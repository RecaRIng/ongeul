import { callLlm } from '../../common/llm.client';
import type { CoreFields, EasyTextLevels } from '../../common/types';
import { buildEasyTextPrompt } from './easyText.prompt';

export async function generateEasyText(rawText: string, coreFields: CoreFields): Promise<EasyTextLevels> {
  const prompt = buildEasyTextPrompt(rawText, coreFields);
  const response = await callLlm(prompt);
  const parsed = JSON.parse(response) as EasyTextLevels;

  return {
    level1: parsed.level1 || '',
    level2: parsed.level2 || '',
    level3: parsed.level3 || ''
  };
}
