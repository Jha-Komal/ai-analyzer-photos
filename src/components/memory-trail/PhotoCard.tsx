"use client";

import type { DemoPhoto } from "@/types/memory-trail";

export function PhotoCard({ photo, onOpen }: { photo: DemoPhoto; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="relative aspect-square overflow-hidden bg-[#f1f3f4]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
    </button>
  );
}
