import OpenAI from 'openai';
import type { ActionStep, CoreFields, VisualPrompt } from '../../common/types.js';
import { callLlm } from '../../common/llm.client.js';
import { buildVisualPrompt } from './visual.prompt.js';

const OBJECT_STYLE_PREFIX =
  'Clean warm pastel spot illustration for a Korean elementary school educational app. Draw only the named subject as one clear centered object or icon, transparent background, no scenery, no room, no landscape, no playground, no extra objects, no people unless the subject itself is a person, crisp friendly outline, soft but clear colors, high clarity, cute but not babyish, not photorealistic, not blurry watercolor, no text, no letters, no signs, no writing. ';

const SCENE_STYLE_PREFIX =
  'Clean warm pastel spot illustration for a Korean elementary school educational app. Show only the essential people and objects needed to explain the action, transparent background, no full background scenery, no room, no landscape, no playground unless it is the action target, keep every subject clearly separated and anatomically correct, crisp friendly outline, soft but clear colors, high clarity, cute but not babyish, not photorealistic, not blurry watercolor, no text, no letters, no signs, no writing. ';

const OLD_STYLE_PREFIXES = [
  OBJECT_STYLE_PREFIX,
  SCENE_STYLE_PREFIX,
  'Bright clean pastel illustration for a modern Korean elementary school educational app, cute but not babyish, crisp friendly edges, soft rounded shapes, very light neutral white background with subtle cool tint, fresh mint, sky blue, soft coral, and lavender accents, gentle shadows, high clarity, not photorealistic, not overly cartoonish, no watercolor blur, no text, no letters, no signs, no writing. ',
  'Single object centered, bright clean pastel illustration for a modern Korean elementary school educational app, cute but not babyish, crisp friendly edges, soft rounded shapes, very light neutral white background with subtle cool tint, fresh mint, sky blue, soft coral, and lavender accents, gentle shadows, high clarity, not photorealistic, not overly cartoonish, no watercolor blur, no humans, no text, no letters, no signs, no writing. ',
  'Soft watercolor illustration style, natural colors appropriate to the object, gentle shading, clean white background, no text, no letters, no signs, no writing, children\'s book illustration style. ',
  'Single object centered, soft watercolor illustration style, natural colors appropriate to the object, gentle shading, clean white background, no humans, no text, no letters, no signs, no writing, children\'s book illustration style. ',
  'Simple flat illustration for children\'s flashcard, clean white background, minimal detail, cartoon style, no text. ',
  'Single object centered on white background, large and clear, flat cartoon illustration, no humans, no text. ',
];

const CARD_PRIORITY: Record<string, number> = {
  deadline_card: 1,
  material_card: 2,
  place_card: 3,
  time_card: 3.5,
  warning_card: 4,
  step_card: 5,
  date_card: 6,
  submit_to_card: 7,
};

let openai: OpenAI | null | undefined;

function getOpenAIClient(): OpenAI | null {
  if (openai === undefined) {
    const key = process.env.OPENAI_API_KEY;
    openai = key ? new OpenAI({ apiKey: key }) : null;
  }
  return openai;
}

function getStylePrefix(cardType: string): string {
  return cardType === 'step_card' ? SCENE_STYLE_PREFIX : OBJECT_STYLE_PREFIX;
}

function stripKnownStylePrefix(prompt: string): string {
  const matchedPrefix = OLD_STYLE_PREFIXES.find((prefix) => prompt.startsWith(prefix));
  return matchedPrefix ? prompt.slice(matchedPrefix.length).trimStart() : prompt.trim();
}

function withStylePrefix(cardType: string, prompt: string): string {
  return `${getStylePrefix(cardType)}${stripKnownStylePrefix(prompt)}`;
}

function postProcessVisuals(visuals: VisualPrompt[]): VisualPrompt[] {
  const seen = new Set<string>();
  return [...visuals]
    .sort((a, b) => (CARD_PRIORITY[a.cardType] ?? 99) - (CARD_PRIORITY[b.cardType] ?? 99))
    .filter((visual) => {
      const key = visual.cardType === 'material_card' ? `${visual.cardType}:${visual.target}` : visual.cardType;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function buildMaterialVisual(material: string): VisualPrompt {
  return {
    cardType: 'material_card',
    label: '준비물',
    target: material,
    prompt: `${OBJECT_STYLE_PREFIX}${material}, single object only, easy to recognize for a child.`,
    imageUrl: '',
  };
}

function normalizeMaterialCards(visuals: VisualPrompt[], materials: string[]): VisualPrompt[] {
  if (materials.length === 0) return visuals;

  return [
    ...materials.map((material) => {
      const existing = visuals.find((visual) => visual.cardType === 'material_card' && visual.target === material);
      return existing ?? buildMaterialVisual(material);
    }),
    ...visuals.filter((visual) => visual.cardType !== 'material_card'),
  ];
}

async function generateImageOnce(client: OpenAI, prompt: string): Promise<string> {
  const response = await client.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1024x1024',
    quality: 'medium',
    background: 'transparent',
    output_format: 'png',
  });
  const b64 = response.data?.[0]?.b64_json;
  return b64 ? `data:image/png;base64,${b64}` : '';
}

async function generateImage(prompt: string): Promise<string> {
  const client = getOpenAIClient();
  if (!client || !prompt.trim()) return '';

  try {
    return await generateImageOnce(client, prompt);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[visual] image generation failed once, retrying:', message);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      return await generateImageOnce(client, prompt);
    } catch (retryErr: unknown) {
      const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
      console.error('[visual] image generation retry failed:', retryMessage);
      return '';
    }
  }
}

