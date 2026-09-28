// Scrapes Apple App Store reviews for the Google Photos app.
// Technique: `app-store-scraper` npm package (RSS-backed, no API key needed --
// same approach used previously in ReviewAnalayzerMyntra/src/appStore.js).
// Apple's RSS feed caps out around ~2500 reviews per country/sort combo
// regardless of pagination effort, so we loop across sort orders AND
// several storefronts (countries) to maximize unique coverage.
import { createRequire } from "node:module";
import { createRateLimiter } from "./lib/rateLimiter.mjs";
import { withRetry } from "./lib/retry.mjs";
import { loadExisting, mergeById, saveJson } from "./lib/dedupe.mjs";
import { isRetrievalRelevant, matchedKeywords } from "./lib/relevance.mjs";

const require = createRequire(import.meta.url);
const store = require("app-store-scraper");

const APP_ID = 962194608; // Google Photos: Backup & Edit
const OUT_FILE = new URL("../../data/raw/appstore.json", import.meta.url).pathname;
const MAX_PAGES = Number(process.env.SCRAPE_MAX_PAGES ?? 10); // Apple RSS pages max out near here anyway
const COUNTRIES = ["us", "gb", "in", "au", "ca"];
const throttle = createRateLimiter(500, 2000);

function toDocument(review, country) {
  const text = [review.title, review.text].filter(Boolean).join(" ");
  return {
    id: `appstore_${country}_${review.id}`,
    source: "app_store",
    country: country.toUpperCase(),
    author: review.userName ?? null,
    rating: review.score ?? null,
    title: review.title ?? "",
    review: review.text ?? "",
    date: review.updated ? new Date(review.updated).toISOString() : null,
    likes: 0,
    version: review.version ?? "",
    url: review.url ?? `https://apps.apple.com/${country}/app/id${APP_ID}`,
    metadata: { storeCountry: country, matchedKeywords: matchedKeywords(text) },
  };
}

async function run() {
  const existing = await loadExisting(OUT_FILE);
  const collected = [];
  let scanned = 0;

  for (const country of COUNTRIES) {
    for (const sortName of ["RECENT", "HELPFUL"]) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        await throttle();
        let reviews;
        try {
          reviews = await withRetry(
            () => store.reviews({ id: APP_ID, country, sort: store.sort[sortName], page }),
            { label: `appstore ${country} ${sortName} page ${page}` },
          );
        } catch (err) {
          console.error(`[appstore] giving up on ${country}/${sortName} page ${page}: ${err.message}`);
          break;
        }

        if (!reviews || reviews.length === 0) break;
        scanned += reviews.length;
        for (const r of reviews) {
          const text = [r.title, r.text].filter(Boolean).join(" ");
          if (isRetrievalRelevant(text)) collected.push(toDocument(r, country));
        }
        console.log(`[appstore] ${country}/${sortName} page ${page}: scanned ${reviews.length} (total scanned ${scanned}, relevant so far ${collected.length})`);
      }
    }
  }

  const { merged, added } = mergeById(existing, collected);
  await saveJson(OUT_FILE, merged);
  console.log(`[appstore] done. scanned=${scanned} relevant_collected=${collected.length} newly_added=${added} total_stored=${merged.length}`);
}

run().catch((err) => {
  console.error("[appstore] fatal error:", err);
  process.exitCode = 1;
});
