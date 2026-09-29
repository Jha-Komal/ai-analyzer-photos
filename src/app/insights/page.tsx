"use client";

import { Lightbulb, RefreshCw } from "lucide-react";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/shared/Loader";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useInsights, useGenerateInsights } from "@/hooks/useInsights";

function ConfidenceBadge({ value }: { value: "HIGH" | "MEDIUM" | "LOW" }) {
  return <Badge tone={value === "HIGH" ? "positive" : value === "LOW" ? "negative" : "neutral"}>{value} confidence</Badge>;
}

export default function InsightsPage() {
  const { data, isLoading, error, refetch } = useInsights();
  const generate = useGenerateInsights();

  return (
    <>
      <TopNav title="Insights" subtitle="Quick Q&A answers to the discovery questions, grounded in extracted episodes">
        <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
          <RefreshCw className={`h-4 w-4 ${generate.isPending ? "animate-spin" : ""}`} />
          {generate.isPending ? "Generating..." : data && data.length > 0 ? "Regenerate" : "Generate Insights"}
        </Button>
      </TopNav>
      <div className="p-6">
        {generate.isError && (
          <div className="mb-4">
            <ErrorState title="Failed to generate insights" message={(generate.error as Error).message} onRetry={() => generate.mutate()} />
          </div>
        )}
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
                <CardContent className="flex-1 space-y-2">
                  <p className="text-sm leading-relaxed text-muted">{insight.answer}</p>
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
