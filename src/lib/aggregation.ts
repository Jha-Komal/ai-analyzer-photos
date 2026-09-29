import type { RawDocument } from "@/types/document";
import type { RetrievalEpisode } from "@/types/episode";
import { countBy } from "./statistics/episodeStats";

export type DiscoveryStats = {
  totalDocuments: number;
  relevanceClassDistribution: Record<string, number>;
  sourceDistribution: Record<string, number>;

  totalEpisodes: number;
  scenarioDistribution: Record<string, number>;
  targetTypeDistribution: Record<string, number>;
  outcomeDistribution: Record<string, number>;
  failureStageDistribution: Record<string, number>;
  workaroundDistribution: Record<string, number>;
  forgottenCategoryFrequency: Record<string, number>;
  memoryDimensionFrequency: Record<string, number>;
};

function bump(record: Record<string, number>, key: string | null | undefined): void {
  if (!key) return;
  record[key] = (record[key] ?? 0) + 1;
}

export function computeDiscoveryStats(
  documents: RawDocument[],
  relevant: { source: string; classification: string }[],
  episodes: RetrievalEpisode[],
): DiscoveryStats {
  const relevanceClassDistribution: Record<string, number> = {};
  const sourceDistribution: Record<string, number> = {};
  for (const doc of documents) bump(sourceDistribution, doc.source);
  for (const r of relevant) bump(relevanceClassDistribution, r.classification);

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
  };
}
