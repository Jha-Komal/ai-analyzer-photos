export type Insight = {
  id: string;
  question: string;
  /** Only what the data directly shows. */
  observation: string;
  /** What the observed pattern may mean -- interpretation, not fact. */
  interpretation: string;
  /** What primary (interview) research should test next. */
  hypothesis: string;
  /** Why this finding should not be overgeneralized. */
  limitation: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  supportingEpisodeIds: string[];
  evidenceCount: number;
};

export type ResearchReport = {
  content: string;
  generatedAt: string;
  episodeCount: number;
  documentCount: number;
};
