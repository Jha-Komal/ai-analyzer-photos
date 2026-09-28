// Scrapes Google Play Store reviews for the Google Photos app.
// Technique: `google-play-scraper` npm package (unofficial, no API key needed --
// same approach used previously in ReviewAnalayzerMyntra/src/playStore.js).
import gplayPkg from "google-play-scraper";
import { createRateLimiter } from "./lib/rateLimiter.mjs";
import { withRetry } from "./lib/retry.mjs";
import { loadExisting, mergeById, saveJson } from "./lib/dedupe.mjs";
import { isRetrievalRelevant, matchedKeywords } from "./lib/relevance.mjs";

const gplay = gplayPkg.default ?? gplayPkg;

const APP_ID = "com.google.android.apps.photos";
const OUT_FILE = new URL("../../data/raw/playstore.json", import.meta.url).pathname;
const MAX_PAGES = Number(process.env.SCRAPE_MAX_PAGES ?? 300);
const throttle = createRateLimiter(500, 2000);

function toDocument(review) {
  const text = [review.title, review.text].filter(Boolean).join("\n\n");
  return {
    id: `playstore_${review.id}`,
    source: "play_store",
    country: "US",
    author: review.userName ?? null,
    rating: review.score ?? null,
    title: review.title ?? "",
    review: review.text ?? "",
    date: review.date ? new Date(review.date).toISOString() : null,
    likes: review.thumbsUp ?? 0,
    version: review.version ?? "",
    url: `https://play.google.com/store/apps/details?id=${APP_ID}`,
    metadata: {
      replyDate: review.replyDate ? new Date(review.replyDate).toISOString() : null,
      replyText: review.replyText ?? null,
      matchedKeywords: matchedKeywords(text),
    },
  };
}

async function run() {
  const existing = await loadExisting(OUT_FILE);
  const collected = [];
  let scanned = 0;

  for (const sortName of ["NEWEST", "RATING", "HELPFULNESS"]) {
    let nextPaginationToken;
    for (let page = 0; page < MAX_PAGES; page++) {
      await throttle();
      let result;
      try {
        result = await withRetry(
          () =>
            gplay.reviews({
              appId: APP_ID,
              lang: "en",
              country: "us",
              sort: gplay.sort[sortName],
              num: 150,
              paginate: true,
              nextPaginationToken,
            }),
          { label: `playstore ${sortName} page ${page}` },
        );
      } catch (err) {
        console.error(`[playstore] giving up on ${sortName} page ${page}: ${err.message}`);
        break;
      }

      const batch = result.data ?? [];
      scanned += batch.length;
      for (const r of batch) {
        const text = [r.title, r.text].filter(Boolean).join(" ");
        if (isRetrievalRelevant(text)) collected.push(toDocument(r));
      }

      nextPaginationToken = result.nextPaginationToken;
      console.log(`[playstore] ${sortName} page ${page}: scanned ${batch.length} (total scanned ${scanned}, relevant so far ${collected.length})`);
      if (!nextPaginationToken || batch.length === 0) break;
    }
  }

  const { merged, added } = mergeById(existing, collected);
  await saveJson(OUT_FILE, merged);
  console.log(`[playstore] done. scanned=${scanned} relevant_collected=${collected.length} newly_added=${added} total_stored=${merged.length}`);
}

run().catch((err) => {
  console.error("[playstore] fatal error:", err);
  process.exitCode = 1;
});
