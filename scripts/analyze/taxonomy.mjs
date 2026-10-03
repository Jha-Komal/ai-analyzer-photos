// Taxonomy classifier -- one lightweight AI pass over the existing stored
// DIRECT_RETRIEVAL episodes (never re-scrapes, never re-extracts episodes).
// Scope/memory-specificity/observed-failure taxonomy, kept in a separate
// file (data/processed/taxonomy.json) joined onto episodes in memory by
// src/lib/data.ts -- episodes.json itself is never touched. Chunked +
// checkpointed, same pattern as relevance.mjs, so a long run can be
// interrupted and resumed without re-paying for work already done.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { client, MODEL } from "./lib/openaiClient.mjs";
import { getCached, setCached } from "./lib/cache.mjs";
import { mapWithConcurrency } from "./lib/concurrency.mjs";

const PROMPT_VERSION = "taxonomy-classifier-v1";
const EPISODES_FILE = path.join(process.cwd(), "data", "processed", "episodes.json");
const OUT_FILE = path.join(process.cwd(), "data", "processed", "taxonomy.json");

const CHUNK_SIZE = Number(process.env.ANALYZE_CHUNK_SIZE ?? 50);
const CONCURRENCY = Number(process.env.ANALYZE_CONCURRENCY ?? 8);
const LIMIT = process.env.ANALYZE_LIMIT ? Number(process.env.ANALYZE_LIMIT) : Infinity;

const SYSTEM_PROMPT = `You are classifying an already-extracted Google Photos retrieval episode.

Your job is NOT to summarize it. NOT to propose a solution. NOT to infer hidden Google system behavior as fact.

Use ONLY the evidence contained in the episode. The business problem is:

"Improve successful retrieval of a photo the user remembers but cannot precisely describe when they start searching."

Return a taxonomy object with these fields:

A. scopeClass -- choose exactly one:
VAGUE_MEMORY_RETRIEVAL: user believes a specific photo/video or bounded set exists, remembers partial clues, memory at retrieval start is incomplete, and attempts to retrieve it.
PRECISE_SEARCH_FAILURE: user knows a fairly precise target or literal descriptor, but retrieval/search still fails.
ORGANIZATION_OR_NAVIGATION: main problem is albums, folders, archive, sorting, locked folder, product organization, or where something was placed.
CONTENT_AVAILABILITY_OR_SYNC: deleted/missing/inaccessible content, or a backup/upload/sync/device-migration/cloud-state issue.
GENERAL_SEARCH_COMPLAINT: a search complaint exists but there is not enough specific retrieval-journey evidence.
UNCLEAR: insufficient evidence to classify safely.
If adjacentCause already clearly identifies backup/sync/deletion, map that deterministically to CONTENT_AVAILABILITY_OR_SYNC. Otherwise classify from the evidence. Do not guess -- use UNCLEAR when evidence is thin.

B. memorySpecificity -- choose exactly one:
M0_PRECISE (exact/near-exact identifier known), M1_PARTIAL_LITERAL (one or two literal properties: object, person, visible text, clothing/color, exact place), M2_CONTEXTUAL_EPISODIC (mainly situation/activity/event/trip/relationship/rough time/why the photo was taken), M3_HIGHLY_INCOMPLETE (mainly knows the item exists or why they need it, very little concrete detail), UNKNOWN.

C. memoryClues -- zero or more of: context, activity, rough_time, exact_time, person, place, object, visual_attribute, visible_text, event, relationship, other. Only include clues supported by the episode. Do not invent clues.

D. observedFailure -- this is critical. Do NOT use speculative internal Google failure labels as the primary result. Choose exactly one:
EXPRESSION_DIFFICULTY (user struggles to turn remembered information into a usable retrieval action/query), NO_USEFUL_RESULTS (user provides some retrieval clue/action but reports no useful/relevant candidates), TARGET_HARD_TO_LOCATE (potentially relevant results/content exist, but the target is buried/poorly ordered/requires excessive scanning), TARGET_HARD_TO_RECOGNIZE (candidate results exist, but the user cannot confidently identify the intended target), REFINEMENT_FAILED (initial attempt fails and one or more subsequent refinements also fail), PRODUCT_LOCATION_CONFUSION (main problem is uncertainty about where Google Photos placed/organized the item), SUCCESS_AFTER_REFORMULATION (initial attempt fails; changing the query/clue succeeds), SUCCESS_AFTER_BROWSING (search fails; manual browsing/timeline/album navigation succeeds), ABANDONED_OR_NOT_FOUND (user explicitly gives up or reports the target could not be found), NO_FAILURE_REPORTED (retrieval-related episode, but no failure is actually reported), UNKNOWN (evidence does not reveal the failure cleanly).
The episode's legacyFailureStage field (from an earlier, more speculative pass) may help as context but is NOT ground truth -- do not mechanically map it. Loose hints only, always overridable by episode evidence: MEMORY_EXPRESSION often implies EXPRESSION_DIFFICULTY; outcome FOUND_AFTER_REFORMULATION often implies SUCCESS_AFTER_REFORMULATION; outcome FOUND_AFTER_WORKAROUND with a browsing-type workaround often implies SUCCESS_AFTER_BROWSING; outcome NOT_FOUND/ABANDONED often implies ABANDONED_OR_NOT_FOUND. Do NOT deterministically map legacyFailureStage values QUERY_FORMULATION, QUERY_UNDERSTANDING, or SEMANTIC_RETRIEVAL to NO_USEFUL_RESULTS -- those legacy labels are already interpretive; read the actual episode evidence instead.

E. possibleSystemExplanation -- optional secondary field, zero or more of: query_interpretation, semantic_matching, ranking, indexing, metadata_gap, content_state, unknown. This is a HYPOTHESIS ONLY, never observed fact. Return [] if the episode does not support even a reasonable hypothesis.

F. evidenceStrength -- choose exactly one: A (target + memory clue + retrieval action + outcome all explicit), B (target + retrieval action explicit, but some details missing), C (retrieval difficulty plausible, but important parts inferred), D (episode is weak/ambiguous for this research question).

G. rationale -- max 3 sentences, explaining why scopeClass and observedFailure were chosen. No solution ideas.

Guardrails: do not infer demographics; do not invent a persona; do not recommend a solution; do not infer internal Google causes as fact; do not treat a missing field as negative evidence; do not assume "old photo" unless age/time is actually supported; do not classify backup/sync/deletion as vague-memory retrieval; use UNKNOWN/UNCLEAR rather than forcing certainty; prefer observable user behavior over technical diagnosis.

Return only valid JSON matching the given schema.`;

