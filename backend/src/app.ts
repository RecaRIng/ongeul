import express from 'express';
import dotenv from 'dotenv';
import documentRouter from './modules/document/document.controller';
import easyTextRouter from './modules/easyText/easyText.controller';

dotenv.config();

const app = express();
app.use(express.json({ limit: '5mb' }));

app.use('/api/analyze', documentRouter);
app.use('/api/easytext', easyTextRouter);

app.get('/', (_req, res) => {
  res.json({ status: 'ongle-backend', message: 'POST /api/analyze/text 로 텍스트 분석을 요청하세요.' });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`Ongle backend listening on http://localhost:${port}`);
});