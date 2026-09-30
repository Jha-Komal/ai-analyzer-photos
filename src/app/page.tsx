import { FileText, MessageSquareText, Search, AlertTriangle, Target } from "lucide-react";
import { TopNav } from "@/components/layout/TopNav";
import { MetricCard } from "@/components/shared/MetricCard";
import { Card, CardContent } from "@/components/ui/card";
import { DistributionBarChart } from "@/components/charts/DistributionBarChart";
import { RelevancePieChart } from "@/components/charts/RelevancePieChart";
import { EmptyState } from "@/components/shared/EmptyState";
import { loadDocuments, loadRelevant, loadEpisodes } from "@/lib/data";
import { computeDiscoveryStats } from "@/lib/aggregation";
import { SOURCE_LABELS } from "@/lib/constants";

export default async function DashboardPage() {
  const [documents, relevant, allEpisodes] = await Promise.all([loadDocuments(), loadRelevant(), loadEpisodes()]);
  // computeDiscoveryStats splits DIRECT_RETRIEVAL vs ADJACENT_RETRIEVAL
  // internally -- scenario/failure/outcome/memory breakdowns are
  // retrieval-specific and never include adjacent (backup/sync) episodes.
  const stats = computeDiscoveryStats(documents, relevant, allEpisodes);
  const adjacentEpisodeCount = stats.adjacentEpisodeCount;

  const directCount = stats.relevanceClassDistribution.DIRECT_RETRIEVAL ?? 0;

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
              <MetricCard label="Direct retrieval" value={directCount.toLocaleString()} icon={Search} tone="positive" />
              <MetricCard
                label="Adjacent (not retrieval)"
                value={(stats.relevanceClassDistribution.ADJACENT_RETRIEVAL ?? 0).toLocaleString()}
                icon={AlertTriangle}
                tone="negative"
              />
              <MetricCard
                label="Retrieval episodes"
                value={stats.totalEpisodes.toLocaleString()}
                icon={MessageSquareText}
              />
              <MetricCard
                label="+ adjacent episodes (contrast)"
                value={adjacentEpisodeCount.toLocaleString()}
                icon={AlertTriangle}
              />
            </div>
            <p className="text-xs text-muted">
              {stats.totalEpisodes.toLocaleString()} DIRECT_RETRIEVAL + {adjacentEpisodeCount.toLocaleString()}{" "}
              ADJACENT_RETRIEVAL = {allEpisodes.length.toLocaleString()} total episodes feed Insights and the
              Research Report (each clearly tagged by relevance class). Memory Matrix, Failure Analysis, and the
              charts below use DIRECT_RETRIEVAL only, since adjacent episodes describe backup/sync/deletion
              problems, not retrieval failures.
            </p>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <RelevancePieChart byClassification={stats.relevanceClassDistribution} />
              <DistributionBarChart
                title="Source Distribution"
                data={Object.fromEntries(Object.entries(stats.sourceDistribution).map(([k, v]) => [SOURCE_LABELS[k] ?? k, v]))}
              />
              <DistributionBarChart title="Scenario Distribution" data={stats.scenarioDistribution} color="var(--series-orange)" />
              <DistributionBarChart title="Failure Stage Distribution" data={stats.failureStageDistribution} color="var(--negative)" />
              <DistributionBarChart title="Outcome Distribution" data={stats.outcomeDistribution} color="var(--positive)" />
              <DistributionBarChart title="Memory Dimensions Remembered" data={stats.memoryDimensionFrequency} color="var(--series-yellow)" />
            </div>

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
                (ranked, evidence-backed opportunity hypotheses) -- generate those once enough episodes are
                extracted.
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
