/**
 * ZYNTHEOR CORE — Release Readiness Report (Buffalo 0.16)
 * Separates: code tests, dataset validation, training pipeline, actual training,
 * checkpoint verification, model evaluation, runtime inference, release readiness.
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAllQualityGates } from './quality_gates.mjs';
import { verifyDataset } from './verify_dataset.mjs';
import { probeNativeModelRuntime } from '../../lib/native-model-runtime.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

function line(status, name, detail) {
  return { status, name, detail };
}

export function buildReleaseReadinessReport(options = {}) {
  const gates = runAllQualityGates(options);
  const dataset = verifyDataset(options);
  const native = probeNativeModelRuntime(options.native || {});

  let pkgVersion = 'unknown';
  try {
    pkgVersion = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8')).version;
  } catch {}

  const sections = [
    line(
      'UNVERIFIED',
      'Code tests',
      'Run `npm test` in the target environment and record pass/fail counts here. This report does not re-execute the full suite.'
    ),
    line(
      dataset.valid ? 'PASS' : 'FAIL',
      'Dataset validation',
      `valid=${dataset.valid}; samples=${dataset.stats.totalSamples}; leakage=${dataset.leakageCheck?.passed}`
    ),
    line(
      gates.pre.preTrainReady ? 'PASS' : 'FAIL',
      'Training pipeline validation (pre-train gates)',
      `preTrainReady=${gates.pre.preTrainReady}; gateFails=${gates.pre.gates.filter(g => g.status === 'FAIL').length}`
    ),
    line(
      'SKIPPED',
      'Actual training',
      'No GPU full training executed on this node. CPU smoke simulation is not actual weight training.'
    ),
    line(
      native.checkpointExists && native.checksumMatched === true ? 'PASS'
        : native.checkpointExists ? 'UNVERIFIED'
        : 'FAIL',
      'Checkpoint verification',
      `exists=${native.checkpointExists}; checksumMatched=${native.checksumMatched}; trainedWeightsExist=${native.trainedWeightsExist}`
    ),
    line(
      native.inferenceTested ? 'PASS' : 'SKIPPED',
      'Model evaluation (native)',
      native.inferenceTested
        ? 'Native inference tested'
        : 'SKIPPED — fixture harness only; not native model capability evidence'
    ),
    line(
      native.status === 'INFERENCE_READY' && native.inferenceTested ? 'PASS' : 'SKIPPED',
      'Runtime inference (native CORE)',
      `status=${native.status}; inferenceTested=${native.inferenceTested}`
    ),
    line(
      gates.post.promoteAllowed ? 'PASS' : 'FAIL',
      'Release readiness (promote native CORE)',
      gates.post.promoteAllowed
        ? 'Promotion criteria met'
        : 'Not ready to promote native CORE — missing trained verified checkpoint and/or inference test'
    ),
  ];

  const text = [
    '='.repeat(72),
    'ZYNTHEOR CORE — Release Readiness Report',
    `Package version: ${pkgVersion}`,
    `Edition: Buffalo 0.16.0`,
    `Generated: ${new Date().toISOString()}`,
    '='.repeat(72),
    '',
    ...sections.map(s => `[${s.status.padEnd(10)}] ${s.name}\n  ${s.detail}`),
    '',
    '--- Summary ---',
    `preTrainReady (automated dataset/config gates): ${gates.pre.preTrainReady}`,
    `promoteAllowed (native CORE): ${gates.post.promoteAllowed}`,
    `nativeStatus: ${native.status}`,
    `trainedWeightsExist: ${native.trainedWeightsExist}`,
    '',
    'Statuses used: PASS | FAIL | SKIPPED | UNVERIFIED',
    'SKIPPED and UNVERIFIED are intentional honest states.',
    'Do not treat fixture scores or CPU smoke logs as trained-model evidence.',
    '='.repeat(72),
  ].join('\n');

  return {
    text,
    sections,
    gates,
    native: {
      status: native.status,
      trainedWeightsExist: native.trainedWeightsExist,
      inferenceTested: native.inferenceTested,
    },
    packageVersion: pkgVersion,
    timestamp: new Date().toISOString(),
  };
}

if (process.argv[1] && process.argv[1].endsWith('release_readiness.mjs')) {
  const report = buildReleaseReadinessReport();
  console.log(report.text);
  const out = path.join(rootDir, 'training/registry/RELEASE_READINESS.txt');
  try {
    writeFileSync(out, report.text, 'utf8');
    console.error(`\nWrote ${out}`);
  } catch (err) {
    console.error(err.message);
  }
  // Exit 0: report generated. Promotion readiness is in the document body.
  process.exit(0);
}
