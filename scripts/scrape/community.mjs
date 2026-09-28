// Scrapes the Google Photos Help Community (support.google.com/photos/community).
// Technique: headless Playwright Chromium (the forum is a heavily client-rendered
// Angular app -- a plain HTTP GET returns the same generic shell regardless of
// query params, so a real browser render is required to read thread content).
// There is no true full-text search exposed to unauthenticated automation, so
// -- mirroring the same "crawl broad listings, filter client-side" approach
// used for Reddit -- we crawl the general "Browse the Community" listing plus
// every known category listing, render each thread, and keep only threads
// whose combined title+body+replies text matches our retrieval keyword list.
import { chromium } from "playwright";
import { createRateLimiter, sleep } from "./lib/rateLimiter.mjs";
import { withRetry } from "./lib/retry.mjs";
import { loadExisting, mergeById, saveJson, generateId } from "./lib/dedupe.mjs";
import { isRetrievalRelevant, matchedKeywords } from "./lib/relevance.mjs";

const OUT_FILE = new URL("../../data/raw/community.json", import.meta.url).pathname;
const BASE = "https://support.google.com/photos";
const LISTING_URLS = [
  `${BASE}/threads?hl=en`,
  `${BASE}/threads?hl=en&thread_filter=(category:photos_restore)`,
  `${BASE}/threads?hl=en&thread_filter=(category:photos_backup)`,
  `${BASE}/threads?hl=en&thread_filter=(category:photos_editing)`,
  `${BASE}/threads?hl=en&thread_filter=(category:photos_storage)`,
];
const throttle = createRateLimiter(1500, 3000);

async function collectThreadLinks(page, url) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await sleep(1500);
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href*="/thread/"]'))
      .map((a) => a.href)
      .filter((h) => /\/thread\/\d+\//.test(h)),
  );
}

async function scrapeThread(page, url) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await sleep(1200);
  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body.innerText);
  return { title: title.replace(/ - Google Photos Community$/, "").trim(), bodyText };
}

function toDocument(url, title, bodyText) {
  const idMatch = url.match(/\/thread\/(\d+)\//);
  const threadId = idMatch ? idMatch[1] : generateId("community", url).replace("community_", "");
  return {
    id: `community_${threadId}`,
    source: "google_photos_community",
    sourceType: "discussion",
    title,
    text: bodyText,
    url,
    publishedAt: null,
    metadata: { matchedKeywords: matchedKeywords(`${title}\n${bodyText}`) },
  };
}

async function run() {
  const existing = await loadExisting(OUT_FILE);
  const collected = [];
  let scanned = 0;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36" });

  try {
    const allLinks = new Set();
    for (const listingUrl of LISTING_URLS) {
      await throttle();
      try {
        const links = await withRetry(() => collectThreadLinks(page, listingUrl), { label: `community listing ${listingUrl}` });
        links.forEach((l) => allLinks.add(l.split("?")[0] + "?hl=en"));
        console.log(`[community] listing ${listingUrl}: found ${links.length} thread links (unique so far ${allLinks.size})`);
      } catch (err) {
        console.error(`[community] failed listing ${listingUrl}: ${err.message}`);
      }
    }

    for (const threadUrl of allLinks) {
      await throttle();
      scanned++;
      try {
        const { title, bodyText } = await withRetry(() => scrapeThread(page, threadUrl), { label: `community thread ${threadUrl}` });
        if (isRetrievalRelevant(`${title}\n${bodyText}`)) {
          collected.push(toDocument(threadUrl, title, bodyText));
        }
      } catch (err) {
        console.warn(`[community] could not scrape ${threadUrl}: ${err.message}`);
      }
      if (scanned % 10 === 0) console.log(`[community] scanned ${scanned}/${allLinks.size} threads, relevant so far ${collected.length}`);
    }
  } finally {
    await browser.close();
  }

  const { merged, added } = mergeById(existing, collected);
  await saveJson(OUT_FILE, merged);
  console.log(`[community] done. scanned=${scanned} relevant_collected=${collected.length} newly_added=${added} total_stored=${merged.length}`);
}

run().catch((err) => {
  console.error("[community] fatal error:", err);
  process.exitCode = 1;
});
