/**
 * ZYNTHEOR AI ENGINE — DEVELOPER API v1 ROUTES (STEP 10)
 * Master Principle: ZERO FAKE — REAL COMPLETENESS ONLY
 *
 * Provides sovereign `/api/v1/*` endpoints for developer integration.
 */

import { Router } from 'express';
import { developerKeyService, type DeveloperApiKey } from '../services/developerPlatform.ts';
import { researchEngine } from '../services/researchEngine.ts';
import { vectorMemoryService } from '../services/vectorMemory.ts';
import { IntelligenceOrchestrationEngine } from '../../lib/intelligence-orchestrator.ts';

const r = Router();
const orchestrator = new IntelligenceOrchestrationEngine();

/**
 * Bearer API Key Authentication Middleware for /api/v1/*
 */
function requireDeveloperKey(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing Bearer API key in Authorization header. Format: Bearer zyntheor_live_...',
    });
  }

  const validation = developerKeyService.validateApiKey(token);
  if (!validation.valid || !validation.keyRecord) {
    return res.status(401).json({
      error: 'invalid_api_key',
      message: validation.reason || 'Invalid API key credentials',
    });
  }

  req.developerKey = validation.keyRecord;
  req.workspaceId = req.headers['x-workspace-id'] || validation.keyRecord.workspaceId;
  next();
}

// Public OpenAPI Spec Contract (Unauthenticated for developer docs)
r.get('/api/v1/docs/openapi.json', (_req, res) => {
  const spec = developerKeyService.getOpenApiSpec();
  res.json(spec);
});

// Authenticated Developer v1 Routes
r.use('/api/v1', requireDeveloperKey);

// 1. POST /api/v1/chat/completions (OpenAI-compatible + ZYNTHEOR Native response)
r.post('/api/v1/chat/completions', async (req: any, res) => {
  try {
    const { model, messages, temperature, stream } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'invalid_messages', message: 'messages must be a non-empty array' });
    }

    const lastMsg = messages[messages.length - 1];
    const queryText = lastMsg?.content || '';

    const ws = req.workspaceId || 'default';
    const isThai = /[\u0E00-\u0E7F]/.test(queryText);

    const execResult = await orchestrator.execute({
      query: queryText,
      workspaceId: ws,
      language: isThai ? 'th' : 'en',
      responseLanguage: isThai ? 'th' : 'en',
      onlineConsent: true,
    });

    const completionId = `chatcmpl-${Date.now().toString(36)}`;
    const createdTimestamp = Math.floor(Date.now() / 1000);

    return res.json({
      id: completionId,
      object: 'chat.completion',
      created: createdTimestamp,
      model: model || 'zyntheor-core-native-v1',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: execResult.finalAnswer,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: Math.max(1, Math.floor(queryText.length / 4)),
        completion_tokens: Math.max(1, Math.floor(execResult.finalAnswer.length / 4)),
        total_tokens: Math.max(2, Math.floor((queryText.length + execResult.finalAnswer.length) / 4)),
      },
      zyntheor: {
        taskType: execResult.taskType,
        sovereignty: 'ZYNTHEOR CORE Native v1',
        developerKeyTier: req.developerKey.tier,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'inference_error', message: err.message || 'Chat completion failed' });
  }
});

// 2. POST /api/v1/research
r.post('/api/v1/research', async (req: any, res) => {
  try {
    const { query, researchDepth, enableWebSearch, maxSources } = req.body || {};
    if (!query) {
      return res.status(400).json({ error: 'query_required', message: 'query parameter is required' });
    }

    const result = await researchEngine.executeResearch(query, {
      workspaceId: req.workspaceId || 'default',
      researchDepth: researchDepth || 'standard',
      enableWebSearch: enableWebSearch !== false,
      maxSources: maxSources ? Number(maxSources) : 5,
    });

    return res.json({ ok: true, researchResult: result });
  } catch (err: any) {
    return res.status(500).json({ error: 'research_error', message: err.message });
  }
});

// 3. GET /api/v1/models
r.get('/api/v1/models', (req: any, res) => {
  return res.json({
    object: 'list',
    data: [
      {
        id: 'zyntheor-core-native-v1',
        object: 'model',
        created: 1700000000,
        owned_by: 'ZYNTHEOR',
        permission: [],
        root: 'zyntheor-core-native-v1',
        parent: null,
      },
    ],
  });
});

// 4. GET /api/v1/memory/search
r.get('/api/v1/memory/search', (req: any, res) => {
  try {
    const q = String(req.query.q || '');
    const ws = req.workspaceId || 'default';
    const topK = req.query.topK ? Number(req.query.topK) : 5;

    const results = vectorMemoryService.search(ws, q, { topK, minScore: 0.40 });
    return res.json({ ok: true, query: q, count: results.length, results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. POST /api/v1/memory/store
r.post('/api/v1/memory/store', (req: any, res) => {
  try {
    const { category, title, content, tags, metadata } = req.body || {};
    if (!title || !content || !category) {
      return res.status(400).json({ error: 'category, title, content required' });
    }

    const entry = vectorMemoryService.storeMemory({
      workspaceId: req.workspaceId || 'default',
      category,
      title,
      content,
      tags: tags || [],
      metadata: metadata || {},
    });

    return res.json({ ok: true, entry });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Key Management Routes (Authenticated by active developer key)
r.post('/api/v1/keys', (req: any, res) => {
  try {
    const { name, tier, permissions, rateLimitPerMin, expiresInDays } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });

    const created = developerKeyService.createApiKey({
      workspaceId: req.workspaceId || 'default',
      name: String(name),
      tier,
      permissions,
      rateLimitPerMin,
      expiresInDays,
    });

    return res.status(201).json({ ok: true, keyRecord: created.keyRecord, secretKey: created.rawSecretKey });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

r.get('/api/v1/keys', (req: any, res) => {
  try {
    const keys = developerKeyService.listApiKeys(req.workspaceId || 'default');
    return res.json({ ok: true, count: keys.length, keys });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

r.delete('/api/v1/keys/:id', (req: any, res) => {
  try {
    const revoked = developerKeyService.revokeApiKey(req.workspaceId || 'default', req.params.id);
    if (!revoked) return res.status(404).json({ error: 'Key record not found' });
    return res.json({ ok: true, revoked: true, id: req.params.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Usage Metering Route
r.get('/api/v1/usage', (req: any, res) => {
  const k = req.developerKey as DeveloperApiKey;
  return res.json({
    ok: true,
    keyId: k.id,
    keyPrefix: k.keyPrefix,
    tier: k.tier,
    usage: {
      totalAccessCount: k.accessCount,
      currentMonthRequests: k.requestCountCurrentMonth,
      monthlyQuota: k.monthlyQuotaRequests,
      rateLimitPerMin: k.rateLimitPerMin,
    },
    timestamp: new Date().toISOString(),
  });
});

export default r;
