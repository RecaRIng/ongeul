import type { ActionStep, CoreFields } from '../../common/types';

export function buildVisualPrompt(coreFields: CoreFields, actionSteps: ActionStep[]) {
  return `### MODULE: visual
설명: 핵심 행동, 준비물, 장소 등 시각화가 필요한 항목을 추출하고, 이미지 생성 API로 넘기기 위한 프롬프트 구조를 만듭니다.
- 실제 이미지 생성 API 호출은 아직 연결하지 않습니다.
- visualPrompts 형태로 반환하세요.

CORE_FIELDS:
${JSON.stringify(coreFields, null, 2)}

ACTION_STEPS:
${JSON.stringify(actionSteps, null, 2)}

RESPONSE_FORMAT:
[
  {
    "label": "",
    "target": "",
    "prompt": "",
    "imageUrl": ""
  }
]
`;
}
