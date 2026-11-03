import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'training', 'native_cpu', 'native_runtime.py');
const PYTHON = process.env.ZYNTHEOR_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const MAX_OUTPUT = 128 * 1024;

function runtimeEnv() {
  const allow = ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'SYSTEMROOT', 'WINDIR', 'LANG', 'LC_ALL'];
  const env = { PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' };
  for (const key of allow) if (process.env[key]) env[key] = process.env[key];
  return env;
}

function run(args, input = '', timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [SCRIPT, ...args], {
      cwd: ROOT, shell: false, windowsHide: true,
      env: runtimeEnv(), stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '', settled = false;
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(new Error('NATIVE_RUNTIME_TIMEOUT'));
    }, timeoutMs);
    const finish = (error, result) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (error) reject(error); else resolve(result);
    };
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; if (stdout.length > MAX_OUTPUT) child.kill('SIGKILL'); });
    child.stderr.on('data', chunk => { stderr += chunk; if (stderr.length > MAX_OUTPUT) child.kill('SIGKILL'); });
    child.on('error', error => finish(error));
    child.on('close', code => {
      if (code !== 0) {
        // Keep runtime failures deterministic and fail-closed. Do not expose
        // Python tracebacks or local paths through the model gateway.
        const details = stderr.trim();
        if (details.includes('ModuleNotFoundError') && details.includes("No module named 'torch'")) {
          if (args[0] === 'probe') {
            return finish(null, {
              phase: 'P17',
              status: 'RUNTIME_UNAVAILABLE',
              ready: false,
              inference_ready: false,
              production_approved: false,
            });
          }
          return finish(new Error(`NATIVE_RUNTIME_EXIT_${code}`));
        }
        return finish(new Error(`NATIVE_RUNTIME_EXIT_${code}`));
      }
      try { finish(null, JSON.parse(stdout.trim())); }
      catch { finish(new Error('NATIVE_RUNTIME_INVALID_JSON')); }
    });
    child.stdin.end(input);
  });
}

export async function probeNativeRuntime() {
  return run(['probe'], '', 30000);
}

export async function generateNativeText(prompt, { maxNewTokens = 64, timeoutMs = 45000 } = {}) {
  if (typeof prompt !== 'string' || !prompt.trim()) throw new TypeError('prompt must be a non-empty string');
  if (!Number.isInteger(maxNewTokens) || maxNewTokens < 1 || maxNewTokens > 128) throw new RangeError('maxNewTokens must be between 1 and 128');
  return run(['generate', '--stdin', '--max-new-tokens', String(maxNewTokens)], prompt, timeoutMs);
}
