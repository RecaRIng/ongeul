import { callLlm, safeJsonParse } from '../../common/llm.client.js';
import type { ActionStep, CoreFields } from '../../common/types.js';
import { buildActionStepsPrompt } from './actionSteps.prompt.js';

type ActionStepLlmResult = Partial<Record<keyof ActionStep, unknown>>;

function getReason(action: string): string {
  if (action.includes('제출')) {
    return '정해진 기한과 제출처를 지키기 위해';
  }
  if (action.includes('준비')) {
    return '활동을 잘하기 위해 준비물을 챙기기 위해';
  }
  return '올바르게 활동을 진행하기 위해';
}

function getStringValue(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

function getStepNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && value >= 1) {
    return value;
  }
  if (typeof value === 'string') {
    const num = Number(value);
    if (!isNaN(num) && num >= 1) {
      return num;
    }
  }
  return fallback;
}

function createFallbackActionSteps(coreFields: CoreFields): ActionStep[] {
  if (coreFields.actions.length === 0) {
    return [];
  }

  return coreFields.actions.slice(0, 5).map((action, index) => ({
    step: index + 1,
    action,
    reason: getReason(action),
    visualTarget: coreFields.place || coreFields.materials.join(', ') || action
  }));
}

function normalizeLlmActionSteps(value: unknown, fallbackSteps: ActionStep[]): ActionStep[] {
  if (!Array.isArray(value)) {
    return fallbackSteps;
  }

  const steps: ActionStep[] = [];
  const llmArray = value.slice(0, 5);

  for (let index = 0; index < llmArray.length; index++) {
    const item = llmArray[index];
    if (typeof item !== 'object' || item === null) {
      continue;
    }

    const itemObj = item as Record<string, unknown>;
    const action = getStringValue(itemObj.action, '');

    // action이 없으면 이 단계는 제외
    if (action === '') {
      continue;
    }

    const step = getStepNumber(itemObj.step, index + 1);
    const reason = getStringValue(
      itemObj.reason,
      fallbackSteps[index]?.reason || getReason(action)
    );
    const visualTarget = getStringValue(
      itemObj.visualTarget,
      fallbackSteps[index]?.visualTarget || action
    );

    steps.push({
      step,
      action,
      reason,
      visualTarget
    });
  }

  // 정제 후 유효한 단계가 없으면 fallback 반환
  if (steps.length === 0) {
    return fallbackSteps;
  }

  // step 번호를 1부터 순서대로 다시 정렬
  return steps.map((step, index) => ({
    ...step,
    step: index + 1
  }));
}

export async function generateActionSteps(rawText: string, coreFields: CoreFields): Promise<ActionStep[]> {
  try {
    const fallbackSteps = createFallbackActionSteps(coreFields);
    const prompt = buildActionStepsPrompt(rawText, coreFields);
    const response = await callLlm(prompt);
    const parsed = safeJsonParse<ActionStepLlmResult[]>(response);
    const normalized = normalizeLlmActionSteps(parsed, fallbackSteps);

    return normalized;
  } catch {
    // 오류 발생 시 fallback
    const fallbackSteps = createFallbackActionSteps(coreFields);
    return fallbackSteps;
  }
}
