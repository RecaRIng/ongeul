import type { CoreFields, EasyTextLevels, ActionStep, DifficultWord } from '../../common/types';
import { buildEasyTextPrompt } from './easyText.prompt';
import { explainWord } from './dictionary.client';
import { callLlm } from '../../common/llm.client';

function buildMockEasyText(coreFields: CoreFields) {
  const date = coreFields.date || '';
  const time = coreFields.time || '';
  const place = coreFields.place || '';
  const materials = coreFields.materials.join(', ');
  const deadline = coreFields.deadline || '';
  const submissionTarget = coreFields.submissionTarget || '';

  const dateText = date ? `${date}${time ? ` ${time}` : ''}` : '';
  const placeText = place ? ` ${place}에서` : '';
  const materialsText = materials ? `준비물은 ${materials}이에요.` : '';
  const submitText = deadline && submissionTarget ? `${deadline}까지 ${submissionTarget}께 내요.` : '';

  return {
    level1: [dateText ? `${dateText}${placeText} 활동을 해요.` : '활동을 해요.', materialsText, submitText].filter(Boolean).join(' '),
    level2: [dateText ? `${dateText}${placeText} 활동이 있어요.` : '활동이 있어요.', materialsText, submitText].filter(Boolean).join(' '),
    level3: [dateText ? `${dateText}${placeText} 활동이 있습니다.` : '활동이 있습니다.', materialsText ? `준비물로 ${materials}이 필요합니다.` : '', deadline && submissionTarget ? `참가 신청서를 ${deadline}까지 ${submissionTarget}께 제출해야 합니다.` : ''].filter(Boolean).join(' '),
  };
}

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

  let parsed: { level1: string; level2: string; level3: string };

  if (process.env.OPENAI_API_KEY) {
    const prompt = buildEasyTextPrompt(rawText, coreFields, documentType, actionSteps);
    let response: string;
    try {
      response = await callLlm(prompt);
    } catch (err) {
      throw new Error(`LLM 호출 실패: ${err instanceof Error ? err.message : String(err)}`);
    }
    let parsedUnknown: unknown;
    try {
      parsedUnknown = JSON.parse(response);
    } catch {
      throw new Error(`LLM 응답 JSON 파싱 실패: ${response}`);
    }
    if (!isEasyTextParsed(parsedUnknown)) {
      throw new Error(`LLM 응답 형식이 올바르지 않습니다: ${JSON.stringify(parsedUnknown)}`);
    }
    parsed = parsedUnknown;
  } else {
    parsed = buildMockEasyText(coreFields);
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
