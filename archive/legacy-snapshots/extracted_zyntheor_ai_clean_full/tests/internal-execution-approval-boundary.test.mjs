import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const serverSource = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const intelligenceRouteSource = readFileSync(new URL('../src/routes/intelligence.ts', import.meta.url), 'utf8');

test('HTTP agent execution routes do not accept client-supplied human approvals', () => {
  assert.doesNotMatch(serverSource, /req\.body\??\.humanApprovals/);
  assert.equal((serverSource.match(/humanApprovals:\s*\{\s*\}/g) || []).length, 4);
});

test('standalone intelligence orchestration route ignores client-supplied human approvals', () => {
  assert.doesNotMatch(intelligenceRouteSource, /humanApprovals\s*[,}]/);
  assert.match(intelligenceRouteSource, /humanApprovals:\s*\{\s*\}/);
});
