"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { RefinementChips } from "./RefinementChips";

const DEFAULT_SUGGESTIONS = ["Fireworks", "Outdoor", "Night", "Stage lights"];

export function AddClueInput({ busy, suggested, onAdd }: { busy: boolean; suggested?: string[]; onAdd: (value: string) => void }) {
  const [text, setText] = useState("");
  const submit = (value: string) => {
    if (!value.trim() || busy) return;
    onAdd(value.trim());
    setText("");
  };

  return (
    <div className="px-4 py-3">
      <p className="text-sm font-medium text-[#3c4043]">Remember anything else?</p>
      <div className="mt-2 flex items-center gap-2 rounded-full border border-[#dadce0] bg-white px-3 py-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit(text)}
          disabled={busy}
          maxLength={120}
          placeholder="Add another clue…"
          className="flex-1 bg-transparent py-2 text-sm text-[#3c4043] outline-none placeholder:text-[#80868b]"
        />
        <button type="button" disabled={!text.trim() || busy} onClick={() => submit(text)} aria-label="Add clue" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4285F4] text-white disabled:opacity-40">
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2">
        <RefinementChips chips={suggested?.length ? suggested : DEFAULT_SUGGESTIONS} onSelect={submit} disabled={busy} />
      </div>
    </div>
  );
}
