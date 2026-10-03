export type PhotoAttributes = {
  peopleCount: number | "crowd" | "several" | null;
  scene: string;
  setting: "indoor" | "outdoor" | string;
  lighting: string;
  objects: string[];
  activity: string | null;
  dominantColors: string[];
};

/** Full photo record (server-side only: includes AI captions). */
export type Photo = {
  id: string;
  url: string;
  filename?: string;
  metadata: { date?: string; location?: string };
  aiTags: string[];
  description: string;
  attributes: PhotoAttributes;
};

/** What the browser is allowed to see: no captions, tags or scenario hints. */
export type PublicPhoto = {
  id: string;
  url: string;
  date?: string;
  location?: string;
};

export type ClueSource = "initial" | "refinement" | "anchor";

export type Clue = {
  text: string;
  source: ClueSource;
  polarity: "positive" | "negative";
  kind?: "person" | "place" | "object" | "event" | "activity" | "visual" | "time" | "context";
  confidence?: number;
  /** Search vocabulary this clue expands to (lowercase terms). */
  terms?: string[];
  removed?: boolean;
};

export type TimeClue = { start: string | null; end: string | null; confidence: "low" | "medium" | "high" };

export type RetrievalRound = {
  roundNumber: number;
  userInput?: string;
  anchorImageId?: string;
  extractedClues: string[];
  candidateImageIds: string[];
  timestamp: string;
};

export type RetrievalSession = {
  id: string;
  originalQuery: string;
  clues: Clue[];
  time?: TimeClue;
  anchorImageIds: string[];
  rejectedImageIds: string[];
  /** Aspects the user said matter about the anchor(s): lighting, people, place... */
  anchorAspects: string[];
  rounds: RetrievalRound[];
  selectedTargetImageId?: string;
  startedAt: string;
  completedAt?: string;
};

export type RankDebug = { id: string; text: number; clue: number; anchor: number; meta: number; llm: number | null; final: number };

export type RetrievalResponse = {
  session: RetrievalSession;
  candidates: PublicPhoto[];
  /** True when the LLM step failed and ranking used only the local signals. */
  degraded: boolean;
  debug?: RankDebug[];
};

export type PhotoFinderEvent =
  | "retrieval_started"
  | "initial_results_shown"
  | "candidate_rejected"
  | "anchor_selected"
  | "refinement_submitted"
  | "results_reranked"
  | "target_selected"
  | "retrieval_abandoned"
  | "retrieval_completed";
