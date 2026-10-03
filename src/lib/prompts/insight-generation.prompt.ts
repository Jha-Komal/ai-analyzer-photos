import type { RetrievalEpisode } from "@/types/episode";
import { isPrimaryAnalysis } from "../statistics/episodeStats";

function toInputRecord(e: RetrievalEpisode) {
  return {
    episode_id: e.id,
    relevance_class: e.relevanceClass ?? "DIRECT_RETRIEVAL",
    adjacent_cause: e.adjacentCause ?? null,
    scenario: e.scenario.category,
    target_type: e.target.type,
    remembered: Object.fromEntries(Object.entries(e.remembered).filter(([, v]) => v.length > 0)),
    forgotten: e.forgotten,
    search_steps: e.searchJourney.map((s) => s.action),
    outcome: e.outcome,
    workaround: e.workaround,
    failure_stage_legacy: e.failureStage,
    evidence_quote: e.evidence.directQuote,
    confidence: e.confidence,
    taxonomy: e.taxonomy
      ? {
          scope_class: e.taxonomy.scopeClass,
          memory_specificity: e.taxonomy.memorySpecificity,
          memory_clues: e.taxonomy.memoryClues,
          observed_failure: e.taxonomy.observedFailure,
          evidence_strength: e.taxonomy.evidenceStrength,
        }
      : null,
  };
}

export function buildInsightGenerationPrompt(episodes: RetrievalEpisode[], questions: readonly string[]): string {
  const primary = episodes.filter(isPrimaryAnalysis);
  const contrast = episodes.filter((e) => !isPrimaryAnalysis(e));

  return `ROLE

You are a Senior UX Researcher on the Google Photos Core Experience team, studying how people retrieve photos they remember but cannot precisely describe.

BUSINESS METRIC

Increase the percentage of users who successfully retrieve a photo they remember but cannot precisely describe when they start searching.

TASK

Answer each of the following discovery questions using ONLY the evidence in the dataset below. Each episode is one real user's attempt to retrieve a specific remembered photo/video, already extracted from public Google Photos reviews and discussions.

PRIMARY vs CONTRAST POPULATION

primary_episodes (${primary.length}) are the episodes that qualify for this research problem: taxonomy.scope_class = VAGUE_MEMORY_RETRIEVAL and taxonomy.evidence_strength in [A, B]. This is the ONLY population every answer should be quantified against.

contrast_episodes (${contrast.length}) are everything else -- other scope classes (PRECISE_SEARCH_FAILURE, ORGANIZATION_OR_NAVIGATION, CONTENT_AVAILABILITY_OR_SYNC, GENERAL_SEARCH_COMPLAINT, UNCLEAR), weaker evidence (C/D), ADJACENT_RETRIEVAL episodes, or episodes not yet classified (taxonomy: null). Use these ONLY as clearly-labeled contrast/context (e.g. "unlike the primary population, these N episodes were actually an organization/navigation problem, not a vague-memory retrieval problem"). NEVER count a contrast episode toward a primary-population statistic, and never blend the two into a single unlabeled percentage.

QUESTIONS:
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

RULES
- Ground every answer in the episodes provided, but keep every text field clean, readable prose for a PM audience -- do NOT inline raw episode_id strings (e.g. "playstore_us_...ep0") into any text field. Put the episode_ids that support each answer ONLY in the separate "supportingEpisodeIds" field. You may still reference concrete details from an episode (a quote, a scenario, a number) without naming its ID.
- Report prevalence as "count / denominator / %", and the denominator must be primary_episodes.length unless you are explicitly in a labeled contrast statement -- never a bare percentage.
- Do not generalize to "Google Photos users" as a whole, and do not state a pattern as a population fact (e.g. never "users primarily remember X" -- instead "X appeared frequently among the qualifying episodes in this dataset").
- Never present taxonomy.observed_failure or failure_stage_legacy as a proven technical cause inside Google Photos -- both describe what the user reported, not Google's internals.
- Distinguish what's directly supported by the evidence (observation) from what it might mean (interpretation) from what should be tested next (hypothesis).
- If the dataset can't answer a question, say so explicitly in "observation" rather than guessing, and leave "interpretation"/"hypothesis" minimal.
- Do not propose product solutions or features, and do not recommend one in "hypothesis" -- a hypothesis is something primary research should test, not a fix.

DATASET:
primary_episodes (${primary.length}): ${JSON.stringify(primary.map(toInputRecord), null, 2)}

contrast_episodes (${contrast.length}, context only): ${JSON.stringify(contrast.map(toInputRecord), null, 2)}

Return a JSON array, one object per question, in this exact order:
[
  {
    "question": "<the question text, verbatim>",
    "observation": "<what the primary_episodes data directly shows -- count/denominator/%, grounded facts only>",
    "interpretation": "<what that observed pattern may mean -- clearly framed as interpretation, not fact>",
    "hypothesis": "<what primary (interview) research should test to confirm or disconfirm the interpretation -- never a solution>",
    "limitation": "<why this finding should not be overgeneralized -- e.g. small N, single-source bias, complaint-only corpus>",
    "confidence": "HIGH | MEDIUM | LOW",
    "supportingEpisodeIds": ["<episode_id>", ...],
    "evidenceCount": <number of primary_episodes supporting this answer>
  }
]`;
}
