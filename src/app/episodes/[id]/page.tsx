import Link from "next/link";
import { notFound } from "next/navigation";
import { loadEpisodes } from "@/lib/data";
import { TopNav } from "@/components/layout/TopNav";

const MEMORY_DIMENSIONS = [
  "people",
  "places",
  "objects",
  "events",
  "activities",
  "visualAttributes",
  "textInImage",
  "time",
  "relationships",
  "context",
] as const;

export default async function EpisodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const episodes = await loadEpisodes();
  const episode = episodes.find((e) => e.id === id);
  if (!episode) notFound();

  const rememberedEntries = MEMORY_DIMENSIONS.map((d) => [d, episode.remembered[d]] as const).filter(
    ([, v]) => v.length > 0,
  );

  return (
    <>
      <TopNav title="Episode detail" subtitle={episode.id} />
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
        <Link href="/episodes" className="text-sm" style={{ color: "var(--accent)" }}>
          &larr; All episodes
        </Link>

        <div>
          <h1 className="text-xl font-medium" style={{ color: "var(--foreground)" }}>
            {episode.target.type}: {episode.target.description}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {episode.scenario.category} &middot; {episode.scenario.description}
          </p>
        </div>

        {/* MEMORY -> SEARCH -> RESULT -> REFORMULATION -> WORKAROUND -> OUTCOME */}
        <ol className="flex flex-col gap-3">
          <JourneyStep label="MEMORY">
            {rememberedEntries.length === 0 ? (
              <span style={{ color: "var(--text-secondary)" }}>Nothing specific recorded as remembered.</span>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {rememberedEntries.map(([dim, values]) => (
                  <li
                    key={dim}
                    className="rounded-full px-3 py-1 text-xs"
                    style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>{dim}:</span> {values.join(", ")}
                  </li>
                ))}
              </ul>
            )}
            {episode.forgotten.length > 0 && (
              <p className="mt-2 text-xs" style={{ color: "var(--series-orange)" }}>
                Forgotten: {episode.forgotten.join(", ")}
              </p>
            )}
          </JourneyStep>

          {episode.searchJourney.map((step) => (
            <JourneyStep key={step.step} label={step.action}>
              {step.query && (
                <p style={{ color: "var(--foreground)" }}>
                  Query: <code className="font-mono">{step.query}</code>
                </p>
              )}
              {step.description && <p style={{ color: "var(--text-secondary)" }}>{step.description}</p>}
            </JourneyStep>
          ))}

          {episode.workaround && (
            <JourneyStep label="WORKAROUND">
              <span style={{ color: "var(--foreground)" }}>{episode.workaround}</span>
            </JourneyStep>
          )}

          <JourneyStep label="OUTCOME" accent>
            <span style={{ color: "var(--foreground)" }}>{episode.outcome}</span>
            <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              Failure stage: {episode.failureStage} &middot; confidence {episode.confidence}
            </p>
          </JourneyStep>
        </ol>

        <div
          className="rounded-2xl p-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="mb-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Evidence
          </h2>
          <blockquote className="text-sm italic" style={{ color: "var(--text-secondary)" }}>
            &ldquo;{episode.evidence.directQuote}&rdquo;
          </blockquote>
          <a href={episode.evidence.sourceUrl} className="mt-2 inline-block text-xs" style={{ color: "var(--accent)" }}>
            View source &rarr;
          </a>
        </div>
      </main>
    </>
  );
}

function JourneyStep({ label, accent, children }: { label: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <div
        className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
        style={{ background: accent ? "var(--accent)" : "var(--series-blue)", marginTop: "6px" }}
      />
      <div className="flex-1 rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="mb-1 text-xs font-medium tracking-wide" style={{ color: "var(--text-secondary)" }}>
          {label}
        </div>
        <div className="text-sm">{children}</div>
      </div>
    </li>
  );
}
