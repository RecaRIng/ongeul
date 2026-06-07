import OpenAI from 'openai';
import type { ActionStep, CoreFields, VisualPrompt } from '../../common/types.js';
import { buildVisualPrompt } from './visual.prompt.js';
import { callLlm } from '../../common/llm.client.js';

const STYLE_PREFIX = 'Simple flat illustration for children\'s flashcard, clean white background, minimal detail, cartoon style, no text. ';
const MATERIAL_STYLE_PREFIX = 'Single object centered on white background, large and clear, flat cartoon illustration, no humans, no text. ';

function getStylePrefix(cardType: string): string {
  return cardType === 'material_card' ? MATERIAL_STYLE_PREFIX : STYLE_PREFIX;
}

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
  const seen = new Set<string>();
  return [...visuals]
    .sort((a, b) => (priority[a.cardType] ?? 99) - (priority[b.cardType] ?? 99))
    .filter(v => {
      if (seen.has(v.cardType)) return false;
      seen.add(v.cardType);
      return true;
    });
}

async function generateImage(prompt: string): Promise<string> {
  const client = getOpenAIClient();
  if (!client || !prompt) {
    console.log('이미지 생성 스킵:', !client ? 'OpenAI 클라이언트 없음 (API 키 확인 필요)' : '프롬프트 없음');
    return '';
  }
  console.log('[generateImage] 시작, 프롬프트 길이:', prompt.length);
  try {
    const response = await client.images.generate({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1024',
      quality: 'low',
    });
    const b64 = response.data?.[0]?.b64_json;
    console.log('[generateImage] 응답 수신, b64 있음:', !!b64);
    return b64 ? `data:image/png;base64,${b64}` : '';
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[generateImage] 실패:', message);
    return '';
  }
}

async function withTimeout(promise: Promise<string>, ms: number): Promise<string> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<string>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function enrichWithImages(visuals: VisualPrompt[]): Promise<VisualPrompt[]> {
  console.log('[enrichWithImages] 이미지 생성 시작, 카드 수:', visuals.length);
  return Promise.all(
    visuals.map(async (v) => ({
      ...v,
      imageUrl: await withTimeout(generateImage(v.prompt), 60000).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[enrichWithImages] 이미지 생성 실패 (cardType:', v.cardType, '):', message);
        return '';
      }),
    }))
  );
}

export async function generateVisualPrompts(coreFields: CoreFields, actionSteps: ActionStep[]): Promise<VisualPrompt[]> {
  const prompt = buildVisualPrompt(coreFields, actionSteps);

  try {
    const raw = await callLlm(prompt);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const visuals = postProcessVisuals(
        parsed
          .map((item: Partial<VisualPrompt>) => ({
            cardType: item.cardType ?? '',
            label: item.label ?? '',
            target: item.target ?? '',
            prompt: item.prompt ? getStylePrefix(item.cardType ?? '') + item.prompt : '',
            imageUrl: item.imageUrl ?? ''
          }))
          .filter(v => v.cardType !== '')
      );
      return enrichWithImages(visuals);
    }
  } catch (err) {
    console.error('visual LLM 호출 또는 JSON 파싱 실패:', err);
  }

  // fallback: 기존 로직
  const visuals: VisualPrompt[] = [];

  if (coreFields.materials.length > 0) {
    visuals.push({
      cardType: 'material_card',
      label: '준비물',
      target: coreFields.materials.join(', '),
      prompt: `${MATERIAL_STYLE_PREFIX}${coreFields.materials.join(', ')} 각각 단독 클로즈업, 흰 배경, 플래시카드 스타일`,
      imageUrl: ''
    });
  }

  if (coreFields.place) {
    visuals.push({
      cardType: 'place_card',
      label: '장소',
      target: coreFields.place,
      prompt: `${STYLE_PREFIX}${coreFields.place}에서 활동하는 학생 모습을 보여주는 이미지`,
      imageUrl: ''
    });
  }

  if (coreFields.time) {
    visuals.push({
      cardType: 'time_card',
      label: '시간',
      target: coreFields.time,
      prompt: `${STYLE_PREFIX}${coreFields.time}를 나타내는 시계 또는 시간 이미지`,
      imageUrl: ''
    });
  }

  if (coreFields.date) {
    visuals.push({
      cardType: 'date_card',
      label: '날짜',
      target: coreFields.date,
      prompt: `${STYLE_PREFIX}${coreFields.date}를 나타내는 달력 또는 날짜 이미지`,
      imageUrl: ''
    });
  }

  if (coreFields.deadline) {
    visuals.push({
      cardType: 'deadline_card',
      label: '마감일',
      target: coreFields.deadline,
      prompt: `${STYLE_PREFIX}${coreFields.deadline} 마감일을 나타내는 이미지`,
      imageUrl: ''
    });
  }

  if (coreFields.warnings.length > 0) {
    visuals.push({
      cardType: 'warning_card',
      label: '주의사항',
      target: coreFields.warnings.join(', '),
      prompt: `${STYLE_PREFIX}${coreFields.warnings.join('와/과 ')} 주의사항을 나타내는 이미지`,
      imageUrl: ''
    });
  }

  if (coreFields.submissionTarget) {
    visuals.push({
      cardType: 'submit_to_card',
      label: '제출 대상',
      target: coreFields.submissionTarget,
      prompt: `${STYLE_PREFIX}${coreFields.submissionTarget}에게 제출하는 장면을 보여주는 이미지`,
      imageUrl: ''
    });
  }

  if (visuals.length === 0 && actionSteps.length > 0) {
    visuals.push({
      cardType: 'step_card',
      label: '행동',
      target: actionSteps[0].action,
      prompt: `${STYLE_PREFIX}${actionSteps[0].action} 장면을 보여주는 이미지`,
      imageUrl: ''
    });
  }

  return enrichWithImages(postProcessVisuals(visuals));
}
