import { inferCoreFields, callLlm, safeJsonParse } from '../../common/llm.client.js';
import type { CoreFields, DocumentType } from '../../common/types.js';
import { buildExtractionPrompt } from './extraction.prompt.js';

function isValidCoreFields(obj: unknown): obj is CoreFields {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.date === 'string' &&
    typeof o.time === 'string' &&
    typeof o.place === 'string' &&
    Array.isArray(o.materials) &&
    typeof o.deadline === 'string' &&
    typeof o.submissionTarget === 'string' &&
    Array.isArray(o.actions) &&
    Array.isArray(o.warnings)
  );
}

export async function extractCoreFields(rawText: string, documentType: DocumentType): Promise<CoreFields> {
  const prompt = buildExtractionPrompt(rawText, documentType);

  try {
    const response = await callLlm(prompt);
    const parsed = safeJsonParse<CoreFields>(response);
    if (isValidCoreFields(parsed)) {
      return parsed;
    }
  } catch {
    // fall through to regex fallback
  }

  const fallback = inferCoreFields(rawText);
  return {
    date: fallback.date || '',
    time: fallback.time || '',
    place: fallback.place || '',
    materials: fallback.materials || [],
    deadline: fallback.deadline || '',
    submissionTarget: fallback.submissionTarget || '',
    actions: fallback.actions || [],
    warnings: fallback.warnings || []
  };
}
