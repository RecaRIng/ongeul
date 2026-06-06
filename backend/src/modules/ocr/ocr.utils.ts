import path from 'path';
import type { ImageFileLike } from './ocr.types';

const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export function getImageFormat(originalName: string): string {
  const ext = path.extname(originalName).replace('.', '').toLowerCase();

  if (!ext) {
    throw new Error('?Œì¼ ?•ìž¥?ë? ?•ì¸?????†ìŠµ?ˆë‹¤. jpg, jpeg, png ?Œì¼???…ë¡œ?œí•´ ì£¼ì„¸??');
  }

  if (!ALLOWED_FORMATS.includes(ext)) {
    throw new Error('jpg, jpeg, png ?Œì¼ë§??…ë¡œ?œí•  ???ˆìŠµ?ˆë‹¤.');
  }

  return ext;
}

export function validateImage(file?: ImageFileLike): asserts file is ImageFileLike {
  if (!file) {
    throw new Error('?´ë?ì§€ ?Œì¼???…ë¡œ?œë˜ì§€ ?Šì•˜?µë‹ˆ??');
  }

  if (!file.buffer || file.buffer.length === 0) {
    throw new Error('?…ë¡œ?œëœ ?´ë?ì§€ ?Œì¼??ë¹„ì–´ ?ˆìŠµ?ˆë‹¤.');
  }

  if (!file.mimetype.startsWith('image/')) {
    throw new Error('?´ë?ì§€ ?Œì¼ë§??…ë¡œ?œí•  ???ˆìŠµ?ˆë‹¤.');
  }

  if (file.size && file.size > MAX_IMAGE_SIZE) {
    throw new Error('?´ë?ì§€ ?©ëŸ‰?€ 10MB ?´í•˜ë§??…ë¡œ?œí•  ???ˆìŠµ?ˆë‹¤.');
  }

  getImageFormat(file.originalname);
}

export function cleanOcrText(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[|]{2,}/g, '|')
    .replace(/\s+/g, ' ')
    .trim();
}
