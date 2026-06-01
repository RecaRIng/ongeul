import type { AnalyzeTextRequest, AnalyzeTextResponse } from '../../common/types.js';
import { classifyDocument } from '../classification/classification.service.js';
import { extractCoreFields } from '../extraction/extraction.service.js';
import { generateEasyText } from '../easyText/easyText.service.js';
import { generateActionSteps } from '../actionSteps/actionSteps.service.js';
import { generateVisualPrompts } from '../visual/visual.service.js';
import { generateActivityMaterials } from '../activity/activity.service.js';

function createTitle(rawText: string): string {
  const firstLine = rawText.split(/\r?\n/)[0]?.trim();
  return firstLine && firstLine.length > 0 ? firstLine.slice(0, 100) : '분석 문서';
}

function findMissingFields(coreFields: Record<string, unknown>): string[] {
  return Object.entries(coreFields)
    .filter(([_, value]) => {
      if (Array.isArray(value)) return value.length === 0;
      return typeof value === 'string' && value.trim().length === 0;
    })
    .map(([key]) => key);
}

function determineOutputPlan(documentType: string): {
  commonBlocks: string[];
  typeBlocks: string[];
  optionalBlocks: string[];
} {
  const commonBlocks = ['guide_summary', 'student_easy_text', 'execution_support_material'];
  const typeBlocks: string[] = [];
  const optionalBlocks: string[] = ['visual_cards', 'checklist', 'supporting_explanation'];

  if (documentType.includes('실행 안내형')) typeBlocks.push('execution_guide_block');
  if (documentType.includes('작성·제출형')) typeBlocks.push('submission_guide_block');
  if (documentType.includes('학습 수행형')) typeBlocks.push('learning_task_block');

  return { commonBlocks, typeBlocks, optionalBlocks };
}

export async function analyzeText(payload: AnalyzeTextRequest): Promise<AnalyzeTextResponse> {
  const rawText = payload.text.trim();
  const title = payload.title?.trim() || createTitle(rawText);

  // 1단계: 문서 분류
  const document = await classifyDocument(rawText, title).catch((err) => {
    console.error('classification 오류:', err);
    throw new Error('문서 분류 중 오류가 발생했습니다.');
  });

  // 2단계: 핵심 정보 추출
  const coreFields = await extractCoreFields(rawText, document.documentType).catch((err) => {
    console.error('extraction 오류:', err);
    throw new Error('핵심 정보 추출 중 오류가 발생했습니다.');
  });

  // 3단계: 쉬운글 생성
  const easyText = await generateEasyText(rawText, coreFields).catch((err) => {
    console.error('easyText 오류:', err);
    return { level1: '', level2: '', level3: '' };
  });

  // 4단계: 행동 단계 생성
  const actionSteps = await generateActionSteps(rawText, coreFields).catch((err) => {
    console.error('actionSteps 오류:', err);
    return [];
  });

  // 5단계: 시각화 프롬프트 생성
  const visuals = await generateVisualPrompts(coreFields, actionSteps).catch((err) => {
    console.error('visual 오류:', err);
    return [];
  });

  // 6단계: 활동자료 생성
  const activityMaterials = await generateActivityMaterials(rawText, document.documentType, coreFields).catch((err) => {
    console.error('activity 오류:', err);
    return { checklist: [], questions: [] };
  });

  const missingFields = findMissingFields(coreFields as unknown as Record<string, unknown>);
  const outputPlan = determineOutputPlan(document.documentType);

  return {
    document: {
      rawText,
      documentType: document.documentType,
      title: document.title || title
    },
    coreFields,
    easyText,
    actionSteps,
    visuals,
    activityMaterials,
    outputPlan,
    metadata: {
      confidence: 'medium',
      missingFields,
      warnings: coreFields.warnings || []
    }
  };
}
