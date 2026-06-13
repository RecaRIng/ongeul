import crypto from 'crypto';
import type { ClovaOcrRequestImage, ClovaOcrResponse } from './ocr.types.js';

export async function callClovaOcr(image: ClovaOcrRequestImage): Promise<ClovaOcrResponse> {
  const invokeUrl = process.env.CLOVA_OCR_INVOKE_URL;
  const secretKey = process.env.CLOVA_OCR_SECRET_KEY;

  if (!invokeUrl) {
    throw new Error('CLOVA_OCR_INVOKE_URL 환경변수가 설정되지 않았습니다.');
  }

  if (!secretKey) {
    throw new Error('CLOVA_OCR_SECRET_KEY 환경변수가 설정되지 않았습니다.');
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
    throw new Error(`CLOVA OCR 호출 실패: status=${response.status}, message=${errorText}`);
  }

  return (await response.json()) as ClovaOcrResponse;
}