async function withTimeout(promise: Promise<string>, ms: number): Promise<string> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<string>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('timeout')), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

async function enrichWithImages(visuals: VisualPrompt[]): Promise<VisualPrompt[]> {
  return Promise.all(
    visuals.map(async (visual) => ({
      ...visual,
      imageUrl: await withTimeout(generateImage(visual.prompt), 60000).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[visual] image generation failed:', visual.cardType, message);
        return '';
      }),
    })),
  );
}

function toVisualPrompt(item: Partial<VisualPrompt>): VisualPrompt | null {
  if (!item.cardType) return null;

  return {
    cardType: item.cardType,
    label: item.label ?? '',
    target: item.target ?? '',
    prompt: item.prompt ? withStylePrefix(item.cardType, item.prompt) : '',
    imageUrl: item.imageUrl ?? '',
  };
}

function buildFallbackVisuals(coreFields: CoreFields, actionSteps: ActionStep[]): VisualPrompt[] {
  const visuals: VisualPrompt[] = [];

  visuals.push(...coreFields.materials.map((material) => buildMaterialVisual(material)));

  if (coreFields.place) {
    visuals.push({
      cardType: 'place_card',
      label: '장소',
      target: coreFields.place,
      prompt: `${OBJECT_STYLE_PREFIX}${coreFields.place}, single centered place icon or building only. If this is a school, draw only a clean school building object, no students, no teacher, no slide, no playground, no trees.`,
      imageUrl: '',
    });
  }

  if (coreFields.time) {
    visuals.push({
      cardType: 'time_card',
      label: '시간',
      target: coreFields.time,
      prompt: `${OBJECT_STYLE_PREFIX}A simple analog clock icon showing ${coreFields.time}, single centered object only.`,
      imageUrl: '',
    });
  }

  if (coreFields.date) {
    visuals.push({
      cardType: 'date_card',
      label: '날짜',
      target: coreFields.date,
      prompt: `${OBJECT_STYLE_PREFIX}A simple calendar icon with a red circle highlight on one date square, no numbers, no text, no letters visible, clean minimal icon.`,
      imageUrl: '',
    });
  }

  if (coreFields.deadline) {
    visuals.push({
      cardType: 'deadline_card',
      label: '마감일',
      target: coreFields.deadline,
      prompt: `${OBJECT_STYLE_PREFIX}A single large circle with a bold X mark or exclamation mark inside, urgency symbol, no text, no numbers, no letters, centered icon only.`,
      imageUrl: '',
    });
  }

  if (coreFields.warnings.length > 0) {
    visuals.push({
      cardType: 'warning_card',
      label: '주의사항',
      target: coreFields.warnings.join(', '),
      prompt: `${OBJECT_STYLE_PREFIX}A simple caution icon about ${coreFields.warnings.join(', ')}, single centered object only.`,
      imageUrl: '',
    });
  }

  if (coreFields.submissionTarget) {
    visuals.push({
      cardType: 'submit_to_card',
      label: '제출처',
      target: coreFields.submissionTarget,
      prompt: `${SCENE_STYLE_PREFIX}A child clearly handing one paper to ${coreFields.submissionTarget}. Use only the child, the adult, and the paper, no classroom background.`,
      imageUrl: '',
    });
  }

  if (visuals.length === 0 && actionSteps.length > 0) {
    visuals.push({
      cardType: 'step_card',
      label: '행동',
      target: actionSteps[0].action,
      prompt: `${SCENE_STYLE_PREFIX}A clear child-friendly action scene showing: ${actionSteps[0].action}.`,
      imageUrl: '',
    });
  }

  return visuals;
}

export async function regenerateVisualImage(prompt: string, cardType = 'step_card'): Promise<string> {
  const basePrompt = withStylePrefix(cardType, prompt);
  const variationPrompt = `${basePrompt}
Create a fresh variation with a different composition while preserving the same object or scene. Make it brighter and cuter, avoid yellow or beige cast, and keep high clarity. Do not include text, letters, signs, captions, or writing. Variation seed: ${Date.now()}.`;

  return generateImage(variationPrompt);
}

export async function generateVisualPrompts(coreFields: CoreFields, actionSteps: ActionStep[]): Promise<VisualPrompt[]> {
  const prompt = buildVisualPrompt(coreFields, actionSteps);

  try {
    const raw = await callLlm(prompt);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const visuals = parsed
        .map((item: Partial<VisualPrompt>) => toVisualPrompt(item))
        .filter((item): item is VisualPrompt => Boolean(item));
      return enrichWithImages(postProcessVisuals(normalizeMaterialCards(visuals, coreFields.materials)));
    }
  } catch (err) {
    console.error('[visual] visual prompt parsing failed:', err);
  }

  return enrichWithImages(postProcessVisuals(buildFallbackVisuals(coreFields, actionSteps)));
}
