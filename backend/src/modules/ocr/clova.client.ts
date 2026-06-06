import crypto from 'crypto';
import type { ClovaOcrRequestImage, ClovaOcrResponse } from './ocr.types';

export async function callClovaOcr(image: ClovaOcrRequestImage): Promise<ClovaOcrResponse> {
  const invokeUrl = process.env.CLOVA_OCR_INVOKE_URL;
  const secretKey = process.env.CLOVA_OCR_SECRET_KEY;

  if (!invokeUrl) {
    throw new Error('CLOVA_OCR_INVOKE_URL ?˜ê²½ë³€?˜ê? ?¤ì •?˜ì? ?Šì•˜?µë‹ˆ??');
  }

  if (!secretKey) {
    throw new Error('CLOVA_OCR_SECRET_KEY ?˜ê²½ë³€?˜ê? ?¤ì •?˜ì? ?Šì•˜?µë‹ˆ??');
  }

  const payload = {
    version: 'V2',
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    lang: 'ko',
    resultType: 'string',
    images: [
      {
        format: image.format,
        name: image.name,
        data: image.data
      }
    ]
  };

  const response = await fetch(invokeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OCR-SECRET': secretKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`CLOVA OCR ?¸ì¶œ ?¤íŒ¨: status=${response.status}, message=${errorText}`);
  }

  return (await response.json()) as ClovaOcrResponse;
}
