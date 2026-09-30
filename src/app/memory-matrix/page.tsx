import { loadEpisodes } from "@/lib/data";
import { computeMemoryMatrix, isDirectRetrieval } from "@/lib/statistics/episodeStats";
import { TopNav } from "@/components/layout/TopNav";

export default async function MemoryMatrixPage() {
  const allEpisodes = await loadEpisodes();
  const episodes = allEpisodes.filter(isDirectRetrieval);
  const matrix = computeMemoryMatrix(episodes);
  const maxFreq = Math.max(1, ...matrix.map((r) => r.frequency));

  return (
    <>
      <TopNav
        title="Memory Matrix"
        subtitle={`What users remember vs. search usage and failure association, calculated from ${episodes.length.toLocaleString()} DIRECT_RETRIEVAL episodes (excludes ${allEpisodes.length - episodes.length} adjacent/backup-sync episodes)`}
      />
      <div className="p-6">
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
      </div>
    </>
  );
}
