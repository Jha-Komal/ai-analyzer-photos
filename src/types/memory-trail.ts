export type DemoPhoto = {
  id: string;
  imageUrl: string;
  date: string;
  approximateTime: string;
  location: string;
  people: string[];
  event: string;
  visualTags: string[];
  sceneDescription: string;
  semanticCaption: string;
};

export type ClueType = "query" | "event" | "person" | "place" | "time" | "visual";
export type ClueSource = "initial-query" | "photo-feedback" | "user-input" | "ai-suggestion";

export type RetrievalClue = {
  id: string;
  type: ClueType;
  value: string;
  source: ClueSource;
};

export type NearMatchSignalType = "same_event" | "same_people" | "same_place" | "around_this_time" | "similar_scene";

export type SelectedPhotoSignal = {
  photoId: string;
  signalType: NearMatchSignalType;
};

export type RetrievalStatus = "initial" | "refining" | "target-visible" | "success";

export type RetrievalSession = {
  originalQuery: string;
  clues: RetrievalClue[];
  selectedPhotos: SelectedPhotoSignal[];
  negativeSignals: string[];
  candidateIds: string[];
  status: RetrievalStatus;
  confirmedPhotoId?: string;
};

/** Strict JSON shape Claude (or the deterministic fallback) must return. Never shown to the user verbatim. */
export type AiRetrievalResponse = {
  interpretedIntent: string;
  activeSignals: string[];
  suggestedRefinements: string[];
  rankedCandidateIds: string[];
  reasoningLabels: Record<string, string>;
};

export type MemoryTrailEvent =
  | "retrieval_started"
  | "initial_results_viewed"
  | "near_match_opened"
  | "context_signal_added"
  | "manual_clue_added"
  | "results_refined"
  | "signal_removed"
  | "target_opened"
  | "target_confirmed"
  | "retrieval_abandoned";

export type EventLogEntry = {
  event: MemoryTrailEvent;
  at: string;
  payload?: Record<string, unknown>;
};
