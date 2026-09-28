import { readFile } from "node:fs/promises";
import path from "node:path";
import type { RawDocument } from "@/types/document";
import { computeDocumentStats } from "@/lib/statistics/documentStats";

async function loadDocuments(): Promise<RawDocument[]> {
  try {
    const filePath = path.join(process.cwd(), "data", "raw", "documents.json");
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit",
  google_photos_community: "Google Photos Community",
  play_store: "Google Play Store",
  app_store: "Apple App Store",
};

export default async function Home() {
  const documents = await loadDocuments();
  const stats = computeDocumentStats(documents);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            PhotoRecall Intelligence
          </h1>
          <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
            AI discovery engine for Google Photos retrieval research. Raw conversations captured from public
            sources are shown below; the extraction/synthesis pipeline (relevance classification, retrieval
            episode extraction, pattern discovery) runs on top of this dataset once{" "}
            <code className="rounded bg-black/[.06] px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/[.08]">
              OPENAI_API_KEY
            </code>{" "}
            is configured.
          </p>
        </header>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Documents analyzed" value={stats.total} />
          {Object.entries(SOURCE_LABELS).map(([key, label]) => (
            <StatCard key={key} label={label} value={stats.bySource[key] ?? 0} />
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-black dark:text-zinc-50">Source distribution</h2>
          <div className="flex flex-col gap-2">
            {Object.entries(stats.bySource).length === 0 && (
              <p className="text-sm text-zinc-500">
                No documents yet. Run <code className="font-mono">npm run scrape:all</code> to populate{" "}
                <code className="font-mono">data/raw/documents.json</code>.
              </p>
            )}
            {Object.entries(stats.bySource).map(([source, count]) => (
              <div key={source} className="flex items-center gap-3">
                <span className="w-56 text-sm text-zinc-600 dark:text-zinc-400">
                  {SOURCE_LABELS[source] ?? source}
                </span>
                <div className="h-2 flex-1 rounded bg-black/[.06] dark:bg-white/[.08]">
                  <div
                    className="h-2 rounded bg-blue-500"
                    style={{ width: stats.total ? `${(count / stats.total) * 100}%` : "0%" }}
                  />
                </div>
                <span className="w-10 text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-black dark:text-zinc-50">Source type distribution</h2>
          <div className="flex flex-col gap-2">
            {Object.entries(stats.bySourceType).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="w-56 text-sm text-zinc-600 dark:text-zinc-400 capitalize">{type}</span>
                <div className="h-2 flex-1 rounded bg-black/[.06] dark:bg-white/[.08]">
                  <div
                    className="h-2 rounded bg-emerald-500"
                    style={{ width: stats.total ? `${(count / stats.total) * 100}%` : "0%" }}
                  />
                </div>
                <span className="w-10 text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-black/[.06] bg-white p-4 dark:border-white/[.08] dark:bg-zinc-950">
      <div className="text-2xl font-semibold tabular-nums text-black dark:text-zinc-50">{value}</div>
      <div className="text-xs text-zinc-500 dark:text-zinc-500">{label}</div>
    </div>
  );
}
