import { readChatStream, type ChatMode } from './chat-core.mjs';


/** Stable provider error codes for OpenAI-compatible / Ollama paths (ZERO FAKE). */
export type ProviderErrorCode =
  | 'OLLAMA_UNAVAILABLE'
  | 'INVALID_RESPONSE'
  | 'MODEL_NOT_FOUND'
  | 'PROVIDER_REQUEST_FAILED';

export class ProviderRequestError extends Error {
  readonly code: ProviderErrorCode;
  readonly httpStatus: number | null;
  constructor(code: ProviderErrorCode, message: string, httpStatus: number | null = null) {
    super(message);
    this.name = 'ProviderRequestError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function classifyOpenAICompatibleFetchError(err: unknown, baseUrl: string): ProviderRequestError {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  // Connection-level failures
  if (
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('econnreset') ||
    lower.includes('fetch failed') ||
    lower.includes('network') ||
    lower.includes('connection refused') ||
    (err as any)?.cause?.code === 'ECONNREFUSED'
  ) {
    return new ProviderRequestError(
      'OLLAMA_UNAVAILABLE',
      `Cannot connect to model endpoint at ${baseUrl}. If you intend to use Ollama, start it with: ollama serve`,
      null
    );
  }
  if (lower.includes('abort') || lower.includes('timeout') || lower.includes('timed out')) {
    return new ProviderRequestError(
      'OLLAMA_UNAVAILABLE',
      `Model endpoint timed out at ${baseUrl}. Verify the server is running and reachable.`,
      null
    );
  }
  return new ProviderRequestError('PROVIDER_REQUEST_FAILED', msg.slice(0, 300), null);
}

function throwForOpenAICompatibleHttp(status: number, body: any, baseUrl: string, path: string): never {
  const upstream = body?.error?.message || body?.message || body?.error || '';
  const detail = typeof upstream === 'string' ? upstream.slice(0, 200) : '';
  if (status === 404) {
    throw new ProviderRequestError(
      'MODEL_NOT_FOUND',
      detail || `Endpoint route not found (HTTP 404) at ${baseUrl}${path}. Check ZYNTHEOR_MODEL_BASE_URL and model name.`,
      404
    );
  }
  throw new ProviderRequestError(
    'PROVIDER_REQUEST_FAILED',
    detail || `Model endpoint returned HTTP ${status} for ${baseUrl}${path}`,
    status
  );
}


export interface ModelMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  mode: ChatMode;
  messages: ModelMessage[];
  signal?: AbortSignal;
  enableGrounding?: boolean;
}

export type StreamItem =
  | { type: 'delta'; text: string }
  | { type: 'grounding'; chunks: Array<{ uri: string; title: string }>; searchQueries?: string[] }
  | { type: 'error'; message: string }
  | { type: 'done'; chars: number; groundingChunks?: Array<{ uri: string; title: string }> };

export interface DiagnosticResult {
  state: string;
  model: string;
  latencyMs: number;
  matchedExpectedText: boolean;
  responsePreview: string;
}

export interface ModelProvider {
  readonly id: string;
  readonly name: string;
  readonly isLocal: boolean;
  readonly endpointHost: string;
  readonly configuredModel: string;
  readonly hasApiKey: boolean;
  /** 'live' = list returned by the provider endpoint on the last listModels() call; 'fallback' = built-in list used because the live list was unavailable (not verified for this account). */
  readonly modelListSource?: 'live' | 'fallback';

  listModels(signal?: AbortSignal): Promise<string[]>;
  chat(options: ChatOptions): Promise<{ reply: string; model: string; provider: string }>;
  chatStream(options: ChatOptions): AsyncIterable<StreamItem>;
  testInference(signal?: AbortSignal): Promise<DiagnosticResult>;
  analyze(options: { source: string; question: string; signal?: AbortSignal }): Promise<{ analysis: string; model: string; latencyMs: number }>;
}



/**
 * OpenAI-compatible provider adapter (Ollama, vLLM, OpenAI, LocalAI).
 */
export class OpenAICompatibleProvider implements ModelProvider {
  readonly id: string;
  readonly name: string;
  readonly isLocal: boolean;
  readonly endpointHost: string;
  readonly configuredModel: string;
  readonly baseUrl: string;
  #apiKey: string;

  constructor(config: { id?: string; name?: string; baseUrl: string; model: string; apiKey?: string }) {
    this.id = config.id || 'ollama';
    this.name = config.name || (this.id === 'openai' ? 'OpenAI' : 'Ollama / OpenAI-Compatible');
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.configuredModel = config.model;
    this.#apiKey = config.apiKey || '';

    let host = 'invalid URL';
    let isLocal = false;
    try {
      const u = new URL(this.baseUrl);
      host = u.host;
      isLocal = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname.toLowerCase());
    } catch { /* ignored */ }

