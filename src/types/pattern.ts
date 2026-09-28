import type { FailureStage, MemoryCueType, Outcome, SearchAction, Workaround } from "./episode";

export type EvidenceStrength = "HIGH" | "MEDIUM" | "LOW";

export type Pattern = {
  id: string;
  name: string;
  description: string;
  supportingEpisodeCount: number;
  sourceDiversity: number;
  commonMemoryCues: MemoryCueType[];
  commonForgottenInformation: string[];
  commonSearchBehaviors: SearchAction[];
  commonFailureStages: FailureStage[];
  commonOutcomes?: Outcome[];
  commonWorkarounds: Workaround[];
  supportingEpisodes: string[];
  contradictingEvidence: string[];
  confidence: EvidenceStrength;
};
