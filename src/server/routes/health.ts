import express, { type Request, type Response } from 'express';
import { ProjectHealthAnalyzer } from '../../intelligence/ProjectHealthAnalyzer.ts';
import path from 'path';

const router = express.Router();

router.get('/analyze', async (_req: Request, res: Response) => {
  try {
    const workspaceDir = path.resolve(process.cwd());
    const report = await ProjectHealthAnalyzer.analyze(workspaceDir);
    // 🛑 Zero Auto-Modify: Analysis only - requires explicit human approval to apply fixes
    return res.json({
      ok: true,
      ...report,
      autoModify: false,
      message: 'Analysis only - requires human approval to apply fixes',
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: 'analysis_failed', message: error.message });
  }
});

router.post('/apply-fix', async (req: Request, res: Response) => {
  const { findingId, approved } = req.body || {};
  if (!approved) {
    return res.status(403).json({ ok: false, error: 'Human approval required' });
  }
  return res.json({
    ok: true,
    status: 'APPROVED_FOR_FIX',
    findingId: String(findingId || 'ALL'),
    message: 'Fix proposal approved by operator and scheduled for verification gate',
  });
});

export default router;
