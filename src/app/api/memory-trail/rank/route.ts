import { z } from "zod";
import { interpretAndRank } from "@/lib/memory-trail/ai";
import { scorePhotos, SHOW } from "@/lib/memory-trail/retrieval";
import { DEMO_PHOTOS } from "@/lib/memory-trail/demoPhotos";
import { ok, fail } from "@/lib/api-response";

const ClueSchema = z.object({
  id: z.string(),
  type: z.enum(["query", "event", "person", "place", "time", "visual"]),
  value: z.string().max(200),
  source: z.enum(["initial-query", "photo-feedback", "user-input", "ai-suggestion"]),
});

const SessionSchema = z.object({
  originalQuery: z.string().max(300),
  clues: z.array(ClueSchema).max(40),
  selectedPhotos: z.array(z.object({ photoId: z.string(), signalType: z.enum(["same_event", "same_people", "same_place", "around_this_time", "similar_scene"]) })).max(20),
  negativeSignals: z.array(z.string()).max(60),
  candidateIds: z.array(z.string()).max(60),
  status: z.enum(["initial", "refining", "target-visible", "success"]),
  confirmedPhotoId: z.string().optional(),
});

const RequestSchema = z.object({ session: SessionSchema });

/** AI-backed re-rank, with a deterministic fallback baked in -- never exposes OPENROUTER_API_KEY to the browser. */
export async function POST(req: Request) {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid session.", 400);
  const { session } = parsed.data;

  const ai = await interpretAndRank(DEMO_PHOTOS, session);
  if (ai) return ok({ ...ai, source: "ai" as const });

  const deterministicIds = scorePhotos(DEMO_PHOTOS, session)
    .slice(0, SHOW)
    .map((s) => s.id);
  return ok({
    interpretedIntent: "",
    activeSignals: [],
    suggestedRefinements: [],
    rankedCandidateIds: deterministicIds,
    reasoningLabels: {},
    source: "deterministic" as const,
  });
}
