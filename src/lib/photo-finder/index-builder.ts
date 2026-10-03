import type { Photo } from "@/types/photo-finder";
import { jaccard, tokens } from "./text";

export type PeopleClass = "0" | "1" | "2" | "few" | "many" | "?";

export type DocFeatures = {
  weights: Map<string, number>;
  tagTerms: Set<string>;
  sceneTokens: Set<string>;
  lightTokens: Set<string>;
  colorTokens: Set<string>;
  activityTokens: Set<string>;
  setting: string;
  people: PeopleClass;
  locationTokens: Set<string>;
  year: number | null;
  month: number | null;
};

export type LibraryIndex = {
  photos: Photo[];
  byId: Map<string, Photo>;
  docs: Map<string, DocFeatures>;
  idf: Map<string, number>;
  /** Frequent caption terms, handed to the LLM so it can map vague words onto real vocabulary. */
  vocabulary: string[];
};

function peopleClass(v: Photo["attributes"]["peopleCount"]): PeopleClass {
  if (v === null || v === undefined) return "?";
  if (v === "crowd" || v === "several") return "many";
  if (v === 0) return "0";
  if (v === 1) return "1";
  if (v === 2) return "2";
  return v >= 7 ? "many" : "few";
}

const PEOPLE_ORDER: PeopleClass[] = ["0", "1", "2", "few", "many"];
export function peopleSimilarity(a: PeopleClass, b: PeopleClass): number {
  if (a === "?" || b === "?") return 0.3;
  const d = Math.abs(PEOPLE_ORDER.indexOf(a) - PEOPLE_ORDER.indexOf(b));
  return d === 0 ? 1 : d === 1 ? 0.4 : 0;
}

function addAll(map: Map<string, number>, texts: (string | null | undefined)[], weight: number) {
  for (const text of texts) for (const t of tokens(text ?? "")) map.set(t, (map.get(t) ?? 0) + weight);
}

function buildDoc(p: Photo): DocFeatures {
  const weights = new Map<string, number>();
  addAll(weights, p.aiTags, 3);
  addAll(weights, [p.attributes.scene], 3);
  addAll(weights, p.attributes.objects, 2);
  addAll(weights, [p.attributes.activity], 2);
  addAll(weights, [p.metadata.location], 3);
  addAll(weights, [p.attributes.lighting], 1.5);
  addAll(weights, p.attributes.dominantColors, 1.5);
  addAll(weights, [p.description], 1);
  addAll(weights, [p.attributes.setting], 1);

  const date = p.metadata.date?.match(/^(\d{4})(?:-(\d{2}))?/);
  return {
    weights,
    tagTerms: new Set([...p.aiTags, ...p.attributes.objects].flatMap(tokens)),
    sceneTokens: new Set(tokens(p.attributes.scene)),
    lightTokens: new Set(tokens(p.attributes.lighting)),
    colorTokens: new Set(p.attributes.dominantColors.flatMap(tokens)),
    activityTokens: new Set(tokens(p.attributes.activity ?? "")),
    setting: p.attributes.setting,
    people: peopleClass(p.attributes.peopleCount),
    locationTokens: new Set(tokens(p.metadata.location ?? "")),
    year: date ? Number(date[1]) : null,
    month: date?.[2] ? Number(date[2]) : null,
  };
}

export function buildIndex(photos: Photo[]): LibraryIndex {
  const docs = new Map(photos.map((p) => [p.id, buildDoc(p)]));
  const df = new Map<string, number>();
  for (const d of docs.values()) for (const t of d.weights.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const n = photos.length;
  const idf = new Map([...df].map(([t, c]) => [t, Math.log(1 + n / c)]));

  const tagFreq = new Map<string, number>();
  for (const p of photos) for (const tag of p.aiTags) tagFreq.set(tag, (tagFreq.get(tag) ?? 0) + 1);
  const vocabulary = [...tagFreq]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 220)
    .map(([t]) => t);

  return { photos, byId: new Map(photos.map((p) => [p.id, p])), docs, idf, vocabulary };
}

/** Similarity between two photos' captions, per component (each 0..1). */
export type AnchorComponents = { tags: number; scene: number; setting: number; light: number; color: number; people: number; activity: number };

export function compareDocs(a: DocFeatures, b: DocFeatures): AnchorComponents {
  return {
    tags: jaccard(a.tagTerms, b.tagTerms),
    scene: jaccard(a.sceneTokens, b.sceneTokens),
    setting: a.setting === b.setting ? 1 : 0,
    light: jaccard(a.lightTokens, b.lightTokens),
    color: jaccard(a.colorTokens, b.colorTokens),
    people: peopleSimilarity(a.people, b.people),
    activity: jaccard(a.activityTokens, b.activityTokens),
  };
}
