import type { DiscoveryStats } from "../aggregation";
import type { RetrievalEpisode } from "@/types/episode";
import { DISCOVERY_QUESTIONS } from "../constants";

function toInputRecord(e: RetrievalEpisode) {
  return {
    episode_id: e.id,
    source_document_id: e.sourceDocumentId,
    scenario: e.scenario.category,
    scenario_description: e.scenario.description,
    target_type: e.target.type,
    remembered: Object.fromEntries(Object.entries(e.remembered).filter(([, v]) => v.length > 0)),
    forgotten: e.forgotten,
    search_journey: e.searchJourney.map((s) => ({ action: s.action, query: s.query })),
    outcome: e.outcome,
    workaround: e.workaround,
    failure_stage: e.failureStage,
    evidence_quote: e.evidence.directQuote,
    confidence: e.confidence,
  };
}

export function buildResearchReportPrompt(stats: DiscoveryStats, episodes: RetrievalEpisode[]): string {
  const dataset = {
    aggregated_statistics: stats,
    sample_episodes: episodes.map(toInputRecord),
    sample_episode_count: episodes.length,
    note: "aggregated_statistics is exact and complete over the FULL analyzed corpus (all documents/episodes processed so far, not just the sample below) -- use it for quantification. sample_episodes is a representative subset for qualitative grounding, evidence quotes, and pattern-finding, not the full corpus.",
  };

  return `ROLE

You are a Senior Product Manager and User Researcher on Google Photos' Core Experience team.

BUSINESS METRIC

Increase:

"The percentage of users who successfully retrieve a photo they remember but cannot precisely describe when they start searching."

The challenge is not to improve search in general -- it is to understand how people remember old visual information, where the existing retrieval experience breaks down, and identify an opportunity that can meaningfully improve successful retrieval.

INPUT

You will receive structured retrieval episodes extracted from public Google Photos reviews, Reddit discussions, and community threads. Each episode is one real user's attempt to retrieve a specific remembered photo/video. Every episode already passed a relevance filter (DIRECT_RETRIEVAL: the user was actively trying to find a visual item), so ADJACENT_RETRIEVAL/NOT_RELEVANT/UNCERTAIN documents are excluded from the episode set but still counted in aggregated_statistics.relevanceClassDistribution for data-quality reporting.

DATASET:
${JSON.stringify(dataset, null, 2)}

GOAL

Use the dataset to:

1. understand how people remember and forget visual information
2. identify where retrieval breaks down (memory expression, query formulation, system understanding, result surfacing, result evaluation, or recovery)
3. identify behavioral segments (by scenario, by remembered-dimension pattern)
4. identify recurring decision/failure patterns
5. rank opportunity hypotheses
6. identify what must be validated in 5-6 user interviews

DO NOT propose features, solutions, MVPs, or AI use cases.

==================================================
RESEARCH RULES
==============

0. Readability

Write narrative sections (executive summary, prose paragraphs) in clean, readable text for a PM audience -- do NOT inline raw episode_id strings (e.g. "playstore_us_...ep0") into sentences. Where you need to cite specific supporting episodes, do it in a distinct "Evidence:" line/field (episode count and, where useful, a short quote), separate from the narrative prose itself.

1. Evidence hierarchy

All episodes in sample_episodes already passed DIRECT_RETRIEVAL classification -- treat them as direct evidence of retrieval behavior. When citing aggregated_statistics.relevanceClassDistribution for data-quality reporting, be clear that ADJACENT_RETRIEVAL (backup/sync/deletion problems) is explicitly NOT retrieval-failure evidence per the spec's scope, and NOT_RELEVANT/UNCERTAIN are excluded from findings entirely.

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
* episodes by source, by scenario, by target type

Identify: overrepresented sources, missing/weak fields, important evidence gaps, areas relying heavily on inference.

Then classify the corpus: A. STRONG ENOUGH FOR DIRECTIONAL FINDINGS / B. HYPOTHESIS-GENERATING ONLY / C. INSUFFICIENT. Explain in 2-4 sentences.

==================================================
STEP 2 -- ANSWER THE DISCOVERY QUESTIONS
=========================================

${DISCOVERY_QUESTIONS.map((q, i) => `Q${i + 1}. ${q}`).join("\n\n")}

For each question report: the pattern found, count/denominator/%, evidence episode_ids, affected scenarios, confidence (HIGH/MEDIUM/LOW). If the dataset can't answer it, say "Insufficient evidence in the current dataset."

==================================================
STEP 3 -- FAILURE-STAGE DECOMPOSITION
======================================

Using aggregated_statistics.failureStageDistribution and the sample episodes, decompose "successful retrieval" into the chain:

MEMORY_EXPRESSION (can the user express what they remember?)
-> QUERY_FORMULATION (can they turn it into a query?)
-> QUERY_UNDERSTANDING (does Google Photos understand the clues?)
-> SEMANTIC_RETRIEVAL (do relevant results surface?)
-> RESULT_EVALUATION (can the user recognize the right result?)
-> RECOVERY (can the user recover after an initial failure?)

For each stage report: count/denominator/%, representative evidence, which scenarios/segments it concentrates in, confidence.

==================================================
STEP 4 -- RECURRING BEHAVIORAL CHAINS
======================================

Find repeated sequences (e.g. SEARCH -> REFORMULATE -> MANUAL_SCROLL -> GIVE_UP). Derive the actual chains from search_journey data. For each: chain, supporting episode count, affected scenarios, typical failure stage, typical workaround, typical outcome, confidence.

==================================================
STEP 5 -- SCENARIO x FAILURE-STAGE MATRIX
===========================================

Rows: scenario categories. Columns: failure stages. For each relevant intersection rate EVIDENCE_VOLUME, WORKAROUND_FRICTION, and EVIDENCE_CONFIDENCE as HIGH/MEDIUM/LOW/INSUFFICIENT.

==================================================
STEP 6 -- RANKED OPPORTUNITY HYPOTHESES (TOP 3-5)
====================================================

An opportunity is a user outcome, NOT a feature. Format:

"Help [segment/scenario] successfully retrieve [target type] when they remember [what] but have forgotten [what], because [problem] currently causes [observable friction/failure]."

For each, return:

OPPORTUNITY:
TARGET SEGMENT/SCENARIO:
WHAT USERS REMEMBER:
WHAT USERS HAVE FORGOTTEN:
PRIMARY FAILURE STAGE:
CURRENT WORKAROUND:
EVIDENCE: episode count / denominator / %, episode_ids, sources
WORKAROUND FRICTION: HIGH/MEDIUM/LOW
WHY IT MATTERS TO SUCCESSFUL RETRIEVAL:
KNOWN: / INFERRED: / UNKNOWN:
EVIDENCE CONFIDENCE:
PRIORITY: P1 (high potential) / P2 (medium) / P3 (lower/uncertain) -- do not calculate a fake numeric score, reason qualitatively from evidence volume x failure severity x addressability
PRIMARY RESEARCH QUESTION: what must 5-6 user interviews validate before this is a confirmed root problem?

==================================================
STEP 7 -- CHALLENGE THE LEADING HYPOTHESES
=============================================

For each major opportunity, actively search for contradictory evidence. Report: contradiction, hypothesis challenged, whether it suggests a different segment, impact on confidence. Do not hide contradictions.

==================================================
STEP 8 -- RESEARCH STATUS
==========================

Three sections, do not mix them: WHAT THE DATA SUPPORTS / WHAT THE DATA SUGGESTS / WHAT THE DATA CANNOT ANSWER.

==================================================
STEP 9 -- PRIMARY RESEARCH GAPS -> INTERVIEW QUESTIONS
=========================================================

Identify what secondary research (public reviews/discussions) cannot reliably establish, e.g.: exactly what triggered the search, how memory degraded over time, what the user tried before giving up, what would have resolved it, whether they eventually found it another way, how they'd describe the item unprompted. Convert the most important gaps into concrete questions for 5-6 user interviews.

==================================================
STEP 10 -- WHAT SHOULD WE VALIDATE NEXT?
===========================================

Recommend 1-3 scenario/segment + failure-stage combinations for primary research. For each: segment/scenario, hypothesized root problem, why it may affect the retrieval-success metric, supporting evidence, missing evidence, what must be validated in interviews. Do not choose a solution.

==================================================
FINAL OUTPUT
============

Return sections in this order:
1. Executive summary
2. Dataset quality and limitations
3. Answers to the discovery questions
4. Failure-stage decomposition
5. Recurring behavioral chains
6. Scenario x failure-stage matrix
7. Ranked opportunity hypotheses
8. Contradictory evidence
9. Known vs inferred vs unknown
10. Primary research gaps -> interview questions
11. Recommended segments/problems to validate

FINAL CHECK BEFORE ANSWERING -- confirm internally that: no feature has been proposed; all percentages include denominators; behavioral segments are evidence-based, not invented demographics; contradictory evidence is included; hypotheses are not presented as validated problems.

Required reasoning path: BUSINESS METRIC -> EVIDENCE -> BEHAVIOR -> FAILURE STAGE -> OPPORTUNITY -> PRIMARY RESEARCH. Do not proceed to solution design.`;
}
