#!/usr/bin/env node
// Generates public/status-cards.svg from REAL command results. No dependencies.
//   node scripts/gen-status-cards.mjs              run the 4 checks, write the SVG
//   MANIFEST_CMD="<your real manifest check>" node scripts/gen-status-cards.mjs   override the manifest command
//   node scripts/gen-status-cards.mjs --unverified write the SVG with every card UNVERIFIED (nothing is run)
// Any check that cannot run (missing script, timeout, no command) is shown as UNVERIFIED, never as PASS.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT = process.env.STATUS_OUT || 'public/status-cards.svg';
const NO_RUN = process.argv.includes('--unverified');

function run(cmd) {
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', timeout: 600000, env: { ...process.env, CI: 'true' } });
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  const cannotRun = Boolean(r.error) || r.status === null || /Missing script|Cannot find module|Could not read package\.json|ENOENT/i.test(out);
  return { ok: !cannotRun && r.status === 0, ran: !cannotRun, out };
}

const UNV = { state: 'unverified', value: 'UNVERIFIED' };
const checks = [
  { label: 'TESTS', cmd: 'npm run test',
    map: (r) => (r.ok ? { state: 'pass', value: 'PASS' } : { state: 'fail', value: 'FAIL' }) },
  { label: 'TYPE ERRORS', cmd: 'npm run typecheck',
    map: (r) => {
      if (r.ok) return { state: 'pass', value: '0 ERRORS' };
      const n = (r.out.split('\n').filter((l) => !l.startsWith('>')).join('\n').match(/(\(\d+,\d+\)|:\d+:\d+)\s*[:-]\s*error TS\d+/g) || []).length;
      return { state: 'fail', value: n ? `${n} ERRORS` : 'FAIL' };
    } },
  { label: 'BUILD', cmd: 'npm run build',
    map: (r) => (r.ok ? { state: 'pass', value: 'OK' } : { state: 'fail', value: 'FAILED' }) },
  { label: 'MANIFEST', cmd: process.env.MANIFEST_CMD || 'node scripts/check-manifest.js',
    map: (r) => (r.ok ? { state: 'pass', value: 'VERIFIED' } : { state: 'fail', value: 'MISMATCH' }) },
];

const results = checks.map((c) => {
  if (NO_RUN) return { ...c, ...UNV };
  const r = run(c.cmd);
  return { ...c, ...(r.ran ? c.map(r) : UNV) };
});

let commit = '';
if (!NO_RUN) {
  const g = spawnSync('git rev-parse --short HEAD', { shell: true, encoding: 'utf8' });
  if (g.status === 0) commit = ` · commit ${g.stdout.trim()}`;
}
const stamp = NO_RUN
  ? 'Not run yet - every value is UNVERIFIED until scripts/gen-status-cards.mjs is executed'
  : `Last local run ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC${commit} - a snapshot, not a live feed`;

const COLORS = { pass: '#10B981', fail: '#F87171', unverified: '#94A3B8' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const summary = results.map((r) => `${r.label}: ${r.value}`).join('; ');

const cards = results.map((r, i) => {
  const x = i * 215, col = COLORS[r.state];
  return `  <g transform="translate(${x} 0)">
    <rect x="1" y="1" width="193" height="86" rx="14" fill="#0D1828" stroke="${col}" stroke-opacity=".55" stroke-width="1.5"/>
    <circle class="dot" cx="20" cy="22" r="4.5" fill="${col}"/>
    <text x="32" y="26" font-size="12" letter-spacing="2" fill="#94A3B8">${esc(r.label)}</text>
    <text x="97" y="63" text-anchor="middle" font-size="${r.value.length > 9 ? 19 : 24}" font-weight="700" fill="${col}">${esc(r.value)}</text>
  </g>`;
}).join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 120" width="840" height="120" role="img" aria-labelledby="t d" font-family="'Segoe UI',Arial,sans-serif">
  <title id="t">Local check status</title>
  <desc id="d">${esc(summary)}. ${esc(stamp)}</desc>
  <style>
    .dot{animation:p 2.4s ease-in-out infinite}
    @keyframes p{50%{opacity:.35}}
    @media (prefers-reduced-motion:reduce){.dot{animation:none}}
  </style>
${cards}
  <text x="420" y="110" text-anchor="middle" font-size="11" fill="#64748B">${esc(stamp)}</text>
</svg>
`;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, svg);
console.log(`wrote ${OUT}\n${summary}`);
