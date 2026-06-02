import { callLlm, inferCoreFields, safeJsonParse } from '../../common/llm.client.js';
import type { CoreFields, DocumentType } from '../../common/types.js';
import { buildExtractionPrompt } from './extraction.prompt.js';

type CoreFieldsLlmResult = Partial<Record<keyof CoreFields, unknown>>;

function getStringField(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

function getStringArrayField(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const filtered = value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (filtered.length > 0) {
      return filtered;
    }
  }
  return fallback;
}

export async function extractCoreFields(rawText: string, documentType: DocumentType): Promise<CoreFields> {
  try {
    const fallback = inferCoreFields(rawText);
    const prompt = buildExtractionPrompt(rawText, documentType);
    const response = await callLlm(prompt);
    const parsed = safeJsonParse<CoreFieldsLlmResult>(response);

    return {
      date: getStringField(parsed?.date, fallback.date),
      time: getStringField(parsed?.time, fallback.time),
      place: getStringField(parsed?.place, fallback.place),
      materials: getStringArrayField(parsed?.materials, fallback.materials),
      deadline: getStringField(parsed?.deadline, fallback.deadline),
      submissionTarget: getStringField(parsed?.submissionTarget, fallback.submissionTarget),
      actions: getStringArrayField(parsed?.actions, fallback.actions),
      warnings: getStringArrayField(parsed?.warnings, fallback.warnings)
    };
  } catch {
    // 오류 발생 시 fallback
    const fallback = inferCoreFields(rawText);
    return fallback;
  }
}
