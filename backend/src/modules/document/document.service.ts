import type { AnalyzeImageRequest, AnalyzeTextRequest, AnalyzeTextResponse, ActivityMaterials, CoreFields, DocumentType, OutputPlan, VisualPrompt } from '../../common/types';
import { classifyDocument } from '../classification/classification.service';
import { extractCoreFields } from '../extraction/extraction.service';
import { generateEasyText } from '../easyText/easyText.service';
import { generateActionSteps } from '../actionSteps/actionSteps.service';
import { generateVisualPrompts } from '../visual/visual.service';
import { generateActivityMaterials } from '../activity/activity.service';
import { extractTextFromBase64Image } from '../ocr/ocr.service';

function createTitle(rawText: string): string {
  const firstLine = rawText.split(/\r?\n/)[0]?.trim();
  return firstLine && firstLine.length > 0 ? firstLine.slice(0, 100) : '분석 문서';
}

function findMissingFields(coreFields: CoreFields): string[] {
  const coreKeys: (keyof CoreFields)[] = ['date', 'time', 'place', 'materials', 'deadline', 'submissionTarget'];
  return coreKeys.filter(key => {
    const value = coreFields[key];
    if (Array.isArray(value)) return value.length === 0;
    return typeof value === 'string' && value.trim().length === 0;
  });
}

function determineOutputPlan(documentType: DocumentType, visuals: VisualPrompt[], activityMaterials: ActivityMaterials): OutputPlan {
  const commonBlocks = ['guide_summary', 'student_easy_text', 'execution_support_material'];
  const typeBlocks: string[] = [];
  const optionalBlocks: string[] = [];

  if (visuals.length > 0) optionalBlocks.push('visual_cards');
  if (activityMaterials.checklist.length > 0) optionalBlocks.push('checklist');
  optionalBlocks.push('supporting_explanation');

  switch (documentType) {
    case 'execution-guide': typeBlocks.push('execution_guide_block'); break;
    case 'submission-form': typeBlocks.push('submission_guide_block'); break;
    case 'learning-task':   typeBlocks.push('learning_task_block');   break;
  }

  return { commonBlocks, typeBlocks, optionalBlocks };
}

export async function analyzeText(payload: AnalyzeTextRequest): Promise<AnalyzeTextResponse> {
  const rawText = payload.text.trim();
  const title = payload.title?.trim() || createTitle(rawText);

  // 1단계: 문서 분류
  const docResult = await classifyDocument(rawText, title).catch((err) => {
    console.error('classification 오류:', err);
    throw new Error('문서 분류 중 오류가 발생했습니다.');
  });

  // 2단계: 핵심 정보 추출
  const coreFields = await extractCoreFields(rawText, docResult.documentType).catch((err) => {
    console.error('extraction 오류:', err);
    throw new Error('핵심 정보 추출 중 오류가 발생했습니다.');
  });

  // 3~4단계: 쉬운글 생성 + 행동 단계 생성 (병렬)
  const [easyText, actionSteps] = await Promise.all([
    generateEasyText(rawText, coreFields).catch((err) => {
      console.error('easyText 오류:', err);
      const empty = { text: '', difficultWords: [] };
      return { level1: empty, level2: empty, level3: empty };
    }),
    generateActionSteps(rawText, coreFields).catch((err) => {
      console.error('actionSteps 오류:', err);
      return [];
    }),
  ]);

  // 5~6단계: 시각화 프롬프트 생성 + 활동자료 생성 (병렬)
  const [visuals, activityMaterials] = await Promise.all([
    generateVisualPrompts(coreFields, actionSteps).catch((err) => {
      console.error('visual 오류:', err);
      return [];
    }),
    generateActivityMaterials(rawText, docResult.documentType, coreFields).catch((err) => {
      console.error('activity 오류:', err);
      return { checklist: [], questions: [], matchingCardIdeas: [], coachingGuide: '' };
    }),
  ]);

  const missingFields = findMissingFields(coreFields);
  const outputPlan = determineOutputPlan(docResult.documentType, visuals, activityMaterials);

  return {
    document: {
      rawText,
      documentType: docResult.documentType,
      title: docResult.title || title
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
      warnings: coreFields.warnings
    }
  };
}

export async function analyzeImage(payload: AnalyzeImageRequest): Promise<AnalyzeTextResponse> {
  const ocrResult = await extractTextFromBase64Image({
    imageBase64: payload.imageBase64,
    imageFormat: payload.imageFormat,
    fileName: payload.fileName
  });

  if (!ocrResult.fullText) {
    throw new Error(ocrResult.quality.reasons[0] || '이미지에서 텍스트를 추출하지 못했습니다.');
  }

  const response = await analyzeText({
    text: ocrResult.fullText,
    title: payload.title || payload.fileName
  });

  return {
    ...response,
    metadata: {
      ...response.metadata,
      confidence: ocrResult.quality.needsRetake ? 'low' : response.metadata.confidence,
      warnings: [...response.metadata.warnings, ...ocrResult.quality.reasons]
    }
  };
}
