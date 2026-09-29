/** The discovery questions this engine needs to answer, in quick Q&A form --
 * derived from the case study's sample questions plus the standard shape of
 * a retrieval episode (spec section 2). */
export const DISCOVERY_QUESTIONS = [
  "What kinds of old photos, videos, screenshots, or documents do users struggle to retrieve?",
  "What information do people actually remember about a photo when they start searching?",
  "What information have they forgotten by the time they search?",
  "How do users formulate a search when their memory is incomplete?",
  "How do users reformulate their search after an initial attempt fails?",
  "Does Google Photos fail to understand the clues the user does provide?",
  "Are potentially relevant results difficult for the user to evaluate or recognize?",
  "What workarounds do users fall back on after a search fails (browsing, asking someone, giving up)?",
  "At which stage does retrieval most often break down (expressing memory, formulating a query, the system understanding it, relevant results surfacing, evaluating results, or recovering from failure)?",
  "How do these behaviors differ across scenarios (travel, family, documents, screenshots, etc.)?",
] as const;

export const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit",
  google_photos_community: "Google Photos Community",
  play_store: "Google Play Store",
  app_store: "Apple App Store",
};

export const RELEVANCE_LABELS: Record<string, string> = {
  DIRECT_RETRIEVAL: "Direct Retrieval",
  ADJACENT_RETRIEVAL: "Adjacent (backup/sync/deletion)",
  NOT_RELEVANT: "Not Relevant",
  UNCERTAIN: "Uncertain",
};
