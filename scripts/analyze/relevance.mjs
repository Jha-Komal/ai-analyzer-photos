// Prompt 1 -- Relevance Classifier (spec section 10), run over every raw
// document. Chunked + checkpointed so a long run can be interrupted and
// resumed without re-paying for work already done, and so this doesn't
// try to hold all 10k+ results in memory/context at once.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { client, MODEL } from "./lib/openaiClient.mjs";
import { getCached, setCached } from "./lib/cache.mjs";
import { mapWithConcurrency } from "./lib/concurrency.mjs";

const PROMPT_VERSION = "relevance-classifier-v1";
const RAW_FILE = path.join(process.cwd(), "data", "raw", "documents.json");
const OUT_FILE = path.join(process.cwd(), "data", "processed", "relevant.json");

const CHUNK_SIZE = Number(process.env.ANALYZE_CHUNK_SIZE ?? 100);
const CONCURRENCY = Number(process.env.ANALYZE_CONCURRENCY ?? 8);
const LIMIT = process.env.ANALYZE_LIMIT ? Number(process.env.ANALYZE_LIMIT) : Infinity;

const SYSTEM_PROMPT = `You are a qualitative UX research classifier studying photo retrieval behavior in Google Photos.

Your task is to determine whether the provided public conversation contains evidence relevant to the research problem:

"Users trying to retrieve a photo, video, screenshot, document, or other visual item that they remember exists but cannot easily retrieve."

Do not infer intent that is not supported by the text.

Definitions:

DIRECT_RETRIEVAL:
The user is actively trying to find a visual item or describes difficulty retrieving one using search, browsing, timeline, albums, people, objects, dates, locations, text, or other retrieval methods.

ADJACENT_RETRIEVAL:
The user cannot find a visual item, but the primary issue appears to be backup, synchronization, deletion, account access, storage, device migration, or another non-retrieval problem.

NOT_RELEVANT:
The conversation is unrelated to retrieving visual memories.

UNCERTAIN:
There is insufficient evidence to determine the category.

Important:
- Do not classify based only on words such as "missing" or "find".
- A complaint about deleted or unbacked-up photos is not automatically a retrieval problem.
- Preserve ambiguity rather than guessing.`;

const RESPONSE_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "relevance_classification",
    strict: true,
    schema: {
      type: "object",
      properties: {
        classification: { type: "string", enum: ["DIRECT_RETRIEVAL", "ADJACENT_RETRIEVAL", "NOT_RELEVANT", "UNCERTAIN"] },
        confidence: { type: "number" },
        evidence: { type: "array", items: { type: "string" } },
        reason: { type: "string" },
        retrievalIntent: { type: "boolean" },
      },
      required: ["classification", "confidence", "evidence", "reason", "retrievalIntent"],
      additionalProperties: false,
    },
  },
};

async function loadJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

async function saveJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callWithRateLimitRetry(fn, { retries = 6, label = "call" } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = err.status === 429;
      const isTransient = err.status === 500 || err.status === 503 || err.status === undefined;
      if ((!isRateLimit && !isTransient) || attempt === retries) throw err;

      // OpenAI's 429 message includes an exact wait hint ("try again in 640ms");
      // fall back to exponential backoff if we can't parse it.
      const hintMatch = /try again in ([\d.]+)(ms|s)/i.exec(err.message ?? "");
      const hintedMs = hintMatch ? parseFloat(hintMatch[1]) * (hintMatch[2] === "s" ? 1000 : 1) : null;
      const backoffMs = hintedMs ?? Math.min(30000, 1000 * 2 ** attempt);
      const waitMs = backoffMs + Math.random() * 300;
      console.warn(`[relevance] ${label}: ${isRateLimit ? "rate limited" : "transient error"}, retrying in ${Math.round(waitMs)}ms (attempt ${attempt + 1}/${retries + 1})`);
      await sleep(waitMs);
    }
  }
}

async function classifyOne(doc) {
  const input = `${doc.title ? doc.title + "\n\n" : ""}${doc.text}`.slice(0, 6000);

  let result = await getCached(input, PROMPT_VERSION, MODEL);
  if (!result) {
    const completion = await callWithRateLimitRetry(
      () =>
        client.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: input },
          ],
          response_format: RESPONSE_SCHEMA,
        }),
      { label: `classify ${doc.id}` },
    );
    result = JSON.parse(completion.choices[0].message.content);
    await setCached(input, PROMPT_VERSION, MODEL, result);
  }

  return {
    documentId: doc.id,
    source: doc.source,
    ...result,
    analysisVersion: "v1",
    promptVersion: PROMPT_VERSION,
    model: MODEL,
    processedAt: new Date().toISOString(),
  };
}

async function run() {
  const documents = await loadJson(RAW_FILE, []);
  const existing = await loadJson(OUT_FILE, []);
  const doneIds = new Set(existing.filter((r) => r.promptVersion === PROMPT_VERSION && r.model === MODEL).map((r) => r.documentId));

  const todo = documents.filter((d) => !doneIds.has(d.id)).slice(0, LIMIT);
  console.log(`[relevance] ${documents.length} total docs, ${doneIds.size} already classified with ${MODEL}/${PROMPT_VERSION}, ${todo.length} to do`);

  let results = existing;
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < todo.length; i += CHUNK_SIZE) {
    const chunk = todo.slice(i, i + CHUNK_SIZE);
    const chunkResults = await mapWithConcurrency(chunk, CONCURRENCY, async (doc) => {
      try {
        return await classifyOne(doc);
      } catch (err) {
        errors++;
        console.error(`[relevance] failed on ${doc.id}: ${err.message}`);
        return null;
      }
    });

    const successful = chunkResults.filter(Boolean);
    results = [...results.filter((r) => !successful.some((s) => s.documentId === r.documentId)), ...successful];
    processed += successful.length;

    await saveJson(OUT_FILE, results);

    const tally = {};
    for (const r of results) tally[r.classification] = (tally[r.classification] ?? 0) + 1;
    console.log(
      `[relevance] checkpoint: chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(todo.length / CHUNK_SIZE)} -- processed ${processed}/${todo.length} this run (${errors} errors) -- totals: ${JSON.stringify(tally)}`,
    );
  }

  console.log(`[relevance] done. ${results.length} total classified, ${errors} errors this run.`);
}

run().catch((err) => {
  console.error("[relevance] fatal error:", err);
  process.exitCode = 1;
});
