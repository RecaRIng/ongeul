import { callLlm, inferDocumentTitle, inferDocumentType, safeJsonParse } from '../../common/llm.client';
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
  return value === 'execution-guide' || value === 'submission-form' || value === 'learning-task';
}

function isMeaningfulTitle(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (/\.(jpe?g|png|webp|gif|pdf)$/i.test(trimmed)) return false;
  return !['문서 분석 결과', '문서 제목', '제목 없음'].includes(trimmed);
}

function titleFromText(rawText: string): string {
  return inferDocumentTitle(rawText).slice(0, 100);
}

export async function classifyDocument(rawText: string, title: string): Promise<ClassificationResult> {
  try {
    const prompt = buildClassificationPrompt(rawText, title);
    const response = await callLlm(prompt);
    const parsed = safeJsonParse<ClassificationLlmResult>(response);
    const fallbackDocumentType = inferDocumentType(rawText);

    const documentType =
      fallbackDocumentType === 'execution-guide' && parsed && isDocumentType(parsed.documentType)
        ? parsed.documentType
        : fallbackDocumentType;

    const inputTitle = title.trim();
    const parsedTitle = parsed && isMeaningfulTitle(parsed.title) ? parsed.title.trim() : '';
    const resultTitle =
      parsedTitle && (!isMeaningfulTitle(inputTitle) || (parsedTitle.startsWith(inputTitle) && parsedTitle.length > inputTitle.length))
        ? parsedTitle
        : isMeaningfulTitle(inputTitle)
          ? inputTitle
          : titleFromText(rawText);

    return { documentType, title: resultTitle };
  } catch {
    const fallbackTitle = title.trim();
    return {
      documentType: inferDocumentType(rawText),
      title: isMeaningfulTitle(fallbackTitle) ? fallbackTitle : titleFromText(rawText)
    };
  }
}
