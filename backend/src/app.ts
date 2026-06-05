import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
dotenv.config();
import documentRouter from './modules/document/document.controller';
import easyTextRouter from './modules/easyText/easyText.controller';

const app = express();

app.use(express.json({ limit: '15mb' }));
app.use('/api/analyze', documentRouter);
app.use('/api/easytext', easyTextRouter);

app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ongle-backend',
    message: 'POST /api/analyze/text 또는 /api/analyze/image 로 분석을 요청하세요.'
  });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(port, () => {
  console.log(`Ongle backend listening on http://localhost:${port}`);
});
