import type { CoreFields, EasyTextLevels, ActionStep, DifficultWord } from '../../common/types.js';
import { buildEasyTextPrompt } from './easyText.prompt.js';
import { classifyWords } from './dictionary.client.js';
import { callLlm } from '../../common/llm.client.js';

interface LlmDifficultWord {
  word: string;
  meaning: string;
  example: string;
  displayMode: {
    level1: 'inline' | 'tooltip' | 'none';
    level2: 'tooltip' | 'none';
    level3: 'tooltip' | 'none';
  };
}

interface LlmEasyTextResponse {
  level1: string;
  level2: string;
  level3: string;
  difficultWords: LlmDifficultWord[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function deadlineWithUntil(value: string): string {
  const cleaned = value.trim().replace(/\s*(?:까지)+$/u, '');
  return cleaned ? `${cleaned}까지` : '';
}

function findOnlineMethod(rawText: string, target: string): string {
  const cleanedTarget = target.trim();
  if (!cleanedTarget) return '';

  const match = rawText.match(new RegExp(`${escapeRegExp(cleanedTarget)}\\s*(로|으로)\\s*(회신|신청|접수)`, 'u'));
  if (!match?.[1] || !match[2]) return '';
  return `${cleanedTarget}${match[1]} ${match[2]}`;
}

function findAnyOnlineMethod(rawText: string): string {
  const normalized = rawText.replace(/\s+/g, ' ');
  const match = normalized.match(/([가-힣A-Za-z0-9]{1,24})\s*(로|으로)\s*(회신|신청|접수)/u);
  if (!match?.[1] || !match[2] || !match[3]) return '';
  return `${match[1]}${match[2]} ${match[3]}`;
}

function buildSubmitText(rawText: string, deadline: string, submissionTarget: string): string {
  const due = deadlineWithUntil(deadline);
  const onlineMethod = findOnlineMethod(rawText, submissionTarget) || (!submissionTarget ? findAnyOnlineMethod(rawText) : '');

  if (onlineMethod) {
    return `${due ? `${due} ` : ''}${onlineMethod}해요.`;
  }

  if (submissionTarget) {
    return `${due ? `${due} ` : ''}${submissionTarget}께 제출해요.`;
  }

  return due ? `${due} 내용을 확인해요.` : '';
}

function sentenceList(items: string[], limit = 3): string {
  return items
    .slice(0, limit)
    .map((item) => item.trim())
    .filter(Boolean)
    .join('\n');
}

function buildMockEasyText(rawText: string, coreFields: CoreFields, documentType?: string, actionSteps: ActionStep[] = []) {
  const date = coreFields.date || '';
  const time = coreFields.time || '';
  const place = coreFields.place || '';
  const materials = coreFields.materials.join(', ');
  const deadline = coreFields.deadline || '';
  const submissionTarget = coreFields.submissionTarget || '';
  const actions = actionSteps.length > 0
    ? actionSteps.map((step) => step.action)
    : coreFields.actions;

  const schedule = [date, time].filter(Boolean).join(' ');
  const submitText = buildSubmitText(rawText, deadline, submissionTarget);
  const actionText = sentenceList(actions);
  const warningText = sentenceList(coreFields.warnings, 2);

  if (documentType === 'submission-form') {
    return {
      level1: [
        '내용을 확인하고 작성해야 하는 안내문이에요.',
        submitText,
        warningText && `주의할 점도 확인해요.\n${warningText}`,
      ].filter(Boolean).join('\n\n'),
      level2: [
        '이 문서는 신청서나 조사서를 작성해서 제출하거나 회신해야 하는 안내문이에요.',
        submitText,
        actionText && `해야 할 일입니다.\n${actionText}`,
        materials && `필요한 준비물은 ${materials}입니다.`,
        warningText && `주의할 점입니다.\n${warningText}`,
      ].filter(Boolean).join('\n\n'),
      level3: [
        '보호자나 학생이 내용을 확인한 뒤 필요한 항목을 작성하고 제출해야 합니다.',
        submitText,
        actionText && `확인할 일을 순서대로 정리하면 다음과 같습니다.\n${actionText}`,
        warningText && `빠뜨리면 안 되는 내용입니다.\n${warningText}`,
      ].filter(Boolean).join('\n\n'),
    };
  }

  if (documentType === 'learning-task') {
    return {
      level1: [actionText || '해야 할 과제를 확인해요.', submitText].filter(Boolean).join('\n\n'),
      level2: [actionText || '문서를 읽고 과제를 순서대로 해요.', materials && `준비물은 ${materials}입니다.`, submitText].filter(Boolean).join('\n\n'),
      level3: [actionText || '과제를 어떻게 해야 하는지 확인하고 차근차근 진행합니다.', materials && `필요한 준비물은 ${materials}입니다.`, submitText].filter(Boolean).join('\n\n'),
    };
  }

  return {
    level1: [schedule && `${schedule} 확인해요.`, place && `${place}에 가요.`, materials && `${materials}을 챙겨요.`, submitText].filter(Boolean).join('\n\n'),
    level2: [schedule ? `일정은 ${schedule}입니다.` : '문서를 읽고 해야 할 일을 확인해요.', place && `장소는 ${place}입니다.`, actionText && `해야 할 일입니다.\n${actionText}`, materials && `준비물은 ${materials}입니다.`, submitText].filter(Boolean).join('\n\n'),
    level3: [schedule && `문서에서 확인한 일정은 ${schedule}입니다.`, place && `장소는 ${place}입니다.`, actionText && `아이와 함께 확인할 일입니다.\n${actionText}`, materials && `빠뜨리지 않도록 ${materials}을 미리 챙겨 주세요.`, submitText].filter(Boolean).join('\n\n'),
  };
}

function isLlmEasyTextResponse(obj: unknown): obj is LlmEasyTextResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.level1 === 'string' &&
    typeof o.level2 === 'string' &&
    typeof o.level3 === 'string' &&
    Array.isArray(o.difficultWords)
  );
}

