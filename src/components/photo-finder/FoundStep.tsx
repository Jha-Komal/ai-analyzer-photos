"use client";

import { CircleCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicPhoto, RetrievalSession } from "@/types/photo-finder";

export function FoundStep({ photo, session, stats, onDone, onAgain }: { photo: PublicPhoto; session: RetrievalSession; stats: { candidatesViewed: number; totalSeconds: number; rounds: number }; onDone: () => void; onAgain: () => void }) {
  const download = () => {
    const blob = new Blob([JSON.stringify({ session, stats }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `photo-finder-session-${session.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const seconds = Math.max(1, Math.round(stats.totalSeconds));
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <CircleCheck className="mx-auto h-12 w-12 text-positive" />
      <h2 className="mt-3 text-3xl font-bold text-foreground">Found it</h2>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt="The photo you found" className="max-h-[420px] w-full object-contain bg-muted-background" />
      </div>
      <p className="mt-4 text-sm text-muted">
        {stats.rounds} {stats.rounds === 1 ? "round" : "rounds"} · {stats.candidatesViewed} photos looked at · {seconds}s
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button size="lg" onClick={onDone}>Done</Button>
        <Button size="lg" variant="outline" onClick={onAgain}>Start another search</Button>
      </div>
      <button type="button" onClick={download} className="mt-6 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
        <Download className="h-3.5 w-3.5" /> Download session JSON
      </button>
    </div>
  );
}
