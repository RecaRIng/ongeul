import OpenAI from 'openai';
import type { CoreFields, DocumentType } from './types.js';

function extractBlock(prompt: string, label: string): string | null {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escapedLabel}:\\n([\\s\\S]*?)(?:\\n[A-Z_]+:|$)`, 'i');
  const match = prompt.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function parseJsonBlock(prompt: string, label: string): unknown | null {
  const block = extractBlock(prompt, label);
  if (!block) return null;
  return safeJsonParse(block);
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function cleanPhrase(text: string): string {
  return normalizeText(text)
    .replace(/^[\s:：\-•ㆍ·]+/, '')
    .replace(/[\s.,;:：]+$/g, '')
    .replace(/\s*(?:입니다|합니다|해주세요|주시기\s*바랍니다|바랍니다)$/u, '')
    .trim();
}

function findPattern(rawText: string, patterns: RegExp[]): string {
  const text = normalizeText(rawText);
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanPhrase(match[1]);
  }
  return '';
}

function detectDocumentType(rawText: string): DocumentType {
  const text = normalizeText(rawText);

  if (/(신청\s*안내|신청서|조사서|수요\s*조사|희망\s*조사|회신|제출|동의|보호자\s*확인|개인정보|미제출)/u.test(text)) {
    return 'submission-form';
  }

  if (/(과제|독서록|보고서|발표|문제\s*풀기|학습지|수행\s*평가)/u.test(text)) {
    return 'learning-task';
  }

  return 'execution-guide';
}

function findDate(rawText: string): string {
  return findPattern(rawText, [
    /((?:\d{4}\s*년\s*)?\d{1,2}\s*월\s*\d{1,2}\s*일\s*(?:\([^)]+\))?)/u,
    /(\d{1,2}\s*\/\s*\d{1,2})/u
  ]);
}

function findTime(rawText: string): string {
  return findPattern(rawText, [
    /((?:오전|오후)\s*\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?\s*~\s*(?:오전|오후)?\s*\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?)/u,
    /((?:오전|오후)\s*\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?)/u,
    /(\d{1,2}:\d{2}\s*~\s*\d{1,2}:\d{2})/u,
    /(\d{1,2}:\d{2})/u
  ]);
}

function findDeadline(rawText: string): string {
  return findPattern(rawText, [
    /(?:제출\s*기한|신청\s*기간|신청기한|접수\s*기간|마감\s*기한|기한)\s*[:：-]?\s*([^\n.]*?(?:\d{4}\s*년\s*)?\d{1,2}\s*월\s*\d{1,2}\s*일\s*(?:\([^)]+\))?\s*까지)/u,
    /((?:\d{4}\s*년\s*)?\d{1,2}\s*월\s*\d{1,2}\s*일\s*(?:\([^)]+\))?\s*까지)/u
  ]);
}

function findPlace(rawText: string): string {
  const direct = rawText.match(/(?:장소|집합\s*장소|모이는\s*곳)\s*[:：-]?\s*([^\n,;.]+)/u);
  const source = direct?.[1] ?? rawText;
  const matches = source.match(/[가-힣A-Za-z0-9\s]{1,30}(?:도서관|박물관|미술관|과학관|체육관|강당|공원|체험관|공연장|극장|운동장|정문)(?:에서|에서는|으로|로|까지)?/gu);
  if (!matches?.length) return '';
  return cleanPhrase(matches[0].replace(/(?:에서|에서는|으로|로|까지)$/u, ''));
}

function cleanSubmissionTarget(value: string): string {
  return cleanPhrase(value)
    .replace(/\s*(?:에게|께)$/u, '')
    .replace(/\s*(?:제출|보내|냅니다|내세요).*$/u, '')
    .trim();
}

function findSubmissionTarget(rawText: string): string {
  const explicit = findPattern(rawText, [
    /(?:제출처|제출\s*대상|제출\s*장소)\s*(?:은|는|[:：-])?\s*([^\n.,]+)/u
  ]);
  if (explicit) return cleanSubmissionTarget(explicit);

  return cleanSubmissionTarget(findPattern(rawText, [
    /([가-힣A-Za-z0-9]{1,20})(?:에게|께)\s*(?:제출|내세요|냅니다|보내세요)/u
  ]));
}

function splitList(value: string): string[] {
  return value
    .split(/[,，、/]|(?:\s+및\s+)|(?:\s+또는\s+)|(?:\s+그리고\s+)/u)
    .map(cleanPhrase)
    .filter(Boolean);
}

function parseListField(rawText: string, label: string): string[] {
  const regex = new RegExp(`${label}\\s*[:：-]?\\s*([^\\n.]+)`, 'u');
  const match = rawText.match(regex);
  if (!match?.[1]) return [];
  return splitList(match[1]);
}

function findMaterials(rawText: string): string[] {
  const found = parseListField(rawText, '준비물');
  for (const match of rawText.matchAll(/([가-힣A-Za-z0-9\s]{1,16})(?:을|를)?\s*(?:준비|가져오|챙겨)/gu)) {
    const item = cleanPhrase(match[1] ?? '');
    if (item && !/(신청|제출|작성|조사|안내|내용)/u.test(item)) found.push(item);
  }
  return Array.from(new Set(found));
}

function addUniqueAction(actions: string[], action: string): void {
  const cleaned = cleanPhrase(action);
  if (cleaned && !actions.includes(cleaned)) actions.push(cleaned);
}

function findActions(rawText: string): string[] {
  const actions: string[] = [];
  for (const line of rawText.split(/\r?\n/)) {
    const bullet = line.match(/^\s*(?:[-*•ㆍ·]|\d+\.)\s*(.+)$/u);
    if (bullet?.[1]) addUniqueAction(actions, bullet[1]);
  }

  for (const sentence of rawText.split(/(?<=[.!?。])\s+|\r?\n/u)) {
    if (/(신청|제출|작성|회신|확인|참여|준비|챙기|읽기|토론)/u.test(sentence)) {
      addUniqueAction(actions, sentence);
    }
  }

  return actions.length ? actions.slice(0, 5) : [normalizeText(rawText).slice(0, 120)];
}

function buildEasyTextFromFields(coreFields: Record<string, unknown>, rawText: string) {
  const date = String(coreFields.date || '');
  const time = String(coreFields.time || '');
  const place = String(coreFields.place || '');
  const materials = Array.isArray(coreFields.materials) ? (coreFields.materials as string[]).join(', ') : '';
  const deadline = String(coreFields.deadline || '');
  const submissionTarget = String(coreFields.submissionTarget || '');
  const actions = Array.isArray(coreFields.actions) ? (coreFields.actions as string[]).slice(0, 3) : [];
  const actionText = actions.length ? actions.map((action, i) => `${i + 1}. ${action}`).join('\n') : '문서를 읽고 해야 할 일을 확인해요.';
  const schedule = [date, time].filter(Boolean).join(' ');
  const submitText = deadline
    ? `${deadline}${submissionTarget ? ` ${submissionTarget}께 제출해요.` : ' 확인해요.'}`
    : '';

  return {
    level1: [schedule && `${schedule} 확인해요.`, place && `${place}에 가요.`, actionText, materials && `${materials}을 챙겨요.`, submitText].filter(Boolean).join('\n\n'),
    level2: [schedule && `날짜와 시간은 ${schedule}입니다.`, place && `장소는 ${place}입니다.`, `해야 할 일입니다.\n${actionText}`, materials && `준비물은 ${materials}입니다.`, submitText].filter(Boolean).join('\n\n'),
    level3: [schedule && `이 문서에서 확인한 일정은 ${schedule}입니다.`, place && `장소는 ${place}입니다.`, `아이가 해야 할 일을 순서대로 정리하면 다음과 같습니다.\n${actionText}`, materials && `빠뜨리지 않도록 ${materials}을 미리 챙겨 주세요.`, submitText].filter(Boolean).join('\n\n')
  };
}

export function inferDocumentType(rawText: string): DocumentType {
  return detectDocumentType(rawText);
}

export function inferCoreFields(rawText: string): CoreFields {
  const warnings = parseListField(rawText, '주의사항');
  return {
    date: findDate(rawText),
    time: findTime(rawText),
    place: findPlace(rawText),
    materials: findMaterials(rawText),
    deadline: findDeadline(rawText),
    submissionTarget: findSubmissionTarget(rawText),
    actions: findActions(rawText),
    warnings
  };
}

export async function callLlm(prompt: string, maxTokens = 4000): Promise<string> {
  if (process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    });
    const choice = response.choices[0];
    if (choice.finish_reason === 'length') {
      console.warn('[callLlm] response truncated at max_tokens:', maxTokens);
    }
    return choice.message.content ?? '';
  }
  return mockLlmResponse(prompt);
}

export function safeJsonParse<T = unknown>(response: string): T | null {
  if (typeof response !== 'string' || response.trim().length === 0) return null;
  const trimmed = response.trim();

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const firstBrace = trimmed.indexOf('{');
    const firstBracket = trimmed.indexOf('[');
    const starts = [firstBrace, firstBracket].filter((index) => index >= 0);
    if (!starts.length) return null;
    const start = Math.min(...starts);
    const end = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'));
    if (end < start) return null;

    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
}

function promptForObjectTarget(target: string): string {
  return `${target}, one clear centered object only, transparent background, no scenery, no extra objects, no people, no text`;
}

function promptForPlaceObject(place: string): string {
  return `${place}, one clear centered place object or building only, transparent background, no scenery, no people, no text`;
}

function mockLlmResponse(prompt: string): string {
  if (prompt.includes('MODULE: classification')) {
    const rawText = extractBlock(prompt, 'INPUT_TEXT') ?? '';
    return JSON.stringify({
      documentType: detectDocumentType(rawText),
      title: rawText.split(/\n/)[0]?.trim().slice(0, 100) || '문서 분석 결과'
    });
  }

  if (prompt.includes('MODULE: extraction')) {
    return JSON.stringify(inferCoreFields(extractBlock(prompt, 'INPUT_TEXT') ?? ''));
  }

  if (prompt.includes('MODULE: easyText')) {
    const rawText = extractBlock(prompt, 'INPUT_TEXT') ?? '';
    const coreFields = parseJsonBlock(prompt, 'CORE_FIELDS') as Record<string, unknown> | null;
    return JSON.stringify(buildEasyTextFromFields(coreFields ?? {}, rawText));
  }

  if (prompt.includes('MODULE: actionSteps')) {
    const coreFields = parseJsonBlock(prompt, 'CORE_FIELDS') as Record<string, unknown> | null;
    const actions = Array.isArray(coreFields?.actions) ? (coreFields.actions as string[]) : [];
    const materials = Array.isArray(coreFields?.materials) ? (coreFields.materials as string[]) : [];
    const place = String(coreFields?.place || '');
    const target = materials.join(' ') || place;
    return JSON.stringify(actions.slice(0, 5).map((action, index) => ({
      step: index + 1,
      action,
      reason: action.includes('제출') ? '정해진 기한과 제출처를 지키기 위해' : '해야 할 일을 빠뜨리지 않기 위해',
      visualTarget: target || action
    })));
  }

  if (prompt.includes('MODULE: visual')) {
    const coreFields = parseJsonBlock(prompt, 'CORE_FIELDS') as Record<string, unknown> | null;
    const actions = Array.isArray(coreFields?.actions) ? (coreFields.actions as string[]) : [];
    const materials = Array.isArray(coreFields?.materials) ? (coreFields.materials as string[]) : [];
    const place = String(coreFields?.place || '');
    const deadline = String(coreFields?.deadline || '');
    const visuals: Array<{ cardType: string; label: string; target: string; prompt: string; imageUrl: string }> = [];

    for (const material of materials) {
      visuals.push({ cardType: 'material_card', label: '준비물', target: material, prompt: promptForObjectTarget(material), imageUrl: '' });
    }

    if (place) {
      visuals.push({ cardType: 'place_card', label: '장소', target: place, prompt: promptForPlaceObject(place), imageUrl: '' });
    }

    if (deadline) {
      visuals.push({ cardType: 'deadline_card', label: '마감일', target: deadline, prompt: promptForObjectTarget(deadline), imageUrl: '' });
    }

    if (visuals.length === 0 && actions.length > 0) {
      visuals.push({
        cardType: 'step_card',
        label: '행동',
        target: actions[0],
        prompt: `Soft watercolor illustration style, clean white background, no text. A Korean elementary school student activity scene about: ${actions[0]}`,
        imageUrl: ''
      });
    }

    return JSON.stringify(visuals);
  }

  if (prompt.includes('MODULE: activity')) {
    const coreFields = parseJsonBlock(prompt, 'CORE_FIELDS') as Record<string, unknown> | null;
    const materials = Array.isArray(coreFields?.materials) ? (coreFields.materials as string[]) : [];
    const actions = Array.isArray(coreFields?.actions) ? (coreFields.actions as string[]) : [];
    return JSON.stringify({
      checklist: [...materials.map((item) => `${item} 챙기기`), ...actions].slice(0, 6),
      questions: ['언제까지 해야 하나요?', '어디로 보내거나 제출하나요?', '주의할 점은 무엇인가요?'],
      matchingCardIdeas: [...materials, ...actions].slice(0, 6),
      coachingGuide: '아이와 함께 날짜, 장소, 준비물, 제출할 것을 한 번 더 확인하세요.'
    });
  }

  return JSON.stringify({});
}
