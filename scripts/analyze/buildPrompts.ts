// One-off helper: builds the real insight-generation and research-report
// prompts (the exact same code the API routes use) and writes them to files
// so they can be handed to a Claude Code subagent instead of a live
// ANTHROPIC_API_KEY-gated fetch call.
import { loadDocuments, loadRelevant, loadEpisodes } from "../../src/lib/data";
import { computeDiscoveryStats } from "../../src/lib/aggregation";
import { buildInsightGenerationPrompt } from "../../src/lib/prompts/insight-generation.prompt";
import { buildResearchReportPrompt } from "../../src/lib/prompts/research-report.prompt";
import { DISCOVERY_QUESTIONS } from "../../src/lib/constants";
import { writeFile } from "node:fs/promises";

async function run() {
  const [documents, relevant, episodes] = await Promise.all([loadDocuments(), loadRelevant(), loadEpisodes()]);
  const stats = computeDiscoveryStats(documents, relevant, episodes);

  const insightsPrompt = buildInsightGenerationPrompt(episodes, DISCOVERY_QUESTIONS);
  const reportPrompt = buildResearchReportPrompt(stats, episodes);

  await writeFile("/tmp/insights_prompt.txt", insightsPrompt, "utf-8");
  await writeFile("/tmp/research_report_prompt.txt", reportPrompt, "utf-8");

  console.log("episodes:", episodes.length, "documents:", documents.length);
  console.log("insights prompt chars:", insightsPrompt.length);
  console.log("report prompt chars:", reportPrompt.length);
}

run();
