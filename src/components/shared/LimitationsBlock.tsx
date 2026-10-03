const CAN = [
  "identify recurring reported behaviors",
  "observe reported memory clues",
  "compare patterns inside this collected dataset",
  "generate research hypotheses",
  "decide what interviews should investigate",
];

const CANNOT = [
  "prevalence across all Google Photos users",
  "actual product retrieval-success rate",
  "Google's true internal technical failure",
  "causal relationships",
  "final target segment",
  "final root cause",
  "which solution to build",
  "which opportunity has the highest business impact",
];

export function LimitationsBlock() {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">This data can help us:</h3>
        <ul className="list-disc space-y-1 pl-4 text-sm text-muted">
          {CAN.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">This data cannot tell us:</h3>
        <ul className="list-disc space-y-1 pl-4 text-sm text-muted">
          {CANNOT.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
