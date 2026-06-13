import express from 'express';
import type { ActionStep, CoreFields } from '../../common/types.js';
import { generateEasyText } from './easyText.service.js';

const router = express.Router();

function validateEasyTextRequest(body: unknown): body is {
  rawText: string;
  coreFields: CoreFields;
  documentType?: string;
  actionSteps?: ActionStep[];
} {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (typeof b.rawText !== 'string' || b.rawText.trim().length === 0) return false;
  const cf = b.coreFields;
  if (!cf || typeof cf !== 'object') return false;
  const c = cf as Record<string, unknown>;
  const stringFields = ['date', 'time', 'place', 'deadline', 'submissionTarget'];
  for (const field of stringFields) {
    if (typeof c[field] !== 'string') return false;
  }
  const arrayFields = ['materials', 'actions', 'warnings'];
  for (const field of arrayFields) {
    if (!Array.isArray(c[field])) return false;
  }
  return true;
}

router.post('/generate', async (req, res) => {
  if (!validateEasyTextRequest(req.body)) {
    return res.status(400).json({
      error: 'rawText(string)와 coreFields(date, time, place, deadline, submissionTarget, materials, actions, warnings)가 필요합니다.'
    });
  }

  try {
    const { rawText, coreFields, documentType, actionSteps } = req.body;
    const result = await generateEasyText(rawText, coreFields, documentType, actionSteps);
    return res.status(200).json(result);
  } catch (error) {
    console.error('EasyText generation error:', error);
    return res.status(500).json({ error: '쉬운글 생성 중 오류가 발생했습니다.' });
  }
});

export default router;
