#!/usr/bin/env node
/**
 * Read-only checkpoint provenance verifier.
 *
 * This script never writes registry files, creates digests, promotes models,
 * or changes runtime readiness. It only scans approved checkpoint roots and
 * compares actual SHA-256 values with recorded registry declarations.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(process.argv[2] || process.cwd());
const CHECKPOINT_ROOTS = [
  'training/checkpoints',
  'models',
  'weights',
];
const CHECKPOINT_EXTENSIONS = new Set(['.gguf', '.safetensors', '.bin', '.pt', '.pth', '.ckpt']);

function readJson(relativePath) {
  const file = path.join(ROOT, relativePath);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return { __parseError: `${relativePath}: ${error.message}` };
  }
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function collectFiles(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];
  const found = [];
  const walk = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (CHECKPOINT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) found.push(absolute);
    }
  };
  walk(absoluteDir);
  return found;
}

function nativeIdentityRecords(identityRegistry) {
  if (!identityRegistry || identityRegistry.__parseError) return [];
  if (Array.isArray(identityRegistry.models)) return identityRegistry.models;
  return identityRegistry.model_id ? [identityRegistry] : [];
}

function modelRegistryRecords(registry) {
  return registry && Array.isArray(registry.models) ? registry.models : [];
}

function registryCrossCheck(registryRecords, identityRecords) {
  const registryIds = registryRecords.map(record => record.model_id).filter(Boolean);
  const nativeIds = identityRecords
    .filter(record => record.identity === 'CORE_NATIVE')
    .map(record => record.model_id)
    .filter(Boolean);
  if (!registryIds.length || !nativeIds.length) return 'UNAVAILABLE';
  return registryIds.includes(nativeIds[0]) ? 'MATCH' : 'MISMATCH';
}

async function main() {
  const registry = readJson('training/registry/model_registry.json');
  const identityRegistry = readJson('training/registry/native_model_identity.json');
  const registryRecords = modelRegistryRecords(registry);
  const identityRecords = nativeIdentityRecords(identityRegistry);
  const candidates = CHECKPOINT_ROOTS.flatMap(collectFiles);
  const declarations = [
    ...registryRecords.map(record => ({
      source: 'model_registry',
      modelId: record.model_id || null,
      checkpointPath: record.checkpoints?.active_checkpoint || null,
      declaredSha256: record.checkpoints?.checkpoint_digest_sha256 || null,
    })),
    ...identityRecords.map(record => ({
      source: 'native_model_identity',
      modelId: record.model_id || null,
      checkpointPath: record.checkpoint || null,
      declaredSha256: record.checkpoint_sha256 || null,
    })),
  ];

  const files = [];
  for (const filePath of candidates) {
    const actualSha256 = await sha256File(filePath);
    const relativePath = path.relative(ROOT, filePath);
    const matchingDeclarations = declarations.filter(item => item.checkpointPath === relativePath || item.declaredSha256 === actualSha256);
    files.push({
      path: relativePath,
      actualSha256,
      status: matchingDeclarations.some(item => item.declaredSha256 === actualSha256) ? 'MATCH' : 'UNVERIFIED',
      matchingDeclarations,
    });
  }

  const result = {
    readOnly: true,
    root: ROOT,
    registryCrossCheck: registryCrossCheck(registryRecords, identityRecords),
    registryRecords: registryRecords.map(record => ({
      modelId: record.model_id || null,
      declaredCheckpoint: record.checkpoints?.active_checkpoint || null,
      declaredSha256: record.checkpoints?.checkpoint_digest_sha256 || null,
    })),
    nativeIdentityRecords: identityRecords.map(record => ({
      modelId: record.model_id || null,
      identity: record.identity || null,
      status: record.status || null,
      declaredCheckpoint: record.checkpoint || null,
      declaredSha256: record.checkpoint_sha256 || null,
    })),
    checkpointRoots: CHECKPOINT_ROOTS,
    checkpointFiles: files,
    overallStatus: registryCrossCheck(registryRecords, identityRecords) === 'MATCH' && files.some(file => file.status === 'MATCH')
      ? 'VERIFIED_CANDIDATE'
      : files.length
        ? 'UNVERIFIED'
        : 'NOT_FOUND',
    notes: [
      'Read-only report: no registry or runtime files were modified.',
      'A MATCH only means the file bytes match a recorded digest; runtime load and inference remain separate gates.',
    ],
  };

  if (registry?.__parseError) result.notes.push(registry.__parseError);
  if (identityRegistry?.__parseError) result.notes.push(identityRegistry.__parseError);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch(error => {
  console.error(`verify-checkpoint-digest failed: ${error.message}`);
  process.exitCode = 1;
});
