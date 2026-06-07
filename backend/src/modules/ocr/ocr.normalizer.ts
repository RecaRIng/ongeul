import type { ClovaOcrField, ClovaOcrResponse, NormalizedOcrResult, OcrToken } from './ocr.types';
import { cleanOcrText } from './ocr.utils';

const LINE_Y_THRESHOLD = 12;
const LOW_CONFIDENCE_THRESHOLD = 0.75;

export function normalizeClovaOcrResult(clovaResult: ClovaOcrResponse): NormalizedOcrResult {
  const fields = clovaResult.images?.[0]?.fields ?? [];
  const tokens = toTokens(fields).filter((token) => token.text.length > 0);
  const lines = groupTokensIntoLines(tokens);
  const fullText = lines.join('\n').trim();
  const avgConfidence = calculateAvgConfidence(tokens);
  const reasons = buildQualityReasons(tokens.length, avgConfidence, fullText);

  return {
    fullText,
    lines,
    tokens,
    quality: {
      avgConfidence,
      fieldCount: tokens.length,
      needsRetake: reasons.length > 0,
      reasons
    },
    raw: clovaResult
  };
}

function toTokens(fields: ClovaOcrField[]): OcrToken[] {
  return fields.map((field) => {
    const vertices = field.boundingPoly?.vertices ?? [];
    const firstVertex = vertices[0] ?? {};

    return {
      text: cleanOcrText(field.inferText ?? ''),
      confidence: field.inferConfidence ?? 0,
      x: firstVertex.x ?? 0,
      y: firstVertex.y ?? 0,
      raw: field
    };
  });
}

function groupTokensIntoLines(tokens: OcrToken[]): string[] {
  if (tokens.length === 0) {
    return [];
  }

  const hasValidPosition = tokens.some((token) => token.x !== 0 || token.y !== 0);

  if (!hasValidPosition) {
    return [tokens.map((token) => token.text).join(' ').replace(/\s+/g, ' ').trim()];
  }

  const sortedTokens = [...tokens].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > LINE_Y_THRESHOLD) {
      return yDiff;
    }
    return a.x - b.x;
  });

  const groupedLines: OcrToken[][] = [];

  for (const token of sortedTokens) {
    const lastLine = groupedLines[groupedLines.length - 1];

    if (!lastLine) {
      groupedLines.push([token]);
      continue;
    }

    const avgY = lastLine.reduce((sum, item) => sum + item.y, 0) / lastLine.length;

    if (Math.abs(token.y - avgY) <= LINE_Y_THRESHOLD) {
      lastLine.push(token);
    } else {
      groupedLines.push([token]);
    }
  }

  return groupedLines
    .map((line) => line.sort((a, b) => a.x - b.x).map((token) => token.text).join(' ').replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
}

function calculateAvgConfidence(tokens: OcrToken[]): number {
  if (tokens.length === 0) {
    return 0;
  }

  const total = tokens.reduce((sum, token) => sum + token.confidence, 0);
  return Number((total / tokens.length).toFixed(4));
}

function buildQualityReasons(fieldCount: number, avgConfidence: number, fullText: string): string[] {
  const reasons: string[] = [];

  if (fieldCount === 0 || fullText.length === 0) {
    reasons.push('?ìŠ¤?¸ë? ?¸ì‹?˜ì? ëª»í–ˆ?µë‹ˆ?? ë¬¸ì„œê°€ ?”ë©´??ê½?ì°¨ê²Œ ?¤ì‹œ ì´¬ì˜??ì£¼ì„¸??');
  }

  if (fieldCount > 0 && avgConfidence < LOW_CONFIDENCE_THRESHOLD) {
    reasons.push('OCR ? ë¢°?„ê? ??Šµ?ˆë‹¤. ??ë°ì? ê³³ì—???”ë“¤ë¦¬ì? ?Šê²Œ ?¤ì‹œ ì´¬ì˜??ì£¼ì„¸??');
  }

  return reasons;
}