    this.endpointHost = host;
    this.isLocal = isLocal;
  }

  get hasApiKey(): boolean {
    return Boolean(this.#apiKey);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      isLocal: this.isLocal,
      endpointHost: this.endpointHost,
      configuredModel: this.configuredModel,
      baseUrl: this.baseUrl,
      hasApiKey: this.hasApiKey,
    };
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.#apiKey) {
      h.Authorization = `Bearer ${this.#apiKey}`;
    }
    return h;
  }

  async listModels(signal?: AbortSignal): Promise<string[]> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/models`, {
        headers: this.headers(),
        signal: signal || AbortSignal.timeout(5000),
      });
    } catch (err) {
      throw classifyOpenAICompatibleFetchError(err, this.baseUrl);
    }
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    if (contentType.includes('text/html') || text.trim().startsWith('<')) {
      throw new ProviderRequestError(
        'INVALID_RESPONSE',
        `Model endpoint ${this.baseUrl}/models returned HTML instead of JSON API response.`,
        response.status
      );
    }
    let body: any = {};
    try {
      body = JSON.parse(text);
    } catch {
      throw new ProviderRequestError(
        'INVALID_RESPONSE',
        `Model endpoint ${this.baseUrl}/models returned invalid non-JSON output.`,
        response.status
      );
    }
    if (!response.ok) {
      throwForOpenAICompatibleHttp(response.status, body, this.baseUrl, '/models');
    }
    return body.data?.map((item: any) => item.id).filter(Boolean) as string[] ||
      body.models?.map((item: any) => item.name || item.model).filter(Boolean) as string[] ||
      [];
  }

  async chat(options: ChatOptions): Promise<{ reply: string; model: string; provider: string }> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          model: this.configuredModel,
          messages: options.messages,
          stream: false,
        }),
        signal: options.signal || AbortSignal.timeout(90000),
      });
    } catch (err) {
      throw classifyOpenAICompatibleFetchError(err, this.baseUrl);
    }

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    if (contentType.includes('text/html') || text.trim().startsWith('<')) {
      throw new ProviderRequestError(
        'INVALID_RESPONSE',
        `Model endpoint ${this.baseUrl}/chat/completions returned HTML instead of JSON API response.`,
        response.status
      );
    }

    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new ProviderRequestError(
        'INVALID_RESPONSE',
        `Model endpoint ${this.baseUrl}/chat/completions returned invalid non-JSON output.`,
        response.status
      );
    }

    if (!response.ok) {
      throwForOpenAICompatibleHttp(response.status, data, this.baseUrl, '/chat/completions');
    }

    const content = data.choices?.[0]?.message?.content;
    const reply = typeof content === 'string' ? content : Array.isArray(content) ? content.map((part: any) => part.text || '').join('') : '';

    if (!reply.trim()) {
      throw new Error('empty_model_response');
    }

    return {
      reply,
      model: this.configuredModel,
      provider: this.id,
    };
  }

  async *chatStream(options: ChatOptions): AsyncIterable<StreamItem> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          model: this.configuredModel,
          messages: options.messages,
          stream: true,
        }),
        signal: options.signal,
      });
    } catch (err) {
      throw classifyOpenAICompatibleFetchError(err, this.baseUrl);
    }

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => '');
      let data: any = {};
      try { data = JSON.parse(text); } catch { /* ignore */ }
      throwForOpenAICompatibleHttp(response.status, data, this.baseUrl, '/chat/completions');
    }

    let chars = 0;
    let finished = false;

    for await (const item of readChatStream(response.body)) {
      if (item.type === 'delta') {
        chars += item.text.length;
        yield { type: 'delta', text: item.text };
      } else if (item.type === 'error') {
        yield { type: 'error', message: item.message };
        return;
      } else if (item.type === 'done') {
        finished = true;
        break;
      }
    }

    if (chars === 0) {
      yield { type: 'error', message: 'empty_model_response' };
      return;
    }

    if (!finished) {
      yield { type: 'error', message: 'upstream_closed_early' };
      return;
    }

    yield { type: 'done', chars };
  }

  async testInference(signal?: AbortSignal): Promise<DiagnosticResult> {
    const started = performance.now();
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.configuredModel,
        messages: [{ role: 'user', content: 'Reply with exactly this text: ZYNTHEOR_INFERENCE_OK' }],
        max_tokens: 32,
        temperature: 0,
        stream: false,
      }),
      signal: signal || AbortSignal.timeout(30000),
    });

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    if (contentType.includes('text/html') || text.trim().startsWith('<')) {
      throw new Error(`Model endpoint ${this.baseUrl}/chat/completions returned HTML instead of JSON API response.`);
    }

    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Model endpoint ${this.baseUrl}/chat/completions returned invalid non-JSON output.`);
    }

    if (!response.ok) {
      throw new Error(data.error?.message || data.message || `Model endpoint returned HTTP ${response.status}`);
    }

    const raw = data.choices?.[0]?.message?.content;
    const reply = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.map((part: any) => part.text || '').join('') : '';

    if (!reply.trim()) {
      throw new Error('empty_model_response');
    }

    const latencyMs = Math.round(performance.now() - started);
    const matchedExpectedText = reply.trim().includes('ZYNTHEOR_INFERENCE_OK');

    return {
      state: 'RESPONDED',
      model: this.configuredModel,
      latencyMs,
      matchedExpectedText,
      responsePreview: reply.trim().slice(0, 160),
    };
  }

  async analyze(options: { source: string; question: string; signal?: AbortSignal }): Promise<{ analysis: string; model: string; latencyMs: number }> {
    const started = performance.now();
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.configuredModel,
        temperature: 0,
        stream: false,
        messages: [
          {
            role: 'system',
            content:
              'You are the code-analysis component of ZYNTHEOR AI ENGINE. Analyze only the supplied source. Separate observed facts from hypotheses. Do not claim you executed tests or ran the code. Return concise Markdown with sections: Summary, Verified from supplied text, Potential issues (label hypotheses), Suggested next steps. If evidence is insufficient, say so.',
          },
          { role: 'user', content: `Task: ${options.question}\n\n<source>\n${options.source}\n</source>` },
        ],
      }),
      signal: options.signal || AbortSignal.timeout(60000),
    });

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    if (contentType.includes('text/html') || text.trim().startsWith('<')) {
      throw new Error(`Model endpoint ${this.baseUrl}/chat/completions returned HTML instead of JSON API response.`);
    }

    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Model endpoint ${this.baseUrl}/chat/completions returned invalid non-JSON output.`);
    }

    if (!response.ok) {
      throw new Error(data.error?.message || data.message || `Model endpoint returned HTTP ${response.status}`);
    }

    const raw = data.choices?.[0]?.message?.content;
    const analysis = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.map((part: any) => part.text || '').join('') : '';

    if (!analysis.trim()) {
      throw new Error('empty_model_response');
    }

    const latencyMs = Math.round(performance.now() - started);
    return {
      analysis,
      model: this.configuredModel,
      latencyMs,
    };
  }
}

/**
 * Resolves the active model provider based on environment configuration.
 * Standardized on OpenAI-compatible / Ollama / Custom API provider contracts.
 */
export function createProvider(env: Record<string, string | undefined> = process.env): ModelProvider {
  const rawProvider = (env.ZYNTHEOR_PROVIDER || '').trim().toLowerCase();

  // OpenAI direct
  if (rawProvider === 'openai') {
    return new OpenAICompatibleProvider({
      id: 'openai',
      name: 'OpenAI API',
      baseUrl: env.ZYNTHEOR_MODEL_BASE_URL || env.OPENAI_API_BASE || 'https://api.openai.com/v1',
      model: env.ZYNTHEOR_MODEL_NAME || env.MODEL_NAME || 'gpt-4o',
      apiKey: env.ZYNTHEOR_MODEL_API_KEY || env.OPENAI_API_KEY || '',
    });
  }

  // Default: Ollama / OpenAI-compatible — require explicit base URL (ZERO FAKE: no silent synthetic bridge).
  // Real Ollama users must set ZYNTHEOR_MODEL_BASE_URL=http://127.0.0.1:11434/v1 (or equivalent).
  const ollamaBase = env.ZYNTHEOR_MODEL_BASE_URL || env.OPENAI_API_BASE || '';
  if (!ollamaBase.trim()) {
    // Provide a provider instance that will fail with OLLAMA_UNAVAILABLE on first use
    // rather than inventing responses. Default URL is the conventional Ollama port only
    // when the operator has not configured anything; readiness must still be proven by a live server.
    return new OpenAICompatibleProvider({
      id: rawProvider || 'ollama',
      name: rawProvider === 'ollama' ? 'Ollama' : 'OpenAI-Compatible',
      baseUrl: 'http://127.0.0.1:11434/v1',
      model: env.ZYNTHEOR_MODEL_NAME || env.MODEL_NAME || 'qwen2.5-coder:7b',
      apiKey: env.ZYNTHEOR_MODEL_API_KEY || '',
    });
  }
  return new OpenAICompatibleProvider({
    id: rawProvider || 'ollama',
    name: rawProvider === 'ollama' ? 'Ollama' : 'OpenAI-Compatible',
    baseUrl: ollamaBase,
    model: env.ZYNTHEOR_MODEL_NAME || env.MODEL_NAME || 'qwen2.5-coder:7b',
    apiKey: env.ZYNTHEOR_MODEL_API_KEY || '',
  });
}
