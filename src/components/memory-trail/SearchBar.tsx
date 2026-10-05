"use client";

import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";

export function SearchBar({ busy, onSubmit }: { busy: boolean; onSubmit: (query: string) => void }) {
  const [text, setText] = useState("");
  const submit = () => text.trim() && !busy && onSubmit(text.trim());

  return (
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
  );
}
