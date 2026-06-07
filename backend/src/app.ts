import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import documentRouter from './modules/document/document.controller.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/api/analyze', documentRouter);

app.get('/', (_req, res) => {
  res.json({ status: 'ongle-backend', message: 'POST /api/analyze/text 로 텍스트 분석을 요청하세요.' });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`Ongle backend listening on http://localhost:${port}`);
});
