import { FileText, MessageSquareText, Search, AlertTriangle, Target, CircleSlash } from "lucide-react";
import { TopNav } from "@/components/layout/TopNav";
import { MetricCard } from "@/components/shared/MetricCard";
import { Card, CardContent } from "@/components/ui/card";
import { DistributionBarChart } from "@/components/charts/DistributionBarChart";
import { RelevancePieChart } from "@/components/charts/RelevancePieChart";
import { EmptyState } from "@/components/shared/EmptyState";
import { loadDocuments, loadRelevant, loadEpisodesWithTaxonomy } from "@/lib/data";
import { computeDiscoveryStats } from "@/lib/aggregation";
import { computeMemoryDimensionFrequency, countBy, deriveObservedBreakdown } from "@/lib/statistics/episodeStats";

export default async function DashboardPage() {
  const [documents, relevant, allEpisodes] = await Promise.all([loadDocuments(), loadRelevant(), loadEpisodesWithTaxonomy()]);
  // computeDiscoveryStats splits DIRECT_RETRIEVAL vs ADJACENT_RETRIEVAL
  // internally -- scenario/outcome/memory breakdowns inside `stats` are
  // retrieval-specific but still span the full 524-episode legacy
  // population. They stay that way deliberately (used only in the collapsed
  // legacy debug section below, and by the research report's data-quality
  // step) -- the headline charts on this page must NOT use them.
  const stats = computeDiscoveryStats(documents, relevant, allEpisodes);
  // extractedEpisodeCount/adjacentEpisodeCount are EXTRACTED-EPISODE counts
  // (episodes.json), not document-level relevance-classification counts
  // (relevant.json) -- those two are different units (e.g. 2,779 documents
  // were tagged DIRECT_RETRIEVAL before extraction, but only 524 of them
  // actually yielded an extracted episode). Mixing the two previously
  // produced a meaningless "excluded/contrast" figure; relevanceClassDistribution
  // is still used below, but only in the explicitly document-level RelevancePieChart.
  const adjacentEpisodeCount = stats.adjacentEpisodeCount;
  const extractedEpisodeCount = stats.totalEpisodes;

  // The primary analysis population, computed directly here (not reused from
  // `stats`) so every headline chart on this page is provably scoped to
  // exactly these 157 episodes, independent of any other consumer of
  // computeDiscoveryStats (Insights, Research Report, which keep their own
  // copy of this same filter).
  const primaryEpisodes = allEpisodes.filter((e) => e.taxonomy?.scopeClass === "VAGUE_MEMORY_RETRIEVAL");
  const qualifiedVagueMemoryCount = primaryEpisodes.length;
  const excludedContrastCount = extractedEpisodeCount - qualifiedVagueMemoryCount;

  const primaryScenarioDistribution = countBy(primaryEpisodes, (e) => e.scenario.category);
  const primaryOutcomeDistribution = countBy(primaryEpisodes, (e) => e.outcome);
  const primaryMemoryDimensionFrequency = computeMemoryDimensionFrequency(primaryEpisodes);
  // Breakdown (WHERE retrieval broke) is kept strictly separate from Outcome
  // (WHAT eventually happened) -- deriveObservedBreakdown collapses the
  // outcome-flavored taxonomy.observedFailure values (SUCCESS_AFTER_*,
  // ABANDONED_OR_NOT_FOUND, NO_FAILURE_REPORTED) to UNKNOWN_BREAKDOWN rather
  // than double-counting them here AND in Outcome Distribution above.
  const primaryObservedBreakdownDistribution = countBy(primaryEpisodes, deriveObservedBreakdown);

  return (
    <>
      <TopNav title="Dashboard" subtitle="Core Experience -- Google Photos discovery engine (Part 1)" />
      <div className="space-y-6 p-6">
        <Card className="border-primary/30 bg-primary-light">
          <CardContent className="flex items-start gap-3 pt-5">
            <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">
                Business metric: increase the % of users who successfully retrieve a photo they remember but
                cannot precisely describe when they start searching.
              </p>
              <p className="text-sm text-muted">
                The challenge is not to improve search in general. This engine exists to understand{" "}
                <em>how people remember old visual information</em>, {" "}
                <em>where the existing retrieval experience breaks down</em>, and to surface{" "}
                <em>an opportunity that can meaningfully improve successful retrieval</em> -- grounded in
                evidence from real users, not assumptions.
              </p>
            </div>
          </CardContent>
        </Card>

        {stats.totalDocuments === 0 ? (
          <EmptyState
            title="No documents yet"
            description="Run the scrapers in scripts/scrape/ to populate data/raw/documents.json."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <MetricCard label="Documents scanned" value={stats.totalDocuments.toLocaleString()} icon={FileText} />
              <MetricCard label="Extracted retrieval episodes" value={extractedEpisodeCount.toLocaleString()} icon={MessageSquareText} />
              <MetricCard
                label="Qualified vague-memory episodes"
                value={qualifiedVagueMemoryCount.toLocaleString()}
                icon={Search}
                tone="positive"
              />
              <MetricCard
                label="Excluded/contrast episodes"
                value={excludedContrastCount.toLocaleString()}
                icon={CircleSlash}
              />
              <MetricCard
                label="Adjacent (backup/sync, not retrieval)"
                value={adjacentEpisodeCount.toLocaleString()}
                icon={AlertTriangle}
                tone="negative"
              />
            </div>
            <p className="text-xs text-muted">
              {extractedEpisodeCount.toLocaleString()} extracted DIRECT_RETRIEVAL episodes were run through a taxonomy
              classifier; {qualifiedVagueMemoryCount.toLocaleString()} qualify as VAGUE_MEMORY_RETRIEVAL and are
              the primary analysis population for every finding below, in Insights, and in the Research Report.
              The other {excludedContrastCount.toLocaleString()} (precise-search-failure, organization/navigation,
              content-availability/sync, general complaint, or unclear) plus {adjacentEpisodeCount.toLocaleString()}{" "}
              ADJACENT_RETRIEVAL episodes are kept only as labeled contrast data, never folded into a
              retrieval-failure statistic.
            </p>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <RelevancePieChart byClassification={stats.relevanceClassDistribution} />
              <DistributionBarChart
                title={`Scenario Distribution (${qualifiedVagueMemoryCount} qualified vague-memory episodes)`}
                data={primaryScenarioDistribution}
                color="var(--series-orange)"
                limit={20}
                height="h-96"
              />
              <DistributionBarChart
                title={`Observed Retrieval Breakdown (${qualifiedVagueMemoryCount} qualified vague-memory episodes) -- where retrieval broke, not what eventually happened`}
                data={primaryObservedBreakdownDistribution}
                color="var(--negative)"
                height="h-80"
              />
              <DistributionBarChart
                title={`Outcome Distribution (${qualifiedVagueMemoryCount} qualified vague-memory episodes)`}
                data={primaryOutcomeDistribution}
                color="var(--positive)"
              />
              <DistributionBarChart
                title={`Memory Dimensions Remembered (${qualifiedVagueMemoryCount} qualified vague-memory episodes)`}
                data={primaryMemoryDimensionFrequency}
                color="var(--series-yellow)"
                height="h-80"
              />
            </div>

            <details className="rounded-2xl border border-border bg-card p-4">
              <summary className="cursor-pointer text-sm font-medium text-muted">
                Legacy failure stage (debug/traceability only, {extractedEpisodeCount.toLocaleString()} DIRECT_RETRIEVAL
                episodes, not the headline metric)
              </summary>
              <p className="mt-3 text-xs text-muted">
                Observed failure stages above describe what users reported happening. Legacy failure stage
                (including QUERY_UNDERSTANDING, SEMANTIC_RETRIEVAL, RESULT_EVALUATION) describes an earlier,
                more speculative labeling of Google&rsquo;s internal mechanism and is not proven fact.
              </p>
              <div className="mt-3">
                <DistributionBarChart title="Failure Stage Distribution (legacy)" data={stats.failureStageDistribution} color="var(--muted)" />
              </div>
            </details>

            <Card>
              <CardContent className="pt-5 text-sm text-muted">
                These charts describe <em>what happened</em>. The evidence-backed answer to <em>why it happens
                and where the opportunity is</em> lives in{" "}
                <a href="/insights" className="font-medium text-primary">
                  Insights
                </a>{" "}
                (the discovery questions) and the{" "}
                <a href="/research-report" className="font-medium text-primary">
                  Research Report
                </a>{" "}
                (competing research hypotheses, not ranked -- no target segment or solution is chosen yet) --
                generate those once enough episodes are extracted.
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
