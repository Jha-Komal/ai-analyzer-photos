"use client";

import type { NearMatchSignalType } from "@/types/memory-trail";

const SIGNAL_CHIPS: { label: string; type: NearMatchSignalType }[] = [
  { label: "Same event", type: "same_event" },
  { label: "Same people", type: "same_people" },
  { label: "Same place", type: "same_place" },
  { label: "Around this time", type: "around_this_time" },
  { label: "Similar scene", type: "similar_scene" },
];

export function NearMatchActions({ busy, onSelect, onNotUseful }: { busy: boolean; onSelect: (type: NearMatchSignalType) => void; onNotUseful: () => void }) {
  return (
    <div className="border-t border-[#f1f3f4] px-4 py-3">
      <p className="text-sm font-medium text-[#3c4043]">Helpful clue?</p>
      <p className="mt-0.5 text-xs text-[#5f6368]">Use what matches this photo to narrow your search. This doesn&rsquo;t mean it&rsquo;s the one.</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {SIGNAL_CHIPS.map((c) => (
          <button
            key={c.type}
            type="button"
            disabled={busy}
            onClick={() => onSelect(c.type)}
            className="rounded-full border border-[#dadce0] bg-white px-3 py-1.5 text-xs font-medium text-[#3c4043] hover:bg-[#f1f3f4] disabled:opacity-50"
          >
            {c.label}
          </button>
        ))}
      </div>
      <button type="button" disabled={busy} onClick={onNotUseful} className="mt-3 text-xs font-medium text-[#5f6368] hover:text-[#3c4043] disabled:opacity-50">
        Not useful
      </button>
    </div>
  );
}
