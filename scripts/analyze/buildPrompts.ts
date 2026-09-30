// One-off helper: builds the real insight-generation and research-report
// prompts (the exact same code the API routes use) and writes them to files
// so they can be handed to a Claude Code subagent instead of a live
// ANTHROPIC_API_KEY-gated fetch call.
import { loadDocuments, loadRelevant, loadEpisodes } from "../../src/lib/data";
import { computeDiscoveryStats } from "../../src/lib/aggregation";
import { sampleEpisodesStratified } from "../../src/lib/sampling";
import { buildInsightGenerationPrompt } from "../../src/lib/prompts/insight-generation.prompt";
import { buildResearchReportPrompt } from "../../src/lib/prompts/research-report.prompt";
import { DISCOVERY_QUESTIONS } from "../../src/lib/constants";
import { writeFile } from "node:fs/promises";

async function run() {
  const [documents, relevant, allEpisodes] = await Promise.all([loadDocuments(), loadRelevant(), loadEpisodes()]);
  // aggregated_statistics (inside computeDiscoveryStats) stays exact/complete
  // over the FULL corpus regardless of sampling below -- only the qualitative
  // episode payload embedded in the prompt is capped, to stay safely under
  // the model's context window now that the corpus mixes 524 direct + 200
  // adjacent episodes (724 unsampled would run ~190k+ tokens per prompt).
  const stats = computeDiscoveryStats(documents, relevant, allEpisodes);
  const sampled = sampleEpisodesStratified(allEpisodes, { directSize: 220, adjacentSize: 80 });

  const insightsPrompt = buildInsightGenerationPrompt(sampled, DISCOVERY_QUESTIONS);
  const reportPrompt = buildResearchReportPrompt(stats, sampled);

  await writeFile("/tmp/insights_prompt.txt", insightsPrompt, "utf-8");
  await writeFile("/tmp/research_report_prompt.txt", reportPrompt, "utf-8");

  console.log("full corpus:", allEpisodes.length, "| sampled for prompt:", sampled.length, "| documents:", documents.length);
  console.log("insights prompt chars:", insightsPrompt.length);
  console.log("report prompt chars:", reportPrompt.length);
}

run();