const RESPONSE_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "episode_taxonomy",
    strict: true,
    schema: {
      type: "object",
      properties: {
        scopeClass: {
          type: "string",
          enum: [
            "VAGUE_MEMORY_RETRIEVAL",
            "PRECISE_SEARCH_FAILURE",
            "ORGANIZATION_OR_NAVIGATION",
            "CONTENT_AVAILABILITY_OR_SYNC",
            "GENERAL_SEARCH_COMPLAINT",
            "UNCLEAR",
          ],
        },
        memorySpecificity: {
          type: "string",
          enum: ["M0_PRECISE", "M1_PARTIAL_LITERAL", "M2_CONTEXTUAL_EPISODIC", "M3_HIGHLY_INCOMPLETE", "UNKNOWN"],
        },
        memoryClues: {
          type: "array",
          items: {
            type: "string",
            enum: ["context", "activity", "rough_time", "exact_time", "person", "place", "object", "visual_attribute", "visible_text", "event", "relationship", "other"],
          },
        },
        observedFailure: {
          type: "string",
          enum: [
            "EXPRESSION_DIFFICULTY",
            "NO_USEFUL_RESULTS",
            "TARGET_HARD_TO_LOCATE",
            "TARGET_HARD_TO_RECOGNIZE",
            "REFINEMENT_FAILED",
            "PRODUCT_LOCATION_CONFUSION",
            "SUCCESS_AFTER_REFORMULATION",
            "SUCCESS_AFTER_BROWSING",
            "ABANDONED_OR_NOT_FOUND",
            "NO_FAILURE_REPORTED",
            "UNKNOWN",
          ],
        },
        possibleSystemExplanation: {
          type: "array",
          items: { type: "string", enum: ["query_interpretation", "semantic_matching", "ranking", "indexing", "metadata_gap", "content_state", "unknown"] },
        },
        evidenceStrength: { type: "string", enum: ["A", "B", "C", "D"] },
        rationale: { type: "string" },
      },
      required: ["scopeClass", "memorySpecificity", "memoryClues", "observedFailure", "possibleSystemExplanation", "evidenceStrength", "rationale"],
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

      const hintMatch = /try again in ([\d.]+)(ms|s)/i.exec(err.message ?? "");
      const hintedMs = hintMatch ? parseFloat(hintMatch[1]) * (hintMatch[2] === "s" ? 1000 : 1) : null;
      const backoffMs = hintedMs ?? Math.min(30000, 1000 * 2 ** attempt);
      const waitMs = backoffMs + Math.random() * 300;
      console.warn(`[taxonomy] ${label}: ${isRateLimit ? "rate limited" : "transient error"}, retrying in ${Math.round(waitMs)}ms (attempt ${attempt + 1}/${retries + 1})`);
      await sleep(waitMs);
    }
  }
}

