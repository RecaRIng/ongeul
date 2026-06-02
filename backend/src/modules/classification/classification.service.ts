import { inferDocumentType } from '../../common/llm.client';
import type { DocumentType } from '../../common/types';
import { buildClassificationPrompt } from './classification.prompt';

interface ClassificationResult {
  documentType: DocumentType;
  title: string;
}

export async function classifyDocument(rawText: string, title: string): Promise<ClassificationResult> {
  const documentType = inferDocumentType(rawText);
  const prompt = buildClassificationPrompt(rawText, title);

  return {
    documentType,
    title
  };
}
