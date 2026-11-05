import crypto from 'node:crypto';

export function tokenMatches(expected, actual) {
  if (!expected || !actual) return false;
  const expStr = String(expected).trim();
  const actStr = String(actual).trim();
  if (expStr.length === 0 || actStr.length === 0) return false;
  if (expStr.length !== actStr.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expStr), Buffer.from(actStr));
  } catch {
    return false;
  }
}

export function extractToken(headers = {}) {
  if (!headers || typeof headers !== 'object') return '';
  const auth = headers.authorization || headers.Authorization;
  if (typeof auth === 'string') {
    const trimmed = auth.trim();
    if (trimmed.startsWith('Bearer ')) {
      return trimmed.slice(7).trim();
    }
  }
  const custom = headers['x-zyntheor-token'] || headers['X-Zyntheor-Token'];
  if (typeof custom === 'string') {
    return custom.trim();
  }
  return '';
}

export default {
  tokenMatches,
  extractToken,
};
