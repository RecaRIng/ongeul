// 분석 요청/응답 타입

export interface AnalysisRequest {
  rawText: string;
  documentType?: string;
}

export interface ImageAnalysisRequest {
  imageBase64: string;
  imageFormat: 'png' | 'jpg' | 'jpeg';
}

export interface DocumentInfo {
  rawText: string;
  documentType: string;
  title: string;
}

export interface ClassificationResult {
  documentType: string;
  confidence: number;
  alternatives?: string[];
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

export interface VisualResult {
  timeline?: string;
  diagram?: string;
  timeline_text?: string;
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

export interface AnalysisResponse {
  document: DocumentInfo;
  classification: ClassificationResult;
  coreFields: CoreFields;
  easyText: EasyTextResult;
  actionSteps: ActionStep[];
  activityMaterials: ActivityMaterials;
  visual: VisualResult;
}
