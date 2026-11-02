import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { GitHubBotService } from '../services/GitHubBotService.ts';
import { createAuditEntry } from '../services/auditLedger.js';

export const webhooksRouter = Router();

/**
 * Validates HMAC SHA-256 webhook signature using constant-time comparison
 */
export function verifySignature(rawPayload: string | Buffer, signatureHeader?: string, secret?: string): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', secret);
    const payloadBuffer = Buffer.isBuffer(rawPayload) ? rawPayload : Buffer.from(rawPayload, 'utf8');
    const digest = 'sha256=' + hmac.update(payloadBuffer).digest('hex');

    const expectedBuffer = Buffer.from(digest, 'utf8');
    const actualBuffer = Buffer.from(signatureHeader, 'utf8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/github (or /api/webhooks)
 * Main GitHub Webhook Listener
 */
webhooksRouter.post('/github', async (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  const event = (req.headers['x-github-event'] as string) || 'unknown';
  const deliveryId = (req.headers['x-github-delivery'] as string) || `del-${Date.now()}`;

  // Fail-Closed: Missing signature header is strictly 401 Unauthorized
  if (!signature) {
    createAuditEntry({
      eventType: 'WEBHOOK_SIGNATURE_MISSING',
      actor: 'github-webhook-listener',
      details: { event, deliveryId, ip: req.ip },
    });
    return res.status(401).json({
      ok: false,
      error: 'MISSING_SIGNATURE',
      message: 'GitHub webhook signature header x-hub-signature-256 is required.',
    });
  }

  // Retrieve webhook secret
  const secret = process.env.GITHUB_WEBHOOK_SECRET || process.env.GH_WEBHOOK_SECRET || 'zyntheor-default-secret';

  // Obtain raw payload representation for HMAC verification
  let rawBody: string | Buffer;
  if (Buffer.isBuffer(req.body)) {
    rawBody = req.body;
  } else if (typeof (req as any).rawBody === 'string' || Buffer.isBuffer((req as any).rawBody)) {
    rawBody = (req as any).rawBody;
  } else if (typeof req.body === 'string') {
    rawBody = req.body;
  } else {
    rawBody = JSON.stringify(req.body || {});
  }

  const isValid = verifySignature(rawBody, signature, secret);

  // Fail-Closed: Invalid signature is strictly 403 Forbidden
  if (!isValid) {
    createAuditEntry({
      eventType: 'WEBHOOK_SIGNATURE_INVALID',
      actor: 'github-webhook-listener',
      details: { event, deliveryId, ip: req.ip },
    });
    return res.status(403).json({
      ok: false,
      error: 'INVALID_SIGNATURE',
      message: 'HMAC SHA-256 signature verification failed.',
    });
  }

  // Parse payload object
  let payload: any = req.body;
  if (Buffer.isBuffer(payload) || typeof payload === 'string') {
    try {
      payload = JSON.parse(payload.toString('utf8'));
    } catch {
      payload = {};
    }
  }

  // Handle ping event
  if (event === 'ping') {
    createAuditEntry({
      eventType: 'GITHUB_WEBHOOK_PING',
      actor: 'github',
      details: { zen: payload.zen, hookId: payload.hook_id },
    });
    return res.status(202).json({
      ok: true,
      status: 'ACCEPTED',
      event: 'ping',
      deliveryId,
      message: 'Ping acknowledged.',
    });
  }

  // Handle issues.opened event
  if (event === 'issues') {
    const action = payload.action;
    const issue = payload.issue;
    const repository = payload.repository;

    if (action === 'opened' && issue && repository) {
      const [owner, repo] = (repository.full_name || '').split('/');

      // Dispatch async task to GitHubBotService
      GitHubBotService.processIssue({
        owner: owner || repository.owner?.login || 'unknown',
        repo: repo || repository.name || 'unknown',
        issueNumber: issue.number,
        title: issue.title,
        body: issue.body,
      }).catch((err) => {
        console.error('[GitHubBotService] Error processing issue:', err);
      });

      return res.status(202).json({
        ok: true,
        status: 'ACCEPTED',
        event: 'issues.opened',
        deliveryId,
        message: `Issue #${issue.number} accepted for autonomous processing in draft mode.`,
      });
    }

    return res.status(202).json({
      ok: true,
      status: 'ACCEPTED',
      event: `issues.${action}`,
      deliveryId,
      message: `Issue action ${action} accepted without workflow trigger.`,
    });
  }

  // Other GitHub events
  return res.status(202).json({
    ok: true,
    status: 'ACCEPTED',
    event,
    deliveryId,
    message: `Event ${event} accepted.`,
  });
});
