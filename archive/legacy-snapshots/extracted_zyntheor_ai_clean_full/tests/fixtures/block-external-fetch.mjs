import { appendFileSync } from 'node:fs';

const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const rawUrl = input instanceof Request ? input.url : String(input);
  const { hostname } = new URL(rawUrl);
  if (['localhost', '127.0.0.1', '::1'].includes(hostname.toLowerCase())) {
    return originalFetch(input, init);
  }

  const logPath = process.env.ZYNTHEOR_TEST_EXTERNAL_FETCH_LOG;
  if (logPath) appendFileSync(logPath, `${hostname}\n`, { mode: 0o600 });
  throw new Error('External fetch blocked by integration-test network guard.');
};
