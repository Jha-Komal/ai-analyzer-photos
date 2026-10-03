import { z } from "zod";
import { completeJsonObject } from "../openrouter";
import type { Photo, TimeClue } from "@/types/photo-finder";

const KINDS = ["person", "place", "object", "event", "activity", "visual", "time", "context"] as const;
const KIND_LIST = KINDS.join(" | ");

const ClueSchema = z.object({
  text: z.string().min(1),
  kind: z.enum(KINDS).catch("context"),
  terms: z.array(z.string()).catch([]),
});

const TimeSchema = z
  .object({
    start: z.string().nullable().catch(null),
    end: z.string().nullable().catch(null),
    confidence: z.enum(["low", "medium", "high"]).catch("low"),
  })
  .nullable()
  .catch(null);

const ExtractionSchema = z.object({
  clues: z.array(ClueSchema).catch([]),
  time: TimeSchema,
});

const ASPECTS = ["lighting", "people", "place", "time", "scene", "objects", "colors", "crowd", "activity"] as const;

const RefinementSchema = z.object({
  positive_clues: z.array(ClueSchema).catch([]),
  negative_clues: z.array(ClueSchema).catch([]),
  anchor_aspects: z.array(z.enum(ASPECTS).catch("scene")).catch([]),
  time: TimeSchema,
});

const RerankSchema = z.object({ ranking: z.array(z.string()).catch([]) });

export type Extraction = z.infer<typeof ExtractionSchema>;
export type RefinementInterpretation = z.infer<typeof RefinementSchema>;

const SYSTEM = "You are a careful assistant inside a photo-retrieval tool. Return only a single JSON object. Never invent details the user did not say.";

export async function extractClues(query: string, vocabulary: string[]): Promise<Extraction | null> {
  const user = `A user is trying to find a photo they only partly remember. Extract the weak clues from their description.

Description: """${query}"""

Rules:
- One clue per distinct remembered fact (event, person, place, object, activity, visual attribute, time, context). Keep "text" short (1-4 words, capitalised first letter).
- Do not over-infer. If the user is unsure about something, still include it but keep it generic.
- "terms": 2-6 lowercase single words a photo caption would plausibly contain for that clue (synonyms and directly implied words only, e.g. "dark" -> "dark","night","dim"). Prefer words from this vocabulary when they fit: ${vocabulary.join(", ")}.
- "time": only if the user gave a year or period; start/end as "YYYY" or "YYYY-MM"; confidence "low" if they said maybe/around; otherwise null.

Return: {"clues":[{"text":string,"kind":"${KIND_LIST}","terms":string[]}],"time":{"start":string|null,"end":string|null,"confidence":"low"|"medium"|"high"}|null}`;
  const raw = await completeJsonObject<unknown>(SYSTEM, user);
  const parsed = ExtractionSchema.safeParse(raw);
  return raw && parsed.success && parsed.data.clues.length > 0 ? parsed.data : null;
}

function photoCard(p: Photo): string {
  const a = p.attributes;
  return `${p.description} Tags: ${p.aiTags.join(", ")}. People: ${a.peopleCount ?? "unknown"}. Lighting: ${a.lighting}. Colors: ${a.dominantColors.join(", ")}. Setting: ${a.setting}.`;
}

export async function interpretRefinement(args: {
  originalQuery: string;
  existingClues: string[];
  anchor: Photo;
  refinement: string;
  vocabulary: string[];
}): Promise<RefinementInterpretation | null> {
  const user = `A user is searching for a photo they partly remember. They were shown a photo that "looks close" (the anchor) and then said what is similar or different about the photo they actually want.

Original description: """${args.originalQuery}"""
Clues so far: ${args.existingClues.join("; ") || "none"}
Anchor photo: ${photoCard(args.anchor)}
User's refinement: """${args.refinement}"""

Rules:
- positive_clues: things the wanted photo HAS according to the user's refinement. Copy a quality from the anchor ONLY when the user explicitly says the wanted photo is the same/similar/like the anchor in that respect (e.g. "same lighting" -> a short clue describing the anchor's lighting in the anchor's own words). If the user does not say that, add nothing taken from the anchor. Keep "text" short.
- negative_clues: things the wanted photo does NOT have or where the anchor is wrong (e.g. "wrong person", "not outdoors").
- anchor_aspects: only aspects of the anchor the user explicitly said are right or similar, chosen from ${ASPECTS.join(", ")}. Return [] if they did not say so. Never guess.
- "terms": 2-6 lowercase single words a photo caption would plausibly contain. Prefer: ${args.vocabulary.slice(0, 120).join(", ")}.
- "time": only if the refinement changes or adds a time (e.g. "later that night" is not a date; leave null).
- Do not invent facts, names or identities.

Return: {"positive_clues":[{"text":string,"kind":"${KIND_LIST}","terms":string[]}],"negative_clues":[{"text":string,"kind":"${KIND_LIST}","terms":string[]}],"anchor_aspects":string[],"time":{"start":string|null,"end":string|null,"confidence":"low"|"medium"|"high"}|null}`;
  const raw = await completeJsonObject<unknown>(SYSTEM, user);
  const parsed = RefinementSchema.safeParse(raw);
  return raw && parsed.success ? parsed.data : null;
}

export async function llmRerank(args: {
  query: string;
  positive: string[];
  negative: string[];
  anchors: Photo[];
  rejected: Photo[];
  candidates: { photo: Photo }[];
}): Promise<string[] | null> {
  const cards = args.candidates.map(({ photo }) => `[${photo.id}] ${photoCard(photo)}${photo.metadata.date ? ` Date: ${photo.metadata.date}.` : ""}${photo.metadata.location ? ` Place: ${photo.metadata.location}.` : ""}`);
  const user = `Rank candidate photos by how likely each is the ONE photo the user is trying to find.

User's original description: """${args.query}"""
Clues the wanted photo has: ${args.positive.join("; ") || "none"}
Clues it does NOT have: ${args.negative.join("; ") || "none"}
${args.anchors.length ? `Photos the user said "look close" but are NOT the wanted photo (similar in some way, different in another):\n${args.anchors.map(photoCard).join("\n")}\n` : ""}${args.rejected.length ? `Photos the user rejected outright (rank similar-looking ones lower):\n${args.rejected.map(photoCard).join("\n")}\n` : ""}
Candidates:
${cards.join("\n")}

Judge only from the information given. Prefer candidates that satisfy the specific clues; do not prefer a candidate merely for resembling a "close" anchor in the aspect the user said was wrong.
Return: {"ranking":[ids from best to worst, every candidate id exactly once]}`;
  const raw = await completeJsonObject<unknown>(SYSTEM, user, { maxTokens: 900, timeoutMs: 25_000 });
  const parsed = RerankSchema.safeParse(raw);
  if (!parsed.success || parsed.data.ranking.length === 0) return null;
  const valid = new Set(args.candidates.map((c) => c.photo.id));
  const seen = new Set<string>();
  const ids = parsed.data.ranking.filter((id) => valid.has(id) && !seen.has(id) && seen.add(id));
  return ids.length >= Math.min(3, valid.size) ? ids : null;
}

export type { TimeClue };
