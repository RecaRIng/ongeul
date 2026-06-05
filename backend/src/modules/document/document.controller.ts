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

// TODO: OCR 연결 필요 (소연 파트)
// 연결 방식:
// 1. req.file 로 이미지/PDF 받기 (multer 미들웨어 필요)
// 2. ocr 모듈 호출 → { rawText, lines, confidence } 반환
// 3. rawText 를 analyzeText() 에 넘겨서 기존 파이프라인 실행
router.post('/image', (_req, res) => {
  res.status(501).json({ message: 'OCR 파이프라인 연결 대기 중입니다. (소연 파트 완성 후 연결 예정)' });
});

export default router;