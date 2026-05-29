import { AnalysisResponse, EasyTextResult } from '../types/analysis.js';

// 분석 결과 데이터 처리 유틸리티

export function formatAnalysisResult(data: AnalysisResponse) {
  return {
    document: data.document,
    classification: data.classification,
    coreFields: data.coreFields,
    easyText: data.easyText,
    actionSteps: data.actionSteps,
    activityMaterials: data.activityMaterials,
    visual: data.visual,
  };
}

export function getEasyTextByLevel(easyText: EasyTextResult, level: 1 | 2 | 3): string {
  if (level === 1) return easyText.level1;
  if (level === 2) return easyText.level2;
  return easyText.level3;
}

export function formatActivityMaterials(data: AnalysisResponse) {
  return {
    checklist: data.activityMaterials.checklist || [],
    questions: data.activityMaterials.questions || [],
    matchingCards: data.activityMaterials.matchingCardIdeas || [],
    guide: data.activityMaterials.coachingGuide || '',
  };
}
