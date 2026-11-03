#!/usr/bin/env node
/** Verify the SHA-256 entries in FILE_MANIFEST.sha256. No dependencies. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(process.cwd());
const manifestArg = process.argv[2] || 'FILE_MANIFEST.sha256';
const manifestPath = path.resolve(root, manifestArg);
if (!manifestPath.startsWith(`${root}${path.sep}`)) {
  console.error('Manifest path must remain inside the project root.');
  process.exit(2);
}
if (!fs.existsSync(manifestPath)) {
  console.error(`Manifest not found: ${manifestArg}`);
  process.exit(2);
}

const lines = fs.readFileSync(manifestPath, 'utf8').split(/\r?\n/).filter(Boolean);
if (!lines.length) {
  console.error('Manifest is empty; no integrity claim can be verified.');
  process.exit(1);
}

const seen = new Set();
const failures = [];
for (const line of lines) {
  const match = line.match(/^([a-f0-9]{64})  (.+)$/i);
  if (!match) { failures.push(`Malformed manifest row: ${line}`); continue; }
  const [, expected, relative] = match;
  const normalized = relative.replace(/\\/g, '/');
  if (path.posix.isAbsolute(normalized) || normalized.split('/').some(part => part === '..' || part === '')) {
    failures.push(`Unsafe manifest path: ${relative}`); continue;
  }
  if (seen.has(normalized)) { failures.push(`Duplicate manifest path: ${relative}`); continue; }
  seen.add(normalized);
  const absolute = path.resolve(root, normalized);
  if (!absolute.startsWith(`${root}${path.sep}`) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    failures.push(`Missing file: ${relative}`); continue;
  }
  const actual = crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
  if (actual !== expected.toLowerCase()) failures.push(`SHA-256 mismatch: ${relative}`);
}

if (failures.length) {
  console.error(`Manifest verification FAILED (${failures.length} issue(s))`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Manifest verification PASS: ${seen.size} files checked.`);
