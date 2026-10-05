"use client";

import { scorePhotos } from "@/lib/memory-trail/retrieval";
import type { AiRetrievalResponse, DemoPhoto, EventLogEntry, RetrievalSession } from "@/types/memory-trail";

/** Only ever rendered when ?debug=true is on the URL -- never part of the normal UX. */
export function DebugPanel({
  session,
  photos,
  log,
  aiMeta,
  targetId,
}: {
  session: RetrievalSession | null;
  photos: DemoPhoto[];
  log: EventLogEntry[];
  aiMeta: (AiRetrievalResponse & { source: "ai" | "deterministic" }) | null;
  /** Scripted scenario's target photo id (from ?scenario=), if any -- shows a live rank check. */
  targetId?: string;
}) {
  const scored = session ? scorePhotos(photos, session).slice(0, 15) : [];
  const targetRank = targetId && session ? session.candidateIds.indexOf(targetId) : -1;

  return (
    <div className="h-[min(844px,90vh)] w-[360px] shrink-0 overflow-y-auto rounded-[1rem] border border-border bg-card p-4 font-mono text-xs text-foreground">
      <p className="mb-2 font-sans text-sm font-semibold">Debug panel</p>

      {targetId && (
        <Section title="Scripted target check">
          <p className={targetRank === 0 ? "font-sans font-semibold text-positive" : "font-sans text-negative"}>
            {targetId}: {targetRank === -1 ? "not in current results" : `rank #${targetRank + 1}`}
          </p>
        </Section>
      )}

      <Section title="Session">
        <pre className="whitespace-pre-wrap">{JSON.stringify({ status: session?.status, originalQuery: session?.originalQuery, negativeSignals: session?.negativeSignals }, null, 2)}</pre>
      </Section>

      <Section title={`Active clues (${session?.clues.length ?? 0})`}>
        <pre className="whitespace-pre-wrap">{JSON.stringify(session?.clues, null, 2)}</pre>
      </Section>

      <Section title={`Near-match signals (${session?.selectedPhotos.length ?? 0})`}>
        <pre className="whitespace-pre-wrap">{JSON.stringify(session?.selectedPhotos, null, 2)}</pre>
      </Section>

      <Section title={`Candidate ranking (deterministic, top ${scored.length})`}>
        <table className="w-full">
          <tbody>
            {scored.map((s) => (
              <tr key={s.id} className={session?.candidateIds.includes(s.id) ? "" : "opacity-40"}>
                <td className="pr-2">{s.id}</td>
                <td>{s.score.toFixed(1)}</td>
                <td className="pl-2 text-muted">{aiMeta?.reasoningLabels?.[s.id] ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title={`AI response (source: ${aiMeta?.source ?? "none yet"})`}>
        <pre className="whitespace-pre-wrap">{JSON.stringify({ interpretedIntent: aiMeta?.interpretedIntent, activeSignals: aiMeta?.activeSignals, suggestedRefinements: aiMeta?.suggestedRefinements }, null, 2)}</pre>
      </Section>

      <Section title={`Event log (${log.length})`}>
        <ol className="space-y-1">
          {log.map((e, i) => (
            <li key={i}>
              {e.at.slice(11, 19)} {e.event} {e.payload ? JSON.stringify(e.payload) : ""}
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 border-t border-border pt-2">
      <p className="mb-1 font-sans text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      {children}
    </div>
  );
}
