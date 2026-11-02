import { Router } from 'express';
import { applyPatchPreview, PatchSecurityError } from '../services/patchApplier.js';
const r = Router();
r.post('/api/editing/propose', (req, res) => {
  const body: unknown = req.body;
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'file and diff required' });
  const { file, diff } = body as { file?: unknown; diff?: unknown };
  if (typeof file !== 'string' || typeof diff !== 'string') {
    return res.status(400).json({ error: 'file and diff required' });
  }
  try {
    return res.json(applyPatchPreview(file, diff));
  } catch (error) {
    if (error instanceof PatchSecurityError || error instanceof TypeError || error instanceof RangeError) {
      return res.status(400).json({ error: 'invalid_patch_preview', message: error.message });
    }
    throw error;
  }
});
r.post('/api/editing/execute', (_req, res) => {
  return res.status(503).json({ error: 'execution_disabled' });
});
export default r;
