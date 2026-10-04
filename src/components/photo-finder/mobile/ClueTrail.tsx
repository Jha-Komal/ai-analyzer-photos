"use client";

import { useState } from "react";
import { Plus, ArrowRight, X } from "lucide-react";
import type { Clue, PublicPhoto } from "@/types/photo-finder";

export function ClueTrail({
  originalQuery,
  clues,
  anchors,
  busy,
  onRemoveClue,
  onAddClue,
  onRestart,
}: {
  originalQuery: string;
  clues: Clue[];
  anchors: PublicPhoto[];
  busy: boolean;
  onRemoveClue: (index: number) => void;
  onAddClue: (text: string) => void;
  onRestart: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const visible = clues.map((c, i) => ({ c, i })).filter(({ c }) => !c.removed);

  const submit = () => {
    const text = draft.trim();
    if (!text) return setAdding(false);
    onAddClue(text);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="shrink-0 border-b border-border bg-background px-4 pb-3 pt-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Search memory</p>
          <p className="truncate text-sm text-foreground">{originalQuery}</p>
        </div>
        <button type="button" onClick={onRestart} className="shrink-0 pt-1 text-[11px] font-medium text-primary hover:underline">
          Start over
        </button>
      </div>

      {anchors.length > 0 && (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-primary-light px-2.5 py-1.5">
          <span className="text-xs font-medium text-primary">Finding photos like</span>
          <div className="flex -space-x-2">
            {anchors.map((a) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={a.id} src={a.url} alt="Anchor" className="h-6 w-6 rounded-full border-2 border-card object-cover" />
            ))}
          </div>
        </div>
      )}

      <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Remembered clues</p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {visible.map(({ c, i }) => (
          <span
            key={`${c.text}-${i}`}
            className={`inline-flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-xs ${
              c.polarity === "negative" ? "bg-negative/10 text-negative" : c.source === "initial" ? "bg-muted-background text-foreground" : "bg-primary-light text-primary"
            }`}
          >
            {c.polarity === "negative" ? `Not: ${c.text}` : c.text}
            <button type="button" aria-label={`Remove clue ${c.text}`} onClick={() => onRemoveClue(i)} disabled={busy} className="rounded-full p-0.5 hover:bg-black/10">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {adding ? (
          <div className="flex items-center gap-1 rounded-full border border-primary bg-card pl-2.5 pr-1">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              onBlur={() => !draft.trim() && setAdding(false)}
              maxLength={120}
              placeholder="probably at night"
              className="w-28 bg-transparent py-1 text-xs text-foreground outline-none placeholder:text-muted"
            />
            <button type="button" onClick={submit} disabled={busy} aria-label="Add clue" className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted hover:border-primary hover:text-primary"
          >
            <Plus className="h-3 w-3" /> Add another clue
          </button>
        )}
      </div>
    </div>
  );
}
