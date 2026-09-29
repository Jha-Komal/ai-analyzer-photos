import { loadEpisodes } from "@/lib/data";
import { computeMemoryMatrix } from "@/lib/statistics/episodeStats";
import NavHeader from "@/components/NavHeader";

export default async function MemoryMatrixPage() {
  const episodes = await loadEpisodes();
  const matrix = computeMemoryMatrix(episodes);
  const maxFreq = Math.max(1, ...matrix.map((r) => r.frequency));

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <NavHeader />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="text-xl font-medium" style={{ color: "var(--foreground)" }}>
            Memory Matrix
          </h1>
          <p className="max-w-2xl text-sm" style={{ color: "var(--text-secondary)" }}>
            What users remember, and how often that dimension co-occurs with an active search step or a
            non-trivial failure stage. Calculated directly from {episodes.length.toLocaleString()} extracted
            episodes -- no numbers here are hard-coded.
          </p>
        </div>

        <div
          className="overflow-x-auto rounded-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Memory dimension", "Frequency", "Search usage", "Failure association"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.dimension} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-3 capitalize" style={{ color: "var(--foreground)" }}>
                    {row.dimension.replace(/([A-Z])/g, " $1")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full" style={{ background: "var(--background)" }}>
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${(row.frequency / maxFreq) * 100}%`, background: "var(--series-blue)" }}
                        />
                      </div>
                      <span className="tabular-nums" style={{ color: "var(--foreground)" }}>
                        {row.frequency}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: "var(--foreground)" }}>
                    {row.searchUsage}%
                  </td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: "var(--foreground)" }}>
                    {row.failureAssociation}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
