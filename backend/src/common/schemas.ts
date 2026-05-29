import type { AnalyzeTextRequest } from './types.js';

export const analyzeTextRequestSchema = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    title: { type: 'string' }
  },
  required: ['text'],
  additionalProperties: false
};

export function validateAnalyzeTextRequest(body: unknown): body is AnalyzeTextRequest {
  if (!body || typeof body !== 'object') {
    return false;
  }

  const candidate = body as Record<string, unknown>;
  if (typeof candidate.text !== 'string' || candidate.text.trim().length === 0) {
    return false;
  }

  if (candidate.title !== undefined && typeof candidate.title !== 'string') {
    return false;
  }

  return true;
}
