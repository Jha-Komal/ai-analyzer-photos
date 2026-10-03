const STAGES = [
  "Loading extracted episodes",
  "Clustering failure patterns",
  "Scoring evidence and confidence",
  "Drafting answers",
  "Finalizing",
];

export function GenerationProgress({ label, progress }: { label: string; progress: number }) {
  const stage = STAGES[Math.min(STAGES.length - 1, Math.floor(progress * STAGES.length))];
  const pct = Math.round(progress * 100);
  return (
    <div className="mb-5 rounded-lg border border-border bg-card p-4" role="status" aria-live="polite">
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>
          {label} &middot; {stage}...
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted-background">
        <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-linear" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">This usually takes a few minutes.</p>
    </div>
  );
}
