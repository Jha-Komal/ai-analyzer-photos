# PhotoRecall Intelligence

AI discovery engine for researching how people retrieve vaguely remembered
photos in Google Photos: what they remember, what they forget, how they
search/reformulate, where retrieval breaks, and what they do instead. Full
product/technical spec: [`docs/PhotoRecall_Intelligence_Spec.md`](docs/PhotoRecall_Intelligence_Spec.md).

Built with Next.js + TypeScript. Local JSON files hold the dataset; OpenAI is
used for extraction/synthesis once configured.

## Data collection (scraping)

Raw public conversations are collected by the scripts in `scripts/scrape/`.
None of the four sources require an API key or credentials.

| Source | Script | Technique |
|---|---|---|
| Google Play Store reviews | `npm run scrape:playstore` | [`google-play-scraper`](https://www.npmjs.com/package/google-play-scraper), looped across countries (US/GB/IN) and sorts |
| Apple App Store reviews | `npm run scrape:appstore` | [`app-store-scraper`](https://www.npmjs.com/package/app-store-scraper) |
| Reddit discussions | `npm run scrape:reddit` | [Arctic Shift](https://arctic-shift.photon-reddit.com) (a free third-party Pushshift-style Reddit archive mirror) -- see note below |
| Google Photos Help Community | `npm run scrape:community` | headless Playwright (the forum is client-rendered; no real full-text search exists for anonymous requests, so it crawls the general + per-category thread listings and filters client-side) |

Run everything and merge into the canonical dataset:

```bash
npx playwright install chromium   # one-time, needed for community.mjs
npm run scrape:all
```

**Why Reddit goes through a third party:** direct requests to `www.reddit.com`
*and* `oauth.reddit.com` (the official API host) are blocked at Reddit's edge
("blocked by network security") from a lot of cloud/datacenter IP ranges --
confirmed independent of technique (plain `curl`, headless Playwright, and
the official OAuth token endpoint were all tested and all blocked from the
same machine). Arctic Shift mirrors Reddit's full post/comment archive and
was reachable, so `reddit.mjs` pages through each subreddit's history via its
API (`GooglePhotos` gets a large budget since it's the most targeted
source; `Android`, `GooglePixel`, `photography` are supplementary with
smaller budgets) and applies the same local keyword filter as the other
scrapers. No API key needed. If you're on a network where Reddit itself
isn't blocked, the direct approach would also work, but there was no reason
to maintain both once this one proved reliable.

Each scraper writes to `data/raw/<source>.json` (native per-source schema,
e.g. `rating`/`author`/`likes` for reviews) and is safe to re-run --
existing entries are deduped by id and merged, not overwritten. `npm run
scrape:merge` (included in `scrape:all`) combines all four into
`data/raw/documents.json` using the canonical schema from the spec (section 6):

```json
{ "id": "...", "source": "...", "sourceType": "...", "title": "...", "text": "...", "url": "...", "publishedAt": "...", "metadata": {} }
```

All four scrapers apply a lightweight keyword prefilter
(`scripts/scrape/lib/relevance.mjs`) so we don't store every unrelated review
-- this is **not** the same as the AI relevance classifier in the spec
(DIRECT_RETRIEVAL / ADJACENT_RETRIEVAL / NOT_RELEVANT / UNCERTAIN); that
classification still has to run as a separate pipeline step over these raw
documents.

## Analysis pipeline (not yet run)

`src/lib/prompts/` contains the nine structured-output prompts from the spec
(relevance classification, episode extraction, memory cue normalization,
failure classification, evidence validation, AI-vs-human eval, pattern
discovery, opportunity generation, interview guide generation). Running them
requires `OPENAI_API_KEY` (see `.env.example`) and is the next step after the
raw dataset is collected.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the Overview
dashboard (document counts by source, currently reading directly from
`data/raw/documents.json`).
