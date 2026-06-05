import type { AnalyzeImageRequest, AnalyzeTextRequest, AnalyzeTextResponse } from '../../common/types';
import { classifyDocument } from '../classification/classification.service';
import { extractCoreFields } from '../extraction/extraction.service';
import { generateEasyText } from '../easyText/easyText.service';
import { generateActionSteps } from '../actionSteps/actionSteps.service';
import { generateVisualPrompts } from '../visual/visual.service';
import { generateActivityMaterials } from '../activity/activity.service';
import { extractTextFromBase64Image } from '../ocr/ocr.service';

function createTitle(rawText: string): string {
  const firstLine = rawText.split(/\r?\n/)[0]?.trim();
  return firstLine.length > 0 ? firstLine.slice(0, 100) : '분석 문서';
}

function findMissingFields(coreFields: Record<string, unknown>) {
  return Object.entries(coreFields)
    .filter(([_, value]) => {
      if (Array.isArray(value)) return value.length === 0;
      return typeof value === 'string' && value.trim().length === 0;
    })
    .map(([key]) => key);
}

export async function analyzeText(payload: AnalyzeTextRequest): Promise<AnalyzeTextResponse> {
  const rawText = payload.text.trim();
  const title = payload.title?.trim() || createTitle(rawText);

  const document = await classifyDocument(rawText, title);
  const coreFields = await extractCoreFields(rawText, document.documentType);
  const actionSteps = await generateActionSteps(rawText, coreFields);
  const easyText = await generateEasyText(rawText, coreFields, document.documentType, actionSteps);
  const visuals = await generateVisualPrompts(coreFields, actionSteps);
  const activityMaterials = await generateActivityMaterials(rawText, document.documentType, coreFields);

  const missingFields = findMissingFields(coreFields as unknown as Record<string, unknown>);

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
