import { randomUUID } from "node:crypto";
import { completeJson, completeText } from "./claude-provider";
import { buildInsightGenerationPrompt } from "./prompts/insight-generation.prompt";
import { buildResearchReportPrompt } from "./prompts/research-report.prompt";
import { InsightArraySchema } from "./validators";
import { parseJsonSafe } from "./json-parse";
import type { DiscoveryStats } from "./aggregation";
import type { RetrievalEpisode } from "@/types/episode";
import type { Insight } from "@/types/insight";

async function completeAndParseArray(prompt: string, label: string): Promise<unknown[]> {
  let raw = await completeJson(prompt);
  let parsed = parseJsonSafe<unknown[]>(raw);

  if (!parsed) {
    console.warn(`[AIService] ${label}: failed to parse response, retrying once...`);
    raw = await completeJson(prompt);
    parsed = parseJsonSafe<unknown[]>(raw);
  }

  if (!parsed) throw new Error(`[AIService] ${label}: failed to parse AI response after retry`);
  return parsed;
}

export async function generateInsights(episodes: RetrievalEpisode[], questions: readonly string[]): Promise<Insight[]> {
  const prompt = buildInsightGenerationPrompt(episodes, questions);
  const parsed = await completeAndParseArray(prompt, "generateInsights");
  const validated = InsightArraySchema.parse(parsed);
  return validated.map((v) => ({ id: randomUUID(), ...v }));
}

export async function generateResearchReport(stats: DiscoveryStats, episodes: RetrievalEpisode[]): Promise<string> {
  const prompt = buildResearchReportPrompt(stats, episodes);
  return completeText(prompt, { maxTokens: 8000 });
}
