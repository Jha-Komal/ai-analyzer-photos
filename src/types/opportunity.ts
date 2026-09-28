import type { FailureStage, Workaround } from "./episode";

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type Opportunity = {
  id: string;
  opportunity: string;
  behavioralProblem: string;
  rememberedInformation: string[];
  missingInformation: string[];
  failureStage: FailureStage;
  workarounds: Workaround[];
  supportingEvidence: string[];
  counterEvidence: string[];
  researchQuestions: string[];
  confidence: Confidence;
};

export type InterviewGuide = {
  patternId: string;
  researchObjective: string;
  openingQuestions: string[];
  coreQuestions: string[];
  behavioralProbes: string[];
  failureProbes: string[];
  workaroundProbes: string[];
  closingQuestions: string[];
};
