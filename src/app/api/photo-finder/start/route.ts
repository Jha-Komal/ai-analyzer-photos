import { after } from "next/server";
import { startRetrieval, toClientResponse } from "@/lib/photo-finder/engine";
import { flushLogs, log, logEvent, logRound } from "@/lib/photo-finder/logger";
import { StartBody } from "@/lib/photo-finder/validators";
import { ok, fail } from "@/lib/api-response";

export async function POST(req: Request) {
  const parsed = StartBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Please describe the photo in a few words (max 500 characters).", 400);
  const { query, testerId, taskId } = parsed.data;
  const ctx = { testerId, taskId };

  const t0 = Date.now();
  try {
    const result = toClientResponse(await startRetrieval(query));
    logEvent("retrieval_started", result.session, ctx, { query });
    logEvent("initial_results_shown", result.session, ctx, { candidates: result.session.rounds[0].candidateImageIds, degraded: result.degraded });
    after(async () => {
      await logRound(result.session, ctx, { latencyMs: Date.now() - t0, degraded: result.degraded });
      await flushLogs();
    });
    return ok(result);
  } catch (err) {
    log("error", { session_id: null, route: "start", error: String(err), latency_ms: Date.now() - t0 });
    after(flushLogs);
    return fail("Something went wrong while searching. Please try again.");
  }
}
