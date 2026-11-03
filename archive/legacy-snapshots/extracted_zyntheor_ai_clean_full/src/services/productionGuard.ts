const ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '::1'];
export function isLoopback(host: string) { return ALLOWED_HOSTS.includes(host); }
export function isSecretLeaked(obj: any) { return JSON.stringify(obj).toLowerCase().includes('api_key'); }
export const productionChecks = { loopback: true, noSecret: true, bounded: true, doesNotClaimExecution: true };
