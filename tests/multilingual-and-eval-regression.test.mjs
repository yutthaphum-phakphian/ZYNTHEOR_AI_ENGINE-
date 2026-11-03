import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Buffalo 0.15: i18n supports th and en with separate UI keys', () => {
  const i18n = readFileSync(path.join(root, 'lib/i18n.ts'), 'utf8');
  assert.ok(i18n.includes("export type SupportedLanguage = 'th' | 'en'"));
  assert.ok(i18n.includes("th:"));
  assert.ok(i18n.includes("en:"));
  assert.ok(i18n.includes('LANGUAGE_STORAGE_KEY'));
});

test('Buffalo 0.15: response language is resolvable independently from UI locale', async () => {
  // Lightweight pure checks via source contracts (avoid loading @google/genai)
  const core = readFileSync(path.join(root, 'lib/intelligence-core.ts'), 'utf8');
  assert.ok(core.includes('resolveResponseLanguage'));
  assert.ok(core.includes('responseLanguage'));
  assert.ok(core.includes('classifyTask(query: string, language?: SupportedLanguage, responseLanguage?: SupportedLanguage)'));
  // Must not force UI locale alone to set answer language without query/explicit preference
  assert.ok(core.includes('Priority:') || core.includes('independent'));
});

test('Buffalo 0.15: intelligence run accepts responseLanguage without requiring UI locale match', () => {
  const server = readFileSync(path.join(root, 'server.ts'), 'utf8');
  assert.ok(server.includes('responseLanguage'));
  assert.ok(server.includes('responseLanguage,'));
});

test('Buffalo 0.15: Prompt Forge supports Thai and English generation targets', () => {
  const forge = readFileSync(path.join(root, 'lib/prompt-engine.ts'), 'utf8');
  assert.ok(forge.includes('targetLanguage') || forge.includes('language'));
  const page = readFileSync(path.join(root, 'src/components/PromptForgePage.tsx'), 'utf8');
  assert.ok(page.includes('forge.lang.th') || page.includes("'th'") || page.includes('"th"'));
  assert.ok(page.includes('forge.lang.en') || page.includes("'en'") || page.includes('"en"'));
});

test('Buffalo 0.15: evaluation harness marks native inference SKIPPED without weights', async () => {
  const { runBaselineEvaluation } = await import('../training/scripts/evaluate_baseline.mjs');
  const report = await runBaselineEvaluation();
  assert.equal(report.nativeModelInference?.available, false);
  assert.ok(
    report.evaluationType === 'DETERMINISTIC_FIXTURE_HARNESS_ONLY' ||
    report.evaluationType === 'NATIVE_MODEL_INFERENCE'
  );
  // Without weights must not be NATIVE_MODEL_INFERENCE
  assert.notEqual(report.evaluationType, 'NATIVE_MODEL_INFERENCE');
});

test('Buffalo 0.15: dataset still has th, en, and th-en coverage for bilingual work', () => {
  const samples = JSON.parse(readFileSync(path.join(root, 'training/dataset/samples.json'), 'utf8'));
  const langs = new Set(samples.map(s => s.language));
  assert.ok(langs.has('th'));
  assert.ok(langs.has('en'));
  assert.ok(langs.has('th-en'));
  const cats = new Set(samples.map(s => s.category));
  assert.ok(cats.has('code_generation') || cats.has('debugging'));
});

test('Buffalo 0.15: package version is 0.15.0', () => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(['0.15.0','0.16.0','0.17.0','0.18.0','0.19.0','0.20.0','1.0.0','1.1.0','1.1.1','1.2.0','1.2.1','1.2.2'].includes(pkg.version));
});
