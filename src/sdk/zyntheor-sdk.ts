/**
 * ZYNTHEOR AI ENGINE — OFFICIAL TYPESCRIPT / NODE.JS SDK (STEP 10)
 * Master Principle: ZERO FAKE — REAL COMPLETENESS ONLY
 *
 * Usage Example:
 * ```ts
 * import { ZyntheorClient } from './src/sdk/zyntheor-sdk.ts';
 *
 * const client = new ZyntheorClient({
 *   apiKey: process.env.ZYNTHEOR_API_KEY || 'zyntheor_live_...',
 * });
 *
 * const completion = await client.chat.completions.create({
 *   messages: [{ role: 'user', content: 'Explain quantum computing.' }],
 * });
 * console.log(completion.choices[0].message.content);
 * ```
 */

export interface ZyntheorClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  workspaceId?: string;
}

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionCreateParams {
  model?: string;
  messages: ChatCompletionMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ResearchExecuteParams {
  query: string;
  researchDepth?: 'quick' | 'standard' | 'deep_comparative';
  enableWebSearch?: boolean;
  maxSources?: number;
}

export interface MemorySearchParams {
  query: string;
  category?: string;
  topK?: number;
  minScore?: number;
}

export interface MemoryStoreParams {
  category: 'USER_PREFERENCE' | 'PROJECT_KNOWLEDGE' | 'SESSION_CONTEXT' | 'DOMAIN_ENTITY' | 'TASK_MEMORY';
  title: string;
  content: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export class ZyntheorAPIError extends Error {
  public status: number;
  public details?: any;

  constructor(message: string, status = 500, details?: any) {
    super(message);
    this.name = 'ZyntheorAPIError';
    this.status = status;
    this.details = details;
  }
}

export class ZyntheorClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;
  private workspaceId: string;

  constructor(options: ZyntheorClientOptions) {
    if (!options.apiKey) {
      throw new Error('ZyntheorClient initialization failed: apiKey is required');
    }
    this.apiKey = options.apiKey.trim();
    this.baseUrl = (options.baseUrl || 'http://localhost:3000/api/v1').replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs || 15000;
    this.workspaceId = options.workspaceId || 'default';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'X-Workspace-Id': this.workspaceId,
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutTimer);

      const data = await response.json().catch(() => ({ error: 'Invalid JSON response from server' }));

      if (!response.ok) {
        throw new ZyntheorAPIError(
          data.error || data.message || `HTTP ${response.status} Request failed`,
          response.status,
          data
        );
      }

      return data as T;
    } catch (err: any) {
      clearTimeout(timeoutTimer);
      if (err instanceof ZyntheorAPIError) throw err;
      if (err.name === 'AbortError') {
        throw new ZyntheorAPIError(`Request timeout after ${this.timeoutMs}ms`, 408);
      }
      throw new ZyntheorAPIError(err.message || 'Network error', 500);
    }
  }

  // --- API DOMAINS ---

  public chat = {
    completions: {
      create: async (params: ChatCompletionCreateParams): Promise<any> => {
        return this.request('/chat/completions', {
          method: 'POST',
          body: JSON.stringify(params),
        });
      },
    },
  };

  public research = {
    execute: async (params: ResearchExecuteParams): Promise<any> => {
      return this.request('/research', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
  };

  public memory = {
    search: async (params: MemorySearchParams): Promise<any> => {
      const q = encodeURIComponent(params.query);
      return this.request(`/memory/search?q=${q}&workspaceId=${encodeURIComponent(this.workspaceId)}`, {
        method: 'GET',
      });
    },
    store: async (params: MemoryStoreParams): Promise<any> => {
      return this.request('/memory/store', {
        method: 'POST',
        body: JSON.stringify({ ...params, workspaceId: this.workspaceId }),
      });
    },
  };

  public models = {
    list: async (): Promise<any> => {
      return this.request('/models', { method: 'GET' });
    },
  };
}
