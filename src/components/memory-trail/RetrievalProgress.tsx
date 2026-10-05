"use client";

export function RetrievalProgress({ busy, clueCount }: { busy: boolean; clueCount: number }) {
  return (
    <p className="px-4 pb-1 text-xs text-[#5f6368]">
      {busy ? "Narrowing results…" : clueCount > 1 ? `Results narrowed using ${clueCount} clues` : "Not seeing it? Use a close photo to narrow your search."}
    </p>
  );
}
