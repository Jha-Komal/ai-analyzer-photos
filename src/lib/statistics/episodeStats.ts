import type { RetrievalEpisode } from "@/types/episode";

const MEMORY_DIMENSIONS = [
  "people",
  "places",
  "objects",
  "events",
  "activities",
  "visualAttributes",
  "textInImage",
  "time",
  "relationships",
  "context",
] as const;

export type MemoryMatrixRow = {
  dimension: string;
  frequency: number;
  searchUsage: number;
  failureAssociation: number;
};

/** Memory Matrix (spec page 5): per remembered-dimension frequency, how
 * often that dimension co-occurs with an actual search action, and how
 * often episodes carrying it end in a non-NONE failure stage. */
export function computeMemoryMatrix(episodes: RetrievalEpisode[]): MemoryMatrixRow[] {
  return MEMORY_DIMENSIONS.map((dim) => {
    const withDim = episodes.filter((e) => e.remembered[dim]?.length > 0);
    const withSearch = withDim.filter((e) => e.searchJourney.some((s) => s.action === "SEARCH"));
    const withFailure = withDim.filter((e) => e.failureStage !== "NONE" && e.failureStage !== "UNKNOWN");
    return {
      dimension: dim,
      frequency: withDim.length,
      searchUsage: withDim.length ? Math.round((withSearch.length / withDim.length) * 100) : 0,
      failureAssociation: withDim.length ? Math.round((withFailure.length / withDim.length) * 100) : 0,
    };
  }).sort((a, b) => b.frequency - a.frequency);
}

export function countBy<T extends string>(episodes: RetrievalEpisode[], pick: (e: RetrievalEpisode) => T): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of episodes) {
    const key = pick(e);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

/** Cross-tab: failure stage x a second dimension, both as counts. */
export function crossTab<T extends string>(
  episodes: RetrievalEpisode[],
  rowKey: (e: RetrievalEpisode) => string,
  colKey: (e: RetrievalEpisode) => T,
): { rows: string[]; cols: string[]; table: Record<string, Record<string, number>> } {
  const table: Record<string, Record<string, number>> = {};
  const rowSet = new Set<string>();
  const colSet = new Set<string>();
  for (const e of episodes) {
    const r = rowKey(e);
    const c = colKey(e);
    rowSet.add(r);
    colSet.add(c);
    table[r] ??= {};
    table[r][c] = (table[r][c] ?? 0) + 1;
  }
  return { rows: Array.from(rowSet), cols: Array.from(colSet), table };
}
