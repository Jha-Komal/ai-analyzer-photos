"use client";

import { useEffect, useState } from "react";
import { Check, ScanSearch, ThumbsDown, X, ArrowRight } from "lucide-react";
import type { PublicPhoto } from "@/types/photo-finder";

function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className="absolute inset-0 z-40">
      <button type="button" aria-label="Close" onClick={onClose} className={`absolute inset-0 bg-black/45 transition-opacity ${shown ? "opacity-100" : "opacity-0"}`} />
      <div
        className={`absolute inset-x-0 bottom-0 max-h-[88%] overflow-y-auto rounded-t-3xl bg-card p-4 pb-6 shadow-2xl transition-transform duration-300 ${shown ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
        {children}
      </div>
    </div>
  );
}

export function DecideSheet({
  photo,
  busy,
  onFound,
  onLooksClose,
  onReject,
  onClose,
}: {
  photo: PublicPhoto;
  busy: boolean;
  onFound: () => void;
  onLooksClose: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet onClose={onClose}>
      <div className="overflow-hidden rounded-2xl bg-muted-background">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt="Selected photo" className="max-h-56 w-full object-contain" />
      </div>
      <p className="mt-4 text-center text-base font-medium text-foreground">Is this the photo you remembered?</p>
      <div className="mt-4 flex flex-col gap-2">
        <button type="button" onClick={onFound} disabled={busy} className="flex items-center justify-center gap-2 rounded-full bg-positive py-3 text-sm font-semibold text-white disabled:opacity-50">
          <Check className="h-4 w-4" /> This is the photo
        </button>
        <button type="button" onClick={onLooksClose} disabled={busy} className="flex items-center justify-center gap-2 rounded-full border border-border py-3 text-sm font-medium text-foreground disabled:opacity-50">
          <ScanSearch className="h-4 w-4" /> Looks close, but not quite
        </button>
        <button type="button" onClick={onReject} disabled={busy} className="flex items-center justify-center gap-1.5 py-2 text-sm text-muted hover:text-negative disabled:opacity-50">
          <ThumbsDown className="h-3.5 w-3.5" /> Not this -- keep looking
        </button>
      </div>
    </Sheet>
  );
}

export function AnchorSheet({
  anchor,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  anchor: PublicPhoto;
  busy: boolean;
  error: string | null;
  onSubmit: (text: string, chips: string[]) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={anchor.url} alt="Anchor" className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Looks close?</p>
          <p className="text-xs text-muted">What about this is right -- and what&rsquo;s different?</p>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="ml-auto rounded-full p-1.5 text-muted hover:bg-muted-background">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onSubmit("More like this", ["more_like_this"])}
          className="rounded-full bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          More like this
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSubmit("Around this time", ["around_this_time"])}
          className="rounded-full border border-border py-2.5 text-sm font-medium text-foreground disabled:opacity-50"
        >
          Around this time
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && text.trim() && onSubmit(text.trim(), [])}
          maxLength={200}
          placeholder="Add what this reminded you of"
          className="flex-1 bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted"
        />
        <button
          type="button"
          disabled={!text.trim() || busy}
          onClick={() => onSubmit(text.trim(), [])}
          aria-label="Submit"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-negative">{error}</p>}
      {busy && <p className="mt-2 text-xs text-muted">Narrowing the results…</p>}
    </Sheet>
  );
}
