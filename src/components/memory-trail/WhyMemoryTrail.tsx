"use client";

import { X } from "lucide-react";

export function WhyMemoryTrail({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white px-5 py-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#3c4043]">Why Memory Trail?</p>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-[#5f6368] hover:bg-[#f1f3f4]">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 space-y-4 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9aa0a6]">Old way</p>
          <p className="mt-1 text-[#3c4043]">Search &rarr; weak result &rarr; think of another query &rarr; search again &rarr; browse &rarr; try another route.</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1a73e8]">Memory Trail</p>
          <p className="mt-1 text-[#3c4043]">Search &rarr; recognise something useful &rarr; capture that clue &rarr; results narrow &rarr; repeat until the target appears.</p>
        </div>
      </div>

      <p className="mt-6 text-sm font-medium text-[#3c4043]">You do not have to start over when the first search misses.</p>
    </div>
  );
}
