import { loadEpisodes } from "@/lib/data";
import { countBy, crossTab } from "@/lib/statistics/episodeStats";
import NavHeader from "@/components/NavHeader";

export default async function FailureAnalysisPage() {
  const episodes = await loadEpisodes();
  const byStage = countBy(episodes, (e) => e.failureStage);
  const total = episodes.length || 1;
  const stages = Object.entries(byStage).sort((a, b) => b[1] - a[1]);

  const byScenario = crossTab(episodes, (e) => e.failureStage, (e) => e.scenario.category);
  const byOutcome = crossTab(episodes, (e) => e.failureStage, (e) => e.outcome);
  const byWorkaround = crossTab(
    episodes,
    (e) => e.failureStage,
    (e) => e.workaround ?? "NONE",
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <NavHeader />
      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
        <div>
          <h1 className="text-xl font-medium" style={{ color: "var(--foreground)" }}>
            Failure Analysis
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Where retrieval breaks, across {episodes.length.toLocaleString()} extracted episodes.
          </p>
        </div>

        <Card title="Failure stage distribution">
          <div className="flex flex-col gap-3">
            {stages.map(([stage, count]) => (
              <div key={stage} className="flex items-center gap-3">
                <span className="w-44 shrink-0 text-sm" style={{ color: "var(--foreground)" }}>
                  {stage}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "var(--background)" }}>
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${(count / total) * 100}%`, background: "var(--series-blue)" }}
                  />
                </div>
                <span className="w-10 text-right text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Failure stage x Scenario">
          <CrossTabTable data={byScenario} rowLabel="Failure stage" />
        </Card>

        <Card title="Failure stage x Outcome">
          <CrossTabTable data={byOutcome} rowLabel="Failure stage" />
        </Card>

        <Card title="Failure stage x Workaround">
          <CrossTabTable data={byWorkaround} rowLabel="Failure stage" />
        </Card>
      </main>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="flex flex-col gap-4 rounded-2xl p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h2 className="text-base font-medium" style={{ color: "var(--foreground)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function CrossTabTable({
  data,
  rowLabel,
}: {
  data: ReturnType<typeof crossTab<string>>;
  rowLabel: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th className="px-3 py-2 font-medium" style={{ color: "var(--text-secondary)" }}>
              {rowLabel}
            </th>
            {data.cols.map((c) => (
              <th key={c} className="px-3 py-2 text-right font-medium" style={{ color: "var(--text-secondary)" }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r} style={{ borderBottom: "1px solid var(--border)" }}>
              <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                {r}
              </td>
              {data.cols.map((c) => (
                <td key={c} className="px-3 py-2 text-right tabular-nums" style={{ color: "var(--foreground)" }}>
                  {data.table[r]?.[c] ?? 0}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
