import { callLlm, inferCoreFields, safeJsonParse } from '../../common/llm.client';
import type { CoreFields, DocumentType } from '../../common/types';
import { buildExtractionPrompt } from './extraction.prompt';

type CoreFieldsLlmResult = Partial<Record<keyof CoreFields, unknown>>;

function getStringField(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

function getStringArrayField(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;

  const filtered = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return filtered.length > 0 ? filtered : fallback;
}

export async function extractCoreFields(rawText: string, documentType: DocumentType): Promise<CoreFields> {
  const fallback = inferCoreFields(rawText);

  try {
    const prompt = buildExtractionPrompt(rawText, documentType);
    const response = await callLlm(prompt);
    const parsed = safeJsonParse<CoreFieldsLlmResult>(response);

    return {
      date: getStringField(parsed?.date, fallback.date),
      time: getStringField(parsed?.time, fallback.time),
      place: getStringField(parsed?.place, fallback.place),
      audience: getStringField(parsed?.audience, fallback.audience),
      materials: getStringArrayField(parsed?.materials, fallback.materials),
      contact: getStringField(parsed?.contact, fallback.contact),
      deadline: getStringField(parsed?.deadline, fallback.deadline),
      submissionTarget: getStringField(parsed?.submissionTarget, fallback.submissionTarget),
      actions: getStringArrayField(parsed?.actions, fallback.actions),
      warnings: getStringArrayField(parsed?.warnings, fallback.warnings)
    };
  } catch {
    return fallback;
  }
}
