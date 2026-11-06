import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import express from 'express';
import { createProvider } from '../lib/providers.ts';

test('intelligence run abort disconnects the upstream provider request', { timeout: 10000 }, async () => {
  let markRequestStarted;
  let markUpstreamClosed;
  const requestStarted = new Promise(resolve => { markRequestStarted = resolve; });
  const upstreamClosed = new Promise(resolve => { markUpstreamClosed = resolve; });

  const providerServer = createServer((request, response) => {
    const handleClose = () => {
      markUpstreamClosed();
      try { response.destroy(); } catch { /* ignore */ }
    };
    request.on('close', handleClose);
    request.on('aborted', handleClose);
    request.on('error', handleClose);
    response.on('close', handleClose);
    response.on('error', handleClose);
    if (request.socket) {
      request.socket.on('close', handleClose);
      request.socket.on('error', handleClose);
    }
    markRequestStarted();
    request.resume();
  });

  await new Promise((resolve, reject) => {
    providerServer.once('error', reject);
    providerServer.listen(0, '127.0.0.1', resolve);
  });

  const providerUrl = `http://127.0.0.1:${providerServer.address().port}/v1`;

  const app = express();
  app.use(express.json());

  app.post('/api/intelligence/run', async (req, res) => {
    const { query } = req.body || {};
    if (query && typeof query === 'string' && query.trim()) {
      const abortController = new AbortController();
      res.on('close', () => {
        if (!res.writableEnded) {
          abortController.abort();
        }
      });

      try {
        const provider = createProvider({
          ZYNTHEOR_PROVIDER: 'openai',
          ZYNTHEOR_MODEL_BASE_URL: providerUrl,
          ZYNTHEOR_MODEL_NAME: 'cancellation-test-model',
          OPENAI_API_KEY: 'test-key',
        });
        const result = await provider.chat({
          mode: 'auto',
          messages: [{ role: 'user', content: query }],
          signal: abortController.signal,
        });
        return res.json({ ok: true, result });
      } catch (err) {
        if (abortController.signal.aborted || err?.name === 'AbortError') {
          return res.status(499).json({ error: 'Client cancelled request' });
        }
        return res.status(500).json({ error: err?.message || 'Provider request failed' });
      }
    }
    return res.json({ executionVerified: false });
  });

  const appServer = createServer(app);
  await new Promise((resolve, reject) => {
    appServer.once('error', reject);
    appServer.listen(0, '127.0.0.1', resolve);
  });

  const baseUrl = `http://127.0.0.1:${appServer.address().port}`;

  try {
    const controller = new AbortController();
    const request = fetch(`${baseUrl}/api/intelligence/run`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Cancel this intelligence request', language: 'en', bypassCache: true }),
    }).catch(error => error);

    await requestStarted;
    controller.abort();
    await request;

    const closedWithinTimeout = await Promise.race([
      upstreamClosed.then(() => true),
      delay(3000).then(() => false),
    ]);
    assert.equal(closedWithinTimeout, true, 'client cancellation must abort the provider request');
  } finally {
    appServer.closeAllConnections();
    await new Promise(resolve => appServer.close(resolve));
    providerServer.closeAllConnections();
    await new Promise(resolve => providerServer.close(resolve));
  }
});