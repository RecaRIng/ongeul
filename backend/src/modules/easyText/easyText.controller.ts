import express from 'express';
import type { CoreFields } from '../../common/types';
import { generateEasyText } from './easyText.service';

const router = express.Router();

function validateEasyTextRequest(body: unknown): body is { rawText: string; coreFields: CoreFields } {
  if (!body || typeof body !== 'object') return false;

  const candidate = body as Record<string, unknown>;
  if (typeof candidate.rawText !== 'string' || candidate.rawText.trim().length === 0) return false;

  const coreFields = candidate.coreFields;
  if (!coreFields || typeof coreFields !== 'object') return false;

  const fields = coreFields as Record<string, unknown>;
  const stringFields = ['date', 'time', 'place', 'deadline', 'submissionTarget'];
  const arrayFields = ['materials', 'actions', 'warnings'];

  return (
    stringFields.every((field) => typeof fields[field] === 'string') &&
    arrayFields.every((field) => Array.isArray(fields[field]))
  );
}

router.post('/generate', async (req, res) => {
  if (!validateEasyTextRequest(req.body)) {
    return res.status(400).json({
      error: 'rawText(string) and coreFields(date, time, place, deadline, submissionTarget, materials, actions, warnings) are required.'
    });
  }

  try {
    const { rawText, coreFields } = req.body;
    const result = await generateEasyText(rawText, coreFields);
    return res.status(200).json(result);
  } catch (error) {
    console.error('EasyText generation error:', error);
    return res.status(500).json({ error: 'Easy text generation failed.' });
  }
});

export default router;
