import { randomUUID } from "node:crypto";
import type { Clue, Photo, RankDebug, RetrievalResponse, RetrievalSession, TimeClue } from "@/types/photo-finder";
import { loadLibrary, toPublic } from "./library";
import { buildIndex, compareDocs, type AnchorComponents, type DocFeatures, type LibraryIndex } from "./index-builder";
import { extractClues, interpretRefinement, llmRerank, type Extraction } from "./ai";
import { tokens } from "./text";

const SHOW = 6; // candidates per grid
const SHORTLIST = 18; // candidates handed to the LLM reranker
const LLM_WEIGHT = 0.7; // the LLM reads language better; local signals contribute anchor, date and place

/** Anchor aspects are only trusted if the user actually expressed similarity ("same lighting", chips like "Similar place"). */
const SIMILARITY_CUE = /\b(same|similar|like|alike|matches?|exactly)\b/i;

let indexCache: LibraryIndex | null = null;
async function getIndex(): Promise<LibraryIndex> {
  if (!indexCache) indexCache = buildIndex(await loadLibrary());
  return indexCache;
}

/* ---------- local signals ---------- */

type WeightedTerm = { term: string; weight: number };

/** IDF-weighted share of the query terms that the photo's caption covers (0..1). Terms unknown to the library are ignored. */
function termScore(doc: DocFeatures, terms: WeightedTerm[], idf: Map<string, number>): number {
  let got = 0;
  let total = 0;
  for (const { term, weight } of terms) {
    const w = idf.get(term);
    if (w === undefined) continue;
    total += w * weight;
    got += w * weight * Math.min(1, (doc.weights.get(term) ?? 0) / 3);
  }
  return total === 0 ? 0 : got / total;
}

function mergeTerms(list: WeightedTerm[]): WeightedTerm[] {
  const m = new Map<string, number>();
  for (const { term, weight } of list) m.set(term, Math.max(m.get(term) ?? 0, weight));
  return [...m].map(([term, weight]) => ({ term, weight }));
}

function clueTerms(clue: Clue, weight: number): WeightedTerm[] {
  return [...tokens(clue.text), ...(clue.terms ?? []).flatMap(tokens)].map((term) => ({ term, weight }));
}

const activeClues = (s: RetrievalSession, polarity: "positive" | "negative") =>
  s.clues.filter((c) => c.polarity === polarity && !c.removed);

function parseBound(value: string | null, end: boolean): number | null {
  const m = value?.match(/^(\d{4})(?:-(\d{2}))?/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) : end ? 12 : 1;
  return year * 12 + (month - 1);
}

/** Date fit (-0.5..1). Photos without a date are neutral, not penalised. */
function timeScore(doc: DocFeatures, time: TimeClue | undefined): number {
  if (!time || doc.year === null) return 0;
  const start = parseBound(time.start ?? time.end, false);
  const end = parseBound(time.end ?? time.start, true);
  if (start === null || end === null) return 0;
  const at = doc.year * 12 + ((doc.month ?? 6) - 1);
  if (at >= start && at <= end) return 1;
  const gap = Math.min(Math.abs(at - start), Math.abs(at - end));
  return gap <= 12 ? 0.2 : -0.5;
}

function placeScore(doc: DocFeatures, places: Set<string>): number {
  if (places.size === 0 || doc.locationTokens.size === 0) return 0;
  for (const t of doc.locationTokens) if (places.has(t)) return 1;
  return -0.3;
}

const BASE_ANCHOR_WEIGHTS: AnchorComponents = { tags: 0.3, scene: 0.15, setting: 0.05, light: 0.15, color: 0.15, people: 0.1, activity: 0.1 };
const ASPECT_BOOST: Record<string, (keyof AnchorComponents)[]> = {
  lighting: ["light"],
  colors: ["color"],
  people: ["people"],
  crowd: ["people"],
  scene: ["scene", "setting"],
  place: ["scene", "setting"],
  objects: ["tags"],
  activity: ["activity"],
};

function anchorWeights(aspects: string[]): AnchorComponents {
  const boosted = new Set(aspects.flatMap((a) => ASPECT_BOOST[a] ?? []));
  const w = { ...BASE_ANCHOR_WEIGHTS };
  if (boosted.size > 0) {
    for (const k of Object.keys(w) as (keyof AnchorComponents)[]) w[k] *= boosted.has(k) ? 3 : 0.6;
  }
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(w) as (keyof AnchorComponents)[]) w[k] /= sum;
  return w;
}

function weighted(c: AnchorComponents, w: AnchorComponents): number {
  return (Object.keys(w) as (keyof AnchorComponents)[]).reduce((s, k) => s + c[k] * w[k], 0);
}

type Scored = RankDebug & { photo: Photo };

