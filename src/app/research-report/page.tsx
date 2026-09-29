"use client";

import { FileText, RefreshCw } from "lucide-react";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/shared/Loader";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useResearchReport, useGenerateResearchReport } from "@/hooks/useResearchReport";

const SEPARATOR_RE = /^=+$/;
const ALL_CAPS_HEADING_RE = /^[A-Z0-9][A-Z0-9\s×x\-.,'/&]*[A-Z0-9.]$/;
const NUMBERED_HEADING_RE = /^\d+\.\s+[A-Z]/;

function ReportBody({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: { type: "h2" | "h3" | "p" | "blank"; text: string }[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (SEPARATOR_RE.test(line.trim())) continue;
    if (line.trim() === "") {
      blocks.push({ type: "blank", text: "" });
      continue;
    }
    const trimmed = line.trim();
    if (NUMBERED_HEADING_RE.test(trimmed) && trimmed.length < 80) {
      blocks.push({ type: "h2", text: trimmed });
    } else if (ALL_CAPS_HEADING_RE.test(trimmed) && trimmed.length < 80 && trimmed.length > 2) {
      blocks.push({ type: "h3", text: trimmed });
    } else {
      blocks.push({ type: "p", text: line });
    }
  }

  return (
    <div className="space-y-1">
      {blocks.map((b, i) => {
        if (b.type === "blank") return <div key={i} className="h-2" />;
        if (b.type === "h2")
          return (
            <h2 key={i} className="mt-6 border-t border-border pt-4 text-base font-bold text-foreground first:mt-0 first:border-0 first:pt-0">
              {b.text}
            </h2>
          );
        if (b.type === "h3")
          return (
            <h3 key={i} className="mt-3 text-sm font-semibold uppercase tracking-wide text-primary">
              {b.text}
            </h3>
          );
        return (
          <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {b.text}
          </p>
        );
      })}
    </div>
  );
}

export default function ResearchReportPage() {
  const { data: report, isLoading, error, refetch } = useResearchReport();
  const generate = useGenerateResearchReport();

  return (
    <>
      <TopNav
        title="Research Report"
        subtitle="Evidence synthesis: data quality, discovery questions, failure-stage decomposition, ranked opportunity hypotheses"
      >
        <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
          <RefreshCw className={`h-4 w-4 ${generate.isPending ? "animate-spin" : ""}`} />
          {generate.isPending ? "Generating..." : report ? "Regenerate" : "Generate Report"}
        </Button>
      </TopNav>
      <div className="p-6">
        {generate.isError && (
          <div className="mb-4">
            <ErrorState title="Failed to generate report" message={(generate.error as Error).message} onRetry={() => generate.mutate()} />
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader text="Loading research report..." />
          </div>
        ) : error ? (
          <ErrorState title="Failed to load research report" message={(error as Error).message} onRetry={() => refetch()} />
        ) : !report ? (
          <EmptyState
            title="No research report yet"
            description="Click Generate Report above -- it reuses the already-extracted episodes, no need to re-run the full pipeline."
          />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-4 text-xs text-muted">
                <FileText className="h-4 w-4" />
                Generated {new Date(report.generatedAt).toLocaleString()} &middot; {report.episodeCount.toLocaleString()} episodes
                across {report.documentCount.toLocaleString()} documents
              </div>
              <ReportBody content={report.content} />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
