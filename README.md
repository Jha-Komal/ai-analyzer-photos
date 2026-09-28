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
| Google Play Store reviews | `npm run scrape:playstore` | [`google-play-scraper`](https://www.npmjs.com/package/google-play-scraper) |
| Apple App Store reviews | `npm run scrape:appstore` | [`app-store-scraper`](https://www.npmjs.com/package/app-store-scraper) |
| Reddit discussions | `npm run scrape:reddit` | headless Playwright hitting Reddit's public `*.json` listing endpoints |
| Google Photos Help Community | `npm run scrape:community` | headless Playwright (the forum is client-rendered; no real full-text search exists for anonymous requests, so it crawls the general + per-category thread listings and filters client-side) |

Run everything and merge into the canonical dataset:

```bash
npx playwright install chromium   # one-time, needed for reddit.mjs and community.mjs
npm run scrape:all
```

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

**Known limitation:** Reddit blocks requests from many cloud/datacenter IP
ranges at the network edge ("blocked by network security"), independent of
the scraping technique. If `scrape:reddit` reports being blocked, re-run it
from a residential/non-datacenter network -- the script itself is unchanged
and works once the IP isn't blocked.

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
