import type { ActionStep, CoreFields } from '../../common/types.js';

export function buildVisualPrompt(coreFields: CoreFields, actionSteps: ActionStep[]): string {
  return `### MODULE: visual
당신은 느린학습자 초등학생(1~6학년)을 위한 한국 초등학교 현장체험학습 안내 문서를 시각 카드로 변환하는 전문가입니다.
이 카드는 글 읽기가 어려운 초등학생이 한눈에 내용을 파악할 수 있도록 설계됩니다.

아래 핵심 정보와 행동 단계를 보고, 시각 카드로 만들 항목과 이미지 생성 프롬프트를 작성하세요.

[공통 규칙]
- 원문에 없는 정보는 절대 추가하지 않는다.
- 각 카드는 cardType, label, target, prompt, imageUrl 형태로 반환한다.
- imageUrl은 항상 빈 문자열("")로 둔다.
- cardType은 아래 중에서만 선택한다:
  date_card | time_card | place_card | material_card | deadline_card | submit_to_card | signature_card | choice_card | step_card | warning_card | result_card
- 시각 카드가 필요한 항목이 없으면 빈 배열([])을 반환한다.
- prompt는 "물건", "장소", "음식" 같은 추상적·모호한 표현을 절대 쓰지 말고, 구체적인 사물·장면을 영어로 묘사한다.
- 초등학교 1~6학년 학생이 실제로 사용하는 물건·경험하는 장면을 기준으로 묘사한다(유아용·성인용 이미지 금지).

[시각 카드 포함 기준 — 반드시 준수]
- 시각 카드는 구체적인 사물, 장소, 날짜, 시간, 준비물처럼 한눈에 그림으로 표현 가능한 항목만 포함한다.
- 긴 설명문, 안내문, 조건 설명, 참가 여부 확인 같은 텍스트 중심 항목은 시각 카드로 만들지 않는다.
  예) "부득이한 사정으로 체험학습 미참여 시 담임선생님께 연락 바랍니다" → 카드 제외
  예) "참가 여부를 표시하여 보내주십시오" → 카드 제외
- warning_card는 짧고 명확한 주의사항(약 20자 이하)만 포함한다.
  예) "멀미약 복용" → warning_card 포함
  예) "부득이한 사정으로 체험학습 미참여 시..." → warning_card 제외 (긴 설명문)

[material_card 프롬프트 규칙]
- 반드시 "Soft watercolor illustration style, warm colors, gentle shading, clean white background, no humans, no text, children's book illustration style. " 로 시작한다.
- 대상 연령을 초등학생(1~6학년) 기준으로 맞출 것.
  · 간편복 → 초등학생이 입는 편한 반팔 티셔츠와 운동복 바지 (아기 옷, 유아복 금지)
  · 운동화 → 초등학생이 신는 흰색 운동화
- 단일 사물보다 실제 사용 맥락이 느껴지도록 묘사할 것.
  · 간식 → 여러 종류의 한국 초등학교 현장학습 간식 모음(주스 팩, 과자, 사탕 등) (쿠키 하나만 그리기 금지)
  · 돗자리 → 펼쳐진 1인용 돗자리
  · 비닐봉지 → 묶음 손잡이 비닐봉지
- 사물을 화면 중앙에 크고 명확하게 배치한다.

[place_card 프롬프트 규칙]
- 반드시 "Soft watercolor illustration style, warm colors, gentle shading, clean white background, no text, children's book illustration style. " 로 시작한다.
- 해당 장소의 가장 대표적인 시각적 특징을 반드시 포함할 것.
  · 공원 → 초록 잔디밭, 나무, 벤치가 있는 한국 도심 근린공원 외관
  · 극장·아동극장 → 붉은 커튼이 드리운 무대와 관람석이 보이는 소극장 내부
  · 박물관 → 전시물이 놓인 밝고 넓은 전시실
  · 체험관 → 어린이 체험 부스와 전시물이 있는 실내 공간
- 장소 분위기와 전체적인 외관이 한눈에 느껴지도록 구체적 영어 묘사를 포함한다.

[그 외 카드 프롬프트 규칙]
- 반드시 "Soft watercolor illustration style, warm colors, gentle shading, clean white background, no text, children's book illustration style. " 로 시작한다.

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
    "prompt": "이미지 생성용 영어 설명 (위 규칙에 맞는 접두어로 시작, 구체적 사물/장면 묘사)",
    "imageUrl": ""
  }
]
`;
}
