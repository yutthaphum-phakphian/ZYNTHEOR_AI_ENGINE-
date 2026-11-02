import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const checks = [];
const major = Number(process.versions.node.split('.')[0]);
checks.push({ name: 'Node.js >= 20', ok: major >= 20, detail: process.version });
for (const name of ['express', 'tsx', 'react', 'react-dom', 'vite', 'typescript']) {
  let detail = 'not installed';
  let ok = false;
  try {
    const path = require.resolve(`${name}/package.json`);
    detail = JSON.parse(readFileSync(path, 'utf8')).version;
    ok = true;
  } catch {
    try { require.resolve(name); detail = 'module found; package metadata not exposed'; ok = true; } catch {}
  }
  checks.push({ name, ok, detail });
}
checks.push({ name: '.env file', ok: true, detail: existsSync(resolve('.env')) ? 'present' : 'optional; defaults apply' });
console.log('ZYNTHEOR Clean Rebuild preflight');
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'BLOCK'}  ${item.name}: ${item.detail}`);
const missing = checks.filter(item => !item.ok);
if (missing.length) {
  console.error(`\nPreflight blocked: ${missing.length} required check(s) missing. Run npm install, then npm run check:env again.`);
  process.exitCode = 1;
} else {
  console.log('\nPreflight passed. This does not prove that the model endpoint is reachable or inference works.');
}
