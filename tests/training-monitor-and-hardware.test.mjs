import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(root, '..');

test('Buffalo 0.11: TrainingMonitor component exists and exports properly', () => {
  const compPath = path.join(appRoot, 'src/components/TrainingMonitor.tsx');
  assert.ok(existsSync(compPath), 'src/components/TrainingMonitor.tsx must exist');

  const content = readFileSync(compPath, 'utf8');
  assert.ok(content.includes('export function TrainingMonitor'), 'TrainingMonitor must be exported as a function');
  assert.ok(content.includes('tokensPerSec'), 'Must track training throughput in tokens per second');
  assert.ok(content.includes('lossHistory'), 'Must track loss curves across steps');
  assert.ok(content.includes('<svg'), 'Must render SVG loss curves visualization');
  assert.ok(content.includes('/api/training/metrics'), 'Must query /api/training/metrics endpoint');
  assert.ok(content.includes('/api/training/start'), 'Must wire start training action');
  assert.ok(content.includes('/api/training/stop'), 'Must wire stop training action');
  assert.ok(content.includes('handleDownloadLogs'), 'Must implement handleDownloadLogs export method');
  assert.ok(content.includes('Download Logs'), 'Must render Download Logs button');
  assert.ok(content.includes('d3') || content.includes('D3LossChart'), 'Must utilize D3 for dynamic loss curve rendering');
  assert.ok(content.includes('D3LossChart'), 'Must export and integrate D3LossChart component');
  assert.ok(content.includes('trainingPercentage'), 'Must calculate training percentage from metadata state');
  assert.ok(content.includes('role="progressbar"'), 'Must render progress bar element');
  // Buffalo 0.11: Raw event log viewer
  assert.ok(content.includes('eventLogs') || content.includes('TrainingEventLog'), 'Must support eventLogs from training job state');
  assert.ok(content.includes('Raw Event Logs') || content.includes("activeTab === 'logs'"), 'Must provide Raw Event Logs tab/viewer');
  assert.ok(content.includes('selectedLog') || content.includes('Epoch / Step Inspection'), 'Must allow deep inspection of individual epoch metrics');
});

test('Buffalo 0.11: HardwareReadinessDashboard component exists and exports properly', () => {
  const compPath = path.join(appRoot, 'src/components/HardwareReadinessDashboard.tsx');
  assert.ok(existsSync(compPath), 'src/components/HardwareReadinessDashboard.tsx must exist');

  const content = readFileSync(compPath, 'utf8');
  assert.ok(content.includes('export function HardwareReadinessDashboard'), 'HardwareReadinessDashboard must be exported as a function');
  assert.ok(content.includes('totalVramGb'), 'Must display VRAM statistics');
  assert.ok(content.includes('readiness'), 'Must assess fine-tuning readiness tiers');
  assert.ok(content.includes('4-bit QLoRA'), 'Must check 4-bit QLoRA tier');
  assert.ok(content.includes('16-bit LoRA'), 'Must check 16-bit LoRA tier');
  assert.ok(content.includes('/api/training/hardware'), 'Must query /api/training/hardware endpoint');
  // Buffalo 0.11: Visual gauges for VRAM usage and RAM headroom
  assert.ok(content.includes('VRAM Usage') || content.includes('vramUsagePct'), 'Must visually represent VRAM usage');
  assert.ok(content.includes('VRAM Headroom') || content.includes('Headroom'), 'Must show VRAM headroom gauge/progress');
  assert.ok(content.includes('RAM Headroom') || content.includes('freeGb'), 'Must show RAM headroom visual feedback');
  assert.ok(content.includes('role="progressbar"'), 'Must use accessible progressbar elements for gauges');
});

test('Buffalo 0.10: App.tsx embeds TrainingMonitor and HardwareReadinessDashboard in ModelsPage', () => {
  const appPath = path.join(appRoot, 'src/App.tsx');
  assert.ok(existsSync(appPath), 'src/App.tsx must exist');

  const content = readFileSync(appPath, 'utf8');
  assert.ok(content.includes("import { TrainingMonitor } from './components/TrainingMonitor';"), 'App.tsx must import TrainingMonitor');
  assert.ok(content.includes("import { HardwareReadinessDashboard } from './components/HardwareReadinessDashboard';"), 'App.tsx must import HardwareReadinessDashboard');
  assert.ok(content.includes('<TrainingMonitor'), 'ModelsPage must render TrainingMonitor');
  assert.ok(content.includes('<HardwareReadinessDashboard'), 'ModelsPage must render HardwareReadinessDashboard');
});

test('Buffalo 0.10: server.ts exposes real-time hardware telemetry and LoRA training job routes', () => {
  const serverPath = path.join(appRoot, 'server.ts');
  assert.ok(existsSync(serverPath), 'server.ts must exist');

  const content = readFileSync(serverPath, 'utf8');
  assert.ok(content.includes('/api/training/hardware'), 'server.ts must provide /api/training/hardware route');
  assert.ok(content.includes('/api/training/metrics'), 'server.ts must provide /api/training/metrics route');
  assert.ok(content.includes('/api/training/start'), 'server.ts must provide /api/training/start route');
  assert.ok(content.includes('/api/training/stop'), 'server.ts must provide /api/training/stop route');
  assert.ok(content.includes('getSystemHardware'), 'server.ts must implement getSystemHardware probe');
  assert.ok(content.includes('nvidia-smi'), 'server.ts must probe nvidia-smi with safe fallback');
});
