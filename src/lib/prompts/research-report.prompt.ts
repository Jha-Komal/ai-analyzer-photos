import type { DiscoveryStats } from "../aggregation";
import type { RetrievalEpisode } from "@/types/episode";
import { DISCOVERY_QUESTIONS } from "../constants";
import { isPrimaryAnalysis } from "../statistics/episodeStats";

function toInputRecord(e: RetrievalEpisode) {
  return {
    episode_id: e.id,
    source_document_id: e.sourceDocumentId,
    relevance_class: e.relevanceClass ?? "DIRECT_RETRIEVAL",
    adjacent_cause: e.adjacentCause ?? null,
    scenario: e.scenario.category,
    scenario_description: e.scenario.description,
    target_type: e.target.type,
    remembered: Object.fromEntries(Object.entries(e.remembered).filter(([, v]) => v.length > 0)),
    forgotten: e.forgotten,
    search_journey: e.searchJourney.map((s) => ({ action: s.action, query: s.query })),
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
          possible_system_explanation: e.taxonomy.possibleSystemExplanation,
          evidence_strength: e.taxonomy.evidenceStrength,
          rationale: e.taxonomy.rationale,
        }
      : null,
  };
}

export function buildResearchReportPrompt(stats: DiscoveryStats, episodes: RetrievalEpisode[]): string {
  const primary = episodes.filter(isPrimaryAnalysis);
  const contrast = episodes.filter((e) => !isPrimaryAnalysis(e));
  const dataset = {
    aggregated_statistics: stats,
    primary_episode_count: primary.length,
    primary_episodes: primary.map(toInputRecord),
    contrast_episode_count: contrast.length,
    contrast_episodes: contrast.map(toInputRecord),
    note: "aggregated_statistics (including aggregated_statistics.taxonomyStats) is exact and complete over the FULL analyzed corpus -- use it for quantification. primary_episodes/contrast_episodes below are a representative sample capped for context-window size, for qualitative grounding, evidence quotes, and pattern-finding, not the full corpus -- do not claim a count of primary_episodes.length as the true total; use aggregated_statistics.taxonomyStats.primaryAnalysisCount for that.",
  };

  return `ROLE

You are a Senior Product Manager and User Researcher on Google Photos' Core Experience team.

BUSINESS METRIC

Increase:

"The percentage of users who successfully retrieve a photo they remember but cannot precisely describe when they start searching."

The challenge is not to improve search in general -- it is to understand how people remember old visual information, where the existing retrieval experience breaks down, and identify an opportunity that can meaningfully improve successful retrieval.

INPUT

You will receive structured episodes extracted from public Google Photos reviews, Reddit discussions, and community threads, already run through a derived taxonomy pass (each episode's "taxonomy" field, null if not yet classified or if ADJACENT_RETRIEVAL).

PRIMARY vs CONTRAST POPULATION -- this is the main grouping for the whole report:

- primary_episodes: taxonomy.scope_class = VAGUE_MEMORY_RETRIEVAL AND taxonomy.evidence_strength in [A, B]. This is the ONLY population every retrieval-failure finding, percentage, and headline chart should be quantified against. aggregated_statistics.taxonomyStats carries the exact, full-corpus counts for this population; primary_episodes in the DATASET below is a capped sample for qualitative grounding only.
- contrast_episodes: everything else -- other scope classes (PRECISE_SEARCH_FAILURE: user had a precise target but search still failed; ORGANIZATION_OR_NAVIGATION: album/folder/navigation problem; CONTENT_AVAILABILITY_OR_SYNC: backup/sync/deletion, see adjacent_cause; GENERAL_SEARCH_COMPLAINT: not enough journey evidence; UNCLEAR), weaker evidence (C/D), or taxonomy: null. Include these ONLY as clearly-labeled contrast evidence -- e.g. a subsection contrasting "what breaks for vague-memory retrieval" vs. "what breaks when the real problem is organization/navigation or content availability." NEVER fold a contrast_episodes count into a primary_episodes percentage, and never let a "count/denominator" quantification silently mix the two.

Within that, relevance_class (DIRECT_RETRIEVAL vs ADJACENT_RETRIEVAL) still matters as a secondary tag -- ADJACENT_RETRIEVAL episodes always land in contrast_episodes. NOT_RELEVANT/UNCERTAIN documents were excluded before episode extraction entirely (never became episodes), but are still counted in aggregated_statistics.relevanceClassDistribution for data-quality reporting.

Treat taxonomy.observed_failure as the headline failure classification. failure_stage_legacy (QUERY_FORMULATION, QUERY_UNDERSTANDING, SEMANTIC_RETRIEVAL, etc.) is kept on each record only for traceability/debugging -- it is an earlier, more speculative internal-cause labeling and must never be presented as a proven technical cause. Likewise taxonomy.possible_system_explanation is a hypothesis about Google's internals, never an observed fact -- always label it "possible system explanation -- inferred from user evidence, not directly observed" wherever it appears.

DATASET:
${JSON.stringify(dataset, null, 2)}

GOAL

Use the dataset to:

1. understand how people remember and forget visual information
2. identify where retrieval breaks down (memory expression, query formulation, system understanding, result surfacing, result evaluation, or recovery)
3. identify candidate behavioral patterns (by scenario, by remembered-dimension pattern) -- never call one a "target segment"; that selection happens only after primary research
4. identify recurring decision/failure patterns
5. surface competing research hypotheses -- do not rank them or declare a winner
6. identify what must be validated in 5-6 user interviews

DO NOT propose features, solutions, MVPs, or AI use cases. DO NOT rank opportunities or declare a leading candidate -- this report stops at competing hypotheses, not a chosen one.

==================================================
RESEARCH RULES
==============

0. Readability

Write narrative sections (executive summary, prose paragraphs) in clean, readable text for a PM audience -- do NOT inline raw episode_id strings (e.g. "playstore_us_...ep0") into sentences. Where you need to cite specific supporting episodes, do it in a distinct "Evidence:" line/field (episode count and, where useful, a short quote), separate from the narrative prose itself.

1. Evidence hierarchy

Check taxonomy.scope_class and taxonomy.evidence_strength on every episode before using it. Only primary_episodes (VAGUE_MEMORY_RETRIEVAL, evidence strength A/B) are the basis for a retrieval-failure finding. contrast_episodes (other scope classes, weak evidence, or ADJACENT_RETRIEVAL/adjacent_cause episodes) are explicitly NOT primary retrieval-failure evidence; use them only in clearly-labeled contrast sections, never merged into a primary_episodes statistic. NOT_RELEVANT/UNCERTAIN documents never became episodes and are excluded from findings entirely (data-quality section only).

1b. Language

Never convert a dataset pattern into a population claim. Do not write "Google Photos fails to understand contextual memory" or "users primarily remember episodic context" -- write "in this dataset, some users provided contextual clues but reported no useful result" or "contextual clues appeared frequently among the qualifying episodes in this dataset." Every observed-failure or memory claim stays scoped to "in this dataset" / "among qualifying episodes," never "users."

2. Evidence vs inference

For every major conclusion distinguish:
KNOWN = directly supported by evidence
INFERRED = reasonable interpretation
UNKNOWN = current dataset cannot establish it

Do not invent missing information.

3. Quantification

When reporting prevalence always show: count / denominator / %
Example: 38 / 193 episodes = 19.7%
Never generalize this to "X% of Google Photos users."

4. Frequency is not importance

Do not prioritize a problem only because it appears often. Public feedback contains source bias, complaint bias, duplicate themes, and vocal minorities.

5. Segmentation

Use behavioral segments derived from scenario/remembered-dimension patterns. Do not invent age, gender, income, occupation, or other demographics not present in the evidence.

6. Contradictions

Preserve evidence that challenges leading hypotheses.

7. Insufficient evidence

When evidence is weak, write: "Insufficient evidence in the current dataset."

==================================================
STEP 1 -- DATA QUALITY
=====================

Report:
* total documents scanned, and the relevance classification breakdown (DIRECT_RETRIEVAL / ADJACENT_RETRIEVAL / NOT_RELEVANT / UNCERTAIN) with count/total/%
* total episodes extracted from DIRECT_RETRIEVAL documents
* taxonomyStats.scopeClassDistribution -- how many DIRECT_RETRIEVAL episodes landed in each scope class, and specifically how many qualify as primary_episodes (VAGUE_MEMORY_RETRIEVAL, evidence strength A/B) vs contrast
* episodes by source, by scenario, by target type

Identify: overrepresented sources, missing/weak fields, important evidence gaps, areas relying heavily on inference.

Then classify the corpus: A. STRONG ENOUGH FOR DIRECTIONAL FINDINGS / B. HYPOTHESIS-GENERATING ONLY / C. INSUFFICIENT. Explain in 2-4 sentences.

==================================================
STEP 2 -- ANSWER THE DISCOVERY QUESTIONS
=========================================

${DISCOVERY_QUESTIONS.map((q, i) => `Q${i + 1}. ${q}`).join("\n\n")}

Answer every question against primary_episodes only (state the denominator as aggregated_statistics.taxonomyStats.primaryAnalysisCount). For each question report: the pattern found, count/denominator/%, evidence episode_ids, affected scenarios, confidence (HIGH/MEDIUM/LOW). If the dataset can't answer it, say "Insufficient evidence in the current dataset."

==================================================
STEP 3 -- OBSERVED-FAILURE DECOMPOSITION
=========================================

Using aggregated_statistics.taxonomyStats.observedFailureDistribution (primary_episodes only) as the headline, report count/denominator/%, representative evidence, which scenarios/candidate behavioral patterns it concentrates in, and confidence for each of: EXPRESSION_DIFFICULTY, NO_USEFUL_RESULTS, TARGET_HARD_TO_LOCATE, TARGET_HARD_TO_RECOGNIZE, REFINEMENT_FAILED, PRODUCT_LOCATION_CONFUSION, SUCCESS_AFTER_REFORMULATION, SUCCESS_AFTER_BROWSING, ABANDONED_OR_NOT_FOUND, NO_FAILURE_REPORTED, UNKNOWN.

Do NOT headline failure_stage_legacy or its values (MEMORY_EXPRESSION, QUERY_FORMULATION, QUERY_UNDERSTANDING, SEMANTIC_RETRIEVAL, RESULT_EVALUATION, RECOVERY) as if they were a proven internal mechanism -- QUERY_UNDERSTANDING, SEMANTIC_RETRIEVAL, and RESULT_EVALUATION in particular describe a hypothesis about Google's internals or an unverified inference about the user's experience, not something the user reported observing. These three may appear only in a secondary/debug paragraph, or under possible_system_explanation explicitly labeled as a hypothesis. You may add one short secondary paragraph cross-referencing aggregated_statistics.failureStageDistribution for traceability, explicitly labeled "legacy/internal-hypothesis labeling, not the headline finding."

End this step with the exact sentence: "Observed failure stages describe what users reported happening. They do not identify Google's internal technical cause."

==================================================
STEP 4 -- RECURRING BEHAVIORAL CHAINS
======================================

Find repeated sequences (e.g. SEARCH -> REFORMULATE -> MANUAL_SCROLL -> GIVE_UP) within primary_episodes. Derive the actual chains from search_journey data. For each: chain, supporting episode count, affected scenarios, typical taxonomy.observed_failure, typical workaround, typical outcome, confidence.

==================================================
STEP 5 -- SCENARIO x OBSERVED-FAILURE MATRIX
=============================================

Primary_episodes only. Rows: scenario categories. Columns: taxonomy.observed_failure values. For each relevant intersection rate EVIDENCE_VOLUME, WORKAROUND_FRICTION, and EVIDENCE_CONFIDENCE as HIGH/MEDIUM/LOW/INSUFFICIENT.

==================================================
STEP 6 -- COMPETING RESEARCH HYPOTHESES (NO RANKING, NO WINNER)
==================================================

Primary_episodes only. Generate 3-5 competing hypotheses about why retrieval fails, at the problem/discovery level only -- no feature ideas, no ranking, no declared winner, no priority tier (no P1/P2/P3), no "highest opportunity," no target segment selection. Primary research (interviews), not this report, decides which hypothesis holds up. Label them Hypothesis A, Hypothesis B, Hypothesis C, etc. -- a letter, never a rank number.

Examples of the KIND of hypothesis this step produces (structure only -- do not hard-code these as true, generate only what the current data supports):
- "People may retain situational context about a photo even when precise searchable attributes have faded."
- "Some users appear able to express meaningful clues, yet still report no useful candidate results."
- "Some retrieval failures may compound because users do not have an effective next step after the first attempt fails."
- "Some apparent search failures are actually organization or content-state problems rather than vague-memory retrieval problems."

For each hypothesis return only:

HYPOTHESIS (A/B/C...):
OBSERVATION SUPPORTING IT: (reference actual episode_ids or aggregated_statistics findings -- never invent evidence)
COUNTER-EVIDENCE: (actively search for it; never omit this field)
ALTERNATIVE EXPLANATION:
CONFIDENCE: HIGH | MEDIUM | LOW (confidence in the hypothesis itself -- never a priority/rank)
WHAT INTERVIEWS MUST TEST:
WHAT WOULD DISPROVE IT:

Do not add a PRIORITY, RANK, or "WHY IT MATTERS MOST" field to any hypothesis. Do not single one out as the leading or most promising hypothesis anywhere in this step or in the executive summary.

==================================================
STEP 7 -- CHALLENGE THE HYPOTHESES
=============================================

For each hypothesis in Step 6, actively search for contradictory evidence. Report: contradiction, hypothesis challenged, whether it suggests a different candidate behavioral pattern, impact on confidence. Do not hide contradictions.

==================================================
STEP 8 -- RESEARCH STATUS
==========================

Three sections, do not mix them: WHAT THE DATA SUPPORTS / WHAT THE DATA SUGGESTS / WHAT THE DATA CANNOT ANSWER.

==================================================
STEP 9 -- PRIMARY RESEARCH GAPS -> INTERVIEW QUESTIONS
=========================================================

Identify what secondary research (public reviews/discussions) cannot reliably establish, e.g.: exactly what triggered the search, how memory degraded over time, what the user tried before giving up, what would have resolved it, whether they eventually found it another way, how they'd describe the item unprompted. Convert the most important gaps into concrete questions for 5-6 user interviews.

==================================================
STEP 10 -- CANDIDATE BEHAVIORAL PATTERNS TO VALIDATE NEXT
=============================================================

Recommend 1-3 scenario + observed-failure combinations for primary research, described as "candidate behavioral patterns" -- never as a chosen target segment. For each: scenario/pattern, hypothesized root problem, why it may affect the retrieval-success metric, supporting evidence, missing evidence, what must be validated in interviews. Do not choose a solution. Do not declare one pattern the final target.

==================================================
STEP 11 -- LIMITATIONS
=======================

Reproduce this block verbatim (adapt only the lead-in sentence if needed, never the two lists):

THIS DATA CAN HELP US:
- identify recurring reported behaviors
- observe reported memory clues
- compare patterns inside this collected dataset
- generate research hypotheses
- decide what interviews should investigate

THIS DATA CANNOT TELL US:
- prevalence across all Google Photos users
- actual product retrieval-success rate
- Google's true internal technical failure
- causal relationships
- final target segment
- final root cause
- which solution to build
- which opportunity has the highest business impact

==================================================
FINAL OUTPUT
============

Return sections in this order:
1. Executive summary (do not name a leading hypothesis or a target segment here either)
2. Dataset quality and limitations
3. Answers to the discovery questions
4. Observed-failure decomposition
5. Recurring behavioral chains
6. Scenario x observed-failure matrix
7. Competing research hypotheses (Hypothesis A/B/C..., not ranked, no winner declared)
8. Contradictory evidence
9. Known vs inferred vs unknown
10. Primary research gaps -> interview questions
11. Candidate behavioral patterns to validate next
12. Limitations

FINAL CHECK BEFORE ANSWERING -- confirm internally that: no feature has been proposed; no opportunity ranking, priority tier (P1/P2/P3), or "highest opportunity" language appears anywhere; all percentages include denominators and are computed over primary_episodes (never a bare percentage, never a denominator that silently mixes primary and contrast); candidate behavioral patterns are evidence-based, not invented demographics, and none is called a "target segment"; contradictory evidence is included; competing hypotheses each have counter-evidence, an alternative explanation, and are not ranked, lettered by priority, or declared a winner; no final target segment or persona is selected; no solution is recommended; the limitations block is present verbatim.

Required reasoning path: BUSINESS METRIC -> EVIDENCE -> BEHAVIOR -> OBSERVED FAILURE -> COMPETING HYPOTHESES -> PRIMARY RESEARCH. Do not proceed to solution design, and do not collapse the competing hypotheses into one chosen direction.`;
}
