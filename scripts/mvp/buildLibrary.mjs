// Merges hand-reviewed captions (data/mvp/captions/part_*.json) into the Photo
// schema used by the app: data/mvp/library.json. Bucket / license info stays in
// library-sources.json so scenario labels never ship to the browser.
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dir = path.join(root, "data/mvp/captions");
const sources = JSON.parse(await readFile(path.join(root, "data/mvp/library-sources.json"), "utf-8"));
const metaPath = path.join(root, "data/mvp/metadata.json"); // optional: { "IMG_4004": { date, location } }
let meta = {};
try { meta = JSON.parse(await readFile(metaPath, "utf-8")); } catch {}

const captions = new Map();
for (const f of (await readdir(dir)).filter((n) => /^part_\d+\.json$/.test(n)).sort()) {
  for (const c of JSON.parse(await readFile(path.join(dir, f), "utf-8"))) captions.set(c.id, c);
}

const library = sources
  .map((s) => {
    const id = s.file.replace(/\.jpg$/, "");
    const c = captions.get(id);
    if (!c) throw new Error(`No caption for ${id}`);
    return {
      id,
      url: `/library/${s.file}`,
      filename: s.file,
      metadata: meta[id] ?? {},
      aiTags: c.aiTags,
      description: c.description,
      attributes: {
        peopleCount: c.peopleCount,
        scene: c.scene,
        setting: c.setting,
        lighting: c.lighting,
        objects: c.objects,
        activity: c.activity,
        dominantColors: c.dominantColors,
      },
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

await writeFile(path.join(root, "data/mvp/library.json"), JSON.stringify(library, null, 2));
console.log(`Wrote ${library.length} photos`);
