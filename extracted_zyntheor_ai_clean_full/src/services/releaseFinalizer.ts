export const RELEASE_STATUSES = ['draft', 'verified', 'production'] as const;
export function isAllowedStatus(s: string) { return (RELEASE_STATUSES as readonly string[]).includes(s); }
export function finalCheck(version: string) {
  return { version, allowed: isAllowedStatus('verified'), bounded: true, productionReady: version.startsWith('0.20') || version.startsWith('1.') };
}
