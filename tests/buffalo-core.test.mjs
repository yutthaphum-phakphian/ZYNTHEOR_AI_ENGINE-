import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChatMessages, normalizeMode, parseUpstreamLine, readChatStream, readServerEvents, sanitizeHistory, MODE_PROMPTS, CHAT_MODES } from '../lib/chat-core.mjs';
import { extractToken, tokenMatches } from '../lib/access.mjs';

const streamOf = chunks => new ReadableStream({ start(c) { const enc = new TextEncoder(); for (const x of chunks) c.enqueue(enc.encode(x)); c.close(); } });
const collect = async gen => { const out = []; for await (const item of gen) out.push(item); return out; };

test('modes: six adaptive modes, legacy aliases, default auto, invalid rejected', () => {
  assert.deepEqual([...CHAT_MODES], ['auto', 'chat', 'reasoning', 'coding', 'research', 'agent']);
  assert.equal(normalizeMode(undefined), 'auto');
  assert.equal(normalizeMode(''), 'auto');
  assert.equal(normalizeMode('PLAN'), 'reasoning');
  assert.equal(normalizeMode('code'), 'coding');
  assert.equal(normalizeMode('AGENT'), 'agent');
  assert.equal(normalizeMode('hack'), null);
  assert.equal(normalizeMode(5), null);
  assert.equal(new Set(Object.keys(MODE_PROMPTS)).size, 6);
  assert.notEqual(MODE_PROMPTS.reasoning, MODE_PROMPTS.coding);
});

test('buildChatMessages puts the mode prompt first, keeps bounded history, user message last', () => {
  const history = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }));
  history.push({ role: 'system', content: 'ignored' }, { role: 'user', content: 5 }, null);
  const messages = buildChatMessages('coding', history, 'hello');
  assert.equal(messages[0].role, 'system');
  assert.equal(messages[0].content, MODE_PROMPTS.coding);
  assert.equal(messages.at(-1).content, 'hello');
  assert.ok(messages.length <= 18);
  assert.ok(!messages.some(m => m.content === 'ignored'));
  assert.equal(sanitizeHistory([{ role: 'user', content: 'x'.repeat(13000) }])[0].content.length, 12000);
  assert.deepEqual(sanitizeHistory('nope'), []);
});

test('parseUpstreamLine handles delta, done, error and noise', () => {
  assert.deepEqual(parseUpstreamLine('data: {"choices":[{"delta":{"content":"hi"}}]}'), { type: 'delta', text: 'hi' });
  assert.deepEqual(parseUpstreamLine('data: [DONE]'), { type: 'done' });
  assert.equal(parseUpstreamLine('data: {"error":{"message":"boom"}}').type, 'error');
  assert.equal(parseUpstreamLine(': keepalive'), null);
  assert.equal(parseUpstreamLine('data: not-json'), null);
  assert.equal(parseUpstreamLine('data: {"choices":[{"delta":{"role":"assistant"}}]}'), null);
});

test('readChatStream reassembles deltas split across chunk boundaries and stops at [DONE]', async () => {
  const body = streamOf(['data: {"choices":[{"delta":{"content":"Sa', 'wasdee"}}]}\n\ndata: {"choices":[{"delta":{"content":" ครับ"}}]}\n', '\ndata: [DONE]\n\n', 'data: {"choices":[{"delta":{"content":"after"}}]}\n']);
  const items = await collect(readChatStream(body));
  assert.deepEqual(items.map(i => i.type), ['delta', 'delta', 'done']);
  assert.equal(items.filter(i => i.type === 'delta').map(i => i.text).join(''), 'Sawasdee ครับ');
});

test('readChatStream reports a stream that ends without [DONE] (caller can detect it)', async () => {
  const items = await collect(readChatStream(streamOf(['data: {"choices":[{"delta":{"content":"partial"}}]}\n'])));
  assert.deepEqual(items, [{ type: 'delta', text: 'partial' }]);
});

test('readServerEvents parses the app SSE format including split multi-byte text', async () => {
  const full = 'event: start\ndata: {"model":"m"}\n\nevent: delta\ndata: {"text":"สวัสดี"}\n\nevent: done\ndata: {"chars":6}\n\n';
  const bytes = new TextEncoder().encode(full);
  const cut = 50; // lands inside the Thai text bytes on purpose
  const body = new ReadableStream({ start(c) { c.enqueue(bytes.slice(0, cut)); c.enqueue(bytes.slice(cut)); c.close(); } });
  const events = await collect(readServerEvents(body));
  assert.deepEqual(events.map(e => e.event), ['start', 'delta', 'done']);
  assert.equal(events[1].data.text, 'สวัสดี');
});

test('access token: constant-time compare and header extraction', () => {
  assert.equal(tokenMatches('secret-token', 'secret-token'), true);
  assert.equal(tokenMatches('secret-token', 'secret-tokeN'), false);
  assert.equal(tokenMatches('secret-token', ''), false);
  assert.equal(tokenMatches('', ''), false);
  assert.equal(extractToken({ authorization: 'Bearer abc123' }), 'abc123');
  assert.equal(extractToken({ 'x-zyntheor-token': ' xyz ' }), 'xyz');
  assert.equal(extractToken({}), '');
});

test('readChatStream works over a real chunked HTTP stream and cancelling it closes the upstream connection', async () => {
  const { createServer } = await import('node:http');
  let upstreamClosed;
  const closed = new Promise(resolve => { upstreamClosed = resolve; });
  const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.write('data: {"choices":[{"delta":{"content":"one"}}]}\n\n');
    const timer = setInterval(() => res.write('data: {"choices":[{"delta":{"content":"."}}]}\n\n'), 20);
    res.on('close', () => { clearInterval(timer); upstreamClosed(true); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
    let seen = '';
    for await (const item of readChatStream(response.body)) {
      if (item.type === 'delta') seen += item.text;
      if (seen.length >= 3) break; // consumer stops early, like an aborted request
    }
    assert.ok(seen.startsWith('one'));
    assert.equal(await Promise.race([closed, new Promise(r => setTimeout(() => r('timeout'), 3000))]), true);
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});

test('AUTO mode routes common intents to bounded response profiles', async () => {
  const { classifyAutoMode } = await import('../lib/chat-core.mjs');
  assert.equal(classifyAutoMode('ช่วยแก้บั๊ก TypeScript ใน API').mode, 'coding');
  assert.equal(classifyAutoMode('ช่วยวิเคราะห์สถาปัตยกรรมและวางแผน').mode, 'reasoning');
  assert.equal(classifyAutoMode('ค้นคว้าข้อมูลล่าสุดพร้อมแหล่งอ้างอิง').mode, 'research');
  assert.equal(classifyAutoMode('ช่วยดำเนินการแก้ไฟล์และรันคำสั่ง').mode, 'agent');
  assert.equal(classifyAutoMode('สวัสดี วันนี้เป็นอย่างไร').mode, 'chat');
  assert.ok(classifyAutoMode('สวัสดี').reason.length > 0);
});
