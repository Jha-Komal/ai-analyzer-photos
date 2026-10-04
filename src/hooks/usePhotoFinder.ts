"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiPost } from "@/lib/api-client";
import type { PublicPhoto, RetrievalResponse, RetrievalSession } from "@/types/photo-finder";

export type Stage = "describe" | "results" | "refine" | "found";
type Context = { testerId?: string; taskId?: string };

/** Client state machine for the retrieval loop: describe -> results -> (anchor + refine -> results)* -> found. */
export function usePhotoFinder(ctx: Context) {
  const [stage, setStage] = useState<Stage>("describe");
  const [session, setSession] = useState<RetrievalSession | null>(null);
  const [candidates, setCandidates] = useState<PublicPhoto[]>([]);
  const [anchor, setAnchor] = useState<PublicPhoto | null>(null);
  const [found, setFound] = useState<PublicPhoto | null>(null);
  const [busy, setBusy] = useState<null | "searching" | "narrowing" | "refilling">(null);
  const [error, setError] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [finalStats, setFinalStats] = useState({ candidatesViewed: 0, totalSeconds: 0, rounds: 0 });

  const viewed = useRef(new Set<string>());
  const startedMs = useRef(0);
  const live = useRef<{ session: RetrievalSession | null; stage: Stage }>({ session: null, stage: "describe" });
  const requestId = useRef(0);
  useEffect(() => {
    live.current = { session, stage };
  });

  const metrics = () => ({
    candidatesViewed: viewed.current.size,
    totalSeconds: (Date.now() - startedMs.current) / 1000,
    rounds: live.current.session?.rounds.length ?? 0,
  });

  const sendEvent = useCallback(
    (event: string, s: RetrievalSession, extra: Record<string, unknown> = {}) => {
      void fetch("/api/photo-finder/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, session: s, ...ctx, ...extra }),
        keepalive: true,
      }).catch(() => {});
    },
    [ctx],
  );

  const apply = useCallback((res: RetrievalResponse) => {
    setSession(res.session);
    setCandidates(res.candidates);
    setDegraded(res.degraded);
    res.candidates.forEach((c) => viewed.current.add(c.id));
  }, []);

  const run = useCallback(async (kind: NonNullable<typeof busy>, fn: () => Promise<RetrievalResponse>): Promise<boolean> => {
    const id = ++requestId.current;
    setBusy(kind);
    setError(null);
    try {
      const res = await fn();
      if (id !== requestId.current) return false; // a newer request superseded this one
      apply(res);
      return true;
    } catch (err) {
      if (id === requestId.current) setError(err instanceof Error ? err.message : "Something went wrong.");
      return false;
    } finally {
      if (id === requestId.current) setBusy(null);
    }
  }, [apply]);

  const start = useCallback(
    async (query: string) => {
      viewed.current = new Set();
      startedMs.current = Date.now();
      const ok = await run("searching", () => apiPost<RetrievalResponse>("/api/photo-finder/start", { query, ...ctx }));
      if (ok) setStage("results");
    },
    [ctx, run],
  );

  const refill = useCallback(
    (next: RetrievalSession) => run("refilling", () => apiPost<RetrievalResponse>("/api/photo-finder/refine", { session: next, ...ctx })),
    [ctx, run],
  );

  const reject = useCallback(
    (photo: PublicPhoto) => {
      if (!session) return;
      const next = { ...session, rejectedImageIds: [...new Set([...session.rejectedImageIds, photo.id])] };
      setSession(next);
      setCandidates((c) => c.filter((p) => p.id !== photo.id)); // remove immediately; refill follows
      sendEvent("candidate_rejected", next, { imageId: photo.id });
      void refill(next);
    },
    [session, refill, sendEvent],
  );

  // The server already logs "clue_added" with the full text when it handles this request.
  const addClue = useCallback(
    (text: string) => {
      if (!session) return Promise.resolve(false);
      return run("narrowing", () => apiPost<RetrievalResponse>("/api/photo-finder/refine", { session, text, ...ctx }));
    },
    [session, ctx, run],
  );

  const removeClue = useCallback(
    (index: number) => {
      if (!session) return;
      const next = { ...session, clues: session.clues.map((c, i) => (i === index ? { ...c, removed: true } : c)) };
      setSession(next);
      sendEvent("clue_removed", next);
      void refill(next);
    },
    [session, refill, sendEvent],
  );

  const openAnchor = useCallback(
    (photo: PublicPhoto) => {
      if (!session) return;
      setAnchor(photo);
      setStage("refine");
      sendEvent("anchor_selected", session, { imageId: photo.id });
    },
    [session, sendEvent],
  );

  const cancelRefine = useCallback(() => {
    setAnchor(null);
    setStage("results");
  }, []);

  const submitRefinement = useCallback(
    async (text: string, chips: string[]) => {
      if (!session || !anchor) return;
      const ok = await run("narrowing", () =>
        apiPost<RetrievalResponse>("/api/photo-finder/refine", { session, anchorId: anchor.id, text, chips, ...ctx }),
      );
      if (ok) {
        setAnchor(null);
        setStage("results");
      }
    },
    [session, anchor, ctx, run],
  );

  const markFound = useCallback(
    (photo: PublicPhoto) => {
      if (!session) return;
      const done = { ...session, selectedTargetImageId: photo.id, completedAt: new Date().toISOString() };
      setSession(done);
      setFound(photo);
      setStage("found");
      const m = metrics();
      setFinalStats(m);
      sendEvent("target_selected", done, { imageId: photo.id, metrics: m });
      sendEvent("retrieval_completed", done, { imageId: photo.id, metrics: m });
    },
    [session, sendEvent],
  );

  const reset = useCallback(() => {
    const { session: s, stage: st } = live.current;
    if (s && (st === "results" || st === "refine")) sendEvent("retrieval_abandoned", s, { metrics: metrics() });
    requestId.current++;
    setSession(null);
    setCandidates([]);
    setAnchor(null);
    setFound(null);
    setError(null);
    setBusy(null);
    setStage("describe");
  }, [sendEvent]);

  // Closing the tab mid-search counts as abandonment.
  useEffect(() => {
    const onHide = () => {
      const { session: s, stage: st } = live.current;
      if (s && (st === "results" || st === "refine")) sendEvent("retrieval_abandoned", s, { metrics: metrics() });
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [sendEvent]);

  return {
    stage, session, candidates, anchor, found, busy, error, degraded,
    start, reject, removeClue, addClue, openAnchor, cancelRefine, submitRefinement, markFound, reset,
    finalStats,
  };
}