function toEpisodeInput(e) {
  return {
    directQuote: e.evidence?.directQuote ?? "",
    scenarioDescription: e.scenario?.description ?? "",
    target: e.target,
    remembered: Object.fromEntries(Object.entries(e.remembered ?? {}).filter(([, v]) => Array.isArray(v) && v.length > 0)),
    forgotten: e.forgotten,
    searchJourney: (e.searchJourney ?? []).map((s) => ({ action: s.action, query: s.query })),
    workaround: e.workaround,
    outcome: e.outcome,
    legacyFailureStage: e.failureStage,
    adjacentCause: e.adjacentCause ?? null,
  };
}

async function classifyOne(episode) {
  const input = JSON.stringify(toEpisodeInput(episode));

  // Deterministic shortcut (spec section 3): an episode whose adjacent cause
  // is already known is content-availability/sync by definition -- skip the
  // model call. In practice this never fires here since the classifier only
  // runs over DIRECT_RETRIEVAL episodes, but kept for safety/cheapness.
  if (episode.adjacentCause) {
    return {
      episodeId: episode.id,
      scopeClass: "CONTENT_AVAILABILITY_OR_SYNC",
      memorySpecificity: "UNKNOWN",
      memoryClues: [],
      observedFailure: "UNKNOWN",
      possibleSystemExplanation: [],
      evidenceStrength: "D",
      rationale: `Deterministic: adjacentCause ("${episode.adjacentCause}") identifies this as a content-availability/sync problem, not evaluated further.`,
      promptVersion: PROMPT_VERSION,
      model: "deterministic",
      processedAt: new Date().toISOString(),
    };
  }

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
      { label: `classify ${episode.id}` },
    );
    result = JSON.parse(completion.choices[0].message.content);
    await setCached(input, PROMPT_VERSION, MODEL, result);
  }

  return {
    episodeId: episode.id,
    ...result,
    promptVersion: PROMPT_VERSION,
    model: MODEL,
    processedAt: new Date().toISOString(),
  };
}

async function run() {
  const allEpisodes = await loadJson(EPISODES_FILE, []);
  const episodes = allEpisodes.filter((e) => e.relevanceClass !== "ADJACENT_RETRIEVAL");
  const existing = await loadJson(OUT_FILE, []);
  const doneIds = new Set(existing.filter((r) => r.promptVersion === PROMPT_VERSION).map((r) => r.episodeId));

  const todo = episodes.filter((e) => !doneIds.has(e.id)).slice(0, LIMIT);
  console.log(`[taxonomy] ${episodes.length} DIRECT_RETRIEVAL episodes, ${doneIds.size} already classified with ${PROMPT_VERSION}, ${todo.length} to do`);

  let results = existing;
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < todo.length; i += CHUNK_SIZE) {
    const chunk = todo.slice(i, i + CHUNK_SIZE);
    const chunkResults = await mapWithConcurrency(chunk, CONCURRENCY, async (episode) => {
      try {
        return await classifyOne(episode);
      } catch (err) {
        errors++;
        console.error(`[taxonomy] failed on ${episode.id}: ${err.message}`);
        return null;
      }
    });

    const successful = chunkResults.filter(Boolean);
    results = [...results.filter((r) => !successful.some((s) => s.episodeId === r.episodeId)), ...successful];
    processed += successful.length;

    await saveJson(OUT_FILE, results);

    const tally = {};
    for (const r of results) tally[r.scopeClass] = (tally[r.scopeClass] ?? 0) + 1;
    console.log(
      `[taxonomy] checkpoint: chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(todo.length / CHUNK_SIZE)} -- processed ${processed}/${todo.length} this run (${errors} errors) -- scopeClass totals: ${JSON.stringify(tally)}`,
    );
  }

  console.log(`[taxonomy] done. ${results.length} total classified, ${errors} errors this run.`);
}

run().catch((err) => {
  console.error("[taxonomy] fatal error:", err);
  process.exitCode = 1;
});
