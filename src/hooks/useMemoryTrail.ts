"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiPost } from "@/lib/api-client";
import { createSession, withClue, withConfirmedTarget, withNearMatchSignal, withoutClue, withoutSignal, withRejection } from "@/lib/memory-trail/retrieval";
import type { AiRetrievalResponse, ClueType, EventLogEntry, MemoryTrailEvent, NearMatchSignalType, RetrievalSession } from "@/types/memory-trail";

const SESSION_KEY = "memory-trail-session";
const LOG_KEY = "memory-trail-log";

type AiMeta = (AiRetrievalResponse & { source: "ai" | "deterministic" }) | null;

/** Client state machine for the Memory Trail loop. Session + event log are mirrored to
 * localStorage (for the ?debug=true panel and so a reload isn't a total dead end) but
 * React state here is the source of truth during the session -- no server-side persistence. */
export function useMemoryTrail() {
  const [session, setSession] = useState<RetrievalSession | null>(null);
  const [aiMeta, setAiMeta] = useState<AiMeta>(null);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<string | null>(null);
  const [log, setLog] = useState<EventLogEntry[]>([]);

  const startedMs = useRef(0);
  const live = useRef<RetrievalSession | null>(null);
  useEffect(() => {
    live.current = session;
  });

  const logEvent = useCallback((event: MemoryTrailEvent, payload?: Record<string, unknown>) => {
    setLog((prev) => {
      const next = [...prev, { event, at: new Date().toISOString(), payload }];
      try {
        localStorage.setItem(LOG_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const persistSession = (s: RetrievalSession) => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } catch {}
  };

  /** Applies a local, deterministic session update immediately (so the UI never waits on
   * the network for the core loop), then asks the AI-backed route to refine the ranking. */
  const rerank = useCallback(async (next: RetrievalSession) => {
    setSession(next);
    persistSession(next);
    setBusy(true);
    try {
      const res = await apiPost<AiRetrievalResponse & { source: "ai" | "deterministic" }>("/api/memory-trail/rank", { session: next });
      setAiMeta(res);
      if (res.rankedCandidateIds.length > 0) {
        const reranked = { ...next, candidateIds: res.rankedCandidateIds };
        setSession(reranked);
        persistSession(reranked);
      }
    } catch {
      setAiMeta({ interpretedIntent: "", activeSignals: [], suggestedRefinements: [], rankedCandidateIds: [], reasoningLabels: {}, source: "deterministic" });
    } finally {
      setBusy(false);
    }
  }, []);

  const start = useCallback(
    (query: string) => {
      startedMs.current = Date.now();
      setFound(null);
      setAiMeta(null);
      setLog([]);
      logEvent("retrieval_started", { query });
      const initial = createSession(query);
      void rerank(initial).then(() => logEvent("initial_results_viewed"));
    },
    [logEvent, rerank],
  );

  const openNearMatch = useCallback(
    (photoId: string) => {
      logEvent("near_match_opened", { photoId });
    },
    [logEvent],
  );

  const useAsNearMatch = useCallback(
    (photoId: string, signalType: NearMatchSignalType) => {
      if (!session) return;
      logEvent("context_signal_added", { photoId, signalType });
      const next = withNearMatchSignal(session, photoId, signalType);
      void rerank(next).then(() => logEvent("results_refined"));
    },
    [session, logEvent, rerank],
  );

  const addClue = useCallback(
    (type: ClueType, value: string) => {
      if (!session || !value.trim()) return;
      logEvent("manual_clue_added", { type, value });
      const next = withClue(session, { type, value: value.trim(), source: "user-input" });
      void rerank(next).then(() => logEvent("results_refined"));
    },
    [session, logEvent, rerank],
  );

  const removeClue = useCallback(
    (clueId: string) => {
      if (!session) return;
      logEvent("signal_removed", { clueId });
      void rerank(withoutClue(session, clueId));
    },
    [session, logEvent, rerank],
  );

  const removeSignal = useCallback(
    (photoId: string) => {
      if (!session) return;
      logEvent("signal_removed", { photoId });
      void rerank(withoutSignal(session, photoId));
    },
    [session, logEvent, rerank],
  );

  const rejectPhoto = useCallback(
    (photoId: string) => {
      if (!session) return;
      void rerank(withRejection(session, photoId)).then(() => logEvent("results_refined"));
    },
    [session, logEvent, rerank],
  );

  const openTarget = useCallback(
    (photoId: string) => {
      logEvent("target_opened", { photoId });
    },
    [logEvent],
  );

  const confirmTarget = useCallback(
    (photoId: string) => {
      if (!session) return;
      const next = withConfirmedTarget(session, photoId);
      setSession(next);
      setFound(photoId);
      persistSession(next);
      logEvent("target_confirmed", { photoId, elapsedMs: Date.now() - startedMs.current, rounds: session.clues.length + session.selectedPhotos.length });
    },
    [session, logEvent],
  );

  const reset = useCallback(() => {
    const current = live.current;
    if (current && current.status !== "success") logEvent("retrieval_abandoned");
    setSession(null);
    setAiMeta(null);
    setFound(null);
    setBusy(false);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
  }, [logEvent]);

  useEffect(() => {
    const onHide = () => {
      const current = live.current;
      if (current && current.status !== "success") logEvent("retrieval_abandoned");
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [logEvent]);

  return {
    session,
    aiMeta,
    busy,
    found,
    log,
    start,
    openNearMatch,
    useAsNearMatch,
    addClue,
    removeClue,
    removeSignal,
    rejectPhoto,
    openTarget,
    confirmTarget,
    reset,
  };
}
