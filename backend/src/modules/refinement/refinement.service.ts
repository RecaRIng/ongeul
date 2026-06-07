import { callLlm, safeJsonParse } from '../../common/llm.client';
import type {
  AnalysisSummary,
  CoreFields,
  DocumentType,
  ExtraField,
  ExtraFieldCategory,
  ExtraFieldImportance
} from '../../common/types';
import { buildRefinementPrompt } from './refinement.prompt';

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
const providedPattern = /(제공|지급|증정|나누어\s*드|나눠\s*드|드립니다|드릴\s*예정|배부)/;
const bringPattern = /(준비|지참|챙겨|가져|가져오|제출|작성)/;

function hasOwn<T extends object>(obj: T | undefined, key: PropertyKey): obj is T {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function readStringField(source: Partial<Record<keyof CoreFields, unknown>> | undefined, key: keyof CoreFields, fallback: string): string {
  if (hasOwn(source, key)) {
    const value = source[key];
    return typeof value === 'string' ? value.trim() : '';
  }
  return fallback;
}

function readStringArrayField(source: Partial<Record<keyof CoreFields, unknown>> | undefined, key: keyof CoreFields, fallback: string[]): string[] {
  if (hasOwn(source, key)) {
    const value = source[key];
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return fallback;
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

function splitSentences(rawText: string): string[] {
  return rawText
    .split(/[\n.!?。]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function hasProvidedContext(rawText: string, value: string): boolean {
  const normalizedValue = value.trim();
  if (!normalizedValue) return false;

  return splitSentences(rawText).some((sentence) => {
    if (!sentence.includes(normalizedValue)) return false;
    return providedPattern.test(sentence) && !bringPattern.test(sentence);
  });
}

function removeProvidedMaterials(rawText: string, coreFields: CoreFields): CoreFields {
  const materials = coreFields.materials.filter((item) => {
    if (providedPattern.test(item) && !bringPattern.test(item)) return false;
    return !hasProvidedContext(rawText, item);
  });

  return { ...coreFields, materials };
}

function isProvidedExtraField(rawText: string, field: { label: string; value: string; sourceText?: string }): boolean {
  const joined = [field.label, field.value, field.sourceText ?? ''].join(' ');
  if (providedPattern.test(joined) && !bringPattern.test(joined)) return true;
  return field.value
    .split(/[,，/·ㆍ및과와]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .some((part) => hasProvidedContext(rawText, part));
}

function readExtraFields(value: unknown, rawText: string): ExtraField[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const fields: ExtraField[] = [];

  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    const fieldValue = typeof record.value === 'string' ? record.value.trim() : '';
    if (!label || !fieldValue) continue;

    const uniqueKey = `${label}\n${fieldValue}`;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);

    const sourceText = typeof record.sourceText === 'string' && record.sourceText.trim()
      ? record.sourceText.trim()
      : undefined;

    const field = {
      label,
      value: fieldValue,
      category: readCategory(record.category),
      importance: readImportance(record.importance),
      ...(sourceText ? { sourceText } : {})
    };

    fields.push(isProvidedExtraField(rawText, field) ? { ...field, importance: 'low' } : field);
  }

  return fields.slice(0, 12);
}

function buildFallbackSummary(rawText: string, coreFields: CoreFields): AnalysisSummary {
  const firstAction = coreFields.actions[0] || '';
  const pieces = [
    coreFields.date,
    coreFields.time,
    coreFields.place,
    firstAction
  ].filter(Boolean);

  const mainSentence = pieces.length > 0
    ? pieces.join(' ')
    : rawText.replace(/\s+/g, ' ').trim().slice(0, 120);

  return { mainSentence };
}

function readSummary(parsed: RefinementLlmResult | null, rawText: string, coreFields: CoreFields): AnalysisSummary {
  const summary = parsed?.summary;
  if (typeof summary === 'object' && summary !== null) {
    const mainSentence = (summary as Record<string, unknown>).mainSentence;
    if (typeof mainSentence === 'string' && mainSentence.trim().length > 0) {
      return { mainSentence: mainSentence.trim() };
    }
  }
  return buildFallbackSummary(rawText, coreFields);
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
    const refinedCoreFields = removeProvidedMaterials(rawText, readCoreFields(parsed, coreFields));

    return {
      coreFields: refinedCoreFields,
      extraFields: readExtraFields(parsed?.extraFields, rawText),
      summary: readSummary(parsed, rawText, refinedCoreFields)
    };
  } catch (err) {
    console.error('refinement error:', err);
    return {
      coreFields,
      extraFields: [],
      summary: buildFallbackSummary(rawText, coreFields)
    };
  }
}
