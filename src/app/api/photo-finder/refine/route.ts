import { after } from "next/server";
import { refineRetrieval, refreshRetrieval, toClientResponse } from "@/lib/photo-finder/engine";
import { flushLogs, log, logEvent, logRound } from "@/lib/photo-finder/logger";
import { RefineBody } from "@/lib/photo-finder/validators";
import { ok, fail } from "@/lib/api-response";

/**
 * With anchorId + text: interpret the refinement and rerank (LLM).
 * Without them: local re-rank only, used to refill the grid after "Not this" or a removed clue.
 */
export async function POST(req: Request) {
  const parsed = RefineBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid request.", 400);
  const { session, anchorId, text, chips, testerId, taskId } = parsed.data;
  const ctx = { testerId, taskId };

  const t0 = Date.now();
  try {
    if (anchorId && text) {
      logEvent("refinement_submitted", session, ctx, { anchorId, text, chips: chips ?? [] });
      const result = toClientResponse(await refineRetrieval(session, anchorId, text));
      logEvent("results_reranked", result.session, ctx, { candidates: result.session.rounds.at(-1)?.candidateImageIds, degraded: result.degraded });
      after(async () => {
        await logRound(result.session, ctx, { latencyMs: Date.now() - t0, degraded: result.degraded });
        await flushLogs();
      });
      return ok(result);
    }
    const result = toClientResponse(await refreshRetrieval(session));
    return ok(result);
  } catch (err) {
    log("error", { session_id: session.id, route: "refine", error: String(err), latency_ms: Date.now() - t0 });
    after(flushLogs);
    return fail("Something went wrong while narrowing the results. Please try again.");
  }
}
