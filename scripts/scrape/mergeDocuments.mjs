// Combines every per-source raw file (data/raw/{playstore,appstore,reddit,community}.json)
// into the canonical documents.json schema described in the spec (section 6):
// { id, source, sourceType, title, text, url, publishedAt, metadata }
import { loadExisting, saveJson } from "./lib/dedupe.mjs";

const OUT_FILE = new URL("../../data/raw/documents.json", import.meta.url).pathname;

const SOURCES = [
  { file: "playstore.json", source: "play_store", sourceType: "review" },
  { file: "appstore.json", source: "app_store", sourceType: "review" },
  { file: "reddit.json", source: "reddit", sourceType: null }, // sourceType already set per-item (discussion|comment)
  { file: "community.json", source: "google_photos_community", sourceType: "discussion" },
];

function reviewToDocument(item, source, sourceType) {
  const text = [item.title, item.review].filter(Boolean).join("\n\n");
  return {
    id: item.id,
    source,
    sourceType,
    title: item.title ?? "",
    text,
    url: item.url,
    publishedAt: item.date ?? null,
    metadata: { ...item.metadata, rating: item.rating ?? null, author: item.author ?? null, country: item.country ?? null, version: item.version ?? null },
  };
}

function discussionToDocument(item) {
  return {
    id: item.id,
    source: item.source,
    sourceType: item.sourceType,
    title: item.title ?? "",
    text: item.text ?? "",
    url: item.url,
    publishedAt: item.publishedAt ?? null,
    metadata: item.metadata ?? {},
  };
}

async function run() {
  const allDocs = [];
  for (const { file, source, sourceType } of SOURCES) {
    const filePath = new URL(`../../data/raw/${file}`, import.meta.url).pathname;
    const items = await loadExisting(filePath);
    for (const item of items) {
      const doc = sourceType ? reviewToDocument(item, source, sourceType) : discussionToDocument(item);
      allDocs.push(doc);
    }
    console.log(`[merge] ${file}: ${items.length} items`);
  }

  await saveJson(OUT_FILE, allDocs);
  console.log(`[merge] done. total documents = ${allDocs.length}`);

  const bySource = {};
  for (const d of allDocs) bySource[d.source] = (bySource[d.source] ?? 0) + 1;
  console.log("[merge] breakdown by source:", bySource);
}

run().catch((err) => {
  console.error("[merge] fatal error:", err);
  process.exitCode = 1;
});
