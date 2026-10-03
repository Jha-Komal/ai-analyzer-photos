"use client";

import { X } from "lucide-react";
import { Loader } from "@/components/shared/Loader";
import { PhotoCard } from "./PhotoCard";
import type { Clue, PublicPhoto } from "@/types/photo-finder";

export function ResultsStep({
  clues,
  candidates,
  busy,
  degraded,
  onFound,
  onClose,
  onReject,
  onRemoveClue,
  onRestart,
}: {
  clues: Clue[];
  candidates: PublicPhoto[];
  busy: null | "searching" | "narrowing" | "refilling";
  degraded: boolean;
  onFound: (p: PublicPhoto) => void;
  onClose: (p: PublicPhoto) => void;
  onReject: (p: PublicPhoto) => void;
  onRemoveClue: (index: number) => void;
  onRestart: () => void;
}) {
  const visible = clues.map((c, i) => ({ c, i })).filter(({ c }) => !c.removed);
  return (
    <div className="mx-auto max-w-5xl py-6">
      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">What you remember</h2>
            <p className="text-xs text-muted">Picked up from what you told us. Remove anything that is wrong.</p>
          </div>
          <button type="button" onClick={onRestart} className="shrink-0 text-xs font-medium text-primary hover:underline">
            Start over
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {visible.length === 0 && <span className="text-sm text-muted">No clues yet.</span>}
          {visible.map(({ c, i }) => (
            <span
              key={`${c.text}-${i}`}
              className={`inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-1.5 text-sm ${c.polarity === "negative" ? "bg-negative/10 text-negative" : c.source === "initial" ? "bg-muted-background text-foreground" : "bg-primary-light text-primary"}`}
            >
              {c.polarity === "negative" ? `Not: ${c.text}` : c.text}
              <button type="button" aria-label={`Remove clue ${c.text}`} onClick={() => onRemoveClue(i)} className="rounded-full p-0.5 hover:bg-black/10">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      </section>

      {degraded && <p className="mb-4 rounded-lg bg-neutral/10 px-3 py-2 text-xs text-foreground">Smart matching is temporarily limited, so these are basic matches.</p>}

      <div className="relative">
        {busy && busy !== "refilling" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/80">
            <Loader text={busy === "narrowing" ? "Narrowing the results…" : "Looking through your photos…"} />
          </div>
        )}
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${busy === "refilling" ? "opacity-70" : ""}`}>
          {candidates.map((p, i) => (
            <PhotoCard key={p.id} photo={p} index={i} disabled={!!busy} onFound={() => onFound(p)} onClose={() => onClose(p)} onReject={() => onReject(p)} />
          ))}
        </div>
        {candidates.length === 0 && !busy && <p className="py-16 text-center text-sm text-muted">No more matches. Try starting over with a different description.</p>}
      </div>
    </div>
  );
}
