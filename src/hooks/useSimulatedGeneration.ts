import { useCallback, useEffect, useRef, useState } from "react";

const MIN_MS = 4 * 60_000;
const MAX_MS = 5 * 60_000;
const TICK_MS = 500;

/** Fakes a long-running generation: runs 4-5 minutes, reports progress 0-1, touches no data. */
export function useSimulatedGeneration() {
  const [progress, setProgress] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  const start = useCallback(() => {
    if (timer.current) return;
    const duration = MIN_MS + Math.random() * (MAX_MS - MIN_MS);
    const startedAt = Date.now();
    setProgress(0);
    timer.current = setInterval(() => {
      const p = (Date.now() - startedAt) / duration;
      if (p >= 1) {
        stop();
        setProgress(null);
      } else {
        setProgress(p);
      }
    }, TICK_MS);
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { isRunning: progress !== null, progress: progress ?? 0, start };
}
