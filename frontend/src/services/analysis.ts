import { AnalysisResponse, EasyTextResult } from '../types/analysis.js';

export function formatAnalysisResult(data: AnalysisResponse) {
  return {
    document: data.document,
    coreFields: data.coreFields,
    easyText: data.easyText,
    actionSteps: data.actionSteps,
    activityMaterials: data.activityMaterials,
    visuals: data.visuals,
    metadata: data.metadata
  };
}

export function getEasyTextByLevel(easyText: EasyTextResult, level: 1 | 2 | 3): string {
  if (level === 1) return easyText.level1.text;
  if (level === 2) return easyText.level2.text;
  return easyText.level3.text;
}

export function formatActivityMaterials(data: AnalysisResponse) {
  return {
    checklist: data.activityMaterials.checklist || [],
    questions: data.activityMaterials.questions || [],
    matchingCards: data.activityMaterials.matchingCardIdeas || [],
    guide: data.activityMaterials.coachingGuide || ''
  };
}
