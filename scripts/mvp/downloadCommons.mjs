// Top-up downloader using Wikimedia Commons (curated categories / file search).
// Usage: node downloadCommons.mjs <bucket> <want> cat:<Category_Name> | search:<query> [...]
// Appends to data/mvp/library-sources.json with the same shape as downloadLibrary.mjs.
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const OUT_DIR = path.join(process.cwd(), "public/library");
const SOURCES_FILE = path.join(process.cwd(), "data/mvp/library-sources.json");
const API = "https://commons.wikimedia.org/w/api.php";
const UA = { "User-Agent": "PhotoRecallMVP/0.1 (research prototype; contact via repo owner)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const [bucket, wantArg, ...specs] = process.argv.slice(2);
const want = Number(wantArg);

async function api(params) {
  const url = new URL(API);
  for (const [k, v] of Object.entries({ format: "json", ...params })) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Commons ${res.status}`);
  return res.json();
}

const IMAGEINFO = { prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "1200" };

async function listSpec(spec) {
  const [kind, ...rest] = spec.split(":");
  const value = rest.join(":");
  const base = kind === "cat"
    ? { action: "query", generator: "categorymembers", gcmtitle: `Category:${value}`, gcmtype: "file", gcmlimit: "50", ...IMAGEINFO }
    : { action: "query", generator: "search", gsrsearch: `filetype:bitmap ${value}`, gsrnamespace: "6", gsrlimit: "50", ...IMAGEINFO };
  const data = await api(base);
  return Object.values(data.query?.pages ?? {});
}

const strip = (html) => (html ?? "").replace(/<[^>]*>/g, "").trim();

let entries = [];
try { entries = JSON.parse(await readFile(SOURCES_FILE, "utf-8")); } catch {}
const seen = new Set(entries.map((e) => e.openverseId));
let need = want - entries.filter((e) => e.bucket === bucket).length;
console.log(`[${bucket}] need ${need} more`);
let counter = 8000 + entries.length * 3;

for (const spec of specs) {
  if (need <= 0) break;
  let pages;
  try { pages = await listSpec(spec); } catch (err) { console.warn(`  ${spec}: ${err.message}`); continue; }
  console.log(`  ${spec}: ${pages.length} files`);
  let taken = 0;
  for (const p of pages) {
    if (need <= 0 || taken >= 8) break;
    const ii = p.imageinfo?.[0];
    const id = `commons:${p.pageid}`;
    if (!ii || seen.has(id) || ii.mime !== "image/jpeg" || (ii.width ?? 0) < 700) continue;
    try {
      const res = await fetch(ii.thumburl ?? ii.url, { headers: UA, signal: AbortSignal.timeout(45_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 30_000) throw new Error("too small");
      const sha1 = createHash("sha1").update(buf).digest("hex");
      if (entries.some((e) => e.sha1 === sha1)) continue;
      let file;
      do { file = `IMG_${++counter}.jpg`; } while (entries.some((e) => e.file === file));
      await writeFile(path.join(OUT_DIR, file), buf);
      const m = ii.extmetadata ?? {};
      entries.push({
        file, bucket, query: spec, openverseId: id, sha1,
        title: p.title.replace(/^File:/, ""),
        creator: strip(m.Artist?.value),
        license: m.LicenseShortName?.value ?? "unknown",
        licenseUrl: m.LicenseUrl?.value ?? null,
        sourceUrl: ii.descriptionurl,
        attribution: strip(m.Attribution?.value) || `${p.title} - Wikimedia Commons`,
      });
      seen.add(id); need--; taken++;
      console.log(`  + ${file}  ${p.title.slice(5, 60)}`);
      await sleep(400);
    } catch (err) { /* skip */ }
  }
  await writeFile(SOURCES_FILE, JSON.stringify(entries, null, 2));
  await sleep(800);
}
await writeFile(SOURCES_FILE, JSON.stringify(entries, null, 2));
console.log("Done", bucket, entries.filter((e) => e.bucket === bucket).length);
