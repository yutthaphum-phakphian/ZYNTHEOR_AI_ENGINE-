import { GoogleGenAI } from '@google/genai';
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
}

export type StreamItem =
  | { type: 'delta'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done'; chars: number };

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
 * Gemini Provider adapter using the official @google/genai SDK.
 * Server-side only: API keys never leave the server.
 */
export class GeminiProvider implements ModelProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini API';
  readonly isLocal = false;
  readonly endpointHost = 'generativelanguage.googleapis.com';
  readonly configuredModel: string;
  #apiKey: string;
  #ai: GoogleGenAI | null = null;

  constructor(apiKey?: string, model?: string) {
    this.#apiKey = apiKey !== undefined ? apiKey : (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.ZYNTHEOR_MODEL_API_KEY || '');
    const rawModel = model || process.env.GEMINI_MODEL;
    if (rawModel) {
      this.configuredModel = rawModel;
    } else if (process.env.ZYNTHEOR_MODEL_NAME && process.env.ZYNTHEOR_MODEL_NAME.toLowerCase().startsWith('gemini-')) {
      this.configuredModel = process.env.ZYNTHEOR_MODEL_NAME;
    } else {
      this.configuredModel = 'gemini-3.8-flash';
    }
    if (this.#apiKey) {
      this.#ai = new GoogleGenAI({
        apiKey: this.#apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      isLocal: this.isLocal,
      endpointHost: this.endpointHost,
      configuredModel: this.configuredModel,
      hasApiKey: this.hasApiKey,
    };
  }

  get hasApiKey(): boolean {
    return Boolean(this.#apiKey);
  }

  private getClient(): GoogleGenAI {
    if (!this.#ai || !this.#apiKey) {
      throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY in server environment.');
    }
    return this.#ai;
  }

  private formatContents(messages: ModelMessage[]): { systemInstruction?: string; contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> } {
    let systemInstruction: string | undefined;
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = systemInstruction ? `${systemInstruction}\n\n${msg.content}` : msg.content;
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    return { systemInstruction, contents };
  }

  modelListSource: 'live' | 'fallback' = 'live';

  async listModels(signal?: AbortSignal): Promise<string[]> {
    // Fallback holds only IDs confirmed in Google's official model list. gemini-3.1-flash-lite is left out: Google lists it as deprecated (shutdown May 7, 2027).
    const fallbackList = ['gemini-3.8-flash', 'gemini-4-argon'];
    signal?.throwIfAborted();
    try {
      const client = this.getClient();
      const list = await client.models.list({ config: { abortSignal: signal } });
      const result: string[] = [];
      for await (const m of list) {
        if (m.name) {
          result.push(m.name.replace(/^models\//, ''));
        }
      }
      signal?.throwIfAborted();
      if (!result.length) { this.modelListSource = 'fallback'; return fallbackList; }
      this.modelListSource = 'live';
      return result;
    } catch (error) {
      if (signal?.aborted) throw error;
      this.modelListSource = 'fallback';
      return fallbackList;
    }
  }

  async chat(options: ChatOptions): Promise<{ reply: string; model: string; provider: string }> {
    options.signal?.throwIfAborted();
    const client = this.getClient();
    const { systemInstruction, contents } = this.formatContents(options.messages);

    const response = await client.models.generateContent({
      model: this.configuredModel,
      contents,
      config: {
        ...(systemInstruction ? { systemInstruction } : {}),
        abortSignal: options.signal,
      },
    });

    const reply = response.text || '';
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
    options.signal?.throwIfAborted();
    const client = this.getClient();
    const { systemInstruction, contents } = this.formatContents(options.messages);

    const stream = await client.models.generateContentStream({
      model: this.configuredModel,
      contents,
      config: {
        ...(systemInstruction ? { systemInstruction } : {}),
        abortSignal: options.signal,
      },
    });

    let chars = 0;
    try {
      for await (const chunk of stream) {
        if (options.signal?.aborted) {
          options.signal.throwIfAborted();
        }
        const text = chunk.text;
        if (text) {
          chars += text.length;
          yield { type: 'delta', text };
        }
      }
    } catch (err) {
      if (options.signal?.aborted) throw err;
      yield { type: 'error', message: err instanceof Error ? err.message : 'Gemini stream error' };
      return;
    }

    if (chars === 0) {
      yield { type: 'error', message: 'empty_model_response' };
      return;
    }

    yield { type: 'done', chars };
  }

  async testInference(signal?: AbortSignal): Promise<DiagnosticResult> {
    signal?.throwIfAborted();
    const client = this.getClient();
    const started = performance.now();

    const response = await client.models.generateContent({
      model: this.configuredModel,
      contents: [{ role: 'user', parts: [{ text: 'Reply with exactly this text: ZYNTHEOR_INFERENCE_OK' }] }],
      config: {
        temperature: 0,
        maxOutputTokens: 128,
        abortSignal: signal,
      },
    });

    const reply = response.text || '';
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
    options.signal?.throwIfAborted();
    const client = this.getClient();
    const started = performance.now();

    const response = await client.models.generateContent({
      model: this.configuredModel,
      contents: [
        {
          role: 'user',
          parts: [{ text: `Task: ${options.question}\n\n<source>\n${options.source}\n</source>` }],
        },
      ],
      config: {
        systemInstruction:
          'You are the code-analysis component of ZYNTHEOR AI ENGINE. Analyze only the supplied source. Separate observed facts from hypotheses. Do not claim you executed tests or ran the code. Return concise Markdown with sections: Summary, Verified from supplied text, Potential issues (label hypotheses), Suggested next steps. If evidence is insufficient, say so.',
        temperature: 0,
        abortSignal: options.signal,
      },
    });

    const analysis = response.text || '';
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
 * Prioritizes Gemini when ZYNTHEOR_PROVIDER=gemini or when GEMINI_API_KEY is present without an explicit provider.
 */
export function createProvider(env: Record<string, string | undefined> = process.env): ModelProvider {
  const rawProvider = (env.ZYNTHEOR_PROVIDER || '').trim().toLowerCase();
  const geminiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || (rawProvider === 'gemini' ? env.ZYNTHEOR_MODEL_API_KEY : '');
  const hasGeminiKey = Boolean(geminiKey);
  const effectiveBaseUrl = env.ZYNTHEOR_MODEL_BASE_URL || env.OPENAI_API_BASE;
  const isCustomBaseUrl = Boolean((env.ZYNTHEOR_MODEL_BASE_URL && env.ZYNTHEOR_MODEL_BASE_URL !== 'http://127.0.0.1:11434/v1') || env.OPENAI_API_BASE);
  const isLocalOnly = ['1', 'true', 'yes'].includes((env.ZYNTHEOR_LOCAL_ONLY || '').trim().toLowerCase());

  // Gemini-first strategy:
  // 1. Explicitly requested: rawProvider === 'gemini'
  // 2. Key present (GEMINI_API_KEY or GOOGLE_API_KEY) AND not explicitly overridden by another external provider ('openai') or custom mock/local URL, AND not in strict local-only mode
  const wantsGemini = rawProvider === 'gemini' || (hasGeminiKey && rawProvider !== 'openai' && !isCustomBaseUrl && !isLocalOnly);

  if (wantsGemini) {
    const rawModel = env.GEMINI_MODEL || env.MODEL_NAME;
    const model = rawModel || (env.ZYNTHEOR_MODEL_NAME && env.ZYNTHEOR_MODEL_NAME.toLowerCase().startsWith('gemini-') ? env.ZYNTHEOR_MODEL_NAME : 'gemini-3.8-flash');
    return new GeminiProvider(geminiKey, model);
  }

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
