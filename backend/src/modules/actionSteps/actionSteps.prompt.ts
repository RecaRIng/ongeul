import type { CoreFields } from '../../common/types.js';

export function buildActionStepsPrompt(rawText: string, coreFields: CoreFields) {
  return `### MODULE: actionSteps
설명: 문서 안의 지시사항을 학생이 따라 할 수 있는 행동 단계로 나눕니다.
- 한 단계에는 하나의 행동만 포함합니다.
- 순서가 필요한 경우 번호를 붙입니다.
- 원문에 없는 행동은 추가하지 않습니다.

INPUT_TEXT:
${rawText}

CORE_FIELDS:
${JSON.stringify(coreFields, null, 2)}

RESPONSE_FORMAT:
[
  {
    "step": 1,
    "action": "",
    "reason": "",
    "visualTarget": ""
  }
]
`;
}
