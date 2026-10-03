"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { Loader } from "@/components/shared/Loader";
import { DescribeStep } from "@/components/photo-finder/DescribeStep";
import { ResultsStep } from "@/components/photo-finder/ResultsStep";
import { RefinePanel } from "@/components/photo-finder/RefinePanel";
import { FoundStep } from "@/components/photo-finder/FoundStep";
import { usePhotoFinder } from "@/hooks/usePhotoFinder";
import { apiFetch } from "@/lib/api-client";

type TaskInfo = { id: string; title: string; narrative: string };

function PhotoFinder() {
  const params = useSearchParams();
  const testerId = params.get("tester") ?? undefined;
  const taskId = params.get("task") ?? undefined;
  const ctx = useMemo(() => ({ testerId, taskId }), [testerId, taskId]);
  const finder = usePhotoFinder(ctx);

  const [task, setTask] = useState<TaskInfo | null>(null);
  useEffect(() => {
    if (!taskId) return;
    apiFetch<TaskInfo[]>("/api/photo-finder/task").then((all) => setTask(all.find((t) => t.id === taskId) ?? null)).catch(() => {});
  }, [taskId]);

  const { stage, session } = finder;
  return (
    <div className="px-6 pb-10">
      {finder.error && stage === "describe" && <p className="mx-auto mt-6 max-w-2xl rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">{finder.error}</p>}
      {stage === "describe" && <DescribeStep busy={finder.busy === "searching"} onSubmit={finder.start} task={task} />}
      {stage === "results" && session && (
        <ResultsStep
          clues={session.clues}
          candidates={finder.candidates}
          busy={finder.busy}
          degraded={finder.degraded}
          onFound={finder.markFound}
          onClose={finder.openAnchor}
          onReject={finder.reject}
          onRemoveClue={finder.removeClue}
          onRestart={finder.reset}
        />
      )}
      {stage === "refine" && finder.anchor && <RefinePanel anchor={finder.anchor} busy={finder.busy === "narrowing"} error={finder.error} onSubmit={finder.submitRefinement} onCancel={finder.cancelRefine} />}
      {stage === "found" && finder.found && session && <FoundStep photo={finder.found} session={session} stats={finder.finalStats} onDone={finder.reset} onAgain={finder.reset} />}
    </div>
  );
}

export default function PhotoFinderPage() {
  return (
    <>
      <TopNav title="Photo Finder" subtitle="Describe a photo you half remember, then refine from a close one" />
      <Suspense fallback={<div className="flex justify-center py-24"><Loader text="Loading…" /></div>}>
        <PhotoFinder />
      </Suspense>
    </>
  );
}
