export type ChatMode = 'auto' | 'chat' | 'reasoning' | 'coding' | 'research' | 'agent';

export declare const CHAT_MODES: readonly ChatMode[];
export declare const DEFAULT_CHAT_MODE: ChatMode;
export declare const MAX_HISTORY_ITEMS: number;
export declare const MAX_HISTORY_CHARS: number;
export declare const MODE_PROMPTS: Record<string, string>;

export declare function normalizeMode(value: unknown): ChatMode | null;
export declare function sanitizeHistory(history: unknown): Array<{ role: 'user' | 'assistant'; content: string }>;
export declare function classifyAutoMode(message: unknown): {
  mode: ChatMode;
  intentType: string;
  labelTh: string;
  reason: string;
};
export declare function buildChatMessages(
  mode: ChatMode,
  history: unknown,
  message: string
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;

export declare function parseUpstreamLine(
  line: string
): { type: 'done' } | { type: 'error'; message: string } | { type: 'delta'; text: string } | null;

export declare function readChatStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<{ type: 'done' } | { type: 'error'; message: string } | { type: 'delta'; text: string }, void, unknown>;

export declare function readServerEvents(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<{ event: string; data: Record<string, any> }, void, unknown>;
