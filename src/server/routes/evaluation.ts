import express, { type Request, type Response } from 'express';
import { EvaluationLab } from '../../evaluation/EvaluationLab.ts';

const router = express.Router();

router.get('/run', async (_req: Request, res: Response) => {
  try {
    const results = await EvaluationLab.runAll();
    return res.json({ ok: true, results, timestamp: new Date().toISOString() });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: 'evaluation_run_failed', message: error.message });
  }
});

export default router;
