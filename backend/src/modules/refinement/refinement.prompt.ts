import type { CoreFields, DocumentType } from '../../common/types.js';

export function buildRefinementPrompt(rawText: string, documentType: DocumentType, coreFields: CoreFields): string {
  return `### MODULE: refinement
You are a correction layer for Korean school notices.

You receive:
1. The original document text.
2. The first-pass document type.
3. The first-pass extracted coreFields.

Your job:
1. Re-read the original document and check whether the first-pass extraction is correct.
2. Move incorrectly placed values out of coreFields.
   - Example: if a service name or application method was placed in materials, remove it from materials and add it to extraFields.
   - Example: if a person or organization was placed in submissionTarget but it is not actually the submission target, remove it or move it to a better extraField.
   - Example: if "capacity", "no class days", "eligibility", "fee", "selection method", or "application method" appears in warnings, move it to extraFields unless it is truly a caution or risk.
   - Example: if souvenirs, snacks, gifts, meals, or other items are "provided", "given", or "distributed" by the school/event, they are not materials.
3. Keep coreFields focused on common school-notice fields only:
   date, time, place, materials, deadline, submissionTarget, actions, warnings.
4. Add important information that does not fit coreFields into extraFields.
5. Create a short mainSentence that says what the user needs to know first.
6. Create primaryItems and warningItems for the result screen.

Rules:
- Do not invent information that is not in the original text.
- Preserve Korean date/time/place wording from the source text when possible. Do not rewrite Korean dates into English formats such as "to".
- Labels in extraFields should be natural Korean labels chosen from the document context.
- extraFields is a flexible list, not a fixed schema.
- extraFields.value must be copied or tightly summarized from the original text. Never use a fixed example value.
- materials means only things the student/parent must bring, prepare, or submit.
- Provided items such as "기념품 및 간식 제공" are not materials and should usually be omitted from the main summary.
- If provided items must be kept, put them in extraFields with importance "low".
- warnings must include only real cautions, risks, required confirmations, or things the reader could easily miss.
- Do not put ordinary conditions such as capacity, class exclusion dates, fee, application method, or target audience into warnings.
- submissionTarget means the place/person/system where something must be submitted or sent. Do not use the reader/audience, such as "학부모님", as submissionTarget.
- Use category only for sorting/filtering.
- category must be one of:
  "schedule", "application", "place", "material", "target", "condition", "contact", "warning", "learning", "other"
- importance must be one of: "high", "medium", "low"
- documentType must remain one of:
  "execution-guide", "submission-form", "learning-task"
- Look for document-specific information such as 신청 방법, 신청 기간, 수강 기간, 정원, 모집 방식, 신청 가능 개수, 문자 발송, 수업 없는 날, 문의, 준비물, 제출 방법, 제출 기한, 장소, 대상, 참가비, 복장, 기존 학생 유의사항.
- These are information types, not fixed values. Use only values found in INPUT_TEXT.
- Return JSON only. Do not wrap it in markdown.

DOCUMENT_TYPE:
${documentType}

INPUT_TEXT:
${rawText}

FIRST_PASS_CORE_FIELDS:
${JSON.stringify(coreFields, null, 2)}

RESPONSE_FORMAT:
{
  "coreFields": {
    "date": "",
    "time": "",
    "place": "",
    "materials": [],
    "deadline": "",
    "submissionTarget": "",
    "actions": [],
    "warnings": []
  },
  "extraFields": [
    {
      "label": "신청 방법",
      "value": "원문에서 발견한 실제 신청 방법",
      "category": "application",
      "importance": "high",
      "sourceText": "원문에서 근거가 되는 짧은 구절"
    }
  ],
  "summary": {
    "mainSentence": "사용자가 가장 먼저 알아야 할 핵심 문장",
    "primaryItems": [
      {
        "label": "핵심 항목 이름",
        "value": "원문에서 추출한 실제 값",
        "source": "coreFields"
      }
    ],
    "warningItems": []
  }
}
`;
}
