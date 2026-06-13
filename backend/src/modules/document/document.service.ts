import type {
  ActivityMaterials,
  ActionStep,
  AnalysisSummary,
  AnalyzeImageRequest,
  AnalyzeTextRequest,
  AnalyzeTextResponse,
  CoreFields,
  DocumentType,
  EasyTextLevels,
  ExtraField,
  OutputPlan,
  VisualPrompt
} from '../../common/types.js';
import { classifyDocument } from '../classification/classification.service.js';
import { extractCoreFields } from '../extraction/extraction.service.js';
import { refineDocumentUnderstanding } from '../refinement/refinement.service.js';
import { generateEasyText } from '../easyText/easyText.service.js';
import { generateActionSteps } from '../actionSteps/actionSteps.service.js';
import { generateVisualPrompts } from '../visual/visual.service.js';
import { generateActivityMaterials } from '../activity/activity.service.js';
import { extractTextFromBase64Image } from '../ocr/ocr.service.js';
import { extractDocumentTitle } from '../../common/document-title.js';

function normalizeDocumentTypeHint(value: AnalyzeTextRequest['documentTypeHint']): DocumentType | undefined {
  if (value === 'execution-guide' || value === 'submission-form' || value === 'learning-task') return value;
  return undefined;
}

function findMissingFields(coreFields: CoreFields): string[] {
  const coreKeys: (keyof CoreFields)[] = ['date', 'time', 'place', 'materials', 'deadline', 'submissionTarget'];
  return coreKeys.filter((key) => {
    const value = coreFields[key];
    if (Array.isArray(value)) return value.length === 0;
    return typeof value === 'string' && value.trim().length === 0;
  });
}

function buildFallbackEasyText(
  documentType: DocumentType,
  title: string,
  summary: AnalysisSummary,
  coreFields: CoreFields,
  extraFields: ExtraField[],
  actionSteps: ActionStep[]
): EasyTextLevels {
  const highFields = extraFields.filter((field) => field.importance === 'high').slice(0, 5);
  const primaryLines = [
    coreFields.deadline ? `기한은 ${coreFields.deadline}입니다.` : '',
    coreFields.submissionTarget ? `${coreFields.submissionTarget}에 제출하거나 보내요.` : '',
    coreFields.date || coreFields.time ? `일정은 ${[coreFields.date, coreFields.time].filter(Boolean).join(' ')}입니다.` : '',
    coreFields.place ? `장소는 ${coreFields.place}입니다.` : '',
    coreFields.materials.length ? `준비물은 ${coreFields.materials.join(', ')}입니다.` : '',
    ...highFields.map((field) => `${field.label}: ${field.value}`)
  ].filter(Boolean);
  const actionLines = actionSteps.length
    ? actionSteps.slice(0, 4).map((step) => `${step.step}. ${step.action}`)
    : coreFields.actions.slice(0, 4).map((action, index) => `${index + 1}. ${action}`);
  const warningLines = Array.from(new Set([...(summary.warningItems || []), ...coreFields.warnings])).slice(0, 4);

  const typeIntro: Record<DocumentType, string> = {
    'submission-form': '이 문서는 내용을 확인하고 작성해서 제출하거나 회신해야 하는 안내문이에요.',
    'execution-guide': '이 문서는 정해진 일정과 장소에 맞춰 행동해야 하는 안내문이에요.',
    'learning-task': '이 문서는 과제를 어떻게 해야 하는지 알려주는 안내문이에요.',
  };

  const level1 = [
    title ? `${title} 안내예요.` : '',
    summary.mainSentence || typeIntro[documentType],
    coreFields.deadline ? `${coreFields.deadline}까지 확인해요.` : '',
    coreFields.submissionTarget ? `${coreFields.submissionTarget}에 내요.` : '',
    warningLines[0] ? `주의할 점: ${warningLines[0]}` : ''
  ].filter(Boolean).join('\n\n');

  const level2 = [
    typeIntro[documentType],
    summary.mainSentence,
    primaryLines.length ? `꼭 확인할 내용입니다.\n${primaryLines.map((line) => `- ${line}`).join('\n')}` : '',
    actionLines.length ? `해야 할 일입니다.\n${actionLines.join('\n')}` : '',
    warningLines.length ? `주의할 점입니다.\n${warningLines.map((line) => `- ${line}`).join('\n')}` : ''
  ].filter(Boolean).join('\n\n');

  const level3 = [
    title ? `문서 제목은 ${title}입니다.` : '',
    typeIntro[documentType],
    summary.mainSentence,
    primaryLines.length ? `핵심 정보는 다음과 같습니다.\n${primaryLines.map((line) => `- ${line}`).join('\n')}` : '',
    actionLines.length ? `아이와 함께 순서대로 확인할 일입니다.\n${actionLines.join('\n')}` : '',
    warningLines.length ? `빠뜨리면 안 되는 주의사항입니다.\n${warningLines.map((line) => `- ${line}`).join('\n')}` : ''
  ].filter(Boolean).join('\n\n');

  return {
    level1: { text: level1 || summary.mainSentence || typeIntro[documentType], difficultWords: [] },
    level2: { text: level2 || summary.mainSentence || typeIntro[documentType], difficultWords: [] },
    level3: { text: level3 || level2 || summary.mainSentence || typeIntro[documentType], difficultWords: [] }
  };
}

