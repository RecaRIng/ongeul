import type { DocumentType } from '../../common/types.js';

export function buildExtractionPrompt(rawText: string, documentType: DocumentType) {
  return `### MODULE: extraction
설명: 문서에서 핵심 정보를 추출합니다. 아래 JSON 구조를 반드시 준수하세요.
- 원문에 없는 정보는 추가하지 마세요.
- 핵심 정보는 누락 없이 가능한 한 정확하게 추출하세요.

DOCUMENT_TYPE: ${documentType}

INPUT_TEXT:
${rawText}

RESPONSE_FORMAT:
{
  "date": "",
  "time": "",
  "place": "",
  "materials": [],
  "deadline": "",
  "submissionTarget": "",
  "actions": [],
  "warnings": []
}
`;
}
