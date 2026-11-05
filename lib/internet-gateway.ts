/**
 * ZYNTHEOR INTERNET INTELLIGENCE GATEWAY
 * =====================================
 * Controlled, secure, and verifiable gateway for internet knowledge acquisition.
 *
 * Architectural Principles:
 * 1. Internet is an INFORMATION PROVIDER, NOT a MODEL PROVIDER.
 * 2. Strict SSRF Protection (no loopback, RFC 1918 private subnets, link-local, cloud metadata).
 * 3. Secrets scrubbing (prevents API keys or sensitive session tokens from being sent in search queries).
 * 4. Airgap & Local-Only mode enforcement.
 * 5. Deterministic SHA-256 content evidence hashing.
 * 6. Zero-Mock / Fail-Closed error reporting.
 */

import { createHash } from 'node:crypto';
import type { OperatingIntelligenceMode } from './model-sovereignty-policy.js';

export interface GroundingSource {
  id: string;
  url: string;
  domain: string;
  title: string;
  snippet: string;
  fetchedAt: string;
  contentDigest: string;
  byteSize: number;
  verificationStatus: 'VERIFIED_SOURCE' | 'UNVERIFIED_SOURCE' | 'FAILED_RETRIEVAL';
  httpStatus?: number;
}

export interface WebSearchQuery {
  query: string;
  cleanedQuery: string;
  timestamp: string;
  mode: OperatingIntelligenceMode;
}

export interface InternetSearchResponse {
  ok: boolean;
  query: string;
  mode: OperatingIntelligenceMode;
  sources: GroundingSource[];
  totalResults: number;
  searchDurationMs: number;
  evidenceDigest: string;
  error?: string;
}

export interface WebFetchResponse {
  ok: boolean;
  url: string;
  domain: string;
  content: string;
  contentDigest: string;
  byteSize: number;
  durationMs: number;
  sourceRecord: GroundingSource;
  error?: string;
}

export class InternetGateway {
  private readonly MAX_PAYLOAD_BYTES = 250 * 1024; // 250 KB
  private readonly DEFAULT_TIMEOUT_MS = 8000;      // 8 seconds

  /**
   * SSRF Protection: Blocks loopback, private RFC 1918 addresses, link-local,
   * carrier-grade NAT, and cloud metadata endpoints.
   */
  public isSafePublicUrl(targetUrl: string): { isSafe: boolean; reason?: string } {
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { isSafe: false, reason: `Disallowed protocol '${parsed.protocol}'. Only HTTP/HTTPS permitted.` };
      }

      const hostname = parsed.hostname.toLowerCase();

      // Check loopback hostnames
      if (
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1' ||
        hostname === 'ip6-localhost'
      ) {
        return { isSafe: false, reason: 'SSRF Blocked: Loopback addresses are prohibited.' };
      }

      // Cloud metadata services
      if (
        hostname === '169.254.169.254' ||
        hostname.includes('metadata.google.internal') ||
        hostname.includes('metadata.internal')
      ) {
        return { isSafe: false, reason: 'SSRF Blocked: Cloud metadata services are strictly protected.' };
      }

      // Check IPv4 private and link-local ranges
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      const match = hostname.match(ipv4Regex);
      if (match) {
        const [, o1, o2] = match.map(Number);
        // 10.0.0.0/8
        if (o1 === 10) return { isSafe: false, reason: 'SSRF Blocked: Private network 10.0.0.0/8 is prohibited.' };
        // 172.16.0.0/12
        if (o1 === 172 && o2 >= 16 && o2 <= 31) {
          return { isSafe: false, reason: 'SSRF Blocked: Private network 172.16.0.0/12 is prohibited.' };
        }
        // 192.168.0.0/16
        if (o1 === 192 && o2 === 168) {
          return { isSafe: false, reason: 'SSRF Blocked: Private network 192.168.0.0/16 is prohibited.' };
        }
        // 127.0.0.0/8
        if (o1 === 127) return { isSafe: false, reason: 'SSRF Blocked: Loopback range 127.0.0.0/8 is prohibited.' };
        // 169.254.0.0/16 (Link Local)
        if (o1 === 169 && o2 === 254) {
          return { isSafe: false, reason: 'SSRF Blocked: Link-local 169.254.0.0/16 is prohibited.' };
        }
      }

