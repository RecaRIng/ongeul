import type { CoreFields } from '../../common/types.js';

export function buildEasyTextPrompt(rawText: string, coreFields: CoreFields) {
  return `### MODULE: easyText
설명: 입력 문서를 3단계 난이도의 쉬운글로 변환합니다.
- Level 1: 가장 짧고 쉬운 문장, 핵심 행동 중심
- Level 2: 기본 쉬운글, 핵심 정보와 간단한 설명 포함
- Level 3: 핵심 용어를 유지하고 이유·맥락까지 설명
- 원문에 없는 정보는 추가하지 마세요.

INPUT_TEXT:
${rawText}

CORE_FIELDS:
${JSON.stringify(coreFields, null, 2)}

RESPONSE_FORMAT:
{
  "level1": "",
  "level2": "",
  "level3": ""
}
`;
}
