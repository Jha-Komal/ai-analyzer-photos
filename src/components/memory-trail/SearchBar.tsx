"use client";

import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { DEMO_PHOTOS } from "@/lib/memory-trail/demoPhotos";

export function SearchBar({
  busy,
  onSubmit,
  task,
}: {
  busy: boolean;
  onSubmit: (query: string) => void;
  task?: { title: string; narrative: string } | null;
}) {
  const [text, setText] = useState("");
  // Shuffled once per mount (not on every render) -- a decorative "your photos" backdrop, not search results.
  const [recent] = useState(() => [...DEMO_PHOTOS].sort(() => Math.random() - 0.5));
  const submit = () => text.trim() && !busy && onSubmit(text.trim());

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {task && (
        <div className="mx-4 mb-2 rounded-2xl border border-[#4285F4]/30 bg-[#e8f0fe] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1a73e8]">{task.title}</p>
          <p className="mt-0.5 text-sm text-[#3c4043]">{task.narrative}</p>
        </div>
      )}
      <div className="shrink-0 px-4 pb-2">
        <div className="flex items-center gap-2.5 rounded-full bg-[#f1f3f4] px-4 py-2.5">
          <Search className="h-4.5 w-4.5 shrink-0 text-[#5f6368]" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            maxLength={200}
            placeholder="concert with my friend last year"
            className="flex-1 bg-transparent text-sm text-[#3c4043] outline-none placeholder:text-[#80868b]"
          />
          <button type="button" onClick={submit} disabled={!text.trim() || busy} aria-label="Search" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4285F4] text-white disabled:opacity-40">
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-[2px]">
          {recent.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.imageUrl} alt="" loading="lazy" className="aspect-square w-full object-cover" />
          ))}
        </div>
      </div>
    </div>
  );
}
