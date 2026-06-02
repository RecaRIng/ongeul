import type { ActionStep, CoreFields, VisualPrompt } from '../../common/types.js';
import { buildVisualPrompt } from './visual.prompt.js';
import { callLlm } from '../../common/llm.client.js';

const priority: Record<string, number> = {
  deadline_card: 1,
  material_card: 2,
  place_card: 3,
  warning_card: 4,
  step_card: 5,
  date_card: 6,
  submit_to_card: 7,
};

function postProcessVisuals(visuals: VisualPrompt[]): VisualPrompt[] {
  visuals.sort((a, b) => (priority[a.cardType] ?? 99) - (priority[b.cardType] ?? 99));
  const seen = new Set<string>();
  return visuals.filter(v => {
    if (seen.has(v.cardType)) return false;
    seen.add(v.cardType);
    return true;
  });
}

export async function generateVisualPrompts(coreFields: CoreFields, actionSteps: ActionStep[]): Promise<VisualPrompt[]> {
  const prompt = buildVisualPrompt(coreFields, actionSteps);
  const raw = await callLlm(prompt);

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return postProcessVisuals(parsed.map((item: Partial<VisualPrompt>) => ({
        cardType: item.cardType ?? '',
        label: item.label ?? '',
        target: item.target ?? '',
        prompt: item.prompt ?? '',
        imageUrl: item.imageUrl ?? ''
      })));
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

  if (coreFields.date) {
    visuals.push({
      cardType: 'date_card',
      label: '날짜',
      target: coreFields.date,
      prompt: `${coreFields.date}를 나타내는 달력 또는 날짜 이미지`,
      imageUrl: ''
    });
  }

  if (coreFields.deadline) {
    visuals.push({
      cardType: 'deadline_card',
      label: '마감일',
      target: coreFields.deadline,
      prompt: `${coreFields.deadline} 마감일을 나타내는 이미지`,
      imageUrl: ''
    });
  }

  if (coreFields.warnings.length > 0) {
    visuals.push({
      cardType: 'warning_card',
      label: '주의사항',
      target: coreFields.warnings.join(', '),
      prompt: `${coreFields.warnings.join('와/과 ')} 주의사항을 나타내는 이미지`,
      imageUrl: ''
    });
  }

  if (coreFields.submissionTarget) {
    visuals.push({
      cardType: 'submit_to_card',
      label: '제출 대상',
      target: coreFields.submissionTarget,
      prompt: `${coreFields.submissionTarget}에게 제출하는 장면을 보여주는 이미지`,
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

  return postProcessVisuals(visuals);
}