function toDifficultWord(w: LlmDifficultWord, gradeMap: Map<string, string>): DifficultWord {
  return {
    word: w.word,
    grade: gradeMap.get(w.word) || '',
    meaning: w.meaning,
    example: w.example,
    displayMode: w.displayMode,
  };
}

export async function generateEasyText(
  rawText: string,
  coreFields: CoreFields,
  documentType?: string,
  actionSteps?: ActionStep[]
): Promise<EasyTextLevels> {
  const wordClassifications = await classifyWords(rawText, coreFields);

  if (process.env.OPENAI_API_KEY) {
    try {
      const prompt = buildEasyTextPrompt(rawText, coreFields, wordClassifications, documentType, actionSteps);
      const response = await callLlm(prompt);
      const cleaned = response.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      const parsedUnknown = JSON.parse(cleaned) as unknown;

      if (!isLlmEasyTextResponse(parsedUnknown)) {
        throw new Error(`LLM response shape error: ${JSON.stringify(parsedUnknown).slice(0, 300)}`);
      }

      const gradeMap = new Map(wordClassifications.map(w => [w.word, w.grade]));
      const allWords = parsedUnknown.difficultWords.map(w => toDifficultWord(w, gradeMap));
      return {
        level1: { text: parsedUnknown.level1, difficultWords: allWords.filter(w => w.displayMode.level1 !== 'none') },
        level2: { text: parsedUnknown.level2, difficultWords: allWords.filter(w => w.displayMode.level2 !== 'none') },
        level3: { text: parsedUnknown.level3, difficultWords: allWords.filter(w => w.displayMode.level3 !== 'none') },
      };
    } catch (err) {
      console.warn('[easyText] LLM failed, using fallback:', err instanceof Error ? err.message : String(err));
    }
  }

  const fallback = buildMockEasyText(rawText, coreFields, documentType, actionSteps);
  const allWords: DifficultWord[] = wordClassifications.map(w => ({
    word: w.word,
    grade: w.grade,
    meaning: w.meaning,
    example: w.example,
    displayMode: w.displayMode,
  }));

  return {
    level1: { text: fallback.level1, difficultWords: allWords.filter(w => w.displayMode.level1 !== 'none') },
    level2: { text: fallback.level2, difficultWords: allWords.filter(w => w.displayMode.level2 !== 'none') },
    level3: { text: fallback.level3, difficultWords: allWords.filter(w => w.displayMode.level3 !== 'none') },
  };
}
