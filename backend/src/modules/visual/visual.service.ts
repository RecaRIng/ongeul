import OpenAI from 'openai';
import type { ActionStep, CoreFields, VisualPrompt } from '../../common/types.js';
import { buildVisualPrompt } from './visual.prompt.js';
import { callLlm } from '../../common/llm.client.js';

let openai: OpenAI | null | undefined;
function getOpenAIClient(): OpenAI | null {
  if (openai === undefined) {
    const key = process.env.OPENAI_API_KEY;
    openai = key ? new OpenAI({ apiKey: key }) : null;
  }
  return openai;
}

const priority: Record<string, number> = {
  deadline_card: 1,
  material_card: 2,
  place_card: 3,
  time_card: 3.5,
  warning_card: 4,
  step_card: 5,
  date_card: 6,
  submit_to_card: 7,
};

function postProcessVisuals(visuals: VisualPrompt[]): VisualPrompt[] {
  return [...visuals]
    .sort((a, b) => (priority[a.cardType] ?? 99) - (priority[b.cardType] ?? 99))
    .filter((() => {
      const seen = new Set<string>();
      return (v: VisualPrompt) => {
        if (seen.has(v.cardType)) return false;
        seen.add(v.cardType);
        return true;
      };
    })());
}

async function generateImage(prompt: string): Promise<string> {
  const openai = getOpenAIClient();
  if (!openai || !prompt) return '';
  try {
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1024',
      quality: 'low',
    });
    const b64 = response.data?.[0]?.b64_json;
    return b64 ? `data:image/png;base64,${b64}` : '';
  } catch (err) {
    console.error('이미지 생성 실패:', err);
    return '';
  }
}

async function enrichWithImages(visuals: VisualPrompt[]): Promise<VisualPrompt[]> {
  return Promise.all(
    visuals.map(async (v) => ({
      ...v,
      imageUrl: await generateImage(v.prompt),
    }))
  );
}

export async function generateVisualPrompts(coreFields: CoreFields, actionSteps: ActionStep[]): Promise<VisualPrompt[]> {
  const prompt = buildVisualPrompt(coreFields, actionSteps);
  const raw = await callLlm(prompt);

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const visuals = postProcessVisuals(
        parsed
          .map((item: Partial<VisualPrompt>) => ({
            cardType: item.cardType ?? '',
            label: item.label ?? '',
            target: item.target ?? '',
            prompt: item.prompt ?? '',
            imageUrl: item.imageUrl ?? ''
          }))
          .filter(v => v.cardType !== '')
      );
      return enrichWithImages(visuals);
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

  if (coreFields.time) {
    visuals.push({
      cardType: 'time_card',
      label: '시간',
      target: coreFields.time,
      prompt: `${coreFields.time}를 나타내는 시계 또는 시간 이미지`,
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

  return enrichWithImages(postProcessVisuals(visuals));
}
