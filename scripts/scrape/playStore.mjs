// Scrapes Google Play Store reviews for the Google Photos app.
// Technique: `google-play-scraper` npm package (unofficial, no API key needed --
// same approach used previously in ReviewAnalayzerMyntra/src/playStore.js).
//
// Reviews are scoped per-country (different reviewer pools), so we loop
// countries the same way appStore.mjs does. Sort yield differs a lot:
// HELPFULNESS and RATING surface far more retrieval-relevant reviews than
// NEWEST (observed ~4.5% / ~3.2% / ~1.0% hit rates respectively), so they
// get a much larger page budget.
import gplayPkg from "google-play-scraper";
import { createRateLimiter } from "./lib/rateLimiter.mjs";
import { withRetry } from "./lib/retry.mjs";
import { loadExisting, mergeById, saveJson } from "./lib/dedupe.mjs";
import { isRetrievalRelevant, matchedKeywords } from "./lib/relevance.mjs";

const gplay = gplayPkg.default ?? gplayPkg;

const APP_ID = "com.google.android.apps.photos";
const OUT_FILE = new URL("../../data/raw/playstore.json", import.meta.url).pathname;
const throttle = createRateLimiter(500, 2000);

const COUNTRIES = (process.env.SCRAPE_COUNTRIES ?? "us,gb,in").split(",").map((c) => c.trim());
const SORT_BUDGETS = [
  { name: "HELPFULNESS", maxPages: Number(process.env.SCRAPE_MAX_PAGES_HELPFUL ?? 500) },
  { name: "RATING", maxPages: Number(process.env.SCRAPE_MAX_PAGES_RATING ?? 500) },
  { name: "NEWEST", maxPages: Number(process.env.SCRAPE_MAX_PAGES_NEWEST ?? 100) },
];

function toDocument(review, country) {
  const text = [review.title, review.text].filter(Boolean).join("\n\n");
  return {
    id: `playstore_${country}_${review.id}`,
    source: "play_store",
    country: country.toUpperCase(),
    author: review.userName ?? null,
    rating: review.score ?? null,
    title: review.title ?? "",
    review: review.text ?? "",
    date: review.date ? new Date(review.date).toISOString() : null,
    likes: review.thumbsUp ?? 0,
    version: review.version ?? "",
    url: `https://play.google.com/store/apps/details?id=${APP_ID}`,
    metadata: {
      storeCountry: country,
      replyDate: review.replyDate ? new Date(review.replyDate).toISOString() : null,
      replyText: review.replyText ?? null,
      matchedKeywords: matchedKeywords(text),
    },
  };
}

async function run() {
  let stored = await loadExisting(OUT_FILE);
  let scanned = 0;
  let totalCollected = 0;

  for (const country of COUNTRIES) {
    for (const { name: sortName, maxPages } of SORT_BUDGETS) {
      const collected = [];
      let nextPaginationToken;
      for (let page = 0; page < maxPages; page++) {
        await throttle();
        let result;
        try {
          result = await withRetry(
            () =>
              gplay.reviews({
                appId: APP_ID,
                lang: "en",
                country,
                sort: gplay.sort[sortName],
                num: 150,
                paginate: true,
                nextPaginationToken,
              }),
            { label: `playstore ${country}/${sortName} page ${page}` },
          );
        } catch (err) {
          console.error(`[playstore] giving up on ${country}/${sortName} page ${page}: ${err.message}`);
          break;
        }

        const batch = result.data ?? [];
        scanned += batch.length;
        for (const r of batch) {
          const text = [r.title, r.text].filter(Boolean).join(" ");
          if (isRetrievalRelevant(text)) collected.push(toDocument(r, country));
        }

        nextPaginationToken = result.nextPaginationToken;
        if (page % 10 === 0 || page === maxPages - 1) {
          console.log(
            `[playstore] ${country}/${sortName} page ${page}: scanned ${batch.length} (total scanned ${scanned}, relevant this bucket ${collected.length})`,
          );
        }
        if (!nextPaginationToken || batch.length === 0) break;
      }

      totalCollected += collected.length;
      const { merged, added } = mergeById(stored, collected);
      stored = merged;
      await saveJson(OUT_FILE, stored);
      console.log(
        `[playstore] checkpoint saved after ${country}/${sortName}: bucket_relevant=${collected.length} newly_added=${added} total_stored=${stored.length}`,
      );
    }
  }

  console.log(`[playstore] done. scanned=${scanned} relevant_collected=${totalCollected} total_stored=${stored.length}`);
}

run().catch((err) => {
  console.error("[playstore] fatal error:", err);
  process.exitCode = 1;
});