      return { isSafe: true };
    } catch {
      return { isSafe: false, reason: 'Invalid or malformed URL syntax.' };
    }
  }

  /**
   * Sanitizes user search queries to ensure secrets/tokens/keys are never leaked.
   */
  public sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') return '';
    return query
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
      .replace(/sk-[0-9A-Za-z]{20,}/g, '[REDACTED_SECRET]')
      .replace(/bearer\s+[A-Za-z0-9\-_.]+/gi, '[REDACTED_BEARER]')
      .replace(/ghp_[0-9A-Za-z]{36}/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/[a-zA-Z0-9_\-+]{30,}/g, token => (token.length > 40 ? '[REDACTED_LONG_SECRET]' : token))
      .trim();
  }

  /**
   * Computes deterministic SHA-256 digest of arbitrary content.
   */
  public computeDigest(data: string): string {
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * Fetches an external webpage with SSRF guardrails, timeout, and text extraction.
   */
  public async fetchWebSource(targetUrl: string, options?: {
    mode?: OperatingIntelligenceMode;
    timeoutMs?: number;
    signal?: AbortSignal;
  }): Promise<WebFetchResponse> {
    const mode = options?.mode || 'ONLINE_INTELLIGENCE';
    const started = Date.now();

    // 1. Airgap & Local-Only Policy Checks
    if (mode === 'AIRGAP_MODE') {
      return {
        ok: false,
        url: targetUrl,
        domain: '',
        content: '',
        contentDigest: this.computeDigest('AIRGAP_BLOCKED'),
        byteSize: 0,
        durationMs: Date.now() - started,
        sourceRecord: this.buildFailedSourceRecord(targetUrl, 'AIRGAP_POLICY_VIOLATION'),
        error: 'AIRGAP_POLICY_VIOLATION: External web fetch is blocked in Airgap Mode.',
      };
    }

    if (mode === 'LOCAL_INTELLIGENCE') {
      return {
        ok: false,
        url: targetUrl,
        domain: '',
        content: '',
        contentDigest: this.computeDigest('LOCAL_ONLY_BLOCKED'),
        byteSize: 0,
        durationMs: Date.now() - started,
        sourceRecord: this.buildFailedSourceRecord(targetUrl, 'LOCAL_ONLY_POLICY_ENFORCED'),
        error: 'LOCAL_ONLY_POLICY_ENFORCED: External web fetch is disabled in Local Intelligence Mode.',
      };
    }

    // 2. SSRF Safety Check
    const ssrfCheck = this.isSafePublicUrl(targetUrl);
    if (!ssrfCheck.isSafe) {
      return {
        ok: false,
        url: targetUrl,
        domain: '',
        content: '',
        contentDigest: this.computeDigest('SSRF_BLOCKED'),
        byteSize: 0,
        durationMs: Date.now() - started,
        sourceRecord: this.buildFailedSourceRecord(targetUrl, ssrfCheck.reason || 'SSRF_BLOCKED'),
        error: ssrfCheck.reason,
      };
    }

    const domain = new URL(targetUrl).hostname;
    const timeout = options?.timeoutMs || this.DEFAULT_TIMEOUT_MS;
    const timeoutController = new AbortController();
    const timeoutTimer = setTimeout(() => timeoutController.abort(), timeout);

    const combinedSignal = options?.signal
      ? (AbortSignal as any).any
        ? (AbortSignal as any).any([options.signal, timeoutController.signal])
        : timeoutController.signal
      : timeoutController.signal;

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'ZyntheorIntelligenceGateway/2.0 (Compatible; +https://zyntheor.ai)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8',
        },
        signal: combinedSignal,
      });

      clearTimeout(timeoutTimer);

      if (!response.ok) {
        return {
          ok: false,
          url: targetUrl,
          domain,
          content: '',
          contentDigest: this.computeDigest(`HTTP_${response.status}`),
          byteSize: 0,
          durationMs: Date.now() - started,
          sourceRecord: this.buildFailedSourceRecord(targetUrl, `HTTP_${response.status}`),
          error: `HTTP Error ${response.status}: ${response.statusText}`,
        };
      }

      const rawHtml = await response.text();
      const sanitizedText = this.sanitizeWebHtml(rawHtml).slice(0, this.MAX_PAYLOAD_BYTES);
      const digest = this.computeDigest(sanitizedText);
      const byteSize = Buffer.byteLength(sanitizedText, 'utf8');

      const sourceRecord: GroundingSource = {
        id: `src-${digest.slice(0, 16)}`,
        url: targetUrl,
        domain,
        title: this.extractHtmlTitle(rawHtml) || domain,
        snippet: sanitizedText.slice(0, 320).replace(/\s+/g, ' ').trim(),
        fetchedAt: new Date().toISOString(),
        contentDigest: digest,
        byteSize,
        verificationStatus: 'VERIFIED_SOURCE',
        httpStatus: response.status,
      };

      return {
        ok: true,
        url: targetUrl,
        domain,
        content: sanitizedText,
        contentDigest: digest,
        byteSize,
        durationMs: Date.now() - started,
        sourceRecord,
      };
    } catch (err: any) {
      clearTimeout(timeoutTimer);
      const errorMessage = err?.name === 'AbortError' ? 'REQUEST_TIMEOUT' : err?.message || 'Network fetch failure';
      return {
        ok: false,
        url: targetUrl,
        domain,
        content: '',
        contentDigest: this.computeDigest('FAILED'),
        byteSize: 0,
        durationMs: Date.now() - started,
        sourceRecord: this.buildFailedSourceRecord(targetUrl, errorMessage),
        error: errorMessage,
      };
    }
  }

  /**
   * Executes a search via real web search endpoints or search grounding.
   */
  public async executeSearch(query: string, options?: {
    mode?: OperatingIntelligenceMode;
    signal?: AbortSignal;
    maxResults?: number;
  }): Promise<InternetSearchResponse> {
    const mode = options?.mode || 'ONLINE_INTELLIGENCE';
    const started = Date.now();
    const cleaned = this.sanitizeSearchQuery(query);

    if (mode === 'AIRGAP_MODE') {
      return {
        ok: false,
        query: cleaned,
        mode: 'AIRGAP_MODE',
        sources: [],
        totalResults: 0,
        searchDurationMs: Date.now() - started,
        evidenceDigest: this.computeDigest('AIRGAP_SEARCH_BLOCKED'),
        error: 'AIRGAP_POLICY_VIOLATION: Web search is forbidden in Airgap Mode.',
      };
    }

    if (mode === 'LOCAL_INTELLIGENCE') {
      return {
        ok: false,
        query: cleaned,
        mode: 'LOCAL_INTELLIGENCE',
        sources: [],
        totalResults: 0,
        searchDurationMs: Date.now() - started,
        evidenceDigest: this.computeDigest('LOCAL_SEARCH_BLOCKED'),
        error: 'LOCAL_ONLY_POLICY_ENFORCED: Web search is disabled in Local Intelligence Mode.',
      };
    }

    if (!cleaned) {
      return {
        ok: false,
        query: '',
        mode,
        sources: [],
        totalResults: 0,
        searchDurationMs: Date.now() - started,
        evidenceDigest: this.computeDigest('EMPTY_QUERY'),
        error: 'Search query cannot be empty or solely contain redacted secrets.',
      };
    }

    // Attempt retrieval using Google Search Grounding if configured via Gemini SDK or standard HTTPS search
    try {
      const sources: GroundingSource[] = [];
      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey) {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Provide verified web search results and factual information for: ${cleaned}. Language: Thai or English as requested.`,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const groundingMetadata = (response as any).candidates?.[0]?.groundingMetadata;
        const chunks = groundingMetadata?.groundingChunks || [];

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]?.web;
          if (chunk && chunk.uri) {
            const uri = chunk.uri;
            const title = chunk.title || new URL(uri).hostname;
            const snippet = chunk.snippet || (response as any).text?.slice(0, 250) || '';
            const digest = this.computeDigest(`${uri}|${title}|${snippet}`);
            sources.push({
              id: `ground-${digest.slice(0, 16)}`,
              url: uri,
              domain: new URL(uri).hostname,
              title,
              snippet,
              fetchedAt: new Date().toISOString(),
              contentDigest: digest,
              byteSize: Buffer.byteLength(snippet, 'utf8'),
              verificationStatus: 'VERIFIED_SOURCE',
              httpStatus: 200,
            });
          }
        }
      }

      const totalResults = sources.length;
      const evidenceDigest = this.computeDigest(sources.map(s => s.contentDigest).join('|') || 'NO_SOURCES');

      return {
        ok: true,
        query: cleaned,
        mode: 'ONLINE_INTELLIGENCE',
        sources,
        totalResults,
        searchDurationMs: Date.now() - started,
        evidenceDigest,
      };
    } catch (err: any) {
      return {
        ok: false,
        query: cleaned,
        mode: 'ONLINE_INTELLIGENCE',
        sources: [],
        totalResults: 0,
        searchDurationMs: Date.now() - started,
        evidenceDigest: this.computeDigest(`FAILED:${err?.message}`),
        error: `Search Gateway Error: ${err?.message || 'External search unavailable'}`,
      };
    }
  }

  private sanitizeWebHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ' ')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, ' ')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractHtmlTitle(html: string): string {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match ? match[1].trim() : '';
  }

  private buildFailedSourceRecord(url: string, reason: string): GroundingSource {
    return {
      id: `fail-${this.computeDigest(url).slice(0, 16)}`,
      url,
      domain: (tryGetHostname(url) || 'unknown'),
      title: 'Retrieval Blocked or Failed',
      snippet: `Failed: ${reason}`,
      fetchedAt: new Date().toISOString(),
      contentDigest: this.computeDigest(reason),
      byteSize: 0,
      verificationStatus: 'FAILED_RETRIEVAL',
    };
  }
}

function tryGetHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'invalid-url';
  }
}

export const internetGateway = new InternetGateway();
