export interface AnalysisRequest {
  text: string;
  title?: string;
}

export interface ImageAnalysisRequest {
  imageBase64: string;
  imageFormat: 'png' | 'jpg' | 'jpeg';
  fileName?: string;
  title?: string;
}

export interface DocumentInfo {
  rawText: string;
  documentType: string;
  title: string;
}

export interface EasyTextResult {
  level1: string;
  level2: string;
  level3: string;
}

export interface ActivityMaterials {
  checklist: string[];
  questions: string[];
  matchingCardIdeas: string[];
  coachingGuide: string;
}

export interface ActionStep {
  step: number;
  action: string;
  reason: string;
  visualTarget: string;
}

export interface VisualPrompt {
  label: string;
  target: string;
  prompt: string;
  imageUrl: string;
}

export interface CoreFields {
  date: string;
  time: string;
  place: string;
  materials: string[];
  deadline: string;
  submissionTarget: string;
  actions: string[];
  warnings: string[];
}

export interface AnalysisMetadata {
  confidence: string;
  missingFields: string[];
  warnings: string[];
}

export interface AnalysisResponse {
  document: DocumentInfo;
  coreFields: CoreFields;
  easyText: EasyTextResult;
  actionSteps: ActionStep[];
  visuals: VisualPrompt[];
  activityMaterials: ActivityMaterials;
  metadata: AnalysisMetadata;
}
