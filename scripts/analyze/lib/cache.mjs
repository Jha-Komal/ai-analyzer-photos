// Caches LLM responses locally keyed by hash(input text + prompt version),
// per the spec's cost-control section (46) -- avoids re-paying for a call
// whose input/prompt hasn't changed if a run is interrupted and resumed.
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const CACHE_DIR = new URL("../../../data/cache", import.meta.url).pathname;

function cacheKey(inputText, promptVersion, model) {
  return createHash("sha256").update(`${model}::${promptVersion}::${inputText}`).digest("hex");
}

export async function getCached(inputText, promptVersion, model) {
  const key = cacheKey(inputText, promptVersion, model);
  try {
    const raw = await readFile(path.join(CACHE_DIR, `${key}.json`), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setCached(inputText, promptVersion, model, value) {
  const key = cacheKey(inputText, promptVersion, model);
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(value), "utf-8");
}
