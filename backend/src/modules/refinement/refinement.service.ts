import { callLlm, safeJsonParse } from '../../common/llm.client.js';
import type {
  AnalysisSummary,
  CoreFields,
  DocumentType,
  ExtraField,
  ExtraFieldCategory,
  ExtraFieldImportance
} from '../../common/types.js';
import { buildRefinementPrompt } from './refinement.prompt.js';

interface RefinementResult {
  coreFields: CoreFields;
  extraFields: ExtraField[];
  summary: AnalysisSummary;
}

interface RefinementLlmResult {
  coreFields?: Partial<Record<keyof CoreFields, unknown>>;
  extraFields?: unknown;
  summary?: unknown;
}

interface FieldSpec {
  label: string;
  category: ExtraFieldCategory;
  importance: ExtraFieldImportance;
  pattern: RegExp;
}

const categories: ExtraFieldCategory[] = [
  'schedule',
  'application',
  'place',
  'material',
  'target',
  'condition',
  'contact',
  'warning',
  'learning',
  'other'
];

const importances: ExtraFieldImportance[] = ['high', 'medium', 'low'];

const fieldBoundary = String.raw`(?=\s*(?:참고사항|주의사항|기타|\d+\.\s*|[가-힣\s]{1,18}\s*[:：]|$))`;

const fieldSpecs: FieldSpec[] = [
  { label: '신청 방법', category: 'application', importance: 'high', pattern: new RegExp(String.raw`(?:신청\s*방법|신청\s*경로|접수\s*방법)\s*[:：-]?\s*([\s\S]*?)${fieldBoundary}`, 'u') },
  { label: '회신 방법', category: 'application', importance: 'high', pattern: new RegExp(String.raw`(?:회신\s*방법|제출\s*방법|제출\s*방식)\s*[:：-]?\s*([\s\S]*?)${fieldBoundary}`, 'u') },
  { label: '신청 기간', category: 'schedule', importance: 'high', pattern: new RegExp(String.raw`(?:신청\s*기간|신청기한|접수\s*기간)\s*[:：-]?\s*([\s\S]*?)${fieldBoundary}`, 'u') },
  { label: '제출 기한', category: 'schedule', importance: 'high', pattern: new RegExp(String.raw`(?:제출\s*기한|마감\s*기한)\s*[:：-]\s*([\s\S]*?)${fieldBoundary}`, 'u') },
  { label: '대상', category: 'target', importance: 'high', pattern: new RegExp(String.raw`(?:\d+\.\s*)?대상\s*[:：-]?\s*([\s\S]*?)${fieldBoundary}`, 'u') },
  { label: '주제', category: 'learning', importance: 'high', pattern: new RegExp(String.raw`(?:\d+\.\s*)?주제\s*[:：-]?\s*([\s\S]*?)${fieldBoundary}`, 'u') },
  { label: '일시', category: 'schedule', importance: 'high', pattern: new RegExp(String.raw`(?:\d+\.\s*)?일시\s*[:：-]?\s*([\s\S]*?)${fieldBoundary}`, 'u') },
  { label: '관련 도서', category: 'learning', importance: 'medium', pattern: new RegExp(String.raw`(?:관련\s*도서|도서)\s*[:：-]?\s*([\s\S]*?)${fieldBoundary}`, 'u') },
  { label: '신청 인원', category: 'condition', importance: 'high', pattern: new RegExp(String.raw`(?:신청\s*인원|정원|모집\s*인원)\s*[:：-]\s*([\s\S]*?)${fieldBoundary}`, 'u') },
  { label: '선발 방식', category: 'condition', importance: 'high', pattern: /([^.\n]*(?:추첨|선발|초과\s*시)[^.\n]*)/u },
  { label: '부분 참여', category: 'warning', importance: 'high', pattern: /([^.\n]*부분\s*참여[^.\n]*)/u },
  { label: '종류', category: 'other', importance: 'high', pattern: new RegExp(String.raw`(?:\d+\.\s*)?[^:\n.]*종류\s*[:：-]?\s*([\s\S]*?)${fieldBoundary}`, 'u') },
  { label: '운영 방법', category: 'condition', importance: 'high', pattern: new RegExp(String.raw`(?:\d+\.\s*)?[^:\n.]*(?:급식|운영)?\s*방법\s*[:：-]?\s*([\s\S]*?)${fieldBoundary}`, 'u') },
  { label: '비용 부담', category: 'condition', importance: 'high', pattern: new RegExp(String.raw`(?:\d+\.\s*)?[^:\n.]*(?:비용\s*부담|부담\s*주체|부담)\s*[:：-]?\s*([\s\S]*?)${fieldBoundary}`, 'u') },
  { label: '예상 단가', category: 'condition', importance: 'high', pattern: new RegExp(String.raw`(?:\d+\.\s*)?[^:\n.]*(?:단가|가격)\s*[:：-]?\s*([\s\S]*?)${fieldBoundary}`, 'u') },
  { label: '시행 조건', category: 'condition', importance: 'high', pattern: /([^.\n]*(?:미만|이상|초과)[^.\n]*(?:시행|실시|선발|제외)[^.\n]*)/u },
  { label: '미제출 처리', category: 'warning', importance: 'high', pattern: /([^.\n]*(?:미제출|제출하지)[^.\n]*(?:간주|처리)[^.\n]*)/u },
  { label: '주의사항', category: 'warning', importance: 'medium', pattern: /([^.\n]*(?:충분히\s*상의|집으로\s*가져|참여.*제한|사전\s*연락\s*없이|기한\s*내\s*미제출)[^.\n]*)/u },
];

