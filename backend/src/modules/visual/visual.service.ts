import type { ActionStep, CoreFields, VisualPrompt } from '../../common/types.js';
import { buildVisualPrompt } from './visual.prompt.js';
import { callLlm } from '../../common/llm.client.js';

export async function generateVisualPrompts(coreFields: CoreFields, actionSteps: ActionStep[]): Promise<VisualPrompt[]> {
  const prompt = buildVisualPrompt(coreFields, actionSteps);
  const raw = await callLlm(prompt);

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item: Partial<VisualPrompt>) => ({
        cardType: item.cardType ?? '',
        label: item.label ?? '',
        target: item.target ?? '',
        prompt: item.prompt ?? '',
        imageUrl: item.imageUrl ?? ''
      }));
    }
  } catch {
    console.error('visual JSON 파싱 실패:', raw);
  }

  // fallback: 기존 로직
  const visuals: VisualPrompt[] = [];

  if (coreFields.materials.length > 0) {
    visuals.push({
      cardType: 'material_card',
      label: '준비물',
      target: coreFields.materials.join(', '),
      prompt: `학생이 ${coreFields.materials.join('와/과 ')}을 준비하는 장면을 보여주는 이미지`,
      imageUrl: ''
    });
  }

  if (coreFields.place) {
    visuals.push({
      cardType: 'place_card',
      label: '장소',
      target: coreFields.place,
      prompt: `${coreFields.place}에서 활동하는 학생 모습을 보여주는 이미지`,
      imageUrl: ''
    });
  }

  if (visuals.length === 0 && actionSteps.length > 0) {
    visuals.push({
      cardType: 'step_card',
      label: '행동',
      target: actionSteps[0].action,
      prompt: `${actionSteps[0].action} 장면을 보여주는 이미지`,
      imageUrl: ''
    });
  }

  return visuals;
}
