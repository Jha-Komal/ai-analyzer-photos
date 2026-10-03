"use client";

import { Lightbulb, RefreshCw } from "lucide-react";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/shared/Loader";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { GenerationProgress } from "@/components/shared/GenerationProgress";
import { LimitationsBlock } from "@/components/shared/LimitationsBlock";
import { useInsights } from "@/hooks/useInsights";
import { useSimulatedGeneration } from "@/hooks/useSimulatedGeneration";

function ConfidenceBadge({ value }: { value: "HIGH" | "MEDIUM" | "LOW" }) {
  return <Badge tone={value === "HIGH" ? "positive" : value === "LOW" ? "negative" : "neutral"}>{value} confidence</Badge>;
}

export default function InsightsPage() {
  const { data, isLoading, error, refetch } = useInsights();
  const generate = useSimulatedGeneration();

  return (
    <>
      <TopNav title="Insights" subtitle="Quick Q&A answers to the discovery questions, grounded in extracted episodes">
        <Button onClick={generate.start} disabled={generate.isRunning}>
          <RefreshCw className={`h-4 w-4 ${generate.isRunning ? "animate-spin" : ""}`} />
          {generate.isRunning ? "Generating..." : data && data.length > 0 ? "Regenerate" : "Generate Insights"}
        </Button>
      </TopNav>
      <div className="flex flex-col gap-5 p-6">
        <LimitationsBlock />
        {generate.isRunning && <GenerationProgress label="Regenerating insights" progress={generate.progress} />}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader text="Loading insights..." />
          </div>
        ) : error ? (
          <ErrorState title="Failed to load insights" message={(error as Error).message} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="No insights yet"
            description="Click Generate Insights above -- it reuses the already-extracted episodes, no need to re-run relevance classification or episode extraction."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {data.map((insight) => (
              <Card key={insight.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <h3 className="text-sm font-semibold leading-snug text-foreground">{insight.question}</h3>
                    </div>
                    <ConfidenceBadge value={insight.confidence} />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Observation</p>
                    <p className="text-sm leading-relaxed text-muted">{insight.observation}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Interpretation</p>
                    <p className="text-sm leading-relaxed text-muted">{insight.interpretation}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Hypothesis</p>
                    <p className="text-sm leading-relaxed text-muted">{insight.hypothesis}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Limitation</p>
                    <p className="text-sm leading-relaxed text-muted">{insight.limitation}</p>
                  </div>
                  <p className="text-xs text-muted">
                    Supported by {insight.evidenceCount} episode{insight.evidenceCount === 1 ? "" : "s"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
