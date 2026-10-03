import type { RawDocument } from "@/types/document";
import type { RetrievalEpisode } from "@/types/episode";
import { countBy, crossTab, crossTabMultiRow, isDirectRetrieval, isPrimaryAnalysis } from "./statistics/episodeStats";

export type DiscoveryStats = {
  totalDocuments: number;
  relevanceClassDistribution: Record<string, number>;
  sourceDistribution: Record<string, number>;

  // All fields below are computed from DIRECT_RETRIEVAL episodes ONLY --
  // ADJACENT_RETRIEVAL episodes (backup/sync/deletion, not retrieval
  // failures) are summarized separately so they never silently skew a
  // retrieval-failure statistic. See adjacentEpisodeCount / adjacentCauseFrequency.
  totalEpisodes: number;
  scenarioDistribution: Record<string, number>;
  targetTypeDistribution: Record<string, number>;
  outcomeDistribution: Record<string, number>;
  // Legacy/internal-hypothesis stage -- kept for traceability only. Do not
  // headline this; see taxonomyStats.observedFailureDistribution instead.
  failureStageDistribution: Record<string, number>;
  workaroundDistribution: Record<string, number>;
  forgottenCategoryFrequency: Record<string, number>;
  memoryDimensionFrequency: Record<string, number>;

  adjacentEpisodeCount: number;
  adjacentCauseFrequency: Record<string, number>;

  taxonomyStats: TaxonomyStats;
};

export type TaxonomyStats = {
  // Denominator context: how many of the DIRECT_RETRIEVAL episodes have been
  // run through the taxonomy classifier, and how many of those qualify for
  // the primary analysis population (scopeClass=VAGUE_MEMORY_RETRIEVAL --
  // evidenceStrength is NOT a gate, see evidenceStrengthDistribution for the
  // quality breakdown within this population). Every distribution below is
  // computed ONLY over the primary population -- always read percentages
  // against primaryAnalysisCount, never classifiedEpisodeCount or totalEpisodes.
  classifiedEpisodeCount: number;
  primaryAnalysisCount: number;

  scopeClassDistribution: Record<string, number>;

  // Computed over the primary population only.
  memorySpecificityDistribution: Record<string, number>;
  memoryClueFrequency: Record<string, number>;
  observedFailureDistribution: Record<string, number>;
  evidenceStrengthDistribution: Record<string, number>;

  // Cross-tabs, primary population only. Co-occurrence, not causation.
  memoryClueByObservedFailure: ReturnType<typeof crossTab<string>>;
  memoryClueByOutcome: ReturnType<typeof crossTab<string>>;
  memorySpecificityByObservedFailure: ReturnType<typeof crossTab<string>>;
  memorySpecificityByOutcome: ReturnType<typeof crossTab<string>>;
  observedFailureByWorkaround: ReturnType<typeof crossTab<string>>;
};

function bump(record: Record<string, number>, key: string | null | undefined): void {
  if (!key) return;
  record[key] = (record[key] ?? 0) + 1;
}

export function computeDiscoveryStats(
  documents: RawDocument[],
  relevant: { source: string; classification: string }[],
  allEpisodes: RetrievalEpisode[],
): DiscoveryStats {
  const relevanceClassDistribution: Record<string, number> = {};
  const sourceDistribution: Record<string, number> = {};
  for (const doc of documents) bump(sourceDistribution, doc.source);
  for (const r of relevant) bump(relevanceClassDistribution, r.classification);

  const episodes = allEpisodes.filter(isDirectRetrieval);
  const adjacentEpisodes = allEpisodes.filter((e) => !isDirectRetrieval(e));

  const forgottenCategoryFrequency: Record<string, number> = {};
  const memoryDimensionFrequency: Record<string, number> = {};
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

  for (const e of episodes) {
    for (const f of e.forgotten) bump(forgottenCategoryFrequency, f);
    for (const dim of MEMORY_DIMENSIONS) {
      if (e.remembered[dim]?.length > 0) bump(memoryDimensionFrequency, dim);
    }
  }

  const adjacentCauseFrequency: Record<string, number> = {};
  for (const e of adjacentEpisodes) bump(adjacentCauseFrequency, e.adjacentCause ?? undefined);

  const classified = episodes.filter((e) => e.taxonomy);
  const primary = episodes.filter(isPrimaryAnalysis);

  const memoryClueFrequency: Record<string, number> = {};
  for (const e of primary) for (const clue of e.taxonomy?.memoryClues ?? []) bump(memoryClueFrequency, clue);

  const taxonomyStats: TaxonomyStats = {
    classifiedEpisodeCount: classified.length,
    primaryAnalysisCount: primary.length,

    scopeClassDistribution: countBy(classified, (e) => e.taxonomy!.scopeClass),

    memorySpecificityDistribution: countBy(primary, (e) => e.taxonomy!.memorySpecificity),
    memoryClueFrequency,
    observedFailureDistribution: countBy(primary, (e) => e.taxonomy!.observedFailure),
    evidenceStrengthDistribution: countBy(primary, (e) => e.taxonomy!.evidenceStrength),

    memoryClueByObservedFailure: crossTabMultiRow(primary, (e) => e.taxonomy?.memoryClues ?? [], (e) => e.taxonomy!.observedFailure),
    memoryClueByOutcome: crossTabMultiRow(primary, (e) => e.taxonomy?.memoryClues ?? [], (e) => e.outcome),
    memorySpecificityByObservedFailure: crossTab(primary, (e) => e.taxonomy!.memorySpecificity, (e) => e.taxonomy!.observedFailure),
    memorySpecificityByOutcome: crossTab(primary, (e) => e.taxonomy!.memorySpecificity, (e) => e.outcome),
    observedFailureByWorkaround: crossTab(primary, (e) => e.taxonomy!.observedFailure, (e) => e.workaround ?? "NONE"),
  };

  return {
    totalDocuments: documents.length,
    relevanceClassDistribution,
    sourceDistribution,

    totalEpisodes: episodes.length,
    scenarioDistribution: countBy(episodes, (e) => e.scenario.category),
    targetTypeDistribution: countBy(episodes, (e) => e.target.type),
    outcomeDistribution: countBy(episodes, (e) => e.outcome),
    failureStageDistribution: countBy(episodes, (e) => e.failureStage),
    workaroundDistribution: countBy(episodes, (e) => e.workaround ?? "NONE"),
    forgottenCategoryFrequency,
    memoryDimensionFrequency,

    adjacentEpisodeCount: adjacentEpisodes.length,
    adjacentCauseFrequency,

    taxonomyStats,
  };
}
