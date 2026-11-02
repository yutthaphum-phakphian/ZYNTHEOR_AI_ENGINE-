import express, { type Request, type Response } from 'express';
import { CAPABILITY_REGISTRY } from '../../capability/registry.ts';

const router = express.Router();

router.get('/', (_req: Request, res: Response) => {
  return res.json(CAPABILITY_REGISTRY);
});

router.get('/:id', (req: Request, res: Response) => {
  const cap = CAPABILITY_REGISTRY.find((c) => c.id === req.params.id);
  if (!cap) {
    return res.status(404).json({ ok: false, error: 'Capability not found' });
  }
  return res.json(cap);
});

export default router;
