// @ts-nocheck
// src/services/diagnosticReporter.ts
// ZYNTHEOR AI ENGINE 0.3.1 — Frontend Diagnostic Metadata Collector
// Captures viewport, storage usage, last 5 API response codes for Diagnostics 'System Errors' tab
// Security: No secrets logged, no token exposure, local-only metadata

export type ApiResponseRecord = {
  endpoint: string;
  status: number;
  timestamp: string;
  durationMs?: number;
};

export type DiagnosticSummary = {
  viewport: { width: number; height: number; dpr: number; orientation: 'portrait' | 'landscape' };
  storage: { localStorageBytes: number; localStorageKeys: number; sessionStorageBytes: number; quotaEstimate?: number };
  apiResponses: ApiResponseRecord[];
  environment: { userAgent: string; language: string; online: boolean; timestamp: string };
  systemErrors: { hasInvalidEndpoint: boolean; hasStreamingFailure: boolean; recentErrors: ApiResponseRecord[] };
};

const MAX_API_HISTORY = 5;
let apiHistory: ApiResponseRecord[] = [];

function safeByteLength(str: string): number {
  return new Blob([str]).size;
}

export function recordApiResponse(endpoint: string, status: number, durationMs?: number): void {
  const record: ApiResponseRecord = {
    endpoint: endpoint.replace(/https?:\/\/[^/]+/g, ''), // strip origin for privacy
    status,
    timestamp: new Date().toISOString(),
    durationMs,
  };
  apiHistory = [record, ...apiHistory].slice(0, MAX_API_HISTORY);
}

export function getApiHistory(): ApiResponseRecord[] {
  return [...apiHistory];
}

function getStorageUsage(): { localStorageBytes: number; localStorageKeys: number; sessionStorageBytes: number } {
  try {
    let lsBytes = 0;
    let lsKeys = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      lsKeys++;
      lsBytes += safeByteLength(k) + safeByteLength(localStorage.getItem(k) || '');
    }
    let ssBytes = 0;
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (!k) continue;
      ssBytes += safeByteLength(k) + safeByteLength(sessionStorage.getItem(k) || '');
    }
    return { localStorageBytes: lsBytes, localStorageKeys: lsKeys, sessionStorageBytes: ssBytes };
  } catch {
    return { localStorageBytes: 0, localStorageKeys: 0, sessionStorageBytes: 0 };
  }
}

export async function getQuotaEstimate(): Promise<number | undefined> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const est = await navigator.storage.estimate();
      return est.usage;
    }
  } catch {}
  return undefined;
}

export async function generateDiagnosticSummary(): Promise<DiagnosticSummary> {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
    orientation: (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait') as 'portrait' | 'landscape',
  };

  const storageBase = getStorageUsage();
  const quota = await getQuotaEstimate();

  const recentErrors = apiHistory.filter(r => r.status >= 400);
  const hasInvalidEndpoint = apiHistory.some(r => r.status === 404 || r.endpoint.includes('INVALID_ENDPOINT'));
  const hasStreamingFailure = apiHistory.some(r => r.status === 0 || (r.status >= 500 && r.endpoint.includes('/stream')));

  return {
    viewport,
    storage: { ...storageBase, quotaEstimate: quota },
    apiResponses: [...apiHistory],
    environment: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      online: navigator.onLine,
      timestamp: new Date().toISOString(),
    },
    systemErrors: { hasInvalidEndpoint, hasStreamingFailure, recentErrors },
  };
}

// Auto-capture fetch errors — call this once at app startup
export function installDiagnosticInterceptor(): void {
  if (typeof window === 'undefined' || (window as any).__zyntheor_diag_installed) return;
  (window as any).__zyntheor_diag_installed = true;

  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const start = performance.now();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    try {
      const res = await originalFetch(input as any, init);
      const duration = Math.round(performance.now() - start);
      recordApiResponse(url, res.status, duration);
      return res;
    } catch (e) {
      const duration = Math.round(performance.now() - start);
      // Network failure → status 0
      recordApiResponse(url, 0, duration);
      throw e;
    }
  };
}
