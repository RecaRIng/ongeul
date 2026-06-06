import type {
  ActivityMaterials,
  AnalyzeImageRequest,
  AnalyzeTextRequest,
  AnalyzeTextResponse,
  CoreFields,
  DocumentType,
  OutputPlan,
  VisualPrompt
} from '../../common/types';
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

  return coreKeys.filter((key) => {
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
  const title = payload.title?.trim() || createTitle(rawText);

  const document = await classifyDocument(rawText, title);
  const coreFields = await extractCoreFields(rawText, document.documentType);
  const [easyText, actionSteps] = await Promise.all([
    generateEasyText(rawText, coreFields),
    generateActionSteps(rawText, coreFields)
  ]);
  const [visuals, activityMaterials] = await Promise.all([
    generateVisualPrompts(coreFields, actionSteps),
    generateActivityMaterials(rawText, document.documentType, coreFields)
  ]);

  const missingFields = findMissingFields(coreFields);
  const outputPlan = determineOutputPlan(document.documentType, visuals, activityMaterials);

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
