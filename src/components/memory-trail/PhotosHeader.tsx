"use client";

import { Info } from "lucide-react";

function PhotosMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 36 36" aria-hidden="true" className="shrink-0">
      <path d="M18 18 L18 3 A15 15 0 0 1 33 18 Z" fill="#4285F4" />
      <path d="M18 18 L33 18 A15 15 0 0 1 18 33 Z" fill="#34A853" />
      <path d="M18 18 L18 33 A15 15 0 0 1 3 18 Z" fill="#EA4335" />
      <path d="M18 18 L3 18 A15 15 0 0 1 18 3 Z" fill="#FBBC05" />
    </svg>
  );
}

export function PhotosHeader({ onInfo }: { onInfo?: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-2 px-4 py-3">
      <PhotosMark />
      <span className="text-[17px] font-medium text-[#3c4043]">Photos</span>
      {onInfo && (
        <button type="button" onClick={onInfo} aria-label="Why Memory Trail?" className="ml-auto rounded-full p-1.5 text-[#5f6368] hover:bg-[#f1f3f4]">
          <Info className="h-[18px] w-[18px]" />
        </button>
      )}
    </div>
  );
}
