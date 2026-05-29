import { recognizeText } from './clova.client.js';

export async function extractTextFromImage(fileBuffer: Buffer): Promise<string> {
  return recognizeText(fileBuffer);
}
