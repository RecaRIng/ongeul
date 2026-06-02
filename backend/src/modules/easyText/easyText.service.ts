import { callLlm } from '../../common/llm.client';
import type { CoreFields, EasyTextLevels, ActionStep, DifficultWord } from '../../common/types';
import { buildEasyTextPrompt } from './easyText.prompt';
import { explainWord } from './dictionary.client';

async function extractDifficultWords(text: string): Promise<DifficultWord[]> {
  const rawWords = text
    .replace(/[.,!?~]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1);

  const seen = new Set<string>();
  const results: DifficultWord[] = [];

  for (const word of rawWords) {
    const result = await explainWord(word);
    if (!result) continue;
    if (seen.has(result.word)) continue;
    seen.add(result.word);
    if (result.needsExplanation) {
      results.push({ word: result.word, grade: result.grade, definition: result.definition });
    }
  }
  return results;
}

function isEasyTextParsed(obj: unknown): obj is { level1: string; level2: string; level3: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Record<string, unknown>).level1 === 'string' &&
    typeof (obj as Record<string, unknown>).level2 === 'string' &&
    typeof (obj as Record<string, unknown>).level3 === 'string'
  );
}

export async function generateEasyText(
  rawText: string,
  coreFields: CoreFields,
  documentType?: string,
  actionSteps?: ActionStep[]
): Promise<EasyTextLevels> {
  const prompt = buildEasyTextPrompt(rawText, coreFields, documentType, actionSteps);

  let response: string;
  try {
    response = await callLlm(prompt);
  } catch (err) {
    throw new Error(`LLM 호출 실패: ${err instanceof Error ? err.message : String(err)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response);
  } catch {
    throw new Error(`LLM 응답 JSON 파싱 실패: ${response}`);
  }

  if (!isEasyTextParsed(parsed)) {
    throw new Error(`LLM 응답 형식이 올바르지 않습니다: ${JSON.stringify(parsed)}`);
  }

  const [difficult1, difficult2, difficult3] = await Promise.all([
    extractDifficultWords(parsed.level1),
    extractDifficultWords(parsed.level2),
    extractDifficultWords(parsed.level3),
  ]);

  return {
    level1: { text: parsed.level1, difficultWords: difficult1 },
    level2: { text: parsed.level2, difficultWords: difficult2 },
    level3: { text: parsed.level3, difficultWords: difficult3 },
  };
}