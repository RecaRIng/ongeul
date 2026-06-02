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

function findDate(rawText: string): string {
  return findPattern(rawText, [
    /(\d{4}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일)/,
    /(\d{1,2}\s*월\s*\d{1,2}\s*일)/,
    /(\d{1,2}\/\d{1,2})/
  ]);
}

function findTime(rawText: string): string {
  return findPattern(rawText, [
    /((?:오전|오후)\s*\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?)/,
    /(\d{1,2}:\d{2})/
  ]);
}

function findPlace(rawText: string): string {
  const labeledPlace = findPattern(rawText, [/(?:장소|집합|모이는 곳)\s*[:：]?\s*([^.,;\n]+)/]);
  if (labeledPlace) return labeledPlace;

  return findPattern(rawText, [
    /(학교\s*(?:교실|강당|체육관|도서관|운동장|교문|현관))에서/,
    /([가-힣A-Za-z0-9]+(?:교실|강당|체육관|도서관|운동장|교문|현관))에서/,
    /([가-힣A-Za-z0-9]+학교)에서/
  ]);
}

function parseListAfterLabel(rawText: string, labels: string[]): string[] {
  for (const label of labels) {
    const regex = new RegExp(`${label}\\s*[:：]?\\s*([^\\n.]+)`, 'i');
    const match = rawText.match(regex);
    if (match?.[1]) return unique(match[1].split(/[,、/]| 및 |와 |과 |그리고 |，/));
  }
  return [];
}

function cleanPhrase(text: string): string {
  return text.replace(/입니다$|합니다$|하세요$|[.。]$/g, '').trim();
}

function findMaterials(rawText: string): string[] {
  return parseListAfterLabel(rawText, ['준비물', '준비할 것', '가져올 것']).map(cleanPhrase);
}

function findDeadline(rawText: string): string {
  return cleanPhrase(
    findPattern(rawText, [
      /(?:제출\s*기한|마감|기한)\s*[:：]?\s*([^.,;\n]+)/,
      /(\d{1,2}\s*월\s*\d{1,2}\s*일(?:까지)?)/,
      /(\d{1,2}\/\d{1,2}(?:까지)?)/
    ])
  );
}

function findSubmissionTarget(rawText: string): string {
  return cleanPhrase(
    findPattern(rawText, [
      /(?:제출처|제출\s*대상|제출할 곳)\s*[:：]?\s*([^.,;\n]+)/,
      /(담임\s*선생님|담임교사|보호자|학급|학교)/
    ])
  );
}

function findActions(rawText: string): string[] {
  const text = normalizeText(rawText);
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
  const firstAction = actions[0] || '문서의 안내를 확인해야 합니다';
  const schedule = [date, time].filter(Boolean).join(' ');
  const context = [schedule, place ? `${place}에서` : ''].filter(Boolean).join(' ');
  const materialsText = materials.length > 0 ? ` 준비물은 ${materials.join(', ')}입니다.` : '';
  const deadlineText = deadline ? ` ${deadline}까지 해야 합니다.` : '';
  const targetText = submissionTarget ? ` 제출은 ${submissionTarget}에게 합니다.` : '';
  const firstActionText = firstAction.endsWith('.') ? firstAction : `${firstAction}.`;
  const contextualAction = context && !firstAction.includes(context) ? `${context} ${firstActionText}` : firstActionText;

  return {
    level1: contextualAction.trim(),
    level2: `${contextualAction}${materialsText}${deadlineText}${targetText}`.trim(),
    level3: `이 문서는 ${rawText.slice(0, 80)}${rawText.length > 80 ? '...' : ''}에 대한 안내입니다. ${schedule ? `일정은 ${schedule}입니다. ` : ''}${place ? `장소는 ${place}입니다. ` : ''}${materialsText}${deadlineText}${targetText}`.trim()
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
    materials: findMaterials(rawText),
    deadline: findDeadline(rawText),
    submissionTarget: findSubmissionTarget(rawText),
    actions: findActions(rawText),
    warnings: warnings.length > 0 ? warnings : /보호자\s*확인|부모님\s*확인/.test(rawText) ? ['보호자 확인 필요'] : []
  };
}

export async function callLlm(prompt: string): Promise<string> {
  return Promise.resolve(mockLlmResponse(prompt));
}

function mockLlmResponse(prompt: string): string {
  if (prompt.includes('MODULE: classification')) {
    const rawText = extractBlock(prompt, 'INPUT_TEXT') ?? '';
    const documentType = detectDocumentType(rawText);
    const title = rawText.split(/\n/)[0]?.trim().slice(0, 100) || '문서 분석 결과';

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
