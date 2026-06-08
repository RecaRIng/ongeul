import OpenAI from 'openai';
import type { ActionStep, CoreFields, VisualPrompt } from '../../common/types.js';
import { buildVisualPrompt } from './visual.prompt.js';
import { callLlm } from '../../common/llm.client.js';

const STYLE_PREFIX = 'Soft watercolor illustration style, natural colors appropriate to the object, gentle shading, clean white background, no text, no letters, no signs, no writing, children\'s book illustration style. ';
const OLD_STYLE_PREFIX = 'Simple flat illustration for children\'s flashcard, clean white background, minimal detail, cartoon style, no text. ';
const MATERIAL_STYLE_PREFIX = 'Single object centered, soft watercolor illustration style, natural colors appropriate to the object, gentle shading, clean white background, no humans, no text, no letters, no signs, no writing, children\'s book illustration style. ';
const OLD_MATERIAL_STYLE_PREFIX = 'Single object centered on white background, large and clear, flat cartoon illustration, no humans, no text. ';

function getStylePrefix(cardType: string): string {
  return cardType === 'material_card' ? MATERIAL_STYLE_PREFIX : STYLE_PREFIX;
}

function stripKnownStylePrefix(cardType: string, prompt: string): string {
  const prefixes = cardType === 'material_card'
    ? [MATERIAL_STYLE_PREFIX, OLD_MATERIAL_STYLE_PREFIX]
    : [STYLE_PREFIX, OLD_STYLE_PREFIX];
  const matchedPrefix = prefixes.find(prefix => prompt.startsWith(prefix));
  return matchedPrefix ? prompt.slice(matchedPrefix.length) : prompt;
}

function withStylePrefix(cardType: string, prompt: string): string {
  return `${getStylePrefix(cardType)}${stripKnownStylePrefix(cardType, prompt)}`;
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
      const key = v.cardType === 'material_card' ? `${v.cardType}:${v.target}` : v.cardType;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function buildMaterialVisual(material: string, label = '\uC900\uBE44\uBB3C', imageUrl = ''): VisualPrompt {
  return {
    cardType: 'material_card',
    label,
    target: material,
    prompt: `${MATERIAL_STYLE_PREFIX}${material}, single object only.`,
    imageUrl
  };
}

function normalizeMaterialCards(visuals: VisualPrompt[], materials: string[]): VisualPrompt[] {
  if (materials.length === 0) return visuals;

  return [
    ...materials.map(material => {
      const existing = visuals.find(v => v.cardType === 'material_card' && v.target === material);
      return existing ?? buildMaterialVisual(material);
    }),
    ...visuals.filter(v => v.cardType !== 'material_card')
  ];
}

async function generateImageOnce(client: OpenAI, prompt: string): Promise<string> {
  const response = await client.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1024x1024',
    quality: 'low',
  });
  const b64 = response.data?.[0]?.b64_json;
  console.log('[generateImage] 응답 수신, b64 있음:', !!b64);
  return b64 ? `data:image/png;base64,${b64}` : '';
}

async function generateImage(prompt: string): Promise<string> {
  const client = getOpenAIClient();
  if (!client || !prompt) {
    console.log('이미지 생성 스킵:', !client ? 'OpenAI 클라이언트 없음 (API 키 확인 필요)' : '프롬프트 없음');
    return '';
  }
  console.log('[generateImage] 시작, 프롬프트 길이:', prompt.length);
  try {
    return await generateImageOnce(client, prompt);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[generateImage] 1차 실패, 3초 후 재시도:', message);
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
      return await generateImageOnce(client, prompt);
    } catch (retryErr: unknown) {
      const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
      console.error('[generateImage] 재시도 실패:', retryMessage);
      return '';
    }
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
            prompt: item.prompt ? withStylePrefix(item.cardType ?? '', item.prompt) : '',
            imageUrl: item.imageUrl ?? ''
          }))
          .filter(v => v.cardType !== '')
      );
      return enrichWithImages(normalizeMaterialCards(visuals, coreFields.materials));
    }
  } catch (err) {
    console.error('visual LLM 호출 또는 JSON 파싱 실패:', err);
  }

  // fallback: 기존 로직
  const visuals: VisualPrompt[] = [];

  if (coreFields.materials.length > 0) {
    visuals.push(...coreFields.materials.map(material => buildMaterialVisual(material)));
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
