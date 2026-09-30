import type { RetrievalEpisode } from "@/types/episode";

/** Highest-confidence episodes first -- shared by the research-report and
 * insights prompts so both see the most reliable evidence first when the
 * full episode set exceeds what fits in one prompt. */
export function sampleEpisodes(episodes: RetrievalEpisode[], size: number): RetrievalEpisode[] {
  return [...episodes].sort((a, b) => b.confidence - a.confidence).slice(0, size);
}

/** Samples DIRECT_RETRIEVAL and ADJACENT_RETRIEVAL episodes separately (each
 * by highest confidence first) so a size cap never accidentally starves the
 * adjacent contrast set -- needed once the combined corpus (724 episodes)
 * gets large enough that the full set risks exceeding the model's context
 * window. aggregated_statistics stays exact/complete over the FULL corpus
 * regardless of this cap; only the qualitative episode payload is capped. */
export function sampleEpisodesStratified(
  episodes: RetrievalEpisode[],
  { directSize, adjacentSize }: { directSize: number; adjacentSize: number },
): RetrievalEpisode[] {
  const direct = episodes.filter((e) => e.relevanceClass !== "ADJACENT_RETRIEVAL");
  const adjacent = episodes.filter((e) => e.relevanceClass === "ADJACENT_RETRIEVAL");
  return [...sampleEpisodes(direct, directSize), ...sampleEpisodes(adjacent, adjacentSize)];
}
