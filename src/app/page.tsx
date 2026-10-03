import { FileText, MessageSquareText, Search, AlertTriangle, Target, CircleSlash } from "lucide-react";
import { TopNav } from "@/components/layout/TopNav";
import { MetricCard } from "@/components/shared/MetricCard";
import { Card, CardContent } from "@/components/ui/card";
import { DistributionBarChart } from "@/components/charts/DistributionBarChart";
import { RelevancePieChart } from "@/components/charts/RelevancePieChart";
import { EmptyState } from "@/components/shared/EmptyState";
import { loadDocuments, loadRelevant, loadEpisodesWithTaxonomy } from "@/lib/data";
import { computeDiscoveryStats } from "@/lib/aggregation";

export default async function DashboardPage() {
  const [documents, relevant, allEpisodes] = await Promise.all([loadDocuments(), loadRelevant(), loadEpisodesWithTaxonomy()]);
  // computeDiscoveryStats splits DIRECT_RETRIEVAL vs ADJACENT_RETRIEVAL
  // internally -- scenario/outcome/memory breakdowns are retrieval-specific
  // and never include adjacent (backup/sync) episodes. Within
  // DIRECT_RETRIEVAL, taxonomyStats further isolates the primary analysis
  // population (scopeClass=VAGUE_MEMORY_RETRIEVAL) from everything else.
  const stats = computeDiscoveryStats(documents, relevant, allEpisodes);
  const adjacentEpisodeCount = stats.adjacentEpisodeCount;

  const directCount = stats.relevanceClassDistribution.DIRECT_RETRIEVAL ?? 0;
  const qualifiedVagueMemoryCount = stats.taxonomyStats.primaryAnalysisCount;
  const excludedContrastCount = directCount - qualifiedVagueMemoryCount;

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
              <MetricCard label="Legacy retrieval episodes" value={directCount.toLocaleString()} icon={MessageSquareText} />
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
                value={(stats.relevanceClassDistribution.ADJACENT_RETRIEVAL ?? 0).toLocaleString()}
                icon={AlertTriangle}
                tone="negative"
              />
            </div>
            <p className="text-xs text-muted">
              {directCount.toLocaleString()} legacy DIRECT_RETRIEVAL episodes were run through a taxonomy
              classifier; {qualifiedVagueMemoryCount.toLocaleString()} qualify as VAGUE_MEMORY_RETRIEVAL and are
              the primary analysis population for every finding below, in Insights, and in the Research Report.
              The other {excludedContrastCount.toLocaleString()} (precise-search-failure, organization/navigation,
              content-availability/sync, general complaint, or unclear) plus {adjacentEpisodeCount.toLocaleString()}{" "}
              ADJACENT_RETRIEVAL episodes are kept only as labeled contrast data, never folded into a
              retrieval-failure statistic.
            </p>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <RelevancePieChart byClassification={stats.relevanceClassDistribution} />
              <DistributionBarChart title="Scenario Distribution" data={stats.scenarioDistribution} color="var(--series-orange)" />
              <DistributionBarChart
                title="Observed Failure Distribution (qualified vague-memory episodes)"
                data={stats.taxonomyStats.observedFailureDistribution}
                color="var(--negative)"
              />
              <DistributionBarChart title="Outcome Distribution" data={stats.outcomeDistribution} color="var(--positive)" />
              <DistributionBarChart title="Memory Dimensions Remembered" data={stats.memoryDimensionFrequency} color="var(--series-yellow)" />
            </div>

            <details className="rounded-2xl border border-border bg-card p-4">
              <summary className="cursor-pointer text-sm font-medium text-muted">
                Legacy failure stage (debug/traceability only, {directCount.toLocaleString()} DIRECT_RETRIEVAL
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
