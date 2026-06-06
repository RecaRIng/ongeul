# Ongle Backend

TypeScript / Node.js / Express 기반 AI 문서 재구성 백엔드 초기 구조입니다.

## 설치

1. `cd backend`
2. `npm install`
3. `npm run dev`

## API

### POST /api/analyze/text

요청 본문 예시:

```json
{
  "text": "[학교 지원] 6월 10일 금요일 오후 2시에 학교 도서관에서 독서 활동 발표를 합니다. 준비물은 공책과 필기도구입니다. 제출 기한은 6월 20일까지이며, 제출처는 담임 선생님입니다. 부모님 확인이 필요합니다.",
  "title": "독서 발표 안내"
}
```

응답 예시:

```json
{
  "document": {
    "rawText": "[학교 지원] 6월 10일 금요일 오후 2시에 학교 도서관에서 독서 활동 발표를 합니다. 준비물은 공책과 필기도구입니다. 제출 기한은 6월 20일까지이며, 제출처는 담임 선생님입니다. 부모님 확인이 필요합니다.",
    "documentType": "learning-task",
    "title": "독서 발표 안내"
  },
  "coreFields": {
    "date": "6월 10일",
    "time": "오후 2시",
    "place": "학교 도서관",
    "materials": ["공책", "필기도구"],
    "deadline": "6월 20일",
    "submissionTarget": "담임 선생님",
    "actions": ["독서 활동 발표 준비하기", "준비물을 챙기기", "제출 기한을 지키기"],
    "warnings": ["부모님 확인 필요"]
  },
  "easyText": {
    "level1": "6월 10일 오후 2시에 학교 도서관에서 발표를 해요. 공책과 필기도구를 준비해요.",
    "level2": "6월 10일 금요일 오후 2시에 학교 도서관에서 독서 발표가 있어요. 공책과 필기도구를 준비하고, 6월 20일까지 담임 선생님께 제출해요.",
    "level3": "6월 10일 금요일 오후 2시에 학교 도서관에서 독서 활동 발표를 합니다. 준비물은 공책과 필기도구이며, 제출 기한은 6월 20일까지이고 제출처는 담임 선생님입니다. 부모님 확인이 필요해요."
  },
  "actionSteps": [
    {
      "step": 1,
      "action": "공책과 필기도구를 준비하기",
      "reason": "발표 자료를 정리하고 메모하기 위해",
      "visualTarget": "준비물"
    },
    {
      "step": 2,
      "action": "학교 도서관으로 가기",
      "reason": "발표 장소에 도착하기 위해",
      "visualTarget": "장소"
    },
    {
      "step": 3,
      "action": "발표를 하고 제출하기",
      "reason": "정해진 기한 안에 활동을 마무리하기 위해",
      "visualTarget": "발표"
    }
  ],
  "visuals": [
    {
      "label": "준비물",
      "target": "공책과 필기도구",
      "prompt": "학생이 공책과 필기도구를 준비하는 장면을 보여주는 이미지",
      "imageUrl": ""
    },
    {
      "label": "장소",
      "target": "학교 도서관",
      "prompt": "학교 도서관 안에서 발표를 준비하는 학생 모습을 보여주는 이미지",
      "imageUrl": ""
    }
  ],
  "activityMaterials": {
    "checklist": ["공책 챙기기", "필기도구 챙기기", "6월 20일까지 제출하기"],
    "questions": ["무엇을 제출하나요?", "언제 발표가 있나요?", "누구에게 제출하나요?"],
    "matchingCardIdeas": ["준비물 카드와 행동 카드 연결", "날짜 카드와 제출 기한 카드 연결"],
    "coachingGuide": "학생이 발표 준비를 잘할 수 있도록 준비물을 미리 챙기고, 제출 기한을 확인하게 도와주세요."
  },
  "metadata": {
    "confidence": "medium",
    "missingFields": [],
    "warnings": ["부모님 확인 필요"]
  }
}
```
