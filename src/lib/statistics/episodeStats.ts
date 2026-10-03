import type { RetrievalEpisode } from "@/types/episode";

/** True for real memory-based retrieval attempts. Episodes extracted before
 * relevanceClass existed have no tag and are treated as direct. Use this
 * before computing any "retrieval failure" metric -- ADJACENT_RETRIEVAL
 * episodes are backup/sync/deletion problems, not retrieval failures, and
 * would skew those stats if included. */
export function isDirectRetrieval(e: RetrievalEpisode): boolean {
  return e.relevanceClass !== "ADJACENT_RETRIEVAL";
}

/** The primary analysis population for Part 1 (spec: isolate
 * VAGUE_MEMORY_RETRIEVAL with strong-enough evidence). Episodes outside this
 * -- other scope classes, or thin evidence -- are kept as contrast/excluded
 * data, never deleted, never headlined as a retrieval-failure finding. An
 * episode with no taxonomy yet (not classified, or ADJACENT_RETRIEVAL which
 * the classifier skips) does not qualify. */
export function isPrimaryAnalysis(e: RetrievalEpisode): boolean {
  const t = e.taxonomy;
  if (!t) return false;
  return t.scopeClass === "VAGUE_MEMORY_RETRIEVAL" && (t.evidenceStrength === "A" || t.evidenceStrength === "B");
}

export function countBy<T extends string>(episodes: RetrievalEpisode[], pick: (e: RetrievalEpisode) => T): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of episodes) {
    const key = pick(e);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

/** Cross-tab where the row key is multi-valued per episode (e.g. an episode
 * can carry several memoryClues) -- each episode bumps every (row, col)
 * pair for every row value it has, not just one. Same output shape as
 * crossTab so both render with the same table component. */
export function crossTabMultiRow<T extends string>(
  episodes: RetrievalEpisode[],
  rowKeys: (e: RetrievalEpisode) => string[],
  colKey: (e: RetrievalEpisode) => T,
): { rows: string[]; cols: string[]; table: Record<string, Record<string, number>> } {
  const table: Record<string, Record<string, number>> = {};
  const rowSet = new Set<string>();
  const colSet = new Set<string>();
  for (const e of episodes) {
    const rs = rowKeys(e);
    const c = colKey(e);
    colSet.add(c);
    for (const r of rs) {
      rowSet.add(r);
      table[r] ??= {};
      table[r][c] = (table[r][c] ?? 0) + 1;
    }
  }
  return { rows: Array.from(rowSet), cols: Array.from(colSet), table };
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
