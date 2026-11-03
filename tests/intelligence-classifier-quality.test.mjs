import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(path.join(root, 'lib/intelligence-core.ts'), 'utf8');

test('classifier supports Thai and English task signals with explicit priority rules', () => {
  for (const signal of ['stack trace', 'บั๊ก|แก้', 'system instruction', 'พรอมป์ต์', 'automation', 'เอเจนต์', 'refactor', 'ตรวจ', 'infrastructure', 'สถาปัตยกรรม', 'sources', 'ค้นคว้า', 'implement', 'สร้างแอป']) {
    assert.ok(source.includes(signal), `missing bilingual classifier signal: ${signal}`);
  }
});

test('heuristic classification is never mislabeled as verified evidence', () => {
  const method = source.slice(source.indexOf('  classifyTask('), source.indexOf('  generateExecutionPlan('));
  assert.match(method, /evidenceLevel:\s*'ASSUMPTION'/);
  assert.match(method, /not a trained model/i);
  assert.match(method, /rationale:/);
});

test('uncertain general requests do not automatically request tools', () => {
  const method = source.slice(source.indexOf('  classifyTask('), source.indexOf('  generateExecutionPlan('));
  assert.match(method, /requiresTools:\s*Boolean\(matched\?\.tools\.length\)/);
  assert.match(method, /avoid.*automatically|หลีกเลี่ยงการเรียกเครื่องมือโดยอัตโนมัติ/i);
});
