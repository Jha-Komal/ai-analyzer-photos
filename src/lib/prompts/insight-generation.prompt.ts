import type { RetrievalEpisode } from "@/types/episode";

function toInputRecord(e: RetrievalEpisode) {
  return {
    episode_id: e.id,
    scenario: e.scenario.category,
    target_type: e.target.type,
    remembered: Object.fromEntries(Object.entries(e.remembered).filter(([, v]) => v.length > 0)),
    forgotten: e.forgotten,
    search_steps: e.searchJourney.map((s) => s.action),
    outcome: e.outcome,
    workaround: e.workaround,
    failure_stage: e.failureStage,
    evidence_quote: e.evidence.directQuote,
    confidence: e.confidence,
  };
}

export function buildInsightGenerationPrompt(episodes: RetrievalEpisode[], questions: readonly string[]): string {
  return `ROLE

You are a Senior UX Researcher on the Google Photos Core Experience team, studying how people retrieve photos they remember but cannot precisely describe.

BUSINESS METRIC

Increase the percentage of users who successfully retrieve a photo they remember but cannot precisely describe when they start searching.

TASK

Answer each of the following discovery questions using ONLY the evidence in the dataset below. Each episode is one real user's attempt to retrieve a specific remembered photo/video, already extracted from public Google Photos reviews and discussions.

QUESTIONS:
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

RULES
- Ground every answer in the episodes provided, but keep the "answer" text itself clean, readable prose for a PM audience -- do NOT inline raw episode_id strings (e.g. "playstore_us_...ep0") into the answer text. Put the episode_ids that support each answer ONLY in the separate "supportingEpisodeIds" field. You may still reference concrete details from an episode (a quote, a scenario, a number) without naming its ID.
- Report prevalence as "count / denominator / %" (denominator = total episodes provided), never a bare percentage.
- Do not generalize to "Google Photos users" as a whole -- these are episodes drawn from public reviews/discussions, not a representative sample.
- Distinguish what's directly supported by the evidence from what you're inferring.
- If the dataset can't answer a question, say so explicitly rather than guessing.
- Do not propose product solutions or features -- this is discovery, not design.

DATASET (${episodes.length} episodes):
${JSON.stringify(episodes.map(toInputRecord), null, 2)}

Return a JSON array, one object per question, in this exact order:
[
  {
    "question": "<the question text, verbatim>",
    "answer": "<2-4 sentence answer grounded in the evidence>",
    "confidence": "HIGH | MEDIUM | LOW",
    "supportingEpisodeIds": ["<episode_id>", ...],
    "evidenceCount": <number of episodes supporting this answer>
  }
]`;
}
