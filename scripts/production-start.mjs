import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

// Handle SIGPIPE gracefully to prevent uncaught signal 13
process.on('SIGPIPE', () => {});

// In production, ensure a secure ZYNTHEOR_ACCESS_TOKEN is present to protect API routes
let accessToken = process.env.ZYNTHEOR_ACCESS_TOKEN?.trim();
if (!accessToken) {
  const tokenFile = path.join(process.cwd(), 'workspace_data', 'production-access-token.txt');
  try {
    if (existsSync(tokenFile)) {
      accessToken = readFileSync(tokenFile, 'utf8').trim();
    }
    if (!accessToken) {
      accessToken = `zyntheor_prod_${randomBytes(24).toString('hex')}`;
      mkdirSync(path.join(process.cwd(), 'workspace_data'), { recursive: true, mode: 0o700 });
      writeFileSync(tokenFile, accessToken, { mode: 0o600 });
    }
  } catch {
    accessToken = `zyntheor_prod_${randomBytes(24).toString('hex')}`;
  }
}

// In hosted preview/containers (like Cloud Run), bind to 0.0.0.0 so ingress/health checks can reach the service
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || '3000';

const child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    HOST: host,
    PORT: port,
    ZYNTHEOR_ACCESS_TOKEN: accessToken,
  },
  stdio: 'inherit',
});

child.on('error', error => {
  console.error('Unable to start ZYNTHEOR server:', error.message);
  process.exitCode = 1;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (child.pid) child.kill(signal);
  });
}

child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
