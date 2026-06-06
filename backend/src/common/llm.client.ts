import type { CoreFields, DocumentType } from './types';

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

function firstNonEmptyLine(rawText: string): string {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? '';
}

export function inferDocumentTitle(rawText: string): string {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => compactField(line))
    .filter(Boolean);

  const titleLines: string[] = [];
  const labelLine = /^(일시|일자|날짜|장소|대상|문의|문의\s*전화|담당자|기념품|간식|준비물|제출|마감)\s*[:：]?/;
  const bodyLine = /^(드릴\s*말씀|아래와\s*같이|학부모님|이웃의|많은\s*관심|적극적인|2020년\s*[‘'"]?\s*경자년)/;

  for (const line of lines) {
    if (labelLine.test(line)) break;

    if (titleLines.length > 0 && bodyLine.test(line)) break;
    if (line.length > 80 && titleLines.length > 0) break;

    titleLines.push(line);

    const joined = titleLines.join(' ');
    if (titleLines.length >= 3) break;
    if (joined.length >= 24 && /(안내|모집|간담회|설명회|신청|과제|가정통신문)/.test(joined)) break;
  }

  const title = titleLines.join(' ').replace(/\s{2,}/g, ' ').trim();
  return title || firstNonEmptyLine(rawText) || '문서 분석 결과';
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function detectDocumentType(rawText: string): DocumentType {
  const text = normalizeText(rawText);

  if (/(과제|수행평가|발표|조사|만들기|학습|숙제)/.test(text)) return 'learning-task';
  if (/(신청서|동의서|서명|제출서류|회신|선택|희망)/.test(text)) return 'submission-form';

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

function readLabeledValue(rawText: string, labels: string[], stopLabels: string[]): string {
  const text = normalizeText(rawText).replace(/[•◆◇▪︎▸▶]/g, ' ');
  const labelPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const stopPattern = stopLabels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const pattern = new RegExp(`(?:${labelPattern})\\s*[:：]?\\s*([\\s\\S]*?)(?=\\s*(?:${stopPattern})(?:\\s*[:：]|\\s+|$)|$)`, 'i');
  const match = text.match(pattern);
  return match?.[1]?.trim() ?? '';
}

function compactField(value: string): string {
  return value
    .replace(/^[·ㆍ\-\s]+/, '')
    .replace(/[·ㆍ\-\s]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function findDate(rawText: string): string {
  const labeled = readLabeledValue(rawText, ['일시', '일자', '날짜'], ['장소', '대상', '기념품', '간식', '문의', '담당자', '제출', '마감']);
  const source = labeled || rawText;

  return findPattern(source, [
    /(\d{4}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일)/,
    /(\d{1,2}\s*월\s*\d{1,2}\s*일)/,
    /(\d{1,2}\/\d{1,2})/
  ]);
}

function findTime(rawText: string): string {
  const labeled = readLabeledValue(rawText, ['일시', '시간'], ['장소', '대상', '기념품', '간식', '문의', '담당자', '제출', '마감']);
  const source = labeled || rawText;

  return findPattern(source, [
    /((?:오전|오후)\s*\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?)/,
    /(\d{1,2}:\d{2})/
  ]);
}

function findPlace(rawText: string): string {
  const labeledPlace = compactField(
    readLabeledValue(rawText, ['장소', '집합', '모이는 곳'], ['대상', '기념품', '간식', '문의', '담당자', '일시', '날짜', '제출', '마감'])
  );
  if (labeledPlace) return labeledPlace;

  return findPattern(rawText, [
    /(학교\s*(?:교실|강당|체육관|도서관|운동장|교문|현관))에서/,
    /([가-힣A-Za-z0-9]+(?:교실|강당|체육관|도서관|운동장|교문|현관))에서/,
    /([가-힣A-Za-z0-9]+학교)에서/
  ]);
}

function findAudience(rawText: string): string {
  return compactField(readLabeledValue(rawText, ['대상'], ['일시', '장소', '기념품', '간식', '문의', '담당자', '제출', '마감']));
}

function findContact(rawText: string): string {
  return compactField(readLabeledValue(rawText, ['문의 전화', '문의'], ['담당자', '일시', '장소', '대상', '기념품', '간식', '제출', '마감']));
}

function parseListAfterLabel(rawText: string, labels: string[]): string[] {
  for (const label of labels) {
    const value = readLabeledValue(rawText, [label], ['일시', '날짜', '장소', '대상', '기념품', '간식', '문의', '담당자', '제출', '마감', '준비물']);
    if (value) return unique(value.split(/[,、/]| 및 |와 |과 |그리고 |，/).map(compactField));
  }
  return [];
}

function cleanPhrase(text: string): string {
  return text.replace(/입니다$|합니다$|하세요$|[.。]$/g, '').trim();
}

function sentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return /[.!?。]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function findMaterials(rawText: string): string[] {
  return parseListAfterLabel(rawText, ['준비물', '준비할 것', '가져올 것']).map(cleanPhrase);
}

function findDeadline(rawText: string): string {
  const explicit = readLabeledValue(rawText, ['제출 기한', '제출기한', '마감', '기한'], ['일시', '장소', '대상', '기념품', '간식', '문의', '담당자']);
  if (explicit) return cleanPhrase(compactField(explicit));

  return cleanPhrase(findPattern(rawText, [/(\d{1,2}\s*월\s*\d{1,2}\s*일\s*까지)/, /(\d{1,2}\/\d{1,2}\s*까지)/]));
}

function findSubmissionTarget(rawText: string): string {
  return cleanPhrase(
    findPattern(rawText, [
      /(?:제출처|제출\s*대상|제출할 곳)\s*[:：]?\s*([^.,;\n]+)/,
      /(담임\s*선생님|담임교사|보호자|학급)/
    ])
  );
}

function findActions(rawText: string): string[] {
  const text = normalizeText(rawText);
  if (/간담회|설명회|입학예정자|학부모/.test(text)) {
    const actions = ['학부모 간담회에 참석합니다'];
    if (/홍보|협조|부탁/.test(text)) actions.push('주변 신입생 학부모에게 안내합니다');
    return actions;
  }

  const bulletActions = Array.from(rawText.matchAll(/(?:^|\n)\s*[-*ㆍ]\s*([^\n]+)/g)).map((match) => cleanPhrase(match[1] ?? ''));

  if (bulletActions.length > 0) return unique(bulletActions);

  const sentences = text
    .split(/(?<=[.!?。])\s*/)
    .map(cleanPhrase)
    .filter((sentence) => /(준비|제출|작성|발표|참가|참여|확인|가져|읽|조사)/.test(sentence));

  return unique(sentences.length > 0 ? sentences : [text.slice(0, 100)]);
}

function buildEasyTextFromFields(coreFields: Record<string, unknown>, rawText: string) {
  const date = String(coreFields.date || '');
  const time = String(coreFields.time || '');
  const place = String(coreFields.place || '');
  const materials = Array.isArray(coreFields.materials) ? (coreFields.materials as string[]) : [];
  const deadline = String(coreFields.deadline || '');
  const submissionTarget = String(coreFields.submissionTarget || '');
  const actions = Array.isArray(coreFields.actions) ? (coreFields.actions as string[]) : [];
  const schedule = [date, time].filter(Boolean).join(' ');
  const firstAction = actions[0] || (rawText.includes('간담회') ? '학부모 간담회에 참석합니다' : '문서의 안내를 확인합니다');
  const audience = String(coreFields.audience || '') || findAudience(rawText);
  const contact = String(coreFields.contact || '') || findContact(rawText);
  const eventLine = sentence([schedule ? `${schedule}에` : '', place ? `${place}에서` : '', firstAction].filter(Boolean).join(' '));
  const audienceLine = audience ? sentence(`대상은 ${audience}입니다`) : '';
  const materialsLine = materials.length > 0 ? `준비하거나 받을 것은 ${materials.join(', ')}입니다.` : '';
  const deadlineLine = deadline ? sentence(`${deadline}까지 해야 합니다`) : '';
  const targetLine = submissionTarget ? sentence(`제출은 ${submissionTarget}에게 합니다`) : '';
  const contactLine = contact ? sentence(`궁금한 것은 ${contact}로 물어볼 수 있습니다`) : '';
  const actionLines = actions.slice(1).map(sentence);
  const lines = [eventLine, audienceLine, materialsLine, deadlineLine, targetLine, contactLine, ...actionLines].filter((line) => line.trim().length > 0);

  return {
    level1: lines.slice(0, 3).join('\n\n'),
    level2: lines.join('\n\n'),
    level3: [
      `이 문서는 ${firstNonEmptyLine(rawText) || '학교 안내문'}에 대한 안내입니다.`,
      schedule ? `일정은 ${schedule}입니다.` : '',
      place ? `장소는 ${place}입니다.` : '',
      ...lines
    ].filter(Boolean).join('\n\n')
  };
}

export function inferDocumentType(rawText: string): DocumentType {
  return detectDocumentType(rawText);
}

export function inferCoreFields(rawText: string): CoreFields {
  const warnings = parseListAfterLabel(rawText, ['주의사항', '유의사항']);

  return {
    date: findDate(rawText),
    time: findTime(rawText),
    place: findPlace(rawText),
    audience: findAudience(rawText),
    materials: findMaterials(rawText),
    contact: findContact(rawText),
    deadline: findDeadline(rawText),
    submissionTarget: findSubmissionTarget(rawText),
    actions: findActions(rawText),
    warnings: warnings.length > 0 ? warnings : /보호자\s*확인|부모님\s*확인/.test(rawText) ? ['보호자 확인 필요'] : []
  };
}

export async function callLlm(prompt: string): Promise<string> {
  return Promise.resolve(mockLlmResponse(prompt));
}

export function safeJsonParse<T = unknown>(response: string): T | null {
  if (typeof response !== 'string' || response.trim().length === 0) {
    return null;
  }

  const trimmed = response.trim();

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const objectStart = trimmed.indexOf('{');
    const arrayStart = trimmed.indexOf('[');
    const starts = [objectStart, arrayStart].filter((idx) => idx >= 0);
    if (starts.length === 0) return null;

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

function mockLlmResponse(prompt: string): string {
  if (prompt.includes('MODULE: classification')) {
    const rawText = extractBlock(prompt, 'INPUT_TEXT') ?? '';
    const documentType = detectDocumentType(rawText);
    const title = inferDocumentTitle(rawText).slice(0, 100);

    return JSON.stringify({ documentType, title });
  }

  if (prompt.includes('MODULE: extraction')) {
    return JSON.stringify(inferCoreFields(extractBlock(prompt, 'INPUT_TEXT') ?? ''));
  }

  if (prompt.includes('MODULE: easyText')) {
    const rawText = extractBlock(prompt, 'INPUT_TEXT') ?? '';
    const coreFields = parseJsonBlock(prompt, 'CORE_FIELDS') as Record<string, unknown> | null;
    return JSON.stringify(buildEasyTextFromFields(coreFields ?? {}, rawText));
  }

  return JSON.stringify({});
}
