import path from 'path';
import type { ImageFileLike } from './ocr.types.js';

const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function getImageFormat(originalName: string): string {
  const ext = path.extname(originalName).replace('.', '').toLowerCase();

  if (!ext) {
    throw new Error('파일 확장자를 확인할 수 없습니다. jpg, jpeg, png, pdf 파일을 업로드해 주세요.');
  }

  if (!ALLOWED_FORMATS.includes(ext)) {
    throw new Error('jpg, jpeg, png, pdf 파일만 업로드할 수 있습니다.');
  }

  return ext;
}

export function validateImage(file?: ImageFileLike): asserts file is ImageFileLike {
  if (!file) {
    throw new Error('파일이 업로드되지 않았습니다.');
  }

  if (!file.buffer || file.buffer.length === 0) {
    throw new Error('업로드된 파일이 비어 있습니다.');
  }

  if (!file.mimetype.startsWith('image/') && file.mimetype !== 'application/pdf') {
    throw new Error('이미지 또는 PDF 파일만 업로드할 수 있습니다.');
  }

  if (file.size && file.size > MAX_FILE_SIZE) {
    throw new Error('파일 용량은 10MB 이하만 업로드할 수 있습니다.');
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
