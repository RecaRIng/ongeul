const FILE_NAME_PATTERN = /\.(png|jpg|jpeg|webp|gif|pdf)$/i;
const DATE_ONLY_PATTERN = /^\d{4}년\s*\d{1,2}월\s*\d{1,2}일$/;
const PHONE_PATTERN = /(\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4})/;
const URL_PATTERN = /(https?:\/\/|www\.)/i;

const TITLE_KEYWORDS: Array<[string, number]> = [
  ['신청 안내', 7],
  ['수강 신청', 6],
  ['참가 신청', 6],
  ['과제 안내', 6],
  ['가정통신문', 3],
  ['교육통신', 3],
  ['독서교실', 3],
  ['현장체험학습', 3],
  ['체험학습', 3],
  ['방과후학교', 3],
  ['수행평가', 3],
  ['프로그램', 2],
  ['신청서', 3],
  ['신청', 3],
  ['안내', 4],
];

const REJECT_KEYWORDS = [
  '학부모님 안녕하십니까',
  '가정에 건강과 행복',
  '교무실',
  '행정실',
  '담당',
  '발행자',
  '학교장',
  '전화번호',
  '문의',
];

function compactHangulForMatching(value: string): string {
  return value.replace(/\s+/g, '');
}

function removeOuterNoise(value: string): string {
  return value
    .replace(/^[\s"'`*_~\-–—:;|()[\]{}<>]+/, '')
    .replace(/[\s"'`*_~\-–—:;|()[\]{}<>]+$/, '');
}

export function isFileNameLike(value: string): boolean {
  return FILE_NAME_PATTERN.test(value.trim());
}

export function normalizeTitleLine(value: string): string {
  return removeOuterNoise(value)
    .replace(FILE_NAME_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function scoreTitleLine(line: string, index: number): number {
  if (!line) return Number.NEGATIVE_INFINITY;

  let score = 0;
  const compactLine = compactHangulForMatching(line);

  for (const [keyword, weight] of TITLE_KEYWORDS) {
    if (line.includes(keyword) || compactLine.includes(compactHangulForMatching(keyword))) {
      score += weight;
    }
  }

  if (/20\d{2}학년도/.test(line)) score += 1;
  if (line.length < 5) score -= 2;
  if (line.length > 80) score -= 1;
  if (/[.!?。]/.test(line)) score -= 6;
  if (index <= 3) score += 1;

  if (PHONE_PATTERN.test(line)) score -= 5;
  if (URL_PATTERN.test(line)) score -= 5;
  if (DATE_ONLY_PATTERN.test(line)) score -= 5;
  if (isFileNameLike(line)) score -= 10;

  if (REJECT_KEYWORDS.some(keyword => line.includes(keyword))) {
    score -= 5;
  }

  return score;
}

function fallbackTitle(value?: string): string {
  const normalized = normalizeTitleLine(value ?? '');
  if (!normalized || isFileNameLike(value ?? '')) return '제목 없음';
  return normalized;
}

export function extractDocumentTitle(rawText: string, fallbackTitleValue?: string): string {
  const lines = rawText
    .split(/\r?\n/)
    .map(normalizeTitleLine)
    .filter(Boolean)
    .filter(line => !isFileNameLike(line));

  let bestLine = '';
  let bestScore = Number.NEGATIVE_INFINITY;

  lines.forEach((line, index) => {
    const score = scoreTitleLine(line, index);
    if (score > bestScore) {
      bestLine = line;
      bestScore = score;
    }
  });

  if (bestLine && bestScore >= 3) {
    return bestLine;
  }

  return fallbackTitle(fallbackTitleValue);
}
