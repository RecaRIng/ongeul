import { Router } from 'express';
import { regenerateVisualImage } from './visual.service.js';

const router = Router();

router.post('/regenerate', async (req, res) => {
  const { prompt, cardType } = req.body ?? {};

  if (typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: '다시 생성할 이미지 정보가 없습니다.' });
    return;
  }

  try {
    const imageUrl = await regenerateVisualImage(
      prompt.trim(),
      typeof cardType === 'string' ? cardType : 'step_card',
    );

    if (!imageUrl) {
      res.status(502).json({ error: '이미지 생성에 실패했습니다. API 설정이나 사용량을 확인해주세요.' });
      return;
    }

    res.json({ imageUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[visual] regenerate failed:', message);
    res.status(500).json({ error: '이미지 다시 생성 중 오류가 발생했습니다.' });
  }
});

export default router;