function hasOwn<T extends object>(obj: T | undefined, key: PropertyKey): obj is T {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function readStringField(source: Partial<Record<keyof CoreFields, unknown>> | undefined, key: keyof CoreFields, fallback: string): string {
  if (!hasOwn(source, key)) return fallback;
  const value = source[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readStringArrayField(source: Partial<Record<keyof CoreFields, unknown>> | undefined, key: keyof CoreFields, fallback: string[]): string[] {
  if (!hasOwn(source, key)) return fallback;
  const value = source[key];
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function readCoreFields(parsed: RefinementLlmResult | null, fallback: CoreFields): CoreFields {
  const source = parsed?.coreFields;
  return {
    date: readStringField(source, 'date', fallback.date),
    time: readStringField(source, 'time', fallback.time),
    place: readStringField(source, 'place', fallback.place),
    materials: readStringArrayField(source, 'materials', fallback.materials),
    deadline: readStringField(source, 'deadline', fallback.deadline),
    submissionTarget: readStringField(source, 'submissionTarget', fallback.submissionTarget),
    actions: readStringArrayField(source, 'actions', fallback.actions),
    warnings: readStringArrayField(source, 'warnings', fallback.warnings)
  };
}

function readCategory(value: unknown): ExtraFieldCategory {
  return typeof value === 'string' && categories.includes(value as ExtraFieldCategory)
    ? value as ExtraFieldCategory
    : 'other';
}

function readImportance(value: unknown): ExtraFieldImportance {
  return typeof value === 'string' && importances.includes(value as ExtraFieldImportance)
    ? value as ExtraFieldImportance
    : 'medium';
}

function cleanExtractedValue(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[\s:：\-•ㆍ·]+/, '')
    .replace(/[\s.。]+$/, '')
    .replace(/\s*(?:입니다|합니다|해주세요|주시기\s*바랍니다|바랍니다)$/u, '')
    .trim();
}

function cleanWarningItem(value: string): string {
  return cleanExtractedValue(value)
    .replace(/^[^:：]{1,18}[:：]\s*/, '')
    .replace(/^\s*[-*•ㆍ·]\s*/, '')
    .replace(/^[^:：]{1,18}[:：]\s*/, '')
    .trim();
}

function splitSentences(rawText: string): string[] {
  return rawText
    .split(/[\n.!?。]+/u)
    .map(cleanExtractedValue)
    .filter(Boolean);
}

function findSourceText(rawText: string, value: string, fallback: string): string {
  const cleanedValue = cleanExtractedValue(value);
  const sentence = splitSentences(rawText).find((item) => item.includes(cleanedValue));
  return cleanExtractedValue(sentence || fallback).slice(0, 180);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeDateMeaning(value: string): string {
  return cleanExtractedValue(value)
    .replace(/\s+/g, '')
    .replace(/[까지.。]/gu, '')
    .replace(/\([^)]*\)/g, '');
}

function hasSameDateMeaning(date: string, deadline: string): boolean {
  const normalizedDate = normalizeDateMeaning(date);
  const normalizedDeadline = normalizeDateMeaning(deadline);
  return normalizedDate.length > 0 && normalizedDate === normalizedDeadline;
}

function isMethodLikeTarget(rawText: string, target: string): boolean {
  const cleanedTarget = cleanExtractedValue(target);
  if (!cleanedTarget) return false;

  const escapedTarget = escapeRegExp(cleanedTarget);
  if (new RegExp(`${escapedTarget}\\s*(?:로|으로)\\s*(?:회신|신청|접수|제출)`, 'u').test(rawText)) {
    return true;
  }

  return /(?:앱|서비스|링크|QR|큐알|폼|온라인|모바일|시스템)/iu.test(cleanedTarget);
}

function removeMisplacedCoreValues(rawText: string, coreFields: CoreFields): CoreFields {
  const date = hasSameDateMeaning(coreFields.date, coreFields.deadline) ? '' : coreFields.date;
  const place = /^(?:각\s*)?교실$/u.test(coreFields.place.trim()) ? '' : coreFields.place;
  const submissionTarget = isMethodLikeTarget(rawText, coreFields.submissionTarget) ? '' : coreFields.submissionTarget;
  const warnings = coreFields.warnings.map(cleanWarningItem).filter(Boolean);
  return { ...coreFields, date, place, submissionTarget, warnings };
}

function addExtraField(fields: ExtraField[], field: ExtraField): void {
  const label = cleanExtractedValue(field.label);
  const value = cleanExtractedValue(field.value);
  if (!label || !value) return;
  if (value.length > 180) return;
  if (label === '비용 부담' && value.length > 80) return;
  if (label === '예상 단가' && (value.length > 45 || /공급업체|결정/u.test(value))) return;

  const key = `${label}\n${value}`.replace(/\s+/g, '');
  if (fields.some((item) => `${item.label}\n${item.value}`.replace(/\s+/g, '') === key)) return;
  fields.push({ ...field, label, value });
}

function readExtraFields(value: unknown, rawText: string): ExtraField[] {
  if (!Array.isArray(value)) return [];

  const fields: ExtraField[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;
    const label = typeof record.label === 'string' ? cleanExtractedValue(record.label) : '';
    const fieldValue = typeof record.value === 'string' ? cleanExtractedValue(record.value) : '';
    if (!label || !fieldValue) continue;

    addExtraField(fields, {
      label,
      value: fieldValue,
      category: readCategory(record.category),
      importance: readImportance(record.importance),
      ...(typeof record.sourceText === 'string' && record.sourceText.trim() ? { sourceText: record.sourceText.trim() } : {})
    });
  }

  return fields.map((field) => ({ ...field, sourceText: field.sourceText || findSourceText(rawText, field.value, field.value) })).slice(0, 12);
}

function findApplicationMethodField(rawText: string): ExtraField | null {
  const normalized = rawText.replace(/\s+/g, ' ');
  const match = normalized.match(/([가-힣A-Za-z0-9]{1,24})\s*(로|으로)\s*(회신|신청|접수)/u);
  if (!match?.[1] || !match[2] || !match[3]) return null;

  const value = cleanExtractedValue(`${match[1]}${match[2]} ${match[3]}`);
  if (!value) return null;

  return {
    label: match[3] === '신청' || match[3] === '접수' ? '신청 방법' : '회신 방법',
    value,
    category: 'application',
    importance: 'high',
    sourceText: findSourceText(rawText, value, value)
  };
}

function findWarningFields(rawText: string): ExtraField[] {
  const warnings: ExtraField[] = [];
  for (const sentence of splitSentences(rawText)) {
    if (!/(미제출|제출하지|불가|제한|충분히\s*상의|집으로\s*가져|사전\s*연락\s*없이|기한\s*내)/u.test(sentence)) continue;
    addExtraField(warnings, {
      label: '주의사항',
      value: cleanWarningItem(sentence),
      category: 'warning',
      importance: 'high',
      sourceText: sentence
    });
  }
  return warnings;
}

function findCapacityField(rawText: string): ExtraField | null {
  const match = rawText.match(/(?:희망자|정원|선발)\s*([0-9]+\s*명)/u);
  if (!match?.[1]) return null;
  const value = cleanExtractedValue(match[1]);
  return {
    label: '신청 인원',
    value,
    category: 'condition',
    importance: 'high',
    sourceText: findSourceText(rawText, value, match[0])
  };
}

function findCostResponsibilityField(rawText: string): ExtraField | null {
  const match = rawText.match(/(?:급식비\s*부담\s*주체|비용\s*부담|부담\s*주체)\s*[:：-]?\s*([^\n.]+)/u);
  if (!match?.[1]) return null;
  const value = cleanExtractedValue(match[1]);
  return {
    label: '비용 부담',
    value,
    category: 'condition',
    importance: 'high',
    sourceText: findSourceText(rawText, value, match[0])
  };
}

function findUnitPriceField(rawText: string): ExtraField | null {
  const match = rawText.match(/([0-9,]+\s*원(?:\s*(?:개당|내외)){0,2})/u);
  if (!match?.[1]) return null;
  const value = cleanExtractedValue(match[1]);
  return {
    label: '예상 단가',
    value,
    category: 'condition',
    importance: 'high',
    sourceText: findSourceText(rawText, value, match[0])
  };
}

function buildFallbackExtraFields(rawText: string): ExtraField[] {
  const fields: ExtraField[] = [];

  for (const spec of fieldSpecs) {
    const match = rawText.match(spec.pattern);
    const captured = match?.[1];
    if (!captured) continue;

    const value = spec.category === 'warning' ? cleanWarningItem(captured) : cleanExtractedValue(captured);
    if (!value) continue;

    addExtraField(fields, {
      label: spec.label,
      value,
      category: spec.category,
      importance: spec.importance,
      sourceText: findSourceText(rawText, value, match[0])
    });
  }

  const methodField = findApplicationMethodField(rawText);
  if (methodField) addExtraField(fields, methodField);
  const capacityField = findCapacityField(rawText);
  if (capacityField) addExtraField(fields, capacityField);
  const costResponsibilityField = findCostResponsibilityField(rawText);
  if (costResponsibilityField) addExtraField(fields, costResponsibilityField);
  const unitPriceField = findUnitPriceField(rawText);
  if (unitPriceField) addExtraField(fields, unitPriceField);
  findWarningFields(rawText).forEach((field) => addExtraField(fields, field));

  return fields.slice(0, 12);
}

function mergeExtraFields(primary: ExtraField[], fallback: ExtraField[]): ExtraField[] {
  const merged: ExtraField[] = [];
  primary.forEach((field) => addExtraField(merged, field));
  fallback.forEach((field) => addExtraField(merged, field));
  return merged.slice(0, 12);
}

function buildFallbackSummary(
  _rawText: string,
  documentType: DocumentType,
  coreFields: CoreFields,
  extraFields: ExtraField[]
): AnalysisSummary {
  const primaryItems: AnalysisSummary['primaryItems'] = [];
  const addPrimary = (label: string, value: string, source: 'coreFields' | 'extraFields') => {
    const cleanedValue = cleanExtractedValue(value);
    if (!cleanedValue) return;
    if (primaryItems.some((item) => item.label === label && item.value === cleanedValue)) return;
    primaryItems.push({ label, value: cleanedValue, source });
  };

  addPrimary('날짜', coreFields.date, 'coreFields');
  addPrimary('시간', coreFields.time, 'coreFields');
  addPrimary('장소', coreFields.place, 'coreFields');
  addPrimary('기한', coreFields.deadline, 'coreFields');
  addPrimary('제출처', coreFields.submissionTarget, 'coreFields');
  if (coreFields.materials.length > 0) addPrimary('준비물', coreFields.materials.join(', '), 'coreFields');

  extraFields
    .filter((field) => field.importance === 'high')
    .slice(0, 5)
    .forEach((field) => addPrimary(field.label, field.value, 'extraFields'));

  const warningItems = [
    ...coreFields.warnings,
    ...extraFields.filter((field) => field.category === 'warning').map((field) => field.value)
  ].map(cleanWarningItem).filter(Boolean);

  const method = extraFields.find((field) => field.category === 'application');
  let mainSentence = '문서의 핵심 정보를 확인하고 필요한 행동을 순서대로 진행하세요.';

  if (documentType === 'submission-form') {
    const dueText = coreFields.deadline ? `기한은 ${coreFields.deadline}입니다.` : '';
    const targetText = coreFields.submissionTarget ? `제출처는 ${coreFields.submissionTarget}입니다.` : '';
    const methodText = method ? `${method.label}은 ${method.value}입니다.` : '';
    mainSentence = [
      '이 문서는 내용을 확인하고 작성해서 제출하거나 회신해야 하는 안내문이에요.',
      dueText,
      targetText || methodText
    ].filter(Boolean).join(' ');
  } else if (documentType === 'execution-guide') {
    mainSentence = '이 문서는 정해진 일정과 장소에 맞춰 행동해야 하는 안내문이에요.';
  } else if (documentType === 'learning-task') {
    mainSentence = '이 문서는 과제를 어떻게 해야 하는지 알려주는 안내문이에요.';
  }

  return {
    mainSentence,
    primaryItems: primaryItems.slice(0, 8),
    warningItems: Array.from(new Set(warningItems)).slice(0, 6)
  };
}

function readSummaryPrimaryItems(value: unknown): AnalysisSummary['primaryItems'] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null;
      const record = item as Record<string, unknown>;
      const label = typeof record.label === 'string' ? cleanExtractedValue(record.label) : '';
      const itemValue = typeof record.value === 'string' ? cleanExtractedValue(record.value) : '';
      const source = record.source === 'extraFields' ? 'extraFields' : 'coreFields';
      return label && itemValue ? { label, value: itemValue, source } : null;
    })
    .filter((item): item is AnalysisSummary['primaryItems'][number] => Boolean(item))
    .slice(0, 8);
}

