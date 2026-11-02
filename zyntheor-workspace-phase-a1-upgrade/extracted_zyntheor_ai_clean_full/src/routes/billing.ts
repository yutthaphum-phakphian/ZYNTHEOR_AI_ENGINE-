import { Router, type Request, type Response } from 'express';

const router = Router();

router.get('/api/billing/subscription', (_req: Request, res: Response) => {
  return res.status(503).json({ ok: false, error: 'tenant_membership_verification_unavailable' });
});

router.post('/api/billing/checkout', (_req: Request, res: Response) => {
  return res.status(503).json({ ok: false, error: 'tenant_membership_verification_unavailable' });
});

router.post('/api/billing/verify-payment', (_req: Request, res: Response) => {
  return res.status(503).json({ ok: false, error: 'payment_provider_verification_unavailable' });
});

router.post('/api/billing/webhook/:provider', (_req: Request, res: Response) => {
  return res.status(503).json({ ok: false, error: 'webhook_provider_contract_unavailable' });
});

router.post('/api/billing/reconcile', (_req: Request, res: Response) => {
  return res.status(503).json({ ok: false, error: 'bank_reconciliation_source_unavailable' });
});

router.get('/api/billing/invoices', (_req: Request, res: Response) => {
  return res.status(503).json({ ok: false, error: 'tenant_membership_verification_unavailable' });
});

router.post('/api/billing/cancel', (_req: Request, res: Response) => {
  return res.status(503).json({ ok: false, error: 'tenant_membership_verification_unavailable' });
});

router.get('/api/billing/audit', (_req: Request, res: Response) => {
  return res.status(503).json({ ok: false, error: 'tenant_membership_verification_unavailable' });
});

export default router;
