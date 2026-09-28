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

// Fixed color per source -- never cycled, so a hue always means the same
// source across every chart on the page (dataviz skill: "color follows the
// entity, never its rank"). Values come from the validated categorical
// ramp in globals.css, not Google's literal logo hues -- that combination
// fails CVD/contrast checks when used as adjacent chart series.
const SOURCE_META: Record<string, { label: string; color: string }> = {
  reddit: { label: "Reddit", color: "var(--series-blue)" },
  google_photos_community: { label: "Google Photos Community", color: "var(--series-orange)" },
  play_store: { label: "Google Play Store", color: "var(--series-aqua)" },
  app_store: { label: "Apple App Store", color: "var(--series-yellow)" },
};

const TYPE_META: Record<string, { label: string; color: string }> = {
  review: { label: "Review", color: "var(--series-blue)" },
  discussion: { label: "Discussion", color: "var(--series-orange)" },
  comment: { label: "Comment", color: "var(--series-aqua)" },
};

export default async function Home() {
  const documents = await loadDocuments();
  const stats = computeDocumentStats(documents);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-6 py-3"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <PinwheelLogo />
        <span className="text-[22px] font-medium tracking-tight" style={{ color: "var(--foreground)" }}>
          PhotoRecall Intelligence
        </span>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10">
        <p className="max-w-2xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
          AI discovery engine for Google Photos retrieval research. Raw conversations captured from public
          sources are shown below; the extraction/synthesis pipeline (relevance classification, retrieval
          episode extraction, pattern discovery) runs on top of this dataset once{" "}
          <code
            className="rounded px-1 py-0.5 font-mono text-[0.85em]"
            style={{ background: "var(--background)", border: "1px solid var(--border)" }}
          >
            OPENAI_API_KEY
          </code>{" "}
          is configured.
        </p>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Documents analyzed" value={stats.total} accent="var(--accent)" />
          {Object.entries(SOURCE_META).map(([key, meta]) => (
            <StatCard key={key} label={meta.label} value={stats.bySource[key] ?? 0} accent={meta.color} />
          ))}
        </section>

        <Card title="Source distribution">
          <DistributionBars data={stats.bySource} meta={SOURCE_META} total={stats.total} />
          {Object.keys(stats.bySource).length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No documents yet. Run <code className="font-mono">npm run scrape:all</code> to populate{" "}
              <code className="font-mono">data/raw/documents.json</code>.
            </p>
          )}
        </Card>

        <Card title="Source type distribution">
          <DistributionBars data={stats.bySourceType} meta={TYPE_META} total={stats.total} />
        </Card>
      </main>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="flex flex-col gap-4 rounded-2xl p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 2px 0 rgba(60,64,67,0.1)" }}
    >
      <h2 className="text-base font-medium" style={{ color: "var(--foreground)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 2px 0 rgba(60,64,67,0.1)" }}
    >
      <div className="mb-2 h-1 w-8 rounded-full" style={{ background: accent }} />
      <div className="text-2xl font-medium tabular-nums" style={{ color: "var(--foreground)" }}>
        {value.toLocaleString()}
      </div>
      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {label}
      </div>
    </div>
  );
}

function DistributionBars({
  data,
  meta,
  total,
}: {
  data: Record<string, number>;
  meta: Record<string, { label: string; color: string }>;
  total: number;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <div className="flex flex-col gap-3">
      {entries.map(([key, count]) => {
        const m = meta[key] ?? { label: key, color: "var(--text-secondary)" };
        const pct = total ? (count / total) * 100 : 0;
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-48 shrink-0 text-sm" style={{ color: "var(--foreground)" }}>
              {m.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "var(--background)" }}>
              <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: m.color }} />
            </div>
            <span className="w-14 shrink-0 text-right text-sm tabular-nums" style={{ color: "var(--text-secondary)" }}>
              {count.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// A small decorative mark echoing Google Photos' four-color pinwheel icon --
// brand flavor for the header, not a data-encoding chart (so the
// dataviz skill's categorical CVD-adjacency rule doesn't apply here).
function PinwheelLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 36 36" aria-hidden="true">
      <path d="M18 18 L18 3 A15 15 0 0 1 33 18 Z" fill="#4285F4" />
      <path d="M18 18 L33 18 A15 15 0 0 1 18 33 Z" fill="#0F9D58" />
      <path d="M18 18 L18 33 A15 15 0 0 1 3 18 Z" fill="#EA4335" />
      <path d="M18 18 L3 18 A15 15 0 0 1 18 3 Z" fill="#FBBC05" />
    </svg>
  );
}
