import type { DiscoveryStats } from "../aggregation";
import type { RetrievalEpisode } from "@/types/episode";
import { deriveObservedBreakdown, isPrimaryAnalysis } from "../statistics/episodeStats";

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
          // Breakdown-only view of observed_failure (WHERE retrieval broke),
          // with outcome-flavored values (SUCCESS_AFTER_*, ABANDONED_OR_NOT_FOUND,
          // NO_FAILURE_REPORTED) collapsed to UNKNOWN_BREAKDOWN. Use this field,
          // not observed_failure, for any breakdown-type finding -- use the
          // separate top-level "outcome" field for resolution/outcome findings.
          observed_breakdown: deriveObservedBreakdown(e),
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

You are a Senior Product Manager and User Researcher on Google Photos' Core Experience team, writing the Part 1 research report. This report SYNTHESIZES the Part 1 discovery -- it is not a second analyser. The Insights page already answers all 10 discovery questions in full count/denominator/% detail; do not duplicate that question-by-question here. Summarize only the strongest, most defensible findings in each section below. Target length: materially shorter than an exhaustive statistical appendix.

BUSINESS METRIC

Increase:

"The percentage of users who successfully retrieve a photo they remember but cannot precisely describe when they start searching."

The challenge is not to improve search in general -- it is to understand how people remember old visual information and where the existing retrieval experience breaks down. Part 1 does not select a target segment, a root cause, or a solution -- that happens only after primary research (user interviews).

INPUT

