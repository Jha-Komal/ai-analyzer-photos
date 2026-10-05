import { completeJsonObject } from "../openrouter";
import type { AiRetrievalResponse, DemoPhoto, RetrievalSession } from "@/types/memory-trail";
import { scorePhotos, SHOW } from "./retrieval";

/**
 * AI's job here is narrow and structural, never conversational: interpret
 * accumulated clues/signals, connect near-match context to retrieval
 * attributes, suggest a few grounded refinements, and re-rank the
 * deterministic shortlist. It never sees or produces free-form chat --
 * only the strict JSON shape in AiRetrievalResponse, and only server-side
 * (OPENROUTER_API_KEY is never sent to the browser).
 */
const SYSTEM =
  "You are a retrieval-context interpreter inside a photo app. You never chat with the user and never explain your reasoning in prose. " +
  "You only read structured retrieval context (a vague memory, accumulated clues, near-match signals) and return one strict JSON object re-ranking the given candidate photos. " +
  "Never invent facts about a photo beyond the fields given to you.";

function photoCard(p: DemoPhoto): string {
  return `[${p.id}] event="${p.event}"; people=${p.people.join(", ") || "none"}; place=${p.location}; date=${p.date}; tags=${p.visualTags.join(", ")}; caption="${p.semanticCaption}"`;
}

function buildPrompt(photos: DemoPhoto[], session: RetrievalSession, shortlist: DemoPhoto[]): string {
  const clues = session.clues
    .filter((c) => c.type !== "query")
    .map((c) => `${c.type}: ${c.value}`)
    .join("; ");
  const signals = session.selectedPhotos
    .map((s) => {
      const anchor = photos.find((p) => p.id === s.photoId);
      return anchor ? `${s.signalType} (based on [${anchor.id}]: ${anchor.event}, ${anchor.location}, ${anchor.date})` : s.signalType;
    })
    .join("; ");

  return `Original memory: "${session.originalQuery}"
Accumulated clues: ${clues || "none yet"}
Near-match signals (photos the user said are USEFUL CONTEXT, not the target itself): ${signals || "none yet"}
Rejected photos (confirmed not useful): ${session.negativeSignals.join(", ") || "none"}

Candidate photos, already pre-ranked by a local deterministic scorer -- you may re-rank using only the fields given:
${shortlist.map(photoCard).join("\n")}

Return exactly this JSON shape:
{
  "interpretedIntent": "<one short sentence: what specific photo the user seems to be trying to find>",
  "activeSignals": ["<one short label per active clue/signal, e.g. 'same event as near-match', 'fireworks mentioned'>"],
  "suggestedRefinements": ["<at most 3 short, concrete refinement ideas grounded in attributes the candidates above actually have -- never invented>"],
  "rankedCandidateIds": ["<every candidate id above, best match for the original memory + context first, each exactly once>"],
  "reasoningLabels": {"<candidateId>": "<at most 6 words on why it ranks where it does>"}
}`;
}

/** Returns null on any failure (missing key, timeout, malformed response) so the caller can fall back to the deterministic ranking untouched. */
export async function interpretAndRank(photos: DemoPhoto[], session: RetrievalSession): Promise<AiRetrievalResponse | null> {
  const deterministic = scorePhotos(photos, session).slice(0, SHOW);
  const shortlist = deterministic.map((d) => photos.find((p) => p.id === d.id)).filter((p): p is DemoPhoto => !!p);
  if (shortlist.length === 0) return null;

  let raw: AiRetrievalResponse | null;
  try {
    raw = await completeJsonObject<AiRetrievalResponse>(SYSTEM, buildPrompt(photos, session, shortlist), { maxTokens: 900, timeoutMs: 15_000 });
  } catch {
    raw = null; // most commonly OPENROUTER_API_KEY not set -- that's the expected local-fallback path
  }
  if (!raw) return null;

  const validIds = new Set(shortlist.map((p) => p.id));
  const ranked = [...new Set((raw.rankedCandidateIds ?? []).filter((id) => validIds.has(id)))];
  if (ranked.length < Math.min(3, shortlist.length)) return null; // too little usable signal to trust

  const missing = shortlist.map((p) => p.id).filter((id) => !ranked.includes(id));
  return {
    interpretedIntent: typeof raw.interpretedIntent === "string" ? raw.interpretedIntent : "",
    activeSignals: Array.isArray(raw.activeSignals) ? raw.activeSignals.slice(0, 8) : [],
    suggestedRefinements: Array.isArray(raw.suggestedRefinements) ? raw.suggestedRefinements.slice(0, 3) : [],
    rankedCandidateIds: [...ranked, ...missing],
    reasoningLabels: typeof raw.reasoningLabels === "object" && raw.reasoningLabels ? raw.reasoningLabels : {},
  };
}
