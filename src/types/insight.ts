export type Insight = {
  id: string;
  question: string;
  answer: string;
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
