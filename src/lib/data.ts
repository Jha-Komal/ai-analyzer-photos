import { readFile } from "node:fs/promises";
import path from "node:path";
import type { EpisodeTaxonomy, RetrievalEpisode } from "@/types/episode";
import type { RawDocument } from "@/types/document";

async function loadJson<T>(relPath: string, fallback: T): Promise<T> {
  try {
    const filePath = path.join(process.cwd(), relPath);
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

export function loadEpisodes(): Promise<RetrievalEpisode[]> {
  return loadJson("data/processed/episodes.json", []);
}

type TaxonomyRecord = EpisodeTaxonomy & { episodeId: string };

export function loadTaxonomy(): Promise<TaxonomyRecord[]> {
  return loadJson("data/processed/taxonomy.json", []);
}

/** Joins the derived taxonomy pass (scripts/analyze/taxonomy.mjs) onto each
 * episode in memory. episodes.json on disk is never mutated -- episodes that
 * haven't been classified yet (or are ADJACENT_RETRIEVAL, which the
 * classifier skips) simply get taxonomy: null. */
export async function loadEpisodesWithTaxonomy(): Promise<RetrievalEpisode[]> {
  const [episodes, taxonomy] = await Promise.all([loadEpisodes(), loadTaxonomy()]);
  const byId = new Map(taxonomy.map((t) => [t.episodeId, t]));
  return episodes.map((e) => ({ ...e, taxonomy: byId.get(e.id) ?? null }));
}

export function loadDocuments(): Promise<RawDocument[]> {
  return loadJson("data/raw/documents.json", []);
}

export type RelevanceResult = {
  documentId: string;
  source: string;
  classification: "DIRECT_RETRIEVAL" | "ADJACENT_RETRIEVAL" | "NOT_RELEVANT" | "UNCERTAIN";
};

export function loadRelevant(): Promise<RelevanceResult[]> {
  return loadJson("data/processed/relevant.json", []);
}
