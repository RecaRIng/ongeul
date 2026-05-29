import type { AnalyzeTextRequest, AnalyzeTextResponse } from '../../common/types.js';
import { classifyDocument } from '../classification/classification.service.js';
import { extractCoreFields } from '../extraction/extraction.service.js';
import { generateEasyText } from '../easyText/easyText.service.js';
import { generateActionSteps } from '../actionSteps/actionSteps.service.js';
import { generateVisualPrompts } from '../visual/visual.service.js';
import { generateActivityMaterials } from '../activity/activity.service.js';

function createTitle(rawText: string): string {
  const firstLine = rawText.split(/\r?\n/)[0]?.trim();
  return firstLine.length > 0 ? firstLine.slice(0, 100) : '분석 문서';
}

function findMissingFields(coreFields: Record<string, unknown>) {
  return Object.entries(coreFields)
    .filter(([_, value]) => {
      if (Array.isArray(value)) {
        return value.length === 0;
      }
      return typeof value === 'string' && value.trim().length === 0;
    })
    .map(([key]) => key);
}

export async function analyzeText(payload: AnalyzeTextRequest): Promise<AnalyzeTextResponse> {
  const rawText = payload.text.trim();
  const title = payload.title?.trim() || createTitle(rawText);

  const document = await classifyDocument(rawText, title);
  const coreFields = await extractCoreFields(rawText, document.documentType);
  const easyText = await generateEasyText(rawText, coreFields);
  const actionSteps = await generateActionSteps(rawText, coreFields);
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
