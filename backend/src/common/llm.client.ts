import type { CoreFields, DocumentType } from './types.js';

function extractBlock(prompt: string, label: string): string | null {
  const pattern = new RegExp(`${label}:\n([\s\S]*?)(?:\n[A-Z_]+:|$)`, 'i');
  const match = prompt.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function parseJsonBlock(prompt: string, label: string): unknown | null {
  const block = extractBlock(prompt, label);
  if (!block) {
    return null;
  }

  try {
    return JSON.parse(block);
  } catch {
    return null;
  }
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function detectDocumentType(rawText: string) {
  const text = normalizeText(rawText);
  if (/(숙제|수행평가|발표|조사|만들기|학습)/.test(text)) {
    return 'learning-task';
  }

  if (/(신청서|동의서|서명|제출|선택)/.test(text)) {
    return 'submission-form';
  }

  return 'execution-guide';
}

function findPattern(rawText: string, patterns: RegExp[]): string {
  const text = normalizeText(rawText);
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return '';
}

function findDate(rawText: string): string {
  return findPattern(rawText, [
    /(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)/,
    /(\d{1,2}월\s*\d{1,2}일)/,
    /(\d{1,2}\/\d{1,2})/
  ]);
}

function findTime(rawText: string): string {
  return findPattern(rawText, [
    /(오전\s*\d{1,2}시\s*\d{0,2}분?)/,
    /(오후\s*\d{1,2}시\s*\d{0,2}분?)/,
    /(\d{1,2}:\d{2})/
  ]);
}

function findPlace(rawText: string): string {
  return findPattern(rawText, [
    /장소[:：]?\s*([^.,;\n]+)/,
    /(학교 도서관|도서관|강당|체육관|교실|학교)/,
    /([^,\.]+?)에서/,
    /([^,\.]+?)로/,
    /([^,\.]+?)부터/
  ]);
}

function parseListField(rawText: string, label: string): string[] {
  const regex = new RegExp(`${label}(?:은|는|:)?\s*([^\n\.]+)`, 'i');
  const match = rawText.match(regex);
  if (!match?.[1]) {
    return [];
  }

  return match[1]
    .split(/[,，、]+|\s*와\s*|\s*과\s*|\s*및\s*/)
    .map((item) => item.replace(/(입니다|입니다\.|입니다!|입니다\?|\.)$/i, '').trim())
    .filter((item) => item.length > 0);
}

function cleanPhrase(text: string) {
  return text.replace(/(입니다|입니다\.|입니다!|입니다\?|\.)$/i, '').trim();
}

function findMaterials(rawText: string): string[] {
  const materials = parseListField(rawText, '준비물');
  if (materials.length > 0) {
    return materials.map((item) => cleanPhrase(item));
  }

  const materialPhrase = findPattern(rawText, [/준비물(?:은|:)?\s*([^\.]+)/i]);
  if (!materialPhrase) {
    return [];
  }

  return materialPhrase
    .replace(/입니다$/i, '')
    .split(/[,，、]+|\s*와\s*|\s*과\s*|\s*및\s*/)
    .map((item) => cleanPhrase(item))
    .filter((item) => item.length > 0);
}

function findActions(rawText: string): string[] {
  const text = normalizeText(rawText);
  const actions: string[] = [];
  const bulletRegex = /[-·•]\s*([^\n]+)/g;
  let match;

  while ((match = bulletRegex.exec(rawText)) !== null) {
    if (match[1]) {
      actions.push(match[1].trim());
    }
  }

  if (actions.length > 0) {
    return actions;
  }

  const sentences = text.split(/[.?!]\s*/);
  for (const sentence of sentences) {
    if (/(준비|제출|작성|발표|참가|조사|확인|연락)/.test(sentence)) {
      actions.push(sentence.trim());
    }
  }

  if (actions.length > 0) {
    return actions;
  }

  return [text.slice(0, 100)];
}

function buildEasyTextFromFields(coreFields: Record<string, unknown>, rawText: string) {
  const date = String(coreFields.date || '');
  const time = String(coreFields.time || '');
  const place = String(coreFields.place || '');
  const materials = Array.isArray(coreFields.materials) ? (coreFields.materials as string[]).join('과 ') : '';
  const deadline = String(coreFields.deadline || '');
  const submissionTarget = String(coreFields.submissionTarget || '');
  const actions = Array.isArray(coreFields.actions) ? (coreFields.actions as string[]).slice(0, 2) : [];

  return {
    level1: `${date}${time ? ` ${time}` : ''}${place ? ` ${place}에서` : ''} ${actions.length > 0 ? actions[0] : '활동을 합니다.'}`.trim(),
    level2: `${date}${time ? ` ${time}` : ''}${place ? ` ${place}에서` : ''} ${actions.length > 0 ? actions[0] : '활동을 합니다.'} 준비물은 ${materials || '없음'}이고${deadline ? ` 제출 기한은 ${deadline}` : ''}${submissionTarget ? `, 제출처는 ${submissionTarget}` : ''}.`.trim(),
    level3: `${date}${time ? ` ${time}` : ''}${place ? ` ${place}에서` : ''} 활동이 있습니다. ${materials ? `준비물은 ${materials} 입니다. ` : ''}${deadline ? `제출 기한은 ${deadline}이고` : ''}${submissionTarget ? ` 제출처는 ${submissionTarget} 입니다. ` : ''}${rawText.includes('부모님 확인') ? '부모님 확인이 필요합니다.' : ''}`.trim()
  };
}

export function inferDocumentType(rawText: string): DocumentType {
  return detectDocumentType(rawText);
}

export function inferCoreFields(rawText: string): CoreFields {
  const materials = findMaterials(rawText);
  const warnings = parseListField(rawText, '주의사항');
  const deadline = cleanPhrase(findPattern(rawText, [/제출 기한(?:은|:)?\s*([^\n\.,]+?)(?:이며|,|\.|$)/i, /\d{1,2}월\s*\d{1,2}일(?:까지)?/i]));
  const submissionTarget = cleanPhrase(findPattern(rawText, [/제출처(?:은|는|:)?\s*([^\n\.,]+?)(?:이며|,|\.|$)/i, /(담임 선생님|부모님|학급)/i]));

  return {
    date: findDate(rawText),
    time: findTime(rawText),
    place: findPlace(rawText),
    materials,
    deadline,
    submissionTarget,
    actions: findActions(rawText),
    warnings: warnings.length > 0 ? warnings : rawText.includes('확인') ? ['부모님 확인 필요'] : []
  };
}

export async function callLlm(prompt: string): Promise<string> {
  return Promise.resolve(mockLlmResponse(prompt));
}

function mockLlmResponse(prompt: string): string {
  if (prompt.includes('MODULE: classification')) {
    const rawText = extractBlock(prompt, 'INPUT_TEXT') ?? '';
    const documentType = detectDocumentType(rawText);
    const title = rawText.split(/\n/)[0].trim().slice(0, 100) || '문서 분석 결과';

    return JSON.stringify({ documentType, title });
  }

  if (prompt.includes('MODULE: extraction')) {
    const rawText = extractBlock(prompt, 'INPUT_TEXT') ?? '';
    const date = findDate(rawText);
    const time = findTime(rawText);
    const place = findPlace(rawText);
    const materials = parseListField(rawText, '준비물');
    const deadline = findPattern(rawText, [/제출 기한(?:은|:)\s*([^\n]+)/i, /마감(?:은|:)\s*([^\n]+)/i]);
    const submissionTarget = findPattern(rawText, [/제출처[:：]\s*([^\n]+)/i, /(담임 선생님|부모님|학교|학급)/i]);
    const actions = findActions(rawText);
    const warnings = parseListField(rawText, '주의사항').length > 0 ? parseListField(rawText, '주의사항') : rawText.includes('확인') ? ['부모님 확인 필요'] : [];

    return JSON.stringify({
      date,
      time,
      place,
      materials,
      deadline,
      submissionTarget,
      actions,
      warnings
    });
  }

  if (prompt.includes('MODULE: easyText')) {
    const rawText = extractBlock(prompt, 'INPUT_TEXT') ?? '';
    const coreFields = parseJsonBlock(prompt, 'CORE_FIELDS') as Record<string, unknown> | null;
    const easyText = buildEasyTextFromFields(coreFields ?? {}, rawText);

    return JSON.stringify(easyText);
  }

  if (prompt.includes('MODULE: actionSteps')) {
    const coreFields = parseJsonBlock(prompt, 'CORE_FIELDS') as Record<string, unknown> | null;
    const actions = Array.isArray(coreFields?.actions) ? (coreFields.actions as string[]) : [];
    const place = String(coreFields?.place || '');
    const target = String(coreFields?.materials ? (coreFields.materials as string[]).join(' ') : '') || place;
    const steps = actions.slice(0, 5).map((action, index) => ({
      step: index + 1,
      action,
      reason: action.includes('제출') ? '정해진 기한과 제출처를 지키기 위해' : '과제를 정확히 준비하기 위해',
      visualTarget: target || action
    }));

    return JSON.stringify(steps);
  }

  if (prompt.includes('MODULE: visual')) {
    const coreFields = parseJsonBlock(prompt, 'CORE_FIELDS') as Record<string, unknown> | null;
    const actions = Array.isArray(coreFields?.actions) ? (coreFields.actions as string[]) : [];
    const materials = Array.isArray(coreFields?.materials) ? (coreFields.materials as string[]) : [];
    const place = String(coreFields?.place || '');
    const visuals: Array<{ label: string; target: string; prompt: string; imageUrl: string }> = [];

    if (materials.length > 0) {
      visuals.push({
        label: '준비물',
        target: materials.join(', '),
        prompt: `학생이 ${materials.join('와/과 ')}을 준비하는 장면을 보여주는 이미지`,
        imageUrl: ''
      });
    }

    if (place) {
      visuals.push({
        label: '장소',
        target: place,
        prompt: `${place}에서 활동하는 학생 모습을 보여주는 이미지`,
        imageUrl: ''
      });
    }

    if (visuals.length === 0 && actions.length > 0) {
      visuals.push({
        label: '행동',
        target: actions[0],
        prompt: `${actions[0]} 장면을 보여주는 이미지`,
        imageUrl: ''
      });
    }

    return JSON.stringify(visuals);
  }

  if (prompt.includes('MODULE: activity')) {
    const coreFields = parseJsonBlock(prompt, 'CORE_FIELDS') as Record<string, unknown> | null;
    const documentType = String(parseJsonBlock(prompt, 'DOCUMENT_TYPE') ?? '');
    const materials = Array.isArray(coreFields?.materials) ? (coreFields.materials as string[]) : [];
    const actions = Array.isArray(coreFields?.actions) ? (coreFields.actions as string[]) : [];
    const checklist = [...materials, ...actions].slice(0, 5);
    const questions = [
      `언제 ${documentType === 'learning-task' ? '활동' : '제출'}을 하나요?`,
      `어디에서 ${actions[0] ?? '활동'}을 하나요?`,
      `무엇을 준비해야 하나요?`
    ];

    return JSON.stringify({
      checklist,
      questions,
      matchingCardIdeas: [
        `${materials.join(' 카드')}과 행동 카드를 연결하기`,
        `날짜/시간 카드와 장소 카드를 짝짓기`
      ],
      coachingGuide: `학생이 준비물을 미리 챙기도록 돕고, 날짜와 제출처를 다시 한 번 확인하도록 안내하세요.`
    });
  }

  return JSON.stringify({});
}
