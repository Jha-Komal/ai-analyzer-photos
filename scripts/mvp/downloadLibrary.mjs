// Downloads a candidate photo library for the Visual Anchor Refinement MVP from
// Openverse (openly licensed images, no API key). Files get neutral names so
// nothing leaks the scenario; the bucket/source/license mapping lives in
// data/mvp/library-sources.json (never served to the browser).
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const OUT_DIR = path.join(process.cwd(), "public/library");
const SOURCES_FILE = path.join(process.cwd(), "data/mvp/library-sources.json");

const BUCKETS = {
  concert: {
    want: 16,
    queries: ["concert crowd stage lights", "friends at concert selfie", "concert purple stage lighting", "music festival night crowd", "band live performance dark"],
  },
  whiteboard: {
    want: 16,
    queries: ["whiteboard", "whiteboard brainstorming", "whiteboard diagram", "whiteboard meeting sticky notes", "sprint planning whiteboard", "kanban board wall", "whiteboard notes office"],
  },
  recipe: {
    want: 16,
    queries: ["handwritten recipe", "grandma handwritten recipe", "handwritten recipe card", "handwritten notebook page", "hindi handwriting notebook", "handwritten menu board", "handwritten family recipes"],
  },
  sunset: {
    want: 16,
    queries: ["sunset manali", "sunset himalaya mountains", "sunset hills india", "sunset valley tea cup", "sunset lake mountains"],
  },
  kitchen: {
    want: 26,
    queries: ["cooking kitchen woman", "kitchen steam cooking", "woman cooking kitchen steam", "mother cooking kitchen", "indian kitchen cooking", "kitchen tiles cooking", "cooking pan stove home"],
  },
  filler: {
    want: 26,
    queries: ["family dinner table", "birthday party", "dog park walk", "street food india", "beach goa", "cafe table coffee", "receipt paper", "street market india", "garden flowers", "road trip car", "children playing", "temple india"],
  },
};

const MIN_WIDTH = 700;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(q, page) {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", q);
  url.searchParams.set("page_size", "20");
  url.searchParams.set("page", String(page));
  url.searchParams.set("mature", "false");
  url.searchParams.set("category", "photograph");
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Openverse ${res.status} for "${q}"`);
  return (await res.json()).results ?? [];
}

async function download(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/jpeg")) throw new Error(`not jpeg (${type})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 30_000) throw new Error("too small");
  return buf;
}

// Optional top-up mode: node downloadLibrary.mjs <bucket> <want> "q1|q2|..." [pages]
const [argBucket, argWant, argQueries, argPages] = process.argv.slice(2);
if (argBucket) {
  BUCKETS[argBucket] = { want: Number(argWant), queries: argQueries.split("|") };
  for (const k of Object.keys(BUCKETS)) if (k !== argBucket) delete BUCKETS[k];
}
const MAX_PAGES = Number(argPages ?? 2);

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(path.dirname(SOURCES_FILE), { recursive: true });

  let existing = [];
  try {
    existing = JSON.parse(await readFile(SOURCES_FILE, "utf-8"));
  } catch {}
  const seen = new Set(existing.map((e) => e.openverseId));
  const entries = [...existing];

  for (const [bucket, { want, queries }] of Object.entries(BUCKETS)) {
    const have = entries.filter((e) => e.bucket === bucket).length;
    let need = want - have;
    console.log(`\n[${bucket}] have ${have}, need ${need} more`);

    for (let page = 1; page <= MAX_PAGES && need > 0; page++) {
      for (const q of queries) {
        if (need <= 0) break;
        let results;
        try {
          results = await search(q, page);
        } catch (err) {
          console.warn(`  search failed: ${err.message}`);
          await sleep(3000);
          continue;
        }
        await sleep(1200);
        let takenFromQuery = 0;
        for (const r of results) {
          if (need <= 0 || takenFromQuery >= 4) break;
          if (seen.has(r.id) || (r.width ?? 0) < MIN_WIDTH || (r.filetype && r.filetype !== "jpg")) continue;
          try {
            const buf = await download(r.url);
            const hash = createHash("sha1").update(buf).digest("hex");
            if (entries.some((e) => e.sha1 === hash)) continue;
            const fileId = `IMG_${String(4000 + entries.length * 7 + Math.floor(Math.random() * 6)).padStart(4, "0")}`;
            const file = `${fileId}.jpg`;
            await writeFile(path.join(OUT_DIR, file), buf);
            entries.push({
              file,
              bucket,
              query: q,
              openverseId: r.id,
              sha1: hash,
              title: r.title,
              creator: r.creator,
              license: `${r.license} ${r.license_version}`,
              licenseUrl: r.license_url,
              sourceUrl: r.foreign_landing_url,
              attribution: r.attribution,
            });
            seen.add(r.id);
            need--;
            takenFromQuery++;
            console.log(`  + ${file}  ${bucket}  "${(r.title ?? "").slice(0, 50)}"`);
          } catch (err) {
            // skip unreachable/non-jpeg images
          }
        }
      }
    }
    await writeFile(SOURCES_FILE, JSON.stringify(entries, null, 2));
  }

  await writeFile(SOURCES_FILE, JSON.stringify(entries, null, 2));
  const counts = Object.fromEntries(Object.keys(BUCKETS).map((b) => [b, entries.filter((e) => e.bucket === b).length]));
  console.log("\nDone:", counts, "total", entries.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
