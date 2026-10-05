"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/memory-trail/AppShell";
import { PhotosHeader } from "@/components/memory-trail/PhotosHeader";
import { SearchBar } from "@/components/memory-trail/SearchBar";
import { MemoryTrail } from "@/components/memory-trail/MemoryTrail";
import { AddClueInput } from "@/components/memory-trail/AddClueInput";
import { RetrievalProgress } from "@/components/memory-trail/RetrievalProgress";
import { PhotoGrid } from "@/components/memory-trail/PhotoGrid";
import { PhotoViewer } from "@/components/memory-trail/PhotoViewer";
import { SuccessState } from "@/components/memory-trail/SuccessState";
import { WhyMemoryTrail } from "@/components/memory-trail/WhyMemoryTrail";
import { DebugPanel } from "@/components/memory-trail/DebugPanel";
import { Loader } from "@/components/shared/Loader";
import { TopNav } from "@/components/layout/TopNav";
import { useMemoryTrail } from "@/hooks/useMemoryTrail";
import { DEMO_PHOTOS } from "@/lib/memory-trail/demoPhotos";
import { SCENARIOS } from "@/lib/memory-trail/scenarios";
import type { DemoPhoto } from "@/types/memory-trail";

function MemoryTrailApp() {
  const params = useSearchParams();
  const debug = params.get("debug") === "true";
  const scenario = SCENARIOS.find((s) => s.id === params.get("scenario")) ?? null;
  const mt = useMemoryTrail();

  const [activePhoto, setActivePhoto] = useState<DemoPhoto | null>(null);
  const [showWhy, setShowWhy] = useState(false);

  const { session, aiMeta, busy, found, log } = mt;
  const candidates = session ? session.candidateIds.map((id) => DEMO_PHOTOS.find((p) => p.id === id)).filter((p): p is DemoPhoto => !!p) : [];
  const foundPhoto = found ? DEMO_PHOTOS.find((p) => p.id === found) ?? null : null;
  const clueCount = session ? session.clues.length + session.selectedPhotos.length : 0;

  const handleOpen = (photo: DemoPhoto) => {
    mt.openNearMatch(photo.id);
    setActivePhoto(photo);
  };

  const handleRestart = () => {
    setActivePhoto(null);
    setShowWhy(false);
    mt.reset();
  };

  return (
    <div className="flex items-start justify-center sm:gap-4 sm:p-4">
      <AppShell>
        <PhotosHeader onInfo={() => setShowWhy(true)} />

        {!session && (
          <SearchBar busy={busy} onSubmit={mt.start} task={scenario ? { title: "Your task", narrative: `Think of this memory: ${scenario.startingMemory}` } : null} />
        )}

        {session && (
          <>
            <MemoryTrail session={session} photos={DEMO_PHOTOS} onRemoveClue={mt.removeClue} onRemoveSignal={mt.removeSignal} />
            <RetrievalProgress busy={busy} clueCount={clueCount} />
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
              <PhotoGrid photos={candidates} busy={busy} onOpen={handleOpen} />
              <AddClueInput busy={busy} suggested={aiMeta?.suggestedRefinements} onAdd={(value) => mt.addClue("visual", value)} />
            </div>
          </>
        )}

        {activePhoto && (
          <PhotoViewer
            photo={activePhoto}
            busy={busy}
            onConfirm={() => {
              mt.confirmTarget(activePhoto.id);
              setActivePhoto(null);
            }}
            onKeepLooking={() => setActivePhoto(null)}
            onUseSignal={(type) => {
              mt.useAsNearMatch(activePhoto.id, type);
              setActivePhoto(null);
            }}
            onNotUseful={() => {
              mt.rejectPhoto(activePhoto.id);
              setActivePhoto(null);
            }}
            onClose={() => setActivePhoto(null)}
          />
        )}

        {foundPhoto && session && <SuccessState photo={foundPhoto} session={session} onStartOver={handleRestart} />}

        {showWhy && <WhyMemoryTrail onClose={() => setShowWhy(false)} />}
      </AppShell>

      {debug && <DebugPanel session={session} photos={DEMO_PHOTOS} log={log} aiMeta={aiMeta} targetId={scenario?.targetId} />}
    </div>
  );
}

export default function MemoryTrailPage() {
  return (
    <>
      <TopNav title="Memory Trail" subtitle="Progressive photo retrieval -- recognition becomes retrieval input" />
      <Suspense
        fallback={
          <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
            <Loader text="Loading…" />
          </div>
        }
      >
        <MemoryTrailApp />
      </Suspense>
    </>
  );
}
