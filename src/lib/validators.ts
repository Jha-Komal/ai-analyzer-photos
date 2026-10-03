import { z } from "zod";

export const InsightSchema = z.object({
  question: z.string(),
  observation: z.string(),
  interpretation: z.string(),
  hypothesis: z.string(),
  limitation: z.string(),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  supportingEpisodeIds: z.array(z.string()),
  evidenceCount: z.number(),
});

export const InsightArraySchema = z.array(InsightSchema);
