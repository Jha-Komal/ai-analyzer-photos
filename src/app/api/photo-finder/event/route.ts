import { after } from "next/server";
import { flushLogs, logEvent, logSessionEnd } from "@/lib/photo-finder/logger";
import { EventBody } from "@/lib/photo-finder/validators";
import { ok, fail } from "@/lib/api-response";

/** Client-side events (the server logs start/refine events itself). */
export async function POST(req: Request) {
  const parsed = EventBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid event.", 400);
  const { event, session, imageId, metrics, testerId, taskId } = parsed.data;
  const ctx = { testerId, taskId };

  logEvent(event, session, ctx, { imageId: imageId ?? null, metrics: metrics ?? null });
  after(async () => {
    if (metrics && event === "retrieval_completed") await logSessionEnd(session, ctx, "found", metrics);
    if (metrics && event === "retrieval_abandoned") await logSessionEnd(session, ctx, "abandoned", metrics);
    await flushLogs();
  });
  return ok({ logged: true });
}
