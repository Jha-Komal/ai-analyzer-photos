"use client";

import { useEffect, useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import type { PublicPhoto } from "@/types/photo-finder";

export function PhotoDetailSheet({
  photo,
  busy,
  error,
  onFound,
  onMoreLikeThis,
  onSubmitText,
  onKeepLooking,
  onClose,
}: {
  photo: PublicPhoto;
  busy: boolean;
  error: string | null;
  onFound: () => void;
  onMoreLikeThis: () => void;
  onSubmitText: (text: string) => void;
  onKeepLooking: () => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const submitText = () => {
    const value = text.trim();
    if (!value) return;
    onSubmitText(value);
    setText("");
  };

  return (
    <div className="absolute inset-0 z-40">
      <button type="button" aria-label="Close" onClick={onClose} className={`absolute inset-0 bg-black/45 transition-opacity ${shown ? "opacity-100" : "opacity-0"}`} />
      <div
        className={`absolute inset-x-0 bottom-0 max-h-[88%] overflow-y-auto rounded-t-3xl bg-card p-4 pb-6 shadow-2xl transition-transform duration-300 ${shown ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />

        <div className="overflow-hidden rounded-2xl bg-muted-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt="Selected photo" className="max-h-56 w-full object-contain" />
        </div>

        <p className="mt-4 text-center text-base font-medium text-foreground">Is this the photo you remembered?</p>

        <div className="mt-4 flex flex-col gap-2">
          <button type="button" onClick={onFound} disabled={busy} className="flex items-center justify-center gap-2 rounded-full bg-positive py-3 text-sm font-semibold text-white disabled:opacity-50">
            <Check className="h-4 w-4" /> This is the photo
          </button>
          <button type="button" onClick={onMoreLikeThis} disabled={busy} className="flex items-center justify-center gap-2 rounded-full border border-primary py-3 text-sm font-medium text-primary disabled:opacity-50">
            More like this
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitText()}
            maxLength={200}
            disabled={busy}
            placeholder="What did this remind you of?"
            className="flex-1 bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted"
          />
          <button
            type="button"
            disabled={!text.trim() || busy}
            onClick={submitText}
            aria-label="Submit"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <button type="button" onClick={onKeepLooking} disabled={busy} className="mt-3 w-full py-1 text-sm text-muted hover:text-foreground disabled:opacity-50">
          Keep looking
        </button>

        {error && <p className="mt-1 text-xs text-negative">{error}</p>}
        {busy && <p className="mt-1 text-xs text-muted">Narrowing the results…</p>}
      </div>
    </div>
  );
}
