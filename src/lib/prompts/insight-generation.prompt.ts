import type { RetrievalEpisode } from "@/types/episode";
import { deriveObservedBreakdown, isPrimaryAnalysis } from "../statistics/episodeStats";

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
          // Breakdown-only view (WHERE it broke) -- see the note in RULES
          // below. The top-level `outcome` field above is the separate
          // "what eventually happened" finding.
          observed_breakdown: deriveObservedBreakdown(e),
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

primary_episodes (${primary.length}) are the episodes that qualify for this research problem: taxonomy.scope_class = VAGUE_MEMORY_RETRIEVAL. This is the ONLY population every answer should be quantified against. evidence_strength (A/B/C/D) is NOT a filter here -- it's a per-episode data-quality signal you may cite (e.g. "most strongly supported by the A/B-strength subset") but it never changes who counts as primary.

contrast_episodes (${contrast.length}) are everything else -- other scope classes (PRECISE_SEARCH_FAILURE, ORGANIZATION_OR_NAVIGATION, CONTENT_AVAILABILITY_OR_SYNC, GENERAL_SEARCH_COMPLAINT, UNCLEAR), ADJACENT_RETRIEVAL episodes, or episodes not yet classified (taxonomy: null). Use these ONLY as clearly-labeled contrast/context (e.g. "unlike the primary population, these N episodes were actually an organization/navigation problem, not a vague-memory retrieval problem"). NEVER count a contrast episode toward a primary-population statistic, and never blend the two into a single unlabeled percentage.

QUESTIONS:
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

FIELD DISCIPLINE -- three different things, never merged into one answer or one statistic:
- taxonomy.observed_breakdown: WHERE retrieval visibly broke (EXPRESSION_DIFFICULTY, NO_USEFUL_RESULTS, TARGET_HARD_TO_LOCATE, TARGET_HARD_TO_RECOGNIZE, REFINEMENT_DIFFICULTY, PRODUCT_LOCATION_CONFUSION, UNKNOWN_BREAKDOWN). Use this for any question about where/how retrieval breaks down. UNKNOWN_BREAKDOWN is an expected, honest value (the episode's taxonomy.observed_failure was itself an outcome-flavored value with no recorded breakdown type) -- report it plainly, never guess a specific breakdown for it.
- outcome: WHAT eventually happened (FOUND_DIRECTLY, FOUND_AFTER_REFORMULATION, FOUND_AFTER_WORKAROUND, NOT_FOUND, ABANDONED, UNKNOWN). Use this for any question about results/resolution. Never describe an outcome value (e.g. a reformulation that succeeded, or an abandonment) as an "observed breakdown" or "failure stage."
- workaround / search_steps: WHAT the user tried next (reformulation, synonym, manual scroll, timeline browse, album browse, date/location filter, external search, asking another person, etc). Use this for any question about what users do after an initial attempt.
An episode can correctly have observed_breakdown=NO_USEFUL_RESULTS and outcome=FOUND_AFTER_REFORMULATION at the same time -- that is not a contradiction. Never present taxonomy.observed_failure (the raw, pre-split field) or failure_stage_legacy as a proven technical cause -- both describe what the user reported, not Google's internals, and are kept only for traceability.

QUESTION-SPECIFIC FIELD GUIDANCE (audit these four carefully):
- The reformulation question ("How do users reformulate their search after an initial attempt fails?"): ground this in search_steps (explicit REFORMULATE actions) and outcome (FOUND_AFTER_REFORMULATION vs not). Do NOT describe a successful reformulation as an "observed failure" or "breakdown" -- it is an outcome.
- The workarounds question ("What workarounds do users fall back on after a search fails?"): ground this in workaround and search_steps, with outcome for what resulted. Do NOT use ABANDONED_OR_NOT_FOUND or SUCCESS_AFTER_BROWSING (legacy raw observed_failure values) as if they were workaround or breakdown categories -- those are outcome-flavored and collapse to UNKNOWN_BREAKDOWN under observed_breakdown; cite the actual outcome field for them instead.
- The breakdown-stage question ("At which stage does retrieval most often break down?"): use ONLY taxonomy.observed_breakdown. Do not mix in outcome values (success/abandonment/no-failure-reported) in this answer -- if you want to mention what eventually happens, that belongs in a different question's answer, not this one.
- The scenario-differences question ("How do these behaviors differ across scenarios?"): if comparing where retrieval breaks, use observed_breakdown; if discussing recovery or success, explicitly label it as outcome/workaround behavior in a separate sentence or clause. Do not combine breakdown counts and outcome counts into one distribution.

RULES
- Ground every answer in the episodes provided, but keep every text field clean, readable prose for a PM audience -- do NOT inline raw episode_id strings (e.g. "playstore_us_...ep0") into any text field. Put the episode_ids that support each answer ONLY in the separate "supportingEpisodeIds" field. You may still reference concrete details from an episode (a quote, a scenario, a number) without naming its ID.
- Report prevalence as "count / denominator / %", and the denominator must be primary_episodes.length (157) unless you are explicitly working with a narrower subset -- if so, name that subset and its own size explicitly and never silently switch denominators. Example: "34/157 had captured query text; 29/34 of those queries were three words or fewer."
- Do not generalize to "Google Photos users" as a whole, and do not state a pattern as a population fact. Prefer direct, concrete wording scoped to this dataset over sweeping claims -- e.g. not "Vague-memory retrieval is almost entirely a casual-photo problem" but "Vague-memory retrieval in this dataset is overwhelmingly a photo-retrieval problem rather than a video, screenshot, or document problem" (cite the actual count/denominator in the sentence or nearby).
- If a category has zero or very little evidence (e.g. TARGET_HARD_TO_RECOGNIZE, repeated reformulation, asking another person), do NOT conclude the behavior doesn't happen -- write "This behavior was not clearly observed in the qualifying public-feedback evidence," and note in "limitation" that public reviews are incomplete journey descriptions, not exhaustive behavioral logs.
- Keep observation, interpretation, and hypothesis genuinely separate layers -- do not let an interpreted claim leak into "observation." A fact belongs in observation ONLY if it is a count/denominator/% or a directly-quoted/paraphrased detail -- no "may," "suggests," "appears to," or any reasoning word belongs there. Example of the required separation:
  observation: "61/157 qualifying episodes report NO_USEFUL_RESULTS."
  interpretation: "A large share of visible retrieval breakdowns happens after the user has already attempted retrieval, not before."
  hypothesis: "Some remembered clues may not map effectively to useful results."
  limitation: "Public feedback cannot tell us whether the internal cause is ranking, indexing, semantic matching, query interpretation, or something else."
  If you catch yourself writing a reasoning word in "observation," move that sentence to "interpretation" instead.
- If the dataset can't answer a question, say so explicitly in "observation" rather than guessing, and leave "interpretation"/"hypothesis" minimal.
- Do not propose product solutions or features, and do not recommend one in "hypothesis" -- a hypothesis is something primary research should test, not a fix.
- Never call a scenario or remembered-dimension pattern a "target segment" -- describe it as a candidate behavioral pattern. Final target selection happens only after primary research.
- Prefer simple, human language throughout: what users remember, how they search, where they get stuck, what they try next, what may be happening, what remains uncertain. Avoid unnecessary AI/PM jargon.

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
