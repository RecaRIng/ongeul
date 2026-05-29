import type { CoreFields, DocumentType } from '../../common/types.js';

export function buildActivityPrompt(rawText: string, documentType: DocumentType, coreFields: CoreFields) {
  return `### MODULE: activity
설명: 교사/보호자가 바로 활용할 수 있는 활동 지원 자료를 생성합니다.
- 체크리스트
- 확인 질문
- 카드 선잇기 활동 아이디어
- 교사/보호자 코칭 가이드

원문에 없는 정보는 추가하지 마세요.

DOCUMENT_TYPE: ${documentType}

INPUT_TEXT:
${rawText}

CORE_FIELDS:
${JSON.stringify(coreFields, null, 2)}

RESPONSE_FORMAT:
{
  "checklist": [],
  "questions": [],
  "matchingCardIdeas": [],
  "coachingGuide": ""
}
`;
}
