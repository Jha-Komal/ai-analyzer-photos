import type { RetrievalEpisode } from "@/types/episode";

/** Highest-confidence episodes first -- shared by the research-report and
 * insights prompts so both see the most reliable evidence first when the
 * full episode set exceeds what fits in one prompt. */
export function sampleEpisodes(episodes: RetrievalEpisode[], size: number): RetrievalEpisode[] {
  return [...episodes].sort((a, b) => b.confidence - a.confidence).slice(0, size);
}
