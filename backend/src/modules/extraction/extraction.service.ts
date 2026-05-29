import { inferCoreFields } from '../../common/llm.client.js';
import type { CoreFields, DocumentType } from '../../common/types.js';
import { buildExtractionPrompt } from './extraction.prompt.js';

const emptyFields: CoreFields = {
  date: '',
  time: '',
  place: '',
  materials: [],
  deadline: '',
  submissionTarget: '',
  actions: [],
  warnings: []
};

export async function extractCoreFields(rawText: string, documentType: DocumentType): Promise<CoreFields> {
  const prompt = buildExtractionPrompt(rawText, documentType);
  const coreFields = inferCoreFields(rawText);

  return {
    date: coreFields.date || '',
    time: coreFields.time || '',
    place: coreFields.place || '',
    materials: coreFields.materials || [],
    deadline: coreFields.deadline || '',
    submissionTarget: coreFields.submissionTarget || '',
    actions: coreFields.actions || [],
    warnings: coreFields.warnings || []
  };
}
