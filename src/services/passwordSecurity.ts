import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const CURRENT_PASSWORD_ITERATIONS = 310_000;

export function hashPassword(password: string, saltHex?: string, iterations = CURRENT_PASSWORD_ITERATIONS): { hash: string; salt: string } {
  const salt = saltHex || randomBytes(16).toString('hex');
  const digest = pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return { hash: `pbkdf2-sha512$${iterations}$${digest}`, salt };
}

export function verifyPassword(password: string, expectedHash: string, salt: string): boolean {
  const parts = expectedHash.startsWith('pbkdf2-sha512$') ? expectedHash.split('$') : [];
  const iterations = parts.length === 3 ? Number(parts[1]) : 10_000;
  const digest = parts.length === 3 ? parts[2] : expectedHash;
  if (!Number.isSafeInteger(iterations) || iterations < 10_000 || iterations > 2_000_000 || !/^[a-f0-9]{128}$/i.test(digest)) return false;
  const actual = pbkdf2Sync(password, salt, iterations, 64, 'sha512');
  const expected = Buffer.from(digest, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function needsPasswordUpgrade(storedHash: string): boolean {
  const match = /^pbkdf2-sha512\$(\d+)\$/.exec(storedHash);
  return !match || Number(match[1]) < CURRENT_PASSWORD_ITERATIONS;
}
