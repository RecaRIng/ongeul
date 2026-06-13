export type DocumentType = 'execution-guide' | 'submission-form' | 'learning-task';
export type DocumentTypeHintInput = DocumentType | 'auto' | '' | null;

export interface DocumentInfo {
  rawText: string;
  documentType: DocumentType;
  title: string;
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

export type ExtraFieldCategory =
  | 'schedule'
  | 'application'
  | 'place'
  | 'material'
  | 'target'
  | 'condition'
  | 'contact'
  | 'warning'
  | 'learning'
  | 'other';

export type ExtraFieldImportance = 'high' | 'medium' | 'low';

export interface ExtraField {
  label: string;
  value: string;
  category: ExtraFieldCategory;
  importance: ExtraFieldImportance;
  sourceText?: string;
}

export interface AnalysisSummary {
  mainSentence: string;
  primaryItems: Array<{
    label: string;
    value: string;
    source: 'coreFields' | 'extraFields';
  }>;
  warningItems: string[];
}

export interface DifficultWord {
  word: string;
  grade: string;
  meaning: string;
  example: string;
  displayMode: {
    level1: 'inline' | 'tooltip' | 'none';
    level2: 'tooltip' | 'none';
    level3: 'tooltip' | 'none';
  };
}

export interface EasyTextLevel {
  text: string;
  difficultWords: DifficultWord[];
}

export interface EasyTextLevels {
  level1: EasyTextLevel;
  level2: EasyTextLevel;
  level3: EasyTextLevel;
}

export interface ActionStep {
  step: number;
  action: string;
  reason: string;
  visualTarget: string;
}

export interface VisualPrompt {
  cardType: string;
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
  extraFields: ExtraField[];
  summary: AnalysisSummary;
  easyText: EasyTextLevels;
  actionSteps: ActionStep[];
  visuals: VisualPrompt[];
  activityMaterials: ActivityMaterials;
  metadata: Metadata;
  outputPlan: OutputPlan;
}

export interface AnalyzeTextRequest {
  text: string;
  title?: string;
  documentTypeHint?: DocumentTypeHintInput;
}

export interface AnalyzeImageRequest {
  imageBase64: string;
  imageFormat: 'png' | 'jpg' | 'jpeg' | 'pdf';
  fileName?: string;
  title?: string;
  documentTypeHint?: DocumentTypeHintInput;
}

export interface OutputPlan {
  commonBlocks: string[];
  typeBlocks: string[];
  optionalBlocks: string[];
}
