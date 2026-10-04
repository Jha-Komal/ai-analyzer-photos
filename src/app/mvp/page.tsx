"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PhoneFrame } from "@/components/photo-finder/mobile/PhoneFrame";
import { GPhotosTopBar } from "@/components/photo-finder/mobile/GPhotosTopBar";
import { SearchMemoryCard } from "@/components/photo-finder/mobile/SearchMemoryCard";
import { ClueTrail } from "@/components/photo-finder/mobile/ClueTrail";
import { MobilePhotoGrid } from "@/components/photo-finder/mobile/MobilePhotoGrid";
import { PhotoDetailSheet } from "@/components/photo-finder/mobile/PhotoDetailSheet";
import { FoundOverlay } from "@/components/photo-finder/mobile/FoundOverlay";
import { Loader } from "@/components/shared/Loader";
import { usePhotoFinder } from "@/hooks/usePhotoFinder";
import { apiFetch } from "@/lib/api-client";
import type { PublicPhoto } from "@/types/photo-finder";

type TaskInfo = { id: string; title: string; narrative: string };

function MvpApp() {
  const params = useSearchParams();
  const testerId = params.get("tester") ?? undefined;
  const taskId = params.get("task") ?? undefined;
  const ctx = useMemo(() => ({ testerId, taskId }), [testerId, taskId]);
  const finder = usePhotoFinder(ctx);

  const [activePhoto, setActivePhoto] = useState<PublicPhoto | null>(null);
  // Anchor photos drop out of `candidates` once selected, so their thumbnails
  // are cached here (by id) the moment they're picked -- for the "Finding
  // photos like" row, which needs to keep showing them.
  const [anchorCache, setAnchorCache] = useState<Record<string, PublicPhoto>>({});

  const [task, setTask] = useState<TaskInfo | null>(null);
  useEffect(() => {
    if (!taskId) return;
    apiFetch<TaskInfo[]>("/api/photo-finder/task").then((all) => setTask(all.find((t) => t.id === taskId) ?? null)).catch(() => {});
  }, [taskId]);

  const { stage, session, candidates, found, busy, error } = finder;

  const handleRestart = () => {
    setActivePhoto(null);
    setAnchorCache({});
    finder.reset();
  };

  const handleMoreLikeThis = (photo: PublicPhoto) => {
    setAnchorCache((prev) => ({ ...prev, [photo.id]: photo }));
    void finder.submitRefinement(photo, "More like this", ["more_like_this"]);
    setActivePhoto(null);
  };

  const handleSubmitText = (photo: PublicPhoto, text: string) => {
    setAnchorCache((prev) => ({ ...prev, [photo.id]: photo }));
    void finder.submitRefinement(photo, text, []);
    setActivePhoto(null);
  };

  return (
    <PhoneFrame>
      <GPhotosTopBar />

      {stage === "describe" && (
        <>
          {error && <p className="mx-4 mb-2 rounded-lg bg-negative/10 px-3 py-2 text-xs text-negative">{error}</p>}
          <SearchMemoryCard busy={busy === "searching"} onSubmit={finder.start} task={task} />
        </>
      )}

      {stage === "results" && session && (
        <>
          <ClueTrail
            originalQuery={session.originalQuery}
            clues={session.clues}
            anchors={session.anchorImageIds.map((id) => anchorCache[id]).filter((p): p is PublicPhoto => !!p)}
            busy={!!busy}
            onRemoveClue={finder.removeClue}
            onAddClue={finder.addClue}
            onRestart={handleRestart}
          />
          <MobilePhotoGrid candidates={candidates} busy={!!busy} onOpen={setActivePhoto} />
        </>
      )}

      {stage === "results" && activePhoto && (
        <PhotoDetailSheet
          photo={activePhoto}
          busy={!!busy}
          error={error}
          onFound={() => {
            finder.markFound(activePhoto);
            setActivePhoto(null);
          }}
          onMoreLikeThis={() => handleMoreLikeThis(activePhoto)}
          onSubmitText={(text) => handleSubmitText(activePhoto, text)}
          onKeepLooking={() => {
            finder.reject(activePhoto);
            setActivePhoto(null);
          }}
          onClose={() => setActivePhoto(null)}
        />
      )}

      {stage === "found" && found && session && <FoundOverlay photo={found} session={session} stats={finder.finalStats} onAgain={handleRestart} />}
    </PhoneFrame>
  );
}

export default function MvpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <Loader text="Loading…" />
        </div>
      }
    >
      <MvpApp />
    </Suspense>
  );
}
