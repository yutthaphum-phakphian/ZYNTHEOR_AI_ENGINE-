#!/usr/bin/env node
/**
 * Human-readable dataset engineering report for ZYNTHEOR CORE.
 * Uses verifyDataset(); does not mutate samples.
 */
import { writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyDataset } from './verify_dataset.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

function fmtTable(obj) {
  const keys = Object.keys(obj || {}).sort();
  if (!keys.length) return '  (none)';
  return keys.map(k => `  ${k.padEnd(28)} ${String(obj[k]).padStart(5)}`).join('\n');
}

export function buildDatasetReport(options = {}) {
  const verification = verifyDataset(options);
  const lines = [];
  lines.push('='.repeat(72));
  lines.push('ZYNTHEOR CORE — Dataset Engineering Report');
  lines.push(`Generated: ${verification.timestamp}`);
  lines.push('='.repeat(72));
  lines.push('');
  lines.push(`Overall valid: ${verification.valid ? 'YES' : 'NO'}`);
  lines.push(`Human review required: ${verification.humanReviewRequired ? 'YES' : 'NO'}`);
  lines.push('');
  lines.push('--- Counts ---');
  lines.push(`Total samples: ${verification.stats.totalSamples}`);
  lines.push('By split:');
  lines.push(fmtTable(verification.stats.splits));
  lines.push('By language:');
  lines.push(fmtTable(verification.stats.languages));
  lines.push('By domain:');
  lines.push(fmtTable(verification.stats.domains));
  lines.push('By category:');
  lines.push(fmtTable(verification.stats.categories));
  lines.push('By license:');
  lines.push(fmtTable(verification.stats.licenses));
  lines.push('By source:');
  lines.push(fmtTable(verification.stats.sources));
  lines.push('');
  lines.push(`Characters: ${verification.stats.totalCharacters}`);
  lines.push(`Est. tokens (~4 chars): ${verification.stats.estimatedTokens}`);
  lines.push('');
  lines.push('--- Digests (SHA-256) ---');
  lines.push(`manifest: ${verification.stats.manifestDigestSha256}`);
  lines.push(`samples:  ${verification.stats.samplesDigestSha256}`);
  lines.push('');
  lines.push('--- Leakage ---');
  lines.push(`passed: ${verification.leakageCheck.passed}`);
  lines.push(`train↔val: ${verification.leakageCheck.trainVsValOverlaps}`);
  lines.push(`train↔test: ${verification.leakageCheck.trainVsTestOverlaps}`);
  lines.push(`val↔test: ${verification.leakageCheck.valVsTestOverlaps}`);
  if (verification.leakageCheck.overlapDetails?.length) {
    lines.push('details:');
    for (const d of verification.leakageCheck.overlapDetails) {
      lines.push(`  ${d.type} hashPrefix=${d.hashPrefix}`);
    }
  }
  lines.push('');
  lines.push('--- Quality ---');
  lines.push(`duplicates: ${verification.qualityCheck.duplicates}`);
  lines.push(`near-duplicates: ${verification.qualityCheck.nearDuplicates}`);
  lines.push(`empty fields: ${verification.qualityCheck.emptyFields}`);
  lines.push(`short instructions: ${verification.qualityCheck.shortInstructions}`);
  lines.push(`invalid language: ${verification.qualityCheck.invalidLanguage}`);
  lines.push(`invalid split: ${verification.qualityCheck.invalidSplit}`);
  if (verification.qualityCheck.nearDuplicatePairs?.length) {
    lines.push('near-duplicate pairs:');
    for (const p of verification.qualityCheck.nearDuplicatePairs) {
      lines.push(`  ${p.a} ↔ ${p.b} (sim=${p.similarity})`);
    }
  }
  lines.push('');
  lines.push('--- Provenance ---');
  lines.push(`all licensed: ${verification.provenance.allLicensed}`);
  lines.push(`all have source: ${verification.provenance.allHaveSource}`);
  lines.push(`licenses: ${verification.provenance.licensesSeen.join(', ') || '(none)'}`);
  lines.push(`sources: ${verification.provenance.sourcesSeen.join(', ') || '(none)'}`);
  lines.push('');
  if (verification.errors.length) {
    lines.push('--- Errors (actionable locations) ---');
    verification.errors.forEach((e, i) => lines.push(`  [${i + 1}] ${e}`));
    lines.push('');
  }
  if (verification.warnings.length) {
    lines.push('--- Warnings ---');
    verification.warnings.forEach((w, i) => lines.push(`  [${i + 1}] ${w}`));
    lines.push('');
  }
  lines.push('--- Notes ---');
  for (const n of verification.notes || []) lines.push(`  • ${n}`);
  lines.push('');
  lines.push('License fitness for training is not automatically asserted.');
  lines.push('Do not treat this report as proof of full training readiness.');
  lines.push('='.repeat(72));

  return { text: lines.join('\n'), verification };
}

if (process.argv[1] && process.argv[1].endsWith('dataset_report.mjs')) {
  const { text, verification } = buildDatasetReport();
  console.log(text);
  const outPath = path.join(rootDir, 'training/dataset/DATASET_REPORT.txt');
  try {
    writeFileSync(outPath, text, 'utf8');
    console.error(`\nWrote ${outPath}`);
  } catch (err) {
    console.error(`Could not write report file: ${err.message}`);
  }
  // Also refresh SHA256 sidecar
  const sumPath = path.join(rootDir, 'training/dataset/SHA256SUMS');
  try {
    const body = [
      `${verification.stats.manifestDigestSha256}  manifest.json`,
      `${verification.stats.samplesDigestSha256}  samples.json`,
      '',
    ].join('\n');
    writeFileSync(sumPath, body, 'utf8');
    console.error(`Wrote ${sumPath}`);
  } catch {}
  process.exit(verification.valid ? 0 : 1);
}
