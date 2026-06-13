import { callClovaOcr } from './clova.client.js';
import { normalizeClovaOcrResult } from './ocr.normalizer.js';
import type { Base64ImageInput, ImageFileLike, NormalizedOcrResult } from './ocr.types.js';
import { getImageFormat, validateImage } from './ocr.utils.js';

export async function extractTextFromImage(file: ImageFileLike): Promise<NormalizedOcrResult> {
  validateImage(file);

  const format = getImageFormat(file.originalname);
  const base64Image = file.buffer.toString('base64');
  const clovaResult = await callClovaOcr({
    format,
    name: file.originalname,
    data: base64Image
  });

  return normalizeClovaOcrResult(clovaResult);
}

export async function extractTextFromBase64Image(input: Base64ImageInput): Promise<NormalizedOcrResult> {
  const rawBase64 = input.imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').trim();
  const buffer = Buffer.from(rawBase64, 'base64');
  const originalname = input.fileName?.trim() || `uploaded-image.${input.imageFormat}`;

  return extractTextFromImage({
    buffer,
    originalname,
    mimetype: input.imageFormat === 'pdf' ? 'application/pdf' : `image/${input.imageFormat === 'jpg' ? 'jpeg' : input.imageFormat}`,
    size: buffer.length
  });
}
