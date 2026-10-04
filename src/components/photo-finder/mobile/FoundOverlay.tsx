"use client";

import { CircleCheck } from "lucide-react";
import type { PublicPhoto, RetrievalSession } from "@/types/photo-finder";

export function FoundOverlay({
  photo,
  session,
  stats,
  onAgain,
}: {
  photo: PublicPhoto;
  session: RetrievalSession;
  stats: { candidatesViewed: number; totalSeconds: number; rounds: number };
  onAgain: () => void;
}) {
  const seconds = Math.max(1, Math.round(stats.totalSeconds));
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center bg-background px-6 pt-16 text-center">
      <CircleCheck className="h-10 w-10 text-positive" />
      <p className="mt-2 text-lg font-semibold text-foreground">Found</p>
      <div className="mt-5 w-full max-w-[260px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt="The photo you found" className="max-h-72 w-full object-contain bg-muted-background" />
      </div>
      <p className="mt-4 text-xs text-muted">
        {stats.rounds} {stats.rounds === 1 ? "round" : "rounds"} · {stats.candidatesViewed} photos looked at · {seconds}s · {session.clues.filter((c) => !c.removed).length} clues used
      </p>
      <button type="button" onClick={onAgain} className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white">
        Start another search
      </button>
    </div>
  );
}
