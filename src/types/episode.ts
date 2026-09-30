export type ScenarioCategory =
  | "TRAVEL"
  | "FAMILY"
  | "FRIENDS"
  | "WORK"
  | "HEALTH"
  | "DOCUMENT"
  | "RECEIPT"
  | "SCREENSHOT"
  | "EVENT"
  | "FOOD"
  | "SHOPPING"
  | "CHILDREN"
  | "PET"
  | "HOME"
  | "HOBBY"
  | "OTHER"
  | "UNKNOWN";

export type TargetType = "PHOTO" | "VIDEO" | "SCREENSHOT" | "DOCUMENT" | "RECEIPT" | "MEME" | "OTHER" | "UNKNOWN";

export type MemoryCueType =
  | "PERSON"
  | "PLACE"
  | "OBJECT"
  | "EVENT"
  | "ACTIVITY"
  | "VISUAL_ATTRIBUTE"
  | "TEXT"
  | "TIME"
  | "RELATIONSHIP"
  | "CONTEXT";

export type ForgottenCategory =
  | "EXACT_DATE"
  | "APPROXIMATE_DATE"
  | "EXACT_LOCATION"
  | "EXACT_PLACE_NAME"
  | "ALBUM"
  | "FILENAME"
  | "PERSON_NAME"
  | "EVENT_NAME"
  | "OBJECT_NAME"
  | "TEXT_CONTENT"
  | "PHOTO_SEQUENCE"
  | "SOURCE_DEVICE"
  | "PHOTOGRAPHER"
  | "RELATIONSHIP"
  | "CONTEXT"
  | "UNKNOWN";

export type SearchAction =
  | "SEARCH"
  | "REFORMULATE"
  | "BROADEN_QUERY"
  | "NARROW_QUERY"
  | "ADD_PERSON"
  | "ADD_LOCATION"
  | "ADD_TIME"
  | "REMOVE_TERM"
  | "TRY_SYNONYM"
  | "BROWSE_TIMELINE"
  | "OPEN_ALBUM"
  | "CHECK_SHARED_ALBUM"
  | "FILTER_DATE"
  | "FILTER_LOCATION"
  | "MANUAL_SCROLL"
  | "ASK_OTHER_PERSON"
  | "OTHER";

export type SearchStep = {
  step: number;
  action: SearchAction;
  query: string | null;
  description?: string;
};

export type Outcome =
  | "FOUND_DIRECTLY"
  | "FOUND_AFTER_REFORMULATION"
  | "FOUND_AFTER_WORKAROUND"
  | "NOT_FOUND"
  | "ABANDONED"
  | "UNKNOWN";

export type FailureStage =
  | "NONE"
  | "MEMORY_EXPRESSION"
  | "QUERY_FORMULATION"
  | "QUERY_UNDERSTANDING"
  | "SEMANTIC_RETRIEVAL"
  | "RESULT_EVALUATION"
  | "RECOVERY"
  | "UNKNOWN";

export type Workaround =
  | "TIMELINE_SCROLLING"
  | "ALBUM_BROWSING"
  | "DATE_FILTERING"
  | "LOCATION_FILTERING"
  | "PERSON_SEARCH"
  | "OBJECT_SEARCH"
  | "TRY_SYNONYMS"
  | "BROADEN_SEARCH"
  | "NARROW_SEARCH"
  | "ASK_ANOTHER_PERSON"
  | "CHECK_DEVICE"
  | "CHECK_SHARED_ALBUM"
  | "USE_EXTERNAL_SEARCH"
  | "GIVE_UP"
  | "OTHER"
  | "NONE";

export type RetrievalEpisode = {
  id: string;
  sourceDocumentId: string;

  scenario: {
    category: ScenarioCategory;
    description: string;
  };

  target: {
    type: TargetType;
    description: string;
  };

  remembered: {
    people: string[];
    places: string[];
    objects: string[];
    events: string[];
    activities: string[];
    visualAttributes: string[];
    textInImage: string[];
    time: string[];
    relationships: string[];
    context: string[];
  };

  forgotten: string[];

  searchJourney: SearchStep[];

  outcome: Outcome;

  workaround: Workaround | null;

  failureStage: FailureStage;

  evidence: {
    directQuote: string;
    sourceUrl: string;
  };

  confidence: number;

  /** DIRECT_RETRIEVAL = a real memory-based retrieval attempt (the primary
   * evidence for this research). ADJACENT_RETRIEVAL = the underlying document
   * was actually a backup/sync/deletion/storage problem, not a retrieval
   * failure -- kept here as contrast evidence per the spec's evidence
   * hierarchy, never to be presented as a retrieval-failure finding on its
   * own. Absent/undefined on episodes extracted before this field existed --
   * treat as DIRECT_RETRIEVAL. */
  relevanceClass?: "DIRECT_RETRIEVAL" | "ADJACENT_RETRIEVAL";
  /** Only set when relevanceClass is ADJACENT_RETRIEVAL: what actually broke
   * (e.g. "automatic backup silently failed", "account storage full"). */
  adjacentCause?: string | null;
};