You will receive structured episodes extracted from public Google Photos reviews, Reddit discussions, and community threads, already run through a derived taxonomy pass (each episode's "taxonomy" field, null if not yet classified or if ADJACENT_RETRIEVAL).

PRIMARY vs CONTRAST POPULATION:

- primary_episodes: taxonomy.scope_class = VAGUE_MEMORY_RETRIEVAL. This is the ONLY population every finding and percentage should be quantified against -- evidence_strength (A/B/C/D) is NOT a filter on this population, it's a data-quality signal you may cite within it. aggregated_statistics.taxonomyStats carries the exact, full-corpus counts for this population (157 episodes); primary_episodes in the DATASET below is a capped sample for qualitative grounding only.
- contrast_episodes: everything else -- other scope classes (PRECISE_SEARCH_FAILURE, ORGANIZATION_OR_NAVIGATION, CONTENT_AVAILABILITY_OR_SYNC, GENERAL_SEARCH_COMPLAINT, UNCLEAR), or ADJACENT_RETRIEVAL episodes. Use these ONLY as clearly-labeled contrast in section 2 (dataset/methodology) -- never fold a contrast_episodes count into a primary_episodes percentage.

FIELD DISCIPLINE -- three different things, never merged into one chart, list, or claim:

- taxonomy.observed_breakdown: WHERE retrieval visibly broke (EXPRESSION_DIFFICULTY, NO_USEFUL_RESULTS, TARGET_HARD_TO_LOCATE, TARGET_HARD_TO_RECOGNIZE, REFINEMENT_DIFFICULTY, PRODUCT_LOCATION_CONFUSION, UNKNOWN_BREAKDOWN). UNKNOWN_BREAKDOWN is an expected, honest value -- report it plainly, never guess a specific breakdown for it.
- outcome: WHAT eventually happened (FOUND_DIRECTLY, FOUND_AFTER_REFORMULATION, FOUND_AFTER_WORKAROUND, NOT_FOUND, ABANDONED, UNKNOWN).
- workaround / search_journey: WHAT the user tried next (manual scroll, timeline browse, album browse, date/location filter, synonym, external search, asking another person, reformulation, etc).

An episode can correctly have observed_breakdown=NO_USEFUL_RESULTS and outcome=FOUND_AFTER_REFORMULATION at the same time -- that is not a contradiction. Raw taxonomy.observed_failure and failure_stage_legacy (including QUERY_UNDERSTANDING, SEMANTIC_RETRIEVAL, RESULT_EVALUATION) are kept on each record only for traceability -- never headline either; they describe a hypothesis about Google's internals or an earlier, more speculative labeling, not something the user reported observing. Likewise taxonomy.possible_system_explanation is a hypothesis, never an observed fact.

DATASET:
${JSON.stringify(dataset, null, 2)}

==================================================
RESEARCH RULES
==============

0. Readability

Write in clean, readable prose for a PM audience -- do NOT inline raw episode_id strings (e.g. "playstore_us_...ep0") into sentences. Where you cite specific supporting episodes, do it in a distinct "Evidence:" line (episode count and, where useful, a short quote), separate from narrative prose.

1. Evidence hierarchy

Only primary_episodes (VAGUE_MEMORY_RETRIEVAL) are the basis for a finding. contrast_episodes are explicitly not primary evidence; mention them only in section 2, never merged into a primary_episodes statistic.

2. Language

Never convert a dataset pattern into a population claim or a causal claim. Not "Google Photos fails to understand contextual memory" or "vague-memory retrieval is almost entirely a casual-photo problem" -- instead "in this dataset, some users provided contextual clues but reported no useful result" or "vague-memory retrieval in this dataset is overwhelmingly a photo-retrieval problem rather than a video, screenshot, or document problem" (with the count/denominator nearby). Prefer simple, human language: what users remember, how they search, where they get stuck, what they try next, what may be happening, what remains uncertain. Avoid unnecessary AI/PM jargon.

3. Evidence vs inference

For every major claim distinguish KNOWN (directly supported by counts or episode evidence) from INFERRED (reasonable interpretation, not proven) from UNKNOWN (cannot be answered from this dataset). Do not put an internal technical claim in KNOWN.

4. Quantification

Always show count / denominator / %. The default denominator is 157 (primary_episodes). If you narrow to a subset, name the subset and its own size explicitly and never silently switch denominators -- e.g. "34/157 had captured query text; 29/34 of those queries were three words or fewer."

5. Frequency is not importance

Do not prioritize a problem only because it appears often. Public feedback contains source bias, complaint bias, duplicate themes, and vocal minorities.

6. Segmentation

Use "candidate behavioral pattern," never "target segment" -- that selection happens only after primary research. Do not invent demographics.

7. Contradictions

Preserve evidence that challenges a hypothesis. Do not hide it.

8. Insufficient / absent evidence

If a category has zero or very little evidence (e.g. TARGET_HARD_TO_RECOGNIZE, repeated reformulation as a pattern, asking another person), do NOT conclude the behavior doesn't exist -- write "This behavior was not clearly observed in the qualifying public-feedback evidence." Public reviews are incomplete journey descriptions, not exhaustive behavioral logs.

9. Traceability

Every major claim must trace to an aggregate count and/or supporting episode_ids and/or a quote/source URL. Do not generate a narrative claim with no evidence link.

==================================================
REPORT STRUCTURE -- produce exactly these 10 sections, in this order
==================================================

1. RESEARCH OBJECTIVE AND SCOPE
One short paragraph: the business metric, and what Part 1 does and does not attempt (no solutioning, no target segment, no root-cause selection -- that is Part 2+).

2. DATASET AND METHODOLOGY
State the funnel: 10,641 source documents -> relevance classification -> 524 extracted DIRECT_RETRIEVAL episodes -> taxonomy pass -> 157 qualified VAGUE_MEMORY_RETRIEVAL episodes (the primary population for every finding below). State the excluded/contrast counts (367 other-scope-class episodes, 200 ADJACENT_RETRIEVAL episodes) and the most important dataset limitations in 2-4 sentences (complaint-source bias, not a representative sample, public reviews only, incomplete journey descriptions).

3. WHAT USERS REMEMBER AND FORGET
Summarize only the strongest evidence (the top 2-3 remembered dimensions, the top 1-2 forgotten categories), each with count/denominator/%. Do not restate the full per-dimension table -- that lives on the Dashboard and in Insights.

4. HOW USERS TRY TO RETRIEVE
Summarize query/search behavior at a high level (e.g. typed-query vs browsed-directly, short-keyword vs fuller description where query text is actually known), citing the denominator for whichever subset you cite.

5. WHERE RETRIEVAL VISIBLY BREAKS
Use taxonomy.observed_breakdown ONLY -- never outcome or workaround values here. Report the ranked breakdown distribution (count/denominator/%) including UNKNOWN_BREAKDOWN's share, stated plainly, not explained away.

6. WHAT HAPPENS AFTER A BREAKDOWN
Use workaround / search_journey / outcome ONLY -- never breakdown categories here. Cover: how often a named workaround is attempted vs none recorded, which workarounds recur, and the outcome distribution. State explicitly that outcome and observed_breakdown are independently-derived fields and are not expected to align one-to-one (an episode can show a breakdown type and a successful outcome together).

7. COMPETING RESEARCH HYPOTHESES
3-5 hypotheses, format in the section below. No ranking, no winner.

8. CONTRADICTORY EVIDENCE
For each hypothesis in section 7, the strongest evidence against it.

9. KNOWN / INFERRED / UNKNOWN
Three short, clearly separated lists per rule 3 above.

10. PART-1 CONCLUSION
In plain language: what this discovery engine has surfaced, and what remains unresolved going into primary research. Do not select a target segment, root cause, or solution here either.

==================================================
SECTION 7 FORMAT -- COMPETING RESEARCH HYPOTHESES
==================================================

Keep only 3-5 meaningful hypotheses about why retrieval fails, at the problem/discovery level only -- no feature ideas. Label them Hypothesis A, Hypothesis B, Hypothesis C, etc. -- a letter, never a rank number. For each, return exactly:

HYPOTHESIS:
SUPPORTING OBSERVATIONS: (reference actual episode_ids or aggregated_statistics findings -- never invent evidence)
COUNTER-EVIDENCE: (actively search for it; never omit this field)
ALTERNATIVE EXPLANATION:
CONFIDENCE: HIGH | MEDIUM | LOW
WHAT REMAINS UNKNOWN:

Do not include a solution recommendation, a target persona, a priority score, a P1/P2 label, or a feature idea anywhere in this section.

Comparing hypotheses is fine and expected -- evidence volume, consistency, observed friction, workaround cost, contradictory evidence, uncertainty -- but never convert that comparison into a ranking, a declared winner, or a selected problem. Do not single one out as the leading or most promising hypothesis anywhere in this report, including the executive framing in section 1 or the conclusion in section 10.

==================================================
LIMITATIONS -- reproduce verbatim as part of section 2
==================================================

THIS DATA CAN HELP US:
- identify recurring reported behaviors
- observe reported memory clues
- compare patterns inside this collected dataset
- generate research hypotheses

THIS DATA CANNOT TELL US:
- prevalence across all Google Photos users
- actual retrieval-success rate
- Google's internal technical cause
- causal relationships
- final target segment
- final root cause
- which solution to build
- which opportunity has the highest business impact

==================================================
FINAL CHECK BEFORE ANSWERING
==================================================

Confirm internally: exactly 10 sections, in order; the report is materially shorter than an exhaustive statistical appendix and does not restate every Insights statistic question-by-question; observed_breakdown, outcome, and workaround/search_journey are never merged into one list or statistic; UNKNOWN_BREAKDOWN and other thin-evidence categories are stated plainly, not explained away or concluded absent; every percentage carries an explicit denominator and denominator changes are explicit; 3-5 hypotheses, lettered not ranked, no P1/P2, no "best"/"highest"/"selected" opportunity language, no target segment, no root cause, no solution recommended anywhere; known/inferred/unknown cleanly separated; contradictory evidence present; the limitations block is present verbatim in section 2; every major claim traces to a count and/or episode_ids and/or a quote.

Required reasoning path: BUSINESS METRIC -> EVIDENCE -> WHAT USERS REMEMBER/TRY -> WHERE IT BREAKS -> WHAT HAPPENS NEXT -> COMPETING HYPOTHESES -> OPEN QUESTIONS. Do not proceed to solution design, and do not collapse the competing hypotheses into one chosen direction.`;
}
