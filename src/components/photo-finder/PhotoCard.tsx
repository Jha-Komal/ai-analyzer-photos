"use client";

import { Check, ThumbsDown, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicPhoto } from "@/types/photo-finder";

function formatDate(date?: string) {
  if (!date) return null;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export function PhotoCard({
  photo,
  index,
  disabled,
  onFound,
  onClose,
  onReject,
}: {
  photo: PublicPhoto;
  index: number;
  disabled?: boolean;
  onFound: () => void;
  onClose: () => void;
  onReject: () => void;
}) {
  const meta = [formatDate(photo.date), photo.location].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="relative aspect-[4/3] bg-muted-background">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={`Candidate photo ${index + 1}`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3">
        <p className="min-h-4 text-xs text-muted">{meta}</p>
        <div className="grid grid-cols-1 gap-2">
          <Button onClick={onFound} disabled={disabled} className="w-full">
            <Check className="h-4 w-4" /> This is it
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={onClose} disabled={disabled} variant="outline" size="sm">
              <ScanSearch className="h-4 w-4" /> Looks close
            </Button>
            <Button onClick={onReject} disabled={disabled} variant="ghost" size="sm">
              <ThumbsDown className="h-4 w-4" /> Not this
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