function readSummary(
  parsed: RefinementLlmResult | null,
  rawText: string,
  documentType: DocumentType,
  coreFields: CoreFields,
  extraFields: ExtraField[]
): AnalysisSummary {
  const fallback = buildFallbackSummary(rawText, documentType, coreFields, extraFields);
  const summary = parsed?.summary;
  if (typeof summary === 'object' && summary !== null) {
    const record = summary as Record<string, unknown>;
    const mainSentence = record.mainSentence;
    if (typeof mainSentence === 'string' && mainSentence.trim().length > 0) {
      const primaryItems = readSummaryPrimaryItems(record.primaryItems);
      const warningItems = Array.isArray(record.warningItems)
        ? record.warningItems.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map(cleanWarningItem)
        : [];
      return {
        mainSentence: cleanExtractedValue(mainSentence),
        primaryItems: primaryItems.length > 0 ? primaryItems : fallback.primaryItems,
        warningItems: warningItems.length > 0 ? warningItems : fallback.warningItems
      };
    }
  }
  return fallback;
}

export async function refineDocumentUnderstanding(
  rawText: string,
  documentType: DocumentType,
  coreFields: CoreFields
): Promise<RefinementResult> {
  try {
    const prompt = buildRefinementPrompt(rawText, documentType, coreFields);
    const response = await callLlm(prompt);
    const parsed = safeJsonParse<RefinementLlmResult>(response);
    const refinedCoreFields = removeMisplacedCoreValues(rawText, readCoreFields(parsed, coreFields));
    const extraFields = mergeExtraFields(
      readExtraFields(parsed?.extraFields, rawText),
      buildFallbackExtraFields(rawText)
    );

    return {
      coreFields: refinedCoreFields,
      extraFields,
      summary: readSummary(parsed, rawText, documentType, refinedCoreFields, extraFields)
    };
  } catch (err) {
    console.error('refinement error:', err);
    const refinedCoreFields = removeMisplacedCoreValues(rawText, coreFields);
    const extraFields = buildFallbackExtraFields(rawText);
    return {
      coreFields: refinedCoreFields,
      extraFields,
      summary: buildFallbackSummary(rawText, documentType, refinedCoreFields, extraFields)
    };
  }
}
