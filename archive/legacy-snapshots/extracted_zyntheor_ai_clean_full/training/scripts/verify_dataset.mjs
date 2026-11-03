import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

/** Tokenize for near-duplicate Jaccard similarity (Thai + English friendly). */
function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function jaccard(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function normalizeInstruction(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\s\p{P}]+/gu, '');
}

/**
 * Dataset verification for ZYNTHEOR CORE.
 * Checks schema, duplicates, near-duplicates, split leakage, provenance fields.
 * Automated checks do NOT replace human review of semantic quality or license.
 */
export function verifyDataset(options = {}) {
  const manifestPath = options.manifestPath || path.join(rootDir, 'training/dataset/manifest.json');
  const samplesPath = options.samplesPath || path.join(rootDir, 'training/dataset/samples.json');
  const nearDupThreshold = typeof options.nearDupThreshold === 'number' ? options.nearDupThreshold : 0.85;

  const report = {
    valid: true,
    timestamp: new Date().toISOString(),
    errors: [],
    warnings: [],
    stats: {
      totalSamples: 0,
      splits: { train: 0, validation: 0, test: 0 },
      languages: {},
      domains: {},
      categories: {},
      licenses: {},
      sources: {},
      totalCharacters: 0,
      estimatedTokens: 0,
      manifestDigestSha256: null,
      samplesDigestSha256: null,
    },
    leakageCheck: {
      trainVsValOverlaps: 0,
      trainVsTestOverlaps: 0,
      valVsTestOverlaps: 0,
      overlapDetails: [],
      passed: true,
    },
    qualityCheck: {
      duplicates: 0,
      nearDuplicates: 0,
      emptyFields: 0,
      shortInstructions: 0,
      missingExpectedOutput: 0,
      invalidLanguage: 0,
      invalidSplit: 0,
      nearDuplicatePairs: [],
      passed: true,
    },
    provenance: {
      allLicensed: true,
      allHaveSource: true,
      licensesSeen: [],
      sourcesSeen: [],
    },
    humanReviewRequired: true,
    notes: [
      'Automated checks: schema, exact/near-duplicate instructions, split leakage, digests.',
      'Semantic quality, code correctness, and training license fitness still require human review.',
      'valid:true is not a claim that every sample is production-ready for full model training.',
    ],
  };

  if (!existsSync(manifestPath)) {
    report.valid = false;
    report.errors.push(`Manifest file not found: ${manifestPath}`);
    return report;
  }
  if (!existsSync(samplesPath)) {
    report.valid = false;
    report.errors.push(`Samples file not found: ${samplesPath}`);
    return report;
  }

  const manifestRaw = readFileSync(manifestPath, 'utf8');
  const samplesRaw = readFileSync(samplesPath, 'utf8');
  report.stats.manifestDigestSha256 = createHash('sha256').update(manifestRaw).digest('hex');
  report.stats.samplesDigestSha256 = createHash('sha256').update(samplesRaw).digest('hex');

  let manifest;
  let samples;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch (err) {
    report.valid = false;
    report.errors.push(`Invalid JSON in manifest: ${err.message}`);
    return report;
  }
  try {
    samples = JSON.parse(samplesRaw);
  } catch (err) {
    report.valid = false;
    report.errors.push(`Invalid JSON in samples: ${err.message}`);
    return report;
  }
  if (!Array.isArray(samples)) {
    report.valid = false;
    report.errors.push('Samples file root must be an array');
    return report;
  }

  report.stats.totalSamples = samples.length;
  const requiredFields = manifest.schema?.required_fields || [
    'id', 'split', 'domain', 'category', 'language', 'license', 'source', 'instruction', 'expected_output'
  ];
  const allowedSplits = new Set(manifest.schema?.allowed_splits || ['train', 'validation', 'test']);
  const allowedLanguages = new Set(manifest.schema?.allowed_languages || ['th-en', 'th', 'en']);

  const seenIds = new Set();
  const seenInstructions = new Map(); // norm -> { id, idx }
  const instructionTokens = []; // { id, idx, tokens, norm, split }
  const splitBuckets = { train: new Set(), validation: new Set(), test: new Set() };

  for (let idx = 0; idx < samples.length; idx++) {
    const item = samples[idx];
    const prefix = `Sample[${idx}] (id: ${item?.id || 'unknown'})`;

    if (!item || typeof item !== 'object') {
      report.errors.push(`${prefix} is not an object`);
      report.valid = false;
      continue;
    }

    for (const field of requiredFields) {
      if (item[field] === undefined || item[field] === null || String(item[field]).trim() === '') {
        report.errors.push(`${prefix} missing or empty required field: '${field}'`);
        report.qualityCheck.emptyFields++;
        report.valid = false;
      }
    }

    if (item.id) {
      if (seenIds.has(item.id)) {
        report.errors.push(`${prefix} duplicate id detected: ${item.id}`);
        report.valid = false;
      }
      seenIds.add(item.id);
    }

    if (item.split) {
      if (!allowedSplits.has(item.split)) {
        report.errors.push(`${prefix} invalid split '${item.split}'. Allowed: ${[...allowedSplits].join(', ')}`);
        report.qualityCheck.invalidSplit++;
        report.valid = false;
      } else {
        report.stats.splits[item.split] = (report.stats.splits[item.split] || 0) + 1;
      }
    }

    if (item.language) {
      report.stats.languages[item.language] = (report.stats.languages[item.language] || 0) + 1;
      if (!allowedLanguages.has(item.language)) {
        report.errors.push(`${prefix} invalid language '${item.language}'. Allowed: ${[...allowedLanguages].join(', ')}`);
        report.qualityCheck.invalidLanguage++;
        report.valid = false;
      }
    }

    if (item.domain) report.stats.domains[item.domain] = (report.stats.domains[item.domain] || 0) + 1;
    if (item.category) report.stats.categories[item.category] = (report.stats.categories[item.category] || 0) + 1;

    if (item.license) {
      report.stats.licenses[item.license] = (report.stats.licenses[item.license] || 0) + 1;
      if (!report.provenance.licensesSeen.includes(item.license)) {
        report.provenance.licensesSeen.push(item.license);
      }
      if (item.license !== 'Apache-2.0' && item.license !== 'MIT') {
        report.warnings.push(`${prefix} uncommon license: ${item.license}`);
      }
    } else {
      report.provenance.allLicensed = false;
    }

    if (item.source) {
      report.stats.sources[item.source] = (report.stats.sources[item.source] || 0) + 1;
      if (!report.provenance.sourcesSeen.includes(item.source)) {
        report.provenance.sourcesSeen.push(item.source);
      }
    } else {
      report.provenance.allHaveSource = false;
    }

    const contentStr = `${item.instruction || ''} ${item.context || ''} ${item.expected_output || ''}`;
    report.stats.totalCharacters += contentStr.length;
    report.stats.estimatedTokens += Math.ceil(contentStr.length / 4);

    if (item.instruction && String(item.instruction).trim().length < 20) {
      report.qualityCheck.shortInstructions++;
      report.warnings.push(`${prefix} instruction is unusually short (<20 chars)`);
    }
    if (!item.expected_output || String(item.expected_output).trim().length < 10) {
      report.qualityCheck.missingExpectedOutput++;
      report.warnings.push(`${prefix} expected_output is missing or very short`);
    }

    if (item.instruction) {
      const norm = normalizeInstruction(item.instruction);
      const tokens = tokenize(item.instruction);
      if (seenInstructions.has(norm)) {
        const prev = seenInstructions.get(norm);
        report.errors.push(`${prefix} exact/near-exact duplicate instruction of Sample[${prev.idx}] (id: ${prev.id})`);
        report.qualityCheck.duplicates++;
        report.valid = false;
      } else {
        seenInstructions.set(norm, { id: item.id, idx });
      }
      instructionTokens.push({ id: item.id, idx, tokens, norm, split: item.split });
      if (splitBuckets[item.split]) {
        splitBuckets[item.split].add(norm);
      }
    }
  }

  // Near-duplicate via Jaccard on instruction tokens (O(n^2); fine for small curated sets)
  for (let i = 0; i < instructionTokens.length; i++) {
    for (let j = i + 1; j < instructionTokens.length; j++) {
      const a = instructionTokens[i];
      const b = instructionTokens[j];
      if (a.norm === b.norm) continue; // already counted as exact
      const sim = jaccard(a.tokens, b.tokens);
      if (sim >= nearDupThreshold) {
        report.qualityCheck.nearDuplicates++;
        report.qualityCheck.nearDuplicatePairs.push({
          a: a.id,
          b: b.id,
          similarity: Number(sim.toFixed(3)),
        });
        report.warnings.push(
          `Near-duplicate instructions (Jaccard ${sim.toFixed(2)}): Sample[${a.idx}] (${a.id}) ↔ Sample[${b.idx}] (${b.id})`
        );
      }
    }
  }

  // Split leakage on normalized instructions
  for (const norm of splitBuckets.train) {
    if (splitBuckets.validation.has(norm)) {
      report.leakageCheck.trainVsValOverlaps++;
      report.leakageCheck.overlapDetails.push({ type: 'train-validation', hashPrefix: norm.slice(0, 24) });
      report.errors.push(`Train vs Validation leakage for instruction hash: ${norm.slice(0, 24)}...`);
      report.valid = false;
    }
    if (splitBuckets.test.has(norm)) {
      report.leakageCheck.trainVsTestOverlaps++;
      report.leakageCheck.overlapDetails.push({ type: 'train-test', hashPrefix: norm.slice(0, 24) });
      report.errors.push(`Train vs Test leakage for instruction hash: ${norm.slice(0, 24)}...`);
      report.valid = false;
    }
  }
  for (const norm of splitBuckets.validation) {
    if (splitBuckets.test.has(norm)) {
      report.leakageCheck.valVsTestOverlaps++;
      report.leakageCheck.overlapDetails.push({ type: 'validation-test', hashPrefix: norm.slice(0, 24) });
      report.errors.push(`Validation vs Test leakage for instruction hash: ${norm.slice(0, 24)}...`);
      report.valid = false;
    }
  }

  report.leakageCheck.passed = (
    report.leakageCheck.trainVsValOverlaps === 0 &&
    report.leakageCheck.trainVsTestOverlaps === 0 &&
    report.leakageCheck.valVsTestOverlaps === 0
  );
  report.qualityCheck.passed = (
    report.qualityCheck.duplicates === 0 &&
    report.qualityCheck.emptyFields === 0 &&
    report.qualityCheck.invalidLanguage === 0 &&
    report.qualityCheck.invalidSplit === 0
  );
  // Near-duplicates are warnings by default (do not auto-fail) unless severe
  if (report.qualityCheck.nearDuplicates > 0 && report.qualityCheck.nearDuplicates >= Math.max(2, Math.floor(samples.length * 0.3))) {
    report.valid = false;
    report.errors.push(`Excessive near-duplicates detected (${report.qualityCheck.nearDuplicates}). Review before training.`);
  }

  const langKeys = Object.keys(report.stats.languages || {});
  if (langKeys.length === 1) {
    report.warnings.push(`Only one language tag present (${langKeys[0]}). Prefer mix of th, en, and th-en.`);
  }

  const declared = manifest.dataset_files?.[0]?.sample_count;
  if (typeof declared === 'number' && declared !== samples.length) {
    report.warnings.push(`Manifest sample_count (${declared}) differs from actual samples length (${samples.length})`);
  }

  if (!report.provenance.allLicensed) {
    report.warnings.push('One or more samples lack a license field.');
  }
  if (!report.provenance.allHaveSource) {
    report.warnings.push('One or more samples lack a source/provenance field.');
  }

  return report;
}

if (process.argv[1] && process.argv[1].endsWith('verify_dataset.mjs')) {
  const result = verifyDataset();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid ? 0 : 1);
}