function scoreLibrary(index: LibraryIndex, session: RetrievalSession): Scored[] {
  const positive = activeClues(session, "positive");
  const negative = activeClues(session, "negative");
  const queryTerms = mergeTerms(tokens(session.originalQuery).map((term) => ({ term, weight: 0.6 })));
  const posTerms = mergeTerms(positive.flatMap((c) => clueTerms(c, c.source === "initial" ? 1 : 1.5)));
  const negTerms = mergeTerms(negative.flatMap((c) => clueTerms(c, 1)));
  const places = new Set(positive.filter((c) => c.kind === "place").flatMap((c) => [...tokens(c.text), ...(c.terms ?? []).flatMap(tokens)]));

  const anchors = session.anchorImageIds.map((id) => index.docs.get(id)).filter((d): d is DocFeatures => !!d);
  const rejected = session.rejectedImageIds.map((id) => index.docs.get(id)).filter((d): d is DocFeatures => !!d);
  const wA = anchorWeights(session.anchorAspects);
  const hasAnchor = anchors.length > 0;
  // Newer anchors count more than older ones.
  const anchorMix = anchors.map((_, i) => (i === anchors.length - 1 ? 1 : 0.5));
  const mixSum = anchorMix.reduce((a, b) => a + b, 0);

  const mix = hasAnchor ? { text: 0.2, clue: 0.3, anchor: 0.35, meta: 0.15 } : { text: 0.5, clue: 0.35, anchor: 0, meta: 0.15 };
  const blocked = new Set([...session.rejectedImageIds, ...session.anchorImageIds]);

  return index.photos
    .filter((p) => !blocked.has(p.id))
    .map((photo) => {
      const doc = index.docs.get(photo.id)!;
      const text = termScore(doc, queryTerms, index.idf);
      const clue = Math.max(0, termScore(doc, posTerms, index.idf) - 0.8 * termScore(doc, negTerms, index.idf));
      const anchor = hasAnchor ? anchors.reduce((s, a, i) => s + weighted(compareDocs(doc, a), wA) * anchorMix[i], 0) / mixSum : 0;
      const meta = (timeScore(doc, session.time) + placeScore(doc, places)) / (places.size > 0 ? 2 : 1);
      const rejectionPenalty = rejected.length ? 0.2 * Math.max(...rejected.map((r) => weighted(compareDocs(doc, r), BASE_ANCHOR_WEIGHTS))) : 0;
      const final = mix.text * text + mix.clue * clue + mix.anchor * anchor + mix.meta * meta - rejectionPenalty;
      return { id: photo.id, photo, text, clue, anchor, meta, llm: null, final };
    })
    .sort((a, b) => b.final - a.final);
}

/* ---------- ranking with LLM rerank ---------- */

async function rank(index: LibraryIndex, session: RetrievalSession, useLlm: boolean): Promise<{ top: Scored[]; ordered: Scored[]; degraded: boolean }> {
  const scored = scoreLibrary(index, session);
  const shortlist = scored.slice(0, SHORTLIST);
  const rest = scored.slice(SHORTLIST);
  if (!useLlm) return { top: shortlist.slice(0, SHOW), ordered: scored, degraded: false };

  const order = await llmRerank({
    query: session.originalQuery,
    positive: activeClues(session, "positive").map((c) => c.text),
    negative: activeClues(session, "negative").map((c) => c.text),
    anchors: session.anchorImageIds.map((id) => index.byId.get(id)).filter((p): p is Photo => !!p),
    rejected: session.rejectedImageIds.map((id) => index.byId.get(id)).filter((p): p is Photo => !!p),
    candidates: shortlist,
  });
  if (!order) return { top: shortlist.slice(0, SHOW), ordered: scored, degraded: true };

  const max = shortlist[0].final;
  const min = shortlist[shortlist.length - 1].final;
  const span = max - min || 1;
  const n = shortlist.length;
  const blended = shortlist.map((s) => {
    const idx = order.indexOf(s.id);
    const llm = idx === -1 ? 0 : 1 - idx / Math.max(1, n - 1);
    const local = (s.final - min) / span;
    return { ...s, llm, final: (1 - LLM_WEIGHT) * local + LLM_WEIGHT * llm };
  });
  blended.sort((a, b) => b.final - a.final);
  return { top: blended.slice(0, SHOW), ordered: [...blended, ...rest], degraded: false };
}

/* ---------- session transitions ---------- */

function toClues(items: Extraction["clues"], source: Clue["source"], polarity: Clue["polarity"]): Clue[] {
  return items.map((c) => ({ text: c.text, source, polarity, kind: c.kind, terms: c.terms.map((t) => t.toLowerCase()) }));
}

