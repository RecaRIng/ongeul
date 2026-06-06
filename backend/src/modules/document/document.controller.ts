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
    return res.status(500).json({ error: 'ë¬¸ì„œ ë¶„ì„ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.' });
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
    const message = error instanceof Error ? error.message : '?´ë?ì§€ ë¶„ì„ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.';
    return res.status(500).json({ error: message });
  }
});

export default router;