function determineOutputPlan(
  documentType: DocumentType,
  visuals: VisualPrompt[],
  activityMaterials: ActivityMaterials
): OutputPlan {
  const commonBlocks = ['guide_summary', 'student_easy_text', 'execution_support_material'];
  const typeBlocks: string[] = [];
  const optionalBlocks: string[] = [];

  optionalBlocks.push('visual_cards');
  if (activityMaterials.checklist.length > 0) optionalBlocks.push('checklist');
  optionalBlocks.push('supporting_explanation');

  switch (documentType) {
    case 'execution-guide':
      typeBlocks.push('execution_guide_block');
      break;
    case 'submission-form':
      typeBlocks.push('submission_guide_block');
      break;
    case 'learning-task':
      typeBlocks.push('learning_task_block');
      break;
  }

  return { commonBlocks, typeBlocks, optionalBlocks };
}

export async function analyzeText(payload: AnalyzeTextRequest): Promise<AnalyzeTextResponse> {
  const rawText = payload.text.trim();
  const title = extractDocumentTitle(rawText, payload.title);

  const docResult = await classifyDocument(rawText, title).catch((err) => {
    console.error('classification error:', err);
    throw new Error('문서 분류 중 오류가 발생했습니다.');
  });
  const documentType = normalizeDocumentTypeHint(payload.documentTypeHint) ?? docResult.documentType;

  const initialCoreFields = await extractCoreFields(rawText, documentType).catch((err) => {
    console.error('extraction error:', err);
    throw new Error('핵심 정보 추출 중 오류가 발생했습니다.');
  });

  const refinement = await refineDocumentUnderstanding(rawText, documentType, initialCoreFields).catch((err) => {
    console.error('refinement error:', err);
    return {
      coreFields: initialCoreFields,
      extraFields: [],
      summary: {
        mainSentence: '문서의 핵심 정보를 확인하고 필요한 행동을 순서대로 진행하세요.',
        primaryItems: [],
        warningItems: initialCoreFields.warnings
      }
    };
  });
  const coreFields = refinement.coreFields ?? initialCoreFields;
  const extraFields = refinement.extraFields ?? [];
  const summary = refinement.summary ?? {
    mainSentence: '문서의 핵심 정보를 확인하고 필요한 행동을 순서대로 진행하세요.',
    primaryItems: [],
    warningItems: coreFields.warnings
  };

  const actionSteps = await generateActionSteps(rawText, coreFields).catch((err) => {
    console.error('actionSteps error:', err);
    return [];
  });

  const easyText = await generateEasyText(rawText, coreFields, documentType, actionSteps).catch((err) => {
    console.error('easyText error:', err);
    console.warn('[easyText] using fallback easy text');
    return buildFallbackEasyText(documentType, title, summary, coreFields, extraFields, actionSteps);
  });

  const [visuals, activityMaterials] = await Promise.all([
    generateVisualPrompts(coreFields, actionSteps).catch((err) => {
      console.error('visual error:', err);
      return [];
    }),
    generateActivityMaterials(rawText, documentType, coreFields).catch((err) => {
      console.error('activity error:', err);
      return { checklist: [], questions: [], matchingCardIdeas: [], coachingGuide: '' };
    })
  ]);

  const missingFields = findMissingFields(coreFields);
  const outputPlan = determineOutputPlan(documentType, visuals, activityMaterials);

  return {
    document: {
      rawText,
      documentType,
      title: docResult.title || title
    },
    coreFields,
    extraFields,
    summary,
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
    throw new Error(ocrResult.quality.reasons[0] || '이미지 또는 PDF에서 텍스트를 추출하지 못했습니다.');
  }

  const response = await analyzeText({
    text: ocrResult.fullText,
    title: payload.title || payload.fileName,
    documentTypeHint: payload.documentTypeHint
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
