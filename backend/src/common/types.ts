export type DocumentType = 'execution-guide' | 'submission-form' | 'learning-task';

export interface DocumentInfo {
  rawText: string;
  documentType: DocumentType;
  title: string;
}

export interface CoreFields {
  date: string;
  time: string;
  place: string;
  audience: string;
  materials: string[];
  contact: string;
  deadline: string;
  submissionTarget: string;
  actions: string[];
  warnings: string[];
}

export interface EasyTextLevels {
  level1: string;
  level2: string;
  level3: string;
}

export interface ActionStep {
  step: number;
  action: string;
  reason: string;
  visualTarget: string;
}

export interface VisualPrompt {
  cardType?: string;
  label: string;
  target: string;
  prompt: string;
  imageUrl: string;
}

export interface ActivityMaterials {
  checklist: string[];
  questions: string[];
  matchingCardIdeas: string[];
  coachingGuide: string;
}

export interface Metadata {
  confidence: string;
  missingFields: string[];
  warnings: string[];
}

export interface AnalyzeTextResponse {
  document: DocumentInfo;
  coreFields: CoreFields;
  easyText: EasyTextLevels;
  actionSteps: ActionStep[];
  visuals: VisualPrompt[];
  activityMaterials: ActivityMaterials;
  outputPlan: OutputPlan;
  metadata: Metadata;
}

export interface AnalyzeTextRequest {
  text: string;
  title?: string;
}

export interface AnalyzeImageRequest {
  imageBase64: string;
  imageFormat: 'png' | 'jpg' | 'jpeg';
  fileName?: string;
  title?: string;
}

export interface OutputPlan {
  commonBlocks: string[];
  typeBlocks: string[];
  optionalBlocks: string[];
}
