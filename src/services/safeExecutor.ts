import type { ProcessExecutionRecord } from '../../lib/runtime-evidence-registry.ts';

export const ALLOWED_CMDS = [
  'npm run verify',
  'npm run build',
  'npm run test',
  'npm run test:vitest',
  'npm run typecheck',
  'npm run check:env',
  'npm test',
  'node --test',
  'npx tsx',
  'vitest run',
];

export function isAllowedCommand(cmd: string): boolean {
  if (!cmd || typeof cmd !== 'string') return false;
  const trimmed = cmd.trim();
  // Prevent command injection chained commands e.g. ; rm -rf / or && or |
  if (trimmed.includes(';') || trimmed.includes('&&') || trimmed.includes('|') || trimmed.includes('`')) {
    return false;
  }
  return ALLOWED_CMDS.some(prefix => trimmed.startsWith(prefix));
}

export interface SafeExecResult {
  cmd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  evidenceRecord: ProcessExecutionRecord;
  bounded?: boolean;
}

export async function safeExec(_cmd: string, _timeoutMs = 30_000): Promise<SafeExecResult> {
  throw new Error('SECURITY_DENIED: Command execution is disabled until a trusted execution and approval boundary is implemented.');
}

export function sanitizeExecutionArgs(args: string[]): string[] {
  const dangerousPattern = /[;&|`$<>(){}[\]\\]/;
  for (const arg of args) {
    if (dangerousPattern.test(arg)) {
      throw new Error(`SECURITY_DENIED: Unsafe execution argument detected: ${arg}`);
    }
  }
  return args;
}
