"use client";

import { useEffect, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { PublicPhoto } from "@/types/photo-finder";

export function SearchMemoryCard({
  busy,
  onSubmit,
  task,
}: {
  busy: boolean;
  onSubmit: (query: string) => void;
  task?: { narrative: string } | null;
}) {
  const [text, setText] = useState("");
  const [recent, setRecent] = useState<PublicPhoto[]>([]);
  const submit = () => text.trim() && !busy && onSubmit(text.trim());

  useEffect(() => {
    apiFetch<PublicPhoto[]>("/api/photo-finder/sample").then(setRecent).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
      <div className="flex items-center gap-3 rounded-full border border-border bg-muted-background px-4 py-3 shadow-sm">
        <Search className="h-4.5 w-4.5 shrink-0 text-muted" />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          maxLength={300}
          rows={1}
          autoFocus
          placeholder="photo from a café trip, maybe Goa, blue wall"
          className="max-h-24 min-h-5 flex-1 resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || busy}
          aria-label="Search"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 px-1 text-xs text-muted">{busy ? "Looking through your photos…" : "Start with whatever you remember"}</p>

      {task && (
        <div className="mt-4 rounded-2xl border border-primary/30 bg-primary-light p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Your task</p>
          <p className="mt-1 text-sm text-foreground">{task.narrative}</p>
        </div>
      )}

      <p className="mt-4 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Your photos</p>
      <div className="mt-1 min-h-0 flex-1 overflow-y-auto">
        <div className={`grid grid-cols-3 gap-1 pb-4 ${busy ? "opacity-60" : ""}`}>
          {recent.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.url} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />
          ))}
        </div>
      </div>
    </div>
  );
}
