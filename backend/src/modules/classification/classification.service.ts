import { inferDocumentType } from '../../common/llm.client.js';
import type { DocumentType } from '../../common/types.js';
import { buildClassificationPrompt } from './classification.prompt.js';

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
