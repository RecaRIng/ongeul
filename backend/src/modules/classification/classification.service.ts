import { callLlm, inferDocumentType, safeJsonParse } from '../../common/llm.client';
import type { DocumentType } from '../../common/types';
import { buildClassificationPrompt } from './classification.prompt';

interface ClassificationResult {
  documentType: DocumentType;
  title: string;
}

interface ClassificationLlmResult {
  documentType?: unknown;
  title?: unknown;
}

function isDocumentType(value: unknown): value is DocumentType {
  return (
    value === 'execution-guide' ||
    value === 'submission-form' ||
    value === 'learning-task'
  );
}

function isMeaningfulTitle(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return !['문서 분석 결과', '문서 제목', '제목 없음'].includes(trimmed);
}

export async function classifyDocument(rawText: string, title: string): Promise<ClassificationResult> {
  try {
    const prompt = buildClassificationPrompt(rawText, title);
    const response = await callLlm(prompt);
    const parsed = safeJsonParse<ClassificationLlmResult>(response);

    const fallbackDocumentType = inferDocumentType(rawText);
    let resultDocumentType: DocumentType = fallbackDocumentType;

    if (
      fallbackDocumentType === 'execution-guide' &&
      parsed &&
      isDocumentType(parsed.documentType)
    ) {
      resultDocumentType = parsed.documentType;
    }

    const inputTitle = title.trim();
    let resultTitle: string = inputTitle;

    if (resultTitle.length === 0 && parsed && isMeaningfulTitle(parsed.title)) {
      resultTitle = parsed.title.trim();
    }

    return { documentType: resultDocumentType, title: resultTitle };
  } catch {
    const fallbackTitle = title.trim();
    return {
      documentType: inferDocumentType(rawText),
      title: fallbackTitle.length > 0 ? fallbackTitle : title
    };
  }
}
