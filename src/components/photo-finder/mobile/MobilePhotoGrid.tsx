"use client";

import type { PublicPhoto } from "@/types/photo-finder";

export function MobilePhotoGrid({ candidates, onOpen, busy }: { candidates: PublicPhoto[]; onOpen: (p: PublicPhoto) => void; busy: boolean }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-2">
      <p className="px-0.5 pb-2 text-xs font-medium text-muted">
        {candidates.length} possible {candidates.length === 1 ? "photo" : "photos"}
      </p>
      {candidates.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">No more matches. Try a different clue.</p>
      ) : (
        <div className={`grid grid-cols-3 gap-1 pb-4 ${busy ? "opacity-60" : ""}`}>
          {candidates.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(p)}
              className="relative aspect-square overflow-hidden rounded-md bg-muted-background"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Candidate photo ${i + 1}`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
