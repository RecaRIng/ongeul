import type { ActionStep, CoreFields } from '../../common/types.js';

export function buildVisualPrompt(coreFields: CoreFields, actionSteps: ActionStep[]): string {
  return `### MODULE: visual
당신은 느린학습자 학생을 위한 문서 구조화 시스템의 시각화 담당입니다.

아래 핵심 정보와 행동 단계를 보고, 시각 카드로 만들면 좋은 항목을 추출하세요.

규칙:
- 원문에 없는 정보는 절대 추가하지 않는다.
- 각 카드는 label, target, prompt, imageUrl 형태로 반환한다.
- imageUrl은 항상 빈 문자열("")로 둔다.
- cardType은 아래 중에서만 선택한다:
  date_card | time_card | place_card | material_card | deadline_card | submit_to_card | signature_card | choice_card | step_card | warning_card | result_card
- 시각 카드가 필요한 항목이 없으면 빈 배열([])을 반환한다.
- prompt는 반드시 "Simple flat illustration for children's flashcard, clean white background, minimal detail, cartoon style, no text. " 로 시작한다.
- material_card의 prompt는 예외로 "Single object centered on white background, large and clear, flat cartoon illustration, no humans, no text. " 로 시작하고, 사람 없이 사물 자체를 크고 명확하게 묘사한다.

CORE_FIELDS:
${JSON.stringify(coreFields, null, 2)}

ACTION_STEPS:
${JSON.stringify(actionSteps, null, 2)}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
[
  {
    "cardType": "cardType 목록 중 선택 (date_card | time_card | place_card | material_card | deadline_card | submit_to_card | signature_card | choice_card | step_card | warning_card | result_card)",
    "label": "항목 이름",
    "target": "원문에서 추출한 값",
    "prompt": "이미지 생성용 설명",
    "imageUrl": ""
  }
]
`;
}
