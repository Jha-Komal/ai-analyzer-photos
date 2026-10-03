"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicPhoto } from "@/types/photo-finder";

const CHIPS = ["Same people", "Similar place", "Similar time", "Similar lighting", "Similar event", "Same day", "Wrong person", "Wrong place", "Wrong time", "More crowded", "Less crowded"];

export function RefinePanel({ anchor, busy, error, onSubmit, onCancel }: { anchor: PublicPhoto; busy: boolean; error: string | null; onSubmit: (text: string, chips: string[]) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const toggle = (c: string) => setChips((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  const composed = [text.trim(), chips.join(", ")].filter(Boolean).join(". ");

  return (
    <div className="mx-auto max-w-5xl py-6">
      <button type="button" onClick={onCancel} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to results
      </button>
      <div className="grid gap-6 rounded-2xl border border-border bg-card p-5 shadow-sm md:grid-cols-2">
        <div className="overflow-hidden rounded-xl bg-muted-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={anchor.url} alt="The photo you picked as close" className="h-full max-h-[420px] w-full object-contain" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-foreground">What about this feels close — and what is different?</h2>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={400}
            rows={4}
            autoFocus
            placeholder="The lighting is similar, but the right photo had Meher in it."
            className="mt-4 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted">Quick hints (optional)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                aria-pressed={chips.includes(c)}
                className={`rounded-full border px-3 py-1 text-xs ${chips.includes(c) ? "border-primary bg-primary-light text-primary" : "border-border bg-card text-foreground hover:bg-muted-background"}`}
              >
                {c}
              </button>
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-negative">{error}</p>}
          <div className="mt-auto flex items-center gap-3 pt-6">
            <Button size="lg" onClick={() => onSubmit(composed, chips)} disabled={!composed || busy}>
              {busy ? "Narrowing…" : "Narrow the results"}
            </Button>
            <Button variant="ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
