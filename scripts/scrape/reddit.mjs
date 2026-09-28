// Scrapes Reddit discussions about Google Photos retrieval/search.
// Technique: headless Playwright Chromium visits Reddit's own public
// `*.json` listing endpoints (a real browser session, not raw fetch/curl,
// to get past Reddit's edge bot-detection) then filters client-side by
// keyword -- same approach used previously in
// ReviewAnalayzerMyntra/src/reddit.js. No OAuth/API key needed.
//
// NOTE: Reddit blocks requests at the network-edge level ("You've been
// blocked by network security") for many cloud/datacenter IP ranges,
// independent of browser fingerprinting. If this script logs that message
// repeatedly, it means the machine's outbound IP is blocked by Reddit, not
// that the technique is broken -- re-run from a residential/non-datacenter
// network.
import { chromium } from "playwright";
import { createRateLimiter, sleep } from "./lib/rateLimiter.mjs";
import { withRetry } from "./lib/retry.mjs";
import { loadExisting, mergeById, saveJson } from "./lib/dedupe.mjs";
import { isRetrievalRelevant, matchedKeywords } from "./lib/relevance.mjs";

const OUT_FILE = new URL("../../data/raw/reddit.json", import.meta.url).pathname;
const SUBREDDITS = ["GooglePhotos", "Android", "GooglePixel", "photography", "googlephotos"];
const LISTINGS = [
  { type: "new", extra: "" },
  { type: "top", extra: "&t=year" },
  { type: "top", extra: "&t=all" },
];
const MAX_LISTING_PAGES = Number(process.env.SCRAPE_MAX_PAGES ?? 40);
const throttle = createRateLimiter(2000, 3500);

async function fetchJson(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await sleep(1200);
  const text = await page.evaluate(() => {
    const pre = document.querySelector("pre");
    return pre ? pre.textContent : document.body.innerText;
  });
  if (text.includes("blocked by network security")) {
    throw new Error("BLOCKED_BY_NETWORK_SECURITY");
  }
  return JSON.parse(text);
}

function postToDocument(post) {
  const d = post.data;
  const text = [d.title, d.selftext].filter(Boolean).join("\n\n");
  return {
    id: `reddit_post_${d.id}`,
    source: "reddit",
    sourceType: "discussion",
    title: d.title ?? "",
    text: d.selftext || d.title || "",
    author: d.author ?? null,
    url: `https://reddit.com${d.permalink}`,
    publishedAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : null,
    metadata: { subreddit: d.subreddit, score: d.score, numComments: d.num_comments, matchedKeywords: matchedKeywords(text) },
  };
}

function commentsToDocuments(postId, subreddit, permalink, commentTree) {
  const docs = [];
  function walk(node) {
    if (!node?.data) return;
    const d = node.data;
    if (d.body) {
      docs.push({
        id: `reddit_comment_${d.id}`,
        source: "reddit",
        sourceType: "comment",
        title: "",
        text: d.body,
        author: d.author ?? null,
        url: `https://reddit.com${permalink}${d.id}/`,
        publishedAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : null,
        metadata: { subreddit, parentPostId: postId, matchedKeywords: matchedKeywords(d.body) },
      });
    }
    const replies = d.replies?.data?.children;
    if (Array.isArray(replies)) replies.forEach(walk);
  }
  (commentTree ?? []).forEach(walk);
  return docs;
}

async function run() {
  const existing = await loadExisting(OUT_FILE);
  const collected = [];
  let scanned = 0;
  let blocked = false;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36" });

  try {
    for (const subreddit of SUBREDDITS) {
      for (const listing of LISTINGS) {
        let after = "";
        for (let pageNum = 0; pageNum < MAX_LISTING_PAGES; pageNum++) {
          await throttle();
          const url = `https://www.reddit.com/r/${subreddit}/${listing.type}.json?limit=100${listing.extra}${after ? `&after=${after}` : ""}`;
          let json;
          try {
            json = await withRetry(() => fetchJson(page, url), { label: `reddit r/${subreddit}/${listing.type} page ${pageNum}` });
          } catch (err) {
            if (err.message === "BLOCKED_BY_NETWORK_SECURITY") {
              console.error(`[reddit] BLOCKED by Reddit network security on r/${subreddit}/${listing.type}. This machine's IP is likely blocked. Aborting Reddit scrape.`);
              blocked = true;
              break;
            }
            console.error(`[reddit] giving up on r/${subreddit}/${listing.type} page ${pageNum}: ${err.message}`);
            break;
          }

          const posts = json?.data?.children ?? [];
          scanned += posts.length;

          for (const post of posts) {
            const d = post.data;
            const text = [d.title, d.selftext].filter(Boolean).join(" ");
            if (!isRetrievalRelevant(text)) continue;
            collected.push(postToDocument(post));

            if (d.num_comments > 0) {
              await throttle();
              try {
                const commentsUrl = `https://www.reddit.com${d.permalink}.json?depth=2&limit=50`;
                const commentsJson = await withRetry(() => fetchJson(page, commentsUrl), { label: `reddit comments ${d.id}` });
                const commentTree = commentsJson?.[1]?.data?.children ?? [];
                collected.push(...commentsToDocuments(d.id, d.subreddit, d.permalink, commentTree));
              } catch (err) {
                console.warn(`[reddit] could not fetch comments for ${d.id}: ${err.message}`);
              }
            }
          }

          console.log(`[reddit] r/${subreddit}/${listing.type} page ${pageNum}: scanned ${posts.length} (total scanned ${scanned}, relevant so far ${collected.length})`);
          after = json?.data?.after;
          if (!after || posts.length === 0) break;
        }
        if (blocked) break;
      }
      if (blocked) break;
    }
  } finally {
    await browser.close();
  }

  const { merged, added } = mergeById(existing, collected);
  await saveJson(OUT_FILE, merged);
  console.log(`[reddit] done. scanned=${scanned} relevant_collected=${collected.length} newly_added=${added} total_stored=${merged.length}${blocked ? " (STOPPED EARLY: IP blocked by Reddit)" : ""}`);
}

run().catch((err) => {
  console.error("[reddit] fatal error:", err);
  process.exitCode = 1;
});
