import OpenAI from 'openai';
import type { CoreFields, DocumentType } from './types';

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!openai && process.env.OPENAI_API_KEY) openai = new OpenAI();
  return openai;
}

function extractBlock(prompt: string, label: string): string | null {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escapedLabel}:\\n([\\s\\S]*?)(?:\\n[A-Z_]+:|$)`, 'i');
  const match = prompt.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function parseJsonBlock(prompt: string, label: string): unknown | null {
  const block = extractBlock(prompt, label);
  if (!block) return null;
  try {
    return JSON.parse(block);
  } catch {
    return null;
  }
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function detectDocumentType(rawText: string): DocumentType {
  const text = normalizeText(rawText);

  if (/(신청서|동의서|조사서|보호자 서명|참가 여부|선택하고 이름|이름과 반|제출처|제출 대상|제출 장소)/.test(text)) {
    return 'submission-form';
  }

  if (/(숙제|과제|독서록|수행평가|발표|조사|보고서|만들기|발표\s*자료|자료\s*만들기|자료를 만들어|만들어 오세요|써 오세요|써오기|줄거리|느낀 점|관찰 보고서|조사하여|발표를 준비|정리해야 합니다|풀어오세요|답하기|문제 풀이)/.test(text)) {
    return 'learning-task';
  }

  return 'execution-guide';
}

function findPattern(rawText: string, patterns: RegExp[]): string {
  const text = normalizeText(rawText);
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
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

function cleanPlace(text: string): string {
  const cleaned = text
    .replace(/오전\s*\d{1,2}시\s*\d{0,2}분?\s*까지?/g, '')
    .replace(/오후\s*\d{1,2}시\s*\d{0,2}분?\s*까지?/g, '')
    .replace(/\d{1,2}:\d{2}\s*까지?/g, '')
    .replace(/\s*까지$/i, '')
    .replace(/\s*(?:으로|로|에서|에)$/i, '')
    .replace(/\s*(?:모입니다|이동하세요|오세요|갑니다)$/i, '')
    .trim();

  const placeCandidates = cleaned.match(/(학교\s*정문\s*앞|운동장|강당|체육관|교실|도서관|교무실|행정실|학교)/g);
  if (placeCandidates && placeCandidates.length > 0) {
    return placeCandidates[placeCandidates.length - 1].trim();
  }

  return cleaned.length <= 20 ? cleaned : '';
}

function findPlace(rawText: string): string {
  return cleanPlace(findPattern(rawText, [
    /(학교\s*정문\s*앞)(?:에|에서)\s*(?:모입니다|모여)/,
    /(운동장|강당|체육관|교실|도서관|학교\s*정문\s*앞|학교)(?:으로|로)\s*(?:모입니다|이동하세요|오세요|갑니다)/,
    /(운동장|강당|체육관|교실|도서관|학교\s*정문\s*앞|학교)(?:에서)\s*(?:교육|수업|활동|모임|진행|안전교육)/,
    /장소[:：]?\s*([^.,;\n]+)/,
    /(학교 도서관|도서관|강당|체육관|교실)/
  ]));
}

function parseListField(rawText: string, label: string): string[] {
  const regex = new RegExp(`${label}(?:은|는|:)?\\s*([^\\n\\.]+)`, 'i');
  const match = rawText.match(regex);
  if (!match?.[1]) return [];
  return match[1]
    .split(/[,，、]+|\s*와\s*|\s*과\s*|\s*및\s*/)
    .map((item) => item.replace(/(입니다|입니다\.|입니다!|입니다\?|\.)$/i, '').trim())
    .filter((item) => item.length > 0);
}

function cleanPhrase(text: string): string {
  return text.replace(/(입니다|입니다\.|입니다!|입니다\?|\.)$/i, '').trim();
}

function cleanDeadline(text: string): string {
  return cleanPhrase(text).replace(/\s*까지$/i, '').trim();
}

function cleanSubmissionTarget(text: string): string {
  return cleanPhrase(text)
    .replace(/\s*(?:께|에게|에|로)$/i, '')
    .replace(/\s*(?:제출하세요|제출|내세요|내기|하세요)$/i, '')
    .replace(/\s*(?:께|에게|에|로)$/i, '')
    .trim();
}

function cleanMaterialItem(text: string): string {
  return cleanPhrase(text)
    .replace(/^(?:학생들은|학생은|학생들이|각자|모두)\s*/, '')
    .trim();
}

function findDeadline(rawText: string): string {
  return cleanDeadline(findPattern(rawText, [
    /(제출\s*기한|제출기한|마감일|마감)(?:은|는|:)?\s*((?:\d{4}년\s*)?\d{1,2}월\s*\d{1,2}일|내일|금요일)(?:\s*까지)?/i,
    /((?:\d{4}년\s*)?\d{1,2}월\s*\d{1,2}일|내일|금요일)\s*까지(?:\s*(?:제출|담임선생님께 제출|담임 선생님께 제출))?/i
  ]));
}

function findSubmissionTarget(rawText: string): string {
  return cleanSubmissionTarget(findPattern(rawText, [
    /제출\s*(?:처|대상|장소)(?:은|는|:)?\s*([^\n\.,]+?)(?:에게|께|에)?(?:\s*(?:제출|내세요|내기|하세요))?(?:이며|,|\.|$)/i,
    /(담임\s*선생님|담임선생님|선생님|담임교사|교무실|행정실)(?:께|에게|에)\s*(?:제출|내세요|내기|하세요)/i
  ]));
}

function findMaterials(rawText: string): string[] {
  const materials = parseListField(rawText, '준비물');
  if (materials.length > 0) {
    return Array.from(new Set(materials.map((item) => cleanPhrase(item))));
  }

  const materialPhrase = findPattern(rawText, [/준비물(?:은|:)?\s*([^\.]+)/i]);
  const foundMaterials = materialPhrase
    ? materialPhrase
        .replace(/입니다$/i, '')
        .split(/[,，、]+|\s*와\s*|\s*과\s*|\s*및\s*/)
        .map((item) => cleanPhrase(item))
        .filter((item) => item.length > 0)
    : [];

  const preparedItems = [...rawText.matchAll(/([가-힣A-Za-z0-9\s]{1,12}?)(?:을|를)\s*준비/g)]
    .map((match) => cleanMaterialItem(match[1]))
    .filter((item) => item.length > 0 && !/(보고서|발표 자료|자료|복장|발표|정리)/.test(item));

  if (/사진(?:을)?\s*(?:\d+장\s*이상\s*)?(?:붙여|첨부)/.test(rawText) || /사진\s*\d+장/.test(rawText)) {
    foundMaterials.push('사진');
  }

  return Array.from(new Set([...foundMaterials, ...preparedItems]));
}

function addUniqueAction(actions: string[], action: string): void {
  const trimmed = action.trim();
  if (trimmed.length > 0 && !actions.includes(trimmed)) actions.push(trimmed);
}

function findLearningActions(text: string): string[] {
  const actions: string[] = [];
  if (/책을\s*골라/.test(text)) addUniqueAction(actions, '읽은 책 고르기');
  if (/독서록을\s*써\s*오세요/.test(text)) addUniqueAction(actions, '독서록 쓰기');
  if (/책\s*제목.*줄거리.*느낀\s*점/.test(text)) addUniqueAction(actions, '책 제목, 줄거리, 느낀 점 적기');
  if (/보고서를\s*작성하세요/.test(text)) addUniqueAction(actions, '보고서 작성하기');
  if (/관찰\s*날짜.*장소.*특징/.test(text)) addUniqueAction(actions, '관찰 날짜, 장소, 특징 정리하기');
  if (/식물의\s*특징.*정리해야\s*합니다/.test(text)) addUniqueAction(actions, '식물의 특징 정리하기');
  if (/사진(?:을)?\s*\d+장\s*이상\s*붙여\s*오세요/.test(text)) {
    addUniqueAction(actions, '사진 1장 이상 붙이기');
  } else if (/사진(?:을)?\s*붙여\s*오세요/.test(text)) {
    addUniqueAction(actions, '사진 붙이기');
  }
  if (/공공기관을\s*조사하여/.test(text)) addUniqueAction(actions, '공공기관 조사하기');
  if (/발표\s*자료를\s*만들어\s*오세요/.test(text)) addUniqueAction(actions, '발표 자료 만들기');
  if (/\d+분\s*발표를\s*준비합니다/.test(text)) {
    const match = text.match(/(\d+분)\s*발표를\s*준비합니다/);
    addUniqueAction(actions, `${match?.[1] ?? ''} 발표 준비하기`.trim());
  }
  if (/문제를\s*풀어오세요/.test(text)) addUniqueAction(actions, '문제 풀어오기');
  if (/답을\s*쓰세요/.test(text)) addUniqueAction(actions, '답 쓰기');
  return actions;
}

function findActions(rawText: string): string[] {
  const text = normalizeText(rawText);
  const actions: string[] = [];
  const bulletRegex = /[-·•]\s*([^\n]+)/g;
  let match;

  while ((match = bulletRegex.exec(rawText)) !== null) {
    if (match[1]) addUniqueAction(actions, match[1]);
  }
  if (actions.length > 0) return actions.slice(0, 5);

  const learningActions = findLearningActions(text);
  const submitActions: string[] = [];
  const sentences = text.split(/[.?!]\s*/);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length === 0) continue;
    if (/제출/.test(trimmed)) {
      addUniqueAction(submitActions, trimmed.replace(/제출합니다$/, '제출하기').replace(/제출하세요$/, '제출하기'));
      continue;
    }
    if (/(준비|작성|발표|참가|조사|확인|연락)/.test(trimmed)) addUniqueAction(actions, trimmed);
  }

  if (learningActions.length > 0) return [...learningActions, ...submitActions].slice(0, 5);
  const fallbackActions = [...actions, ...submitActions];
  if (fallbackActions.length > 0) return fallbackActions.slice(0, 5);
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
  return {
    date: findDate(rawText),
    time: findTime(rawText),
    place: findPlace(rawText),
    materials,
    deadline: findDeadline(rawText),
    submissionTarget: findSubmissionTarget(rawText),
    actions: findActions(rawText),
    warnings: warnings.length > 0 ? warnings : rawText.includes('확인') ? ['부모님 확인 필요'] : []
  };
}

export async function callLlm(prompt: string): Promise<string> {
  const client = getOpenAI();
  if (client) {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 1000,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('OpenAI 응답이 없습니다.');
    return content;
  }
  return Promise.resolve(mockLlmResponse(prompt));
}

export function safeJsonParse<T = unknown>(response: string): T | null {
  if (typeof response !== 'string' || response.trim().length === 0) return null;
  const trimmed = response.trim();

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // 파싱 실패, 다음 단계로 진행
  }

  try {
    const firstBraceIdx = trimmed.indexOf('{');
    const firstBracketIdx = trimmed.indexOf('[');
    let startIdx = -1;
    if (firstBraceIdx !== -1 && firstBracketIdx !== -1) startIdx = Math.min(firstBraceIdx, firstBracketIdx);
    else if (firstBraceIdx !== -1) startIdx = firstBraceIdx;
    else if (firstBracketIdx !== -1) startIdx = firstBracketIdx;
    if (startIdx === -1) return null;

    const lastBraceIdx = trimmed.lastIndexOf('}');
    const lastBracketIdx = trimmed.lastIndexOf(']');
    let endIdx = -1;
    if (lastBraceIdx !== -1 && lastBracketIdx !== -1) endIdx = Math.max(lastBraceIdx, lastBracketIdx);
    else if (lastBraceIdx !== -1) endIdx = lastBraceIdx;
    else if (lastBracketIdx !== -1) endIdx = lastBracketIdx;
    if (endIdx === -1 || endIdx < startIdx) return null;

    return JSON.parse(trimmed.substring(startIdx, endIdx + 1)) as T;
  } catch {
    return null;
  }
}

export function mockLlmResponse(prompt: string): string {
  if (prompt.includes('MODULE: classification')) {
    const rawText = extractBlock(prompt, 'INPUT_TEXT') ?? '';
    const documentType = detectDocumentType(rawText);
    const title = rawText.split(/\n/)[0]?.trim().slice(0, 100) || '문서 분석 결과';
    return JSON.stringify({ documentType, title });
  }

  if (prompt.includes('MODULE: extraction')) {
    const rawText = extractBlock(prompt, 'INPUT_TEXT') ?? '';
    const warnings = parseListField(rawText, '주의사항');
    return JSON.stringify({
      date: findDate(rawText),
      time: findTime(rawText),
      place: findPlace(rawText),
      materials: findMaterials(rawText),
      deadline: findDeadline(rawText),
      submissionTarget: findSubmissionTarget(rawText),
      actions: findActions(rawText),
      warnings: warnings.length > 0 ? warnings : rawText.includes('확인') ? ['부모님 확인 필요'] : []
    });
  }

  if (prompt.includes('MODULE: easyText')) {
    const rawText = extractBlock(prompt, 'INPUT_TEXT') ?? '';
    const coreFields = parseJsonBlock(prompt, 'CORE_FIELDS') as Record<string, unknown> | null;
    return JSON.stringify(buildEasyTextFromFields(coreFields ?? {}, rawText));
  }

  if (prompt.includes('MODULE: actionSteps')) {
    const coreFields = parseJsonBlock(prompt, 'CORE_FIELDS') as Record<string, unknown> | null;
    const actions = Array.isArray(coreFields?.actions) ? (coreFields.actions as string[]) : [];
    const place = String(coreFields?.place || '');
    const target = String(coreFields?.materials ? (coreFields.materials as string[]).join(' ') : '') || place;
    return JSON.stringify(actions.slice(0, 5).map((action, index) => ({
      step: index + 1,
      action,
      reason: action.includes('제출') ? '정해진 기한과 제출처를 지키기 위해' : '과제를 정확히 준비하기 위해',
      visualTarget: target || action
    })));
  }

  if (prompt.includes('MODULE: visual')) {
    const coreFields = parseJsonBlock(prompt, 'CORE_FIELDS') as Record<string, unknown> | null;
    const actions = Array.isArray(coreFields?.actions) ? (coreFields.actions as string[]) : [];
    const materials = Array.isArray(coreFields?.materials) ? (coreFields.materials as string[]) : [];
    const place = String(coreFields?.place || '');
    const visuals: Array<{ label: string; target: string; prompt: string; imageUrl: string }> = [];
    if (materials.length > 0) visuals.push({ label: '준비물', target: materials.join(', '), prompt: `학생이 ${materials.join('와/과 ')}을 준비하는 장면을 보여주는 이미지`, imageUrl: '' });
    if (place) visuals.push({ label: '장소', target: place, prompt: `${place}에서 활동하는 학생 모습을 보여주는 이미지`, imageUrl: '' });
    if (visuals.length === 0 && actions.length > 0) visuals.push({ label: '행동', target: actions[0], prompt: `${actions[0]} 장면을 보여주는 이미지`, imageUrl: '' });
    return JSON.stringify(visuals);
  }

  if (prompt.includes('MODULE: activity')) {
    const coreFields = parseJsonBlock(prompt, 'CORE_FIELDS') as Record<string, unknown> | null;
    const documentType = String(parseJsonBlock(prompt, 'DOCUMENT_TYPE') ?? '');
    const materials = Array.isArray(coreFields?.materials) ? (coreFields.materials as string[]) : [];
    const actions = Array.isArray(coreFields?.actions) ? (coreFields.actions as string[]) : [];
    return JSON.stringify({
      checklist: [...materials, ...actions].slice(0, 5),
      questions: [
        `언제 ${documentType === 'learning-task' ? '활동' : '제출'}을 하나요?`,
        `어디에서 ${actions[0] ?? '활동'}을 하나요?`,
        '무엇을 준비해야 하나요?'
      ],
      matchingCardIdeas: [`${materials.join(' 카드')}과 행동 카드를 연결하기`, '날짜/시간 카드와 장소 카드를 짝짓기'],
      coachingGuide: '학생이 준비물을 미리 챙기도록 돕고, 날짜와 제출처를 다시 한 번 확인하도록 안내하세요.'
    });
  }

  return JSON.stringify({});
}
