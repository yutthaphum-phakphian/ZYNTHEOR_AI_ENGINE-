import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyDataset } from '../training/scripts/verify_dataset.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

test('Buffalo 0.12: live dataset passes schema, leakage and duplicate gates', () => {
  const report = verifyDataset();
  assert.equal(report.valid, true, `dataset invalid: ${JSON.stringify(report.errors)}`);
  assert.equal(report.leakageCheck.passed, true);
  assert.equal(report.qualityCheck.duplicates, 0);
  assert.equal(report.qualityCheck.emptyFields, 0);
  assert.ok(report.stats.totalSamples >= 11, 'expected at least 9 curated samples after 0.12 expansion');
  assert.ok(report.stats.samplesDigestSha256 && report.stats.samplesDigestSha256.length === 64);
  assert.ok(report.stats.manifestDigestSha256 && report.stats.manifestDigestSha256.length === 64);
  assert.equal(report.humanReviewRequired, true);
});

test('Buffalo 0.12: verifyDataset detects missing required fields', () => {
  const tmpSamples = path.join(root, 'training/dataset/_tmp_invalid_samples.json');
  const tmpManifest = path.join(root, 'training/dataset/manifest.json');
  writeFileSync(tmpSamples, JSON.stringify([
    { id: 'bad-1', split: 'train', domain: 'x', category: 'y', language: 'en', license: 'Apache-2.0', source: 't', instruction: 'hi' }
    // missing expected_output
  ], null, 2));
  try {
    const report = verifyDataset({ samplesPath: tmpSamples, manifestPath: tmpManifest });
    assert.equal(report.valid, false);
    assert.ok(report.errors.some(e => e.includes('expected_output')));
  } finally {
    if (existsSync(tmpSamples)) unlinkSync(tmpSamples);
  }
});

test('Buffalo 0.12: verifyDataset detects train/test leakage', () => {
  const tmpSamples = path.join(root, 'training/dataset/_tmp_leak_samples.json');
  const tmpManifest = path.join(root, 'training/dataset/manifest.json');
  const shared = 'Write a function that returns forty two exactly as specified';
  writeFileSync(tmpSamples, JSON.stringify([
    {
      id: 't1', split: 'train', domain: 'software_engineering', category: 'code_generation',
      language: 'en', license: 'Apache-2.0', source: 'tmp', instruction: shared, expected_output: 'return 42'
    },
    {
      id: 't2', split: 'test', domain: 'software_engineering', category: 'code_generation',
      language: 'en', license: 'Apache-2.0', source: 'tmp', instruction: shared, expected_output: 'return 42'
    }
  ], null, 2));
  try {
    const report = verifyDataset({ samplesPath: tmpSamples, manifestPath: tmpManifest });
    assert.equal(report.valid, false);
    assert.ok(report.leakageCheck.trainVsTestOverlaps >= 1);
    assert.equal(report.leakageCheck.passed, false);
  } finally {
    if (existsSync(tmpSamples)) unlinkSync(tmpSamples);
  }
});

test('Buffalo 0.12: verifyDataset detects exact duplicate ids and instructions', () => {
  const tmpSamples = path.join(root, 'training/dataset/_tmp_dup_samples.json');
  const tmpManifest = path.join(root, 'training/dataset/manifest.json');
  writeFileSync(tmpSamples, JSON.stringify([
    {
      id: 'dup', split: 'train', domain: 'software_engineering', category: 'code_generation',
      language: 'en', license: 'Apache-2.0', source: 'tmp', instruction: 'Unique instruction alpha', expected_output: 'a'
    },
    {
      id: 'dup', split: 'train', domain: 'software_engineering', category: 'code_generation',
      language: 'en', license: 'Apache-2.0', source: 'tmp', instruction: 'Unique instruction beta', expected_output: 'b'
    }
  ], null, 2));
  try {
    const report = verifyDataset({ samplesPath: tmpSamples, manifestPath: tmpManifest });
    assert.equal(report.valid, false);
    assert.ok(report.errors.some(e => e.includes('duplicate id')));
  } finally {
    if (existsSync(tmpSamples)) unlinkSync(tmpSamples);
  }
});

test('Buffalo 0.12: manifest and samples stay in sync on disk', () => {
  const manifest = JSON.parse(readFileSync(path.join(root, 'training/dataset/manifest.json'), 'utf8'));
  const samples = JSON.parse(readFileSync(path.join(root, 'training/dataset/samples.json'), 'utf8'));
  assert.ok(['1.1.0','1.2.0','1.3.1'].includes(manifest.manifest_version));
  assert.equal(manifest.dataset_files[0].sample_count, samples.length);
  assert.ok(samples.length >= 11);
  assert.ok(samples.filter(s => s.split === 'train').length >= 6);
  assert.ok(samples.filter(s => s.split === 'validation').length >= 2);
  assert.ok(samples.filter(s => s.split === 'test').length >= 3);
  const langs = new Set(samples.map(s => s.language));
  assert.ok(langs.has('en') && langs.has('th') && langs.has('th-en'));
});

test('Buffalo 0.12 Phase2: near-duplicate detector flags high Jaccard pairs', () => {
  const tmpSamples = path.join(root, 'training/dataset/_tmp_neardup_samples.json');
  const tmpManifest = path.join(root, 'training/dataset/manifest.json');
  writeFileSync(tmpSamples, JSON.stringify([
    {
      id: 'n1', split: 'train', domain: 'software_engineering', category: 'code_generation',
      language: 'en', license: 'Apache-2.0', source: 'tmp',
      instruction: 'Write a pure function that adds two positive integers and returns the sum safely',
      expected_output: 'function add(a,b){return a+b}'
    },
    {
      id: 'n2', split: 'train', domain: 'software_engineering', category: 'code_generation',
      language: 'en', license: 'Apache-2.0', source: 'tmp',
      instruction: 'Write a pure function that adds two positive integers and returns the sum carefully',
      expected_output: 'function add(a,b){return a+b}'
    }
  ], null, 2));
  try {
    const report = verifyDataset({ samplesPath: tmpSamples, manifestPath: tmpManifest, nearDupThreshold: 0.7 });
    assert.ok(report.qualityCheck.nearDuplicates >= 1, 'expected near-duplicate warning');
    assert.ok(report.qualityCheck.nearDuplicatePairs.length >= 1);
  } finally {
    if (existsSync(tmpSamples)) unlinkSync(tmpSamples);
  }
});

test('Buffalo 0.12 Phase2: dataset_report module builds text report', async () => {
  const mod = await import('../training/scripts/dataset_report.mjs');
  const { text, verification } = mod.buildDatasetReport();
  assert.ok(text.includes('ZYNTHEOR CORE — Dataset Engineering Report'));
  assert.ok(text.includes('By split:'));
  assert.ok(text.includes('By language:'));
  assert.ok(verification.stats.totalSamples >= 11);
  assert.equal(verification.humanReviewRequired, true);
});
