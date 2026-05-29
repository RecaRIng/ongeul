import express from 'express';
import { validateAnalyzeTextRequest } from '../../common/schemas.js';
import { analyzeText } from './document.service.js';

const router = express.Router();

router.post('/text', async (req, res) => {
  if (!validateAnalyzeTextRequest(req.body)) {
    return res.status(400).json({ error: 'Invalid request: text must be a non-empty string.' });
  }

  try {
    const response = await analyzeText(req.body);
    return res.status(200).json(response);
  } catch (error) {
    console.error('Analyze text error:', error);
    return res.status(500).json({ error: '서버 처리 중 오류가 발생했습니다.' });
  }
});

router.post('/image', (_req, res) => {
  res.status(501).json({ message: '이미지 OCR 파이프라인은 후속 구현 대상입니다.' });
});

export default router;
