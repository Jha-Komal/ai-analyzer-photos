"use client";

import type { DemoPhoto } from "@/types/memory-trail";
import { PhotoCard } from "./PhotoCard";

export function PhotoGrid({ photos, busy, onOpen }: { photos: DemoPhoto[]; busy: boolean; onOpen: (photo: DemoPhoto) => void }) {
  if (photos.length === 0) {
    return <p className="px-4 py-12 text-center text-sm text-[#5f6368]">No more matches. Try a different clue.</p>;
  }
  return (
    <div className={`grid grid-cols-3 gap-[2px] bg-white transition-opacity ${busy ? "opacity-60" : ""}`}>
      {photos.map((p) => (
        <PhotoCard key={p.id} photo={p} onOpen={() => onOpen(p)} />
      ))}
    </div>
  );
}
