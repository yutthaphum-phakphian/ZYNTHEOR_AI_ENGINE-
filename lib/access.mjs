import { createHash, timingSafeEqual } from 'node:crypto';

/** Constant-time comparison of the configured access token with the one supplied by a client. */
export function tokenMatches(expected, provided) {
  if (!expected || typeof provided !== 'string' || !provided) return false;
  const a = createHash('sha256').update(expected).digest();
  const b = createHash('sha256').update(provided).digest();
  return timingSafeEqual(a, b);
}

/** Reads `Authorization: Bearer <token>` or `X-Zyntheor-Token` from Node request headers. */
export function extractToken(headers) {
  const auth = headers['authorization'];
  const authValue = Array.isArray(auth) ? auth[0] : auth;
  const bearer = typeof authValue === 'string' ? authValue.match(/^Bearer\s+(.+)$/i) : null;
  if (bearer) return bearer[1].trim();
  const custom = headers['x-zyntheor-token'];
  const customValue = Array.isArray(custom) ? custom[0] : custom;
  return typeof customValue === 'string' ? customValue.trim() : '';
}
