import { z } from "zod";

const Id = z.string().min(1).max(80);
const Text = z.string().trim().min(1).max(500);

const ClueSchema = z.object({
  text: z.string().max(200),
  source: z.enum(["initial", "refinement", "anchor"]),
  polarity: z.enum(["positive", "negative"]),
  kind: z.enum(["person", "place", "object", "event", "activity", "visual", "time", "context"]).optional(),
  confidence: z.number().optional(),
  terms: z.array(z.string().max(60)).max(40).optional(),
  removed: z.boolean().optional(),
});

const RoundSchema = z.object({
  roundNumber: z.number().int().min(1).max(50),
  userInput: z.string().max(500).optional(),
  anchorImageId: Id.optional(),
  extractedClues: z.array(z.string().max(200)).max(40),
  candidateImageIds: z.array(Id).max(60),
  timestamp: z.string().max(40),
});

export const SessionSchema = z.object({
  id: Id,
  originalQuery: z.string().max(500),
  clues: z.array(ClueSchema).max(80),
  time: z
    .object({ start: z.string().nullable(), end: z.string().nullable(), confidence: z.enum(["low", "medium", "high"]) })
    .optional(),
  anchorImageIds: z.array(Id).max(30),
  rejectedImageIds: z.array(Id).max(120),
  anchorAspects: z.array(z.string().max(30)).max(20),
  rounds: z.array(RoundSchema).max(50),
  selectedTargetImageId: Id.optional(),
  startedAt: z.string().max(40),
  completedAt: z.string().max(40).optional(),
});

const Context = { testerId: z.string().max(60).optional(), taskId: z.string().max(40).optional() };

export const StartBody = z.object({ query: Text, ...Context });
export const RefineBody = z.object({
  session: SessionSchema,
  anchorId: Id.optional(),
  text: Text.optional(),
  /** Quick chips the user tapped (logged only; their meaning is already in `text`). */
  chips: z.array(z.string().max(40)).max(12).optional(),
  ...Context,
});

export const EventBody = z.object({
  event: z.enum([
    "candidate_rejected",
    "anchor_selected",
    "target_selected",
    "retrieval_abandoned",
    "retrieval_completed",
    "clue_removed",
    "clue_added",
  ]),
  session: SessionSchema,
  imageId: Id.optional(),
  metrics: z
    .object({
      candidatesViewed: z.number().int().min(0).max(1000),
      totalSeconds: z.number().min(0).max(86_400),
      rounds: z.number().int().min(0).max(50),
    })
    .optional(),
  ...Context,
});
