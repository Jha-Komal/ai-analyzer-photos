"use client";

import { CheckCircle2 } from "lucide-react";
import type { DemoPhoto, RetrievalSession } from "@/types/memory-trail";

const SIGNAL_LABEL: Record<string, string> = {
  same_event: "Same event",
  same_people: "Same people",
  same_place: "Same place",
  around_this_time: "Around this time",
  similar_scene: "Similar scene",
};

export function SuccessState({ photo, session, onStartOver }: { photo: DemoPhoto; session: RetrievalSession; onStartOver: () => void }) {
  const used = [...session.selectedPhotos.map((s) => SIGNAL_LABEL[s.signalType] ?? s.signalType), ...session.clues.filter((c) => c.type !== "query").map((c) => c.value)];

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center bg-white px-6 pt-14 text-center">
      <CheckCircle2 className="h-9 w-9 text-[#34A853]" />
      <p className="mt-2 text-base font-medium text-[#3c4043]">Found with Memory Trail</p>

      <div className="mt-5 w-full max-w-[240px] overflow-hidden rounded-2xl bg-[#f1f3f4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.imageUrl} alt="The photo you found" className="max-h-64 w-full object-contain" />
      </div>

      <div className="mt-6 w-full text-left">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#5f6368]">Started with</p>
        <p className="mt-0.5 text-sm text-[#3c4043]">&ldquo;{session.originalQuery}&rdquo;</p>

        {used.length > 0 && (
          <>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#5f6368]">Memory Trail used</p>
            <ul className="mt-1 space-y-0.5 text-sm text-[#3c4043]">
              {used.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      <button type="button" onClick={onStartOver} className="mt-8 rounded-full bg-[#4285F4] px-6 py-2.5 text-sm font-semibold text-white">
        Start another search
      </button>
    </div>
  );
}
