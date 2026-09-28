// Scrapes Reddit discussions about Google Photos retrieval/search.
//
// Technique: the Arctic Shift API (https://arctic-shift.photon-reddit.com),
// a free third-party mirror of the Reddit archive (Pushshift-style). This
// machine's IP is blocked by Reddit's own edge network security for BOTH
// www.reddit.com and oauth.reddit.com (confirmed via direct testing -- it's
// not a browser-fingerprinting issue, headless Playwright hit the same
// block), so we go through this third party instead of Reddit directly.
// No API key/OAuth app needed.
//
// We page chronologically (sort=asc) through each subreddit's full post
// history and filter client-side by keyword, same "crawl broad, filter
// locally" pattern used for the community forum scraper -- Arctic Shift's
// server-side full-text `selftext` search is unreliable (frequently times
// out), but `title` search and plain listing both work fine.
import axios from "axios";
import { createRateLimiter } from "./lib/rateLimiter.mjs";
import { withRetry } from "./lib/retry.mjs";
import { loadExisting, mergeById, saveJson } from "./lib/dedupe.mjs";
import { isRetrievalRelevant, matchedKeywords } from "./lib/relevance.mjs";

const OUT_FILE = new URL("../../data/raw/reddit.json", import.meta.url).pathname;
const API_BASE = "https://arctic-shift.photon-reddit.com/api";
// r/GooglePhotos is the highest-value, most targeted source -- give it a
// budget large enough to walk its entire history. r/Android was tried and
// dropped: a manual sample of its keyword matches found ~95% weren't even
// about photos (generic troubleshooting phrases like "can't find" are
// common across all of Android, unrelated to Google Photos specifically).
// The remaining broader subs get a capped budget; check precision on a
// sample before trusting their yield the way r/Android's turned out to be
// mostly noise. Override with SCRAPE_SUBREDDITS="Name:maxPages,Name2:maxPages".
const DEFAULT_SUBREDDIT_BUDGETS = [
  { name: "GooglePhotos", maxPages: 5000 },
  { name: "GooglePixel", maxPages: 800 },
  { name: "photography", maxPages: 400 },
];
const SUBREDDIT_BUDGETS = process.env.SCRAPE_SUBREDDITS
  ? process.env.SCRAPE_SUBREDDITS.split(",").map((entry) => {
      const [name, maxPages] = entry.split(":");
      return { name: name.trim(), maxPages: Number(maxPages ?? 2000) };
    })
  : DEFAULT_SUBREDDIT_BUDGETS;
const throttle = createRateLimiter(400, 900);

async function apiGet(path, params) {
  // axios's `timeout` only covers time-to-first-byte in some Node/axios
  // combinations -- a connection that opens but then stalls mid-response
  // (observed with a couple of very-high-comment-count threads) can hang
  // well past that. Force a hard abort as a backstop.
  const controller = new AbortController();
  const hardTimeout = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await axios.get(`${API_BASE}${path}`, {
      params,
      timeout: 15000,
      signal: controller.signal,
      responseType: "text",
      transformResponse: [(d) => d],
    });
  } finally {
    clearTimeout(hardTimeout);
  }
  let text = res.data;
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Arctic Shift occasionally returns unescaped control characters inside
    // string fields (raw archived data); strip them and retry once.
    parsed = JSON.parse(text.replace(/[\u0000-\u001F]+/g, " "));
  }
  if (parsed.error) throw new Error(`arctic-shift error: ${parsed.error}`);
  return parsed.data ?? [];
}

function postToDocument(post) {
  const text = [post.title, post.selftext].filter(Boolean).join("\n\n");
  return {
    id: `reddit_post_${post.id}`,
    source: "reddit",
    sourceType: "discussion",
    title: post.title ?? "",
    text: post.selftext || post.title || "",
    author: post.author ?? null,
    url: `https://reddit.com${post.permalink}`,
    publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
    metadata: {
      subreddit: post.subreddit,
      score: post.score,
      numComments: post.num_comments,
      matchedKeywords: matchedKeywords(text),
    },
  };
}

function commentToDocument(comment) {
  return {
    id: `reddit_comment_${comment.id}`,
    source: "reddit",
    sourceType: "comment",
    title: "",
    text: comment.body ?? "",
    author: comment.author ?? null,
    url: `https://reddit.com${comment.permalink ?? ""}`,
    publishedAt: comment.created_utc ? new Date(comment.created_utc * 1000).toISOString() : null,
    metadata: {
      subreddit: comment.subreddit,
      parentPostId: (comment.link_id ?? "").replace("t3_", ""),
      matchedKeywords: matchedKeywords(comment.body ?? ""),
    },
  };
}

async function fetchCommentsForPost(postId) {
  await throttle();
  try {
    const comments = await withRetry(() => apiGet("/comments/search", { link_id: `t3_${postId}`, limit: 100 }), {
      label: `comments for ${postId}`,
      retries: 2,
    });
    return comments
      .filter((c) => c.body && c.body !== "[deleted]" && c.body !== "[removed]" && isRetrievalRelevant(c.body))
      .map(commentToDocument);
  } catch (err) {
    console.warn(`[reddit] could not fetch comments for ${postId}: ${err.message}`);
    return [];
  }
}

async function run() {
  let stored = await loadExisting(OUT_FILE);
  let scanned = 0;
  let totalCollected = 0;

  for (const { name: subreddit, maxPages } of SUBREDDIT_BUDGETS) {
    const collected = [];
    let after; // created_utc cursor, chronological ascending
    for (let page = 0; page < maxPages; page++) {
      await throttle();
      let posts;
      try {
        posts = await withRetry(
          () => apiGet("/posts/search", { subreddit, limit: 100, sort: "asc", ...(after ? { after } : {}) }),
          { label: `reddit r/${subreddit} page ${page}` },
        );
      } catch (err) {
        console.error(`[reddit] giving up on r/${subreddit} page ${page}: ${err.message}`);
        break;
      }

      if (posts.length === 0) break;
      scanned += posts.length;

      for (const post of posts) {
        const text = [post.title, post.selftext].filter(Boolean).join(" ");
        if (!isRetrievalRelevant(text)) continue;
        collected.push(postToDocument(post));
        if ((post.num_comments ?? 0) > 0) {
          collected.push(...(await fetchCommentsForPost(post.id)));
        }
      }

      after = posts[posts.length - 1].created_utc;
      if (page % 20 === 0 || posts.length < 100) {
        console.log(`[reddit] r/${subreddit} page ${page}: scanned ${posts.length} (total scanned ${scanned}, relevant this bucket ${collected.length})`);
      }
      if (posts.length < 100) break; // last page for this subreddit
    }

    totalCollected += collected.length;
    const { merged, added } = mergeById(stored, collected);
    stored = merged;
    await saveJson(OUT_FILE, stored);
    console.log(`[reddit] checkpoint saved after r/${subreddit}: bucket_relevant=${collected.length} newly_added=${added} total_stored=${stored.length}`);
  }

  console.log(`[reddit] done. scanned=${scanned} relevant_collected=${totalCollected} total_stored=${stored.length}`);
}

run().catch((err) => {
  console.error("[reddit] fatal error:", err);
  process.exitCode = 1;
});
