"use client";

import { X } from "lucide-react";
import type { DemoPhoto, RetrievalSession } from "@/types/memory-trail";

const SIGNAL_LABEL: Record<string, string> = {
  same_event: "Same event",
  same_people: "Same people",
  same_place: "Same place",
  around_this_time: "Around this time",
  similar_scene: "Similar scene",
};

export function MemoryTrail({
  session,
  photos,
  onRemoveClue,
  onRemoveSignal,
}: {
  session: RetrievalSession;
  photos: DemoPhoto[];
  onRemoveClue: (clueId: string) => void;
  onRemoveSignal: (photoId: string) => void;
}) {
  const userClues = session.clues.filter((c) => c.type !== "query");

  return (
    <div className="shrink-0 border-b border-[#f1f3f4] px-4 pb-2.5 pt-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#5f6368]">Memory Trail</p>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-[#f1f3f4] px-3 py-1 text-xs text-[#3c4043]">{session.originalQuery}</span>

        {session.selectedPhotos.map((s) => {
          const anchor = photos.find((p) => p.id === s.photoId);
          return (
            <span key={s.photoId} className="inline-flex items-center gap-1.5 rounded-full border border-[#4285F4] bg-[#e8f0fe] py-1 pl-1 pr-1.5 text-xs text-[#1a73e8]">
              {anchor && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={anchor.imageUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
              )}
              {SIGNAL_LABEL[s.signalType] ?? s.signalType} &#10003;
              <button type="button" aria-label="Remove signal" onClick={() => onRemoveSignal(s.photoId)} className="rounded-full p-0.5 hover:bg-black/10">
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}

        {userClues.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-[#fef7e0] py-1 pl-2.5 pr-1 text-xs text-[#8a6d00]">
            {c.value}
            <button type="button" aria-label={`Remove clue ${c.value}`} onClick={() => onRemoveClue(c.id)} className="rounded-full p-0.5 hover:bg-black/10">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {session.selectedPhotos.length > 0 && <p className="mt-1.5 text-[11px] text-[#5f6368]">Using {session.selectedPhotos.length === 1 ? "this photo" : `${session.selectedPhotos.length} photos`} as context</p>}
    </div>
  );
}
