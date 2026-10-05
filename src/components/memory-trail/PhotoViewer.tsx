"use client";

import { ArrowLeft, Check } from "lucide-react";
import type { DemoPhoto, NearMatchSignalType } from "@/types/memory-trail";
import { NearMatchActions } from "./NearMatchActions";

/**
 * Every opened photo gets the same viewer: a "Found it?" confirmation (since the
 * user can't know in advance whether this IS the target) plus "Helpful clue?"
 * near-match actions underneath -- one inline surface instead of two separate
 * screens, so refinement never requires leaving the viewer.
 */
export function PhotoViewer({
  photo,
  busy,
  onConfirm,
  onKeepLooking,
  onUseSignal,
  onNotUseful,
  onClose,
}: {
  photo: DemoPhoto;
  busy: boolean;
  onConfirm: () => void;
  onKeepLooking: () => void;
  onUseSignal: (type: NearMatchSignalType) => void;
  onNotUseful: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-white">
      <div className="flex shrink-0 items-center px-3 py-3">
        <button type="button" onClick={onClose} aria-label="Back" className="rounded-full p-1.5 text-[#3c4043] hover:bg-[#f1f3f4]">
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="flex max-h-[46%] items-center justify-center bg-[#f1f3f4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.imageUrl} alt="Selected photo" className="max-h-[320px] w-full object-contain" />
        </div>

        <div className="border-b border-[#f1f3f4] px-4 py-3">
          <p className="text-sm font-medium text-[#3c4043]">Found it?</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#34A853] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Yes, this is it
            </button>
            <button type="button" disabled={busy} onClick={onKeepLooking} className="flex-1 rounded-full border border-[#dadce0] py-2.5 text-sm font-medium text-[#3c4043] disabled:opacity-50">
              Keep looking
            </button>
          </div>
        </div>

        <NearMatchActions busy={busy} onSelect={onUseSignal} onNotUseful={onNotUseful} />
      </div>
    </div>
  );
}
