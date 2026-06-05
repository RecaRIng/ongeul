import type { DocumentType } from '../../common/types';

export function buildClassificationPrompt(rawText: string, title: string) {
  return `### MODULE: classification
설명: 사용자가 입력한 문서를 아래 3가지 유형 중 하나로 분류하세요.
- 실행 안내형(execution-guide)
- 작성·제출형(submission-form)
- 학습 수행형(learning-task)

중요:
- 원문에 없는 정보는 추가하지 마세요.
- 문서 제목은 가능한 경우 원문 첫 줄 또는 주요 문구에서 추출하세요.

TITLE:
${title}

INPUT_TEXT:
${rawText}

RESPONSE_FORMAT:
{
  "documentType": "execution-guide",
  "title": "문서 제목"
}
`;
}
