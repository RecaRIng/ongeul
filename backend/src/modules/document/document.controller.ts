import express from 'express';
import { validateAnalyzeImageRequest, validateAnalyzeTextRequest } from '../../common/schemas';
import { analyzeImage, analyzeText } from './document.service';

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
    return res.status(500).json({ error: '문서 분석 중 오류가 발생했습니다.' });
  }
});

router.post('/image', async (req, res) => {
  if (!validateAnalyzeImageRequest(req.body)) {
    return res.status(400).json({ error: 'Invalid request: imageBase64 and imageFormat are required.' });
  }

  try {
    const response = await analyzeImage(req.body);
    return res.status(200).json(response);
  } catch (error) {
    console.error('Analyze image error:', error);
    const message = error instanceof Error ? error.message : '이미지 분석 중 오류가 발생했습니다.';
    return res.status(500).json({ error: message });
  }
});

export default router;