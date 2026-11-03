import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('GpuTelemetryWidget component exists and exports GpuTelemetryWidget', () => {
  const widgetPath = path.join(root, 'src/components/GpuTelemetryWidget.tsx');
  assert.equal(existsSync(widgetPath), true, 'src/components/GpuTelemetryWidget.tsx must exist');
  
  const content = readFileSync(widgetPath, 'utf8');
  assert.match(content, /export function GpuTelemetryWidget/);
  assert.match(content, /GpuTelemetryData/);
  assert.match(content, /vramUsagePct/);
  assert.match(content, /gpuUtilizationPct/);
  assert.match(content, /temperatureC/);
  assert.match(content, /renderSparklinePath/);
});

test('App.tsx imports and renders GpuTelemetryWidget on Diagnostics page', () => {
  const appPath = path.join(root, 'src/App.tsx');
  const content = readFileSync(appPath, 'utf8');
  assert.match(content, /import \{ GpuTelemetryWidget \} from '\.\/components\/GpuTelemetryWidget'/);
  assert.match(content, /<GpuTelemetryWidget/);
});

test('server.ts provides /api/diagnostics/gpu-telemetry endpoint', () => {
  const serverPath = path.join(root, 'server.ts');
  const content = readFileSync(serverPath, 'utf8');
  assert.match(content, /\/api\/diagnostics\/gpu-telemetry/);
  assert.match(content, /getSystemHardware\(\)/);
});
