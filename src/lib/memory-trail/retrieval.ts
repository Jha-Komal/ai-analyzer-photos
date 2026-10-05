import type { DemoPhoto, NearMatchSignalType, RetrievalClue, RetrievalSession } from "@/types/memory-trail";
import { DEMO_PHOTOS } from "./demoPhotos";

export const SHOW = 12;

const STOPWORDS = new Set(["a", "an", "the", "with", "my", "me", "and", "at", "in", "on", "of", "last", "year", "this", "that", "for", "to", "i", "was", "were", "it"]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function searchableText(photo: DemoPhoto): string {
  return [photo.visualTags.join(" "), photo.event, photo.sceneDescription, photo.semanticCaption].join(" ").toLowerCase();
}

/** Small deterministic (not random) tie-break so equally-scored photos don't just fall back to array order. */
function hashTieBreak(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 97;
  return h;
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;
}

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a.map((t) => t.toLowerCase()));
  const setB = new Set(b.map((t) => t.toLowerCase()));
  const intersection = [...setA].filter((t) => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

const TEXT_MATCH_WEIGHT = 2;
const VISUAL_CLUE_WEIGHT = 3;
const PERSON_CLUE_WEIGHT = 3;
const PLACE_CLUE_WEIGHT = 2;
const EVENT_SIGNAL_WEIGHT = 12;
const PEOPLE_SIGNAL_WEIGHT = 4;
const PLACE_SIGNAL_WEIGHT = 3;
const TIME_SIGNAL_WEIGHT = 4;
const SCENE_SIGNAL_WEIGHT = 6;

export type ScoredPhoto = { id: string; score: number };

/** Deterministic scoring -- no AI involved. This is the baseline the AI layer may optionally refine. */
export function scorePhotos(photos: DemoPhoto[], session: RetrievalSession): ScoredPhoto[] {
  const excluded = new Set([...session.negativeSignals, ...session.selectedPhotos.map((s) => s.photoId)]);
  const queryTokens = session.clues.filter((c) => c.type === "query").flatMap((c) => tokenize(c.value));
  const visualClues = session.clues.filter((c) => c.type === "visual");
  const personClues = session.clues.filter((c) => c.type === "person");
  const placeClues = session.clues.filter((c) => c.type === "place");
  const anchors = session.selectedPhotos.map((s) => ({ signal: s, photo: photos.find((p) => p.id === s.photoId) })).filter((a) => a.photo);

  return photos
    .filter((p) => !excluded.has(p.id))
    .map((photo) => {
      let score = 0;
      const text = searchableText(photo);
      for (const token of queryTokens) if (text.includes(token)) score += TEXT_MATCH_WEIGHT;
      for (const clue of visualClues) if (text.includes(clue.value.toLowerCase())) score += VISUAL_CLUE_WEIGHT;
      for (const clue of personClues) if (photo.people.some((p) => p.toLowerCase() === clue.value.toLowerCase())) score += PERSON_CLUE_WEIGHT;
      for (const clue of placeClues) if (photo.location.toLowerCase() === clue.value.toLowerCase()) score += PLACE_CLUE_WEIGHT;

      for (const { signal, photo: anchor } of anchors) {
        if (!anchor) continue;
        switch (signal.signalType) {
          case "same_event":
            if (photo.event === anchor.event) score += EVENT_SIGNAL_WEIGHT;
            break;
          case "same_people":
            if (photo.people.some((p) => anchor.people.includes(p))) score += PEOPLE_SIGNAL_WEIGHT;
            break;
          case "same_place":
            if (photo.location === anchor.location) score += PLACE_SIGNAL_WEIGHT;
            break;
          case "around_this_time":
            if (daysBetween(photo.date, anchor.date) <= 45) score += TIME_SIGNAL_WEIGHT;
            break;
          case "similar_scene":
            score += SCENE_SIGNAL_WEIGHT * jaccard(photo.visualTags, anchor.visualTags);
            break;
        }
      }
      return { id: photo.id, score };
    })
    .sort((a, b) => b.score - a.score || hashTieBreak(a.id) - hashTieBreak(b.id));
}

function recompute(session: RetrievalSession, photos: DemoPhoto[] = DEMO_PHOTOS): RetrievalSession {
  const ranked = scorePhotos(photos, session);
  const candidateIds = ranked.slice(0, SHOW).map((r) => r.id);
  const hasContext = session.clues.length > 1 || session.selectedPhotos.length > 0;
  return { ...session, candidateIds, status: session.status === "success" ? "success" : hasContext ? "refining" : "initial" };
}

export function createSession(query: string, photos: DemoPhoto[] = DEMO_PHOTOS): RetrievalSession {
  const session: RetrievalSession = {
    originalQuery: query,
    clues: [{ id: "clue_query", type: "query", value: query, source: "initial-query" }],
    selectedPhotos: [],
    negativeSignals: [],
    candidateIds: [],
    status: "initial",
  };
  return recompute(session, photos);
}

export function withNearMatchSignal(session: RetrievalSession, photoId: string, signalType: NearMatchSignalType, photos: DemoPhoto[] = DEMO_PHOTOS): RetrievalSession {
  const next = { ...session, selectedPhotos: [...session.selectedPhotos, { photoId, signalType }] };
  return recompute(next, photos);
}

export function withClue(session: RetrievalSession, clue: Omit<RetrievalClue, "id">, photos: DemoPhoto[] = DEMO_PHOTOS): RetrievalSession {
  // A double Enter/click shouldn't add the same clue twice.
  const isDuplicate = session.clues.some((c) => c.type === clue.type && c.value.toLowerCase() === clue.value.toLowerCase());
  if (isDuplicate) return session;
  const next = { ...session, clues: [...session.clues, { ...clue, id: `clue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }] };
  return recompute(next, photos);
}

export function withoutClue(session: RetrievalSession, clueId: string, photos: DemoPhoto[] = DEMO_PHOTOS): RetrievalSession {
  const next = { ...session, clues: session.clues.filter((c) => c.id !== clueId) };
  return recompute(next, photos);
}

export function withoutSignal(session: RetrievalSession, photoId: string, photos: DemoPhoto[] = DEMO_PHOTOS): RetrievalSession {
  const next = { ...session, selectedPhotos: session.selectedPhotos.filter((s) => s.photoId !== photoId) };
  return recompute(next, photos);
}

export function withRejection(session: RetrievalSession, photoId: string, photos: DemoPhoto[] = DEMO_PHOTOS): RetrievalSession {
  const next = { ...session, negativeSignals: [...session.negativeSignals, photoId] };
  return recompute(next, photos);
}

export function withConfirmedTarget(session: RetrievalSession, photoId: string): RetrievalSession {
  return { ...session, status: "success", confirmedPhotoId: photoId };
}