function fallbackClues(query: string): Clue[] {
  // Used only if the LLM is unreachable: every meaningful word becomes a clue.
  return [...new Set(tokens(query).filter((t) => !/^\d+$/.test(t)))].slice(0, 8).map((t) => ({ text: t[0].toUpperCase() + t.slice(1), source: "initial" as const, polarity: "positive" as const, kind: "context" as const, terms: [t] }));
}

function fallbackTime(text: string): TimeClue | undefined {
  const years = [...text.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => m[0]).sort();
  return years.length ? { start: years[0], end: years[years.length - 1], confidence: "low" } : undefined;
}

function respond(index: LibraryIndex, session: RetrievalSession, top: Scored[], degraded: boolean): RetrievalResponse {
  return { session, candidates: top.map((s) => toPublic(s.photo)), degraded, debug: top.map((s) => ({ id: s.id, text: s.text, clue: s.clue, anchor: s.anchor, meta: s.meta, llm: s.llm, final: s.final })) };
}

export async function startRetrieval(query: string): Promise<RetrievalResponse> {
  const index = await getIndex();
  const extraction = await extractClues(query, index.vocabulary);
  const clues = extraction ? toClues(extraction.clues, "initial", "positive") : fallbackClues(query);
  const time = (extraction?.time ?? undefined) || fallbackTime(query);

  const session: RetrievalSession = {
    id: randomUUID(),
    originalQuery: query,
    clues,
    time: time ?? undefined,
    anchorImageIds: [],
    rejectedImageIds: [],
    anchorAspects: [],
    rounds: [],
    startedAt: new Date().toISOString(),
  };
  const { top, degraded } = await rank(index, session, true);
  session.rounds.push({ roundNumber: 1, extractedClues: clues.map((c) => c.text), candidateImageIds: top.map((t) => t.id), timestamp: new Date().toISOString() });
  return respond(index, session, top, degraded || !extraction);
}

export async function refineRetrieval(input: RetrievalSession, anchorId: string, text: string): Promise<RetrievalResponse> {
  const index = await getIndex();
  const anchor = index.byId.get(anchorId);
  if (!anchor) throw new Error(`Unknown anchor photo: ${anchorId}`);

  const session: RetrievalSession = structuredClone(input);
  const interpretation = await interpretRefinement({
    originalQuery: session.originalQuery,
    existingClues: activeClues(session, "positive").map((c) => c.text),
    anchor,
    refinement: text,
    vocabulary: index.vocabulary,
  });

  if (!session.anchorImageIds.includes(anchorId)) session.anchorImageIds.push(anchorId);
  let extracted: string[];
  if (interpretation) {
    const added = [...toClues(interpretation.positive_clues, "refinement", "positive"), ...toClues(interpretation.negative_clues, "refinement", "negative")];
    session.clues.push(...added);
    if (SIMILARITY_CUE.test(text)) session.anchorAspects = [...new Set([...session.anchorAspects, ...interpretation.anchor_aspects])];
    if (interpretation.time) session.time = interpretation.time;
    extracted = added.map((c) => (c.polarity === "negative" ? `not ${c.text}` : c.text));
  } else {
    // LLM unavailable: treat the raw words as positive clues so the refinement still changes the ranking.
    const fallback = fallbackClues(text).map((c) => ({ ...c, source: "refinement" as const }));
    session.clues.push(...fallback);
    extracted = fallback.map((c) => c.text);
  }

  const { top, degraded } = await rank(index, session, true);
  session.rounds.push({
    roundNumber: session.rounds.length + 1,
    userInput: text,
    anchorImageId: anchorId,
    extractedClues: extracted,
    candidateImageIds: top.map((t) => t.id),
    timestamp: new Date().toISOString(),
  });
  return respond(index, session, top, degraded || !interpretation);
}

/** Local-only re-rank (no LLM call): used after "Not this" or removing a clue so the grid refills instantly. */
export async function refreshRetrieval(input: RetrievalSession): Promise<RetrievalResponse> {
  const index = await getIndex();
  const session: RetrievalSession = structuredClone(input);
  const { top } = await rank(index, session, false);
  const last = session.rounds[session.rounds.length - 1];
  if (last) last.candidateImageIds = [...new Set([...last.candidateImageIds, ...top.map((t) => t.id)])];
  return respond(index, session, top, false);
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
  return (await getIndex()).byId.get(id);
}

/** Full-library ordering for a session (LLM-blended shortlist first). Used by the scenario verifier only. */
export async function fullOrder(session: RetrievalSession): Promise<string[]> {
  const { ordered } = await rank(await getIndex(), session, true);
  return ordered.map((s) => s.id);
}

/** What the browser may receive: no scoring internals. */
export function toClientResponse({ session, candidates, degraded }: RetrievalResponse): Omit<RetrievalResponse, "debug"> {
  return { session, candidates, degraded };
}
