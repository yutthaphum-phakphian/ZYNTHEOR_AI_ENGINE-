export type ChatMode = 'auto' | 'chat' | 'reasoning' | 'coding' | 'research' | 'agent';
export type UpstreamItem = { type: 'delta'; text: string } | { type: 'error'; message: string } | { type: 'done' };
export type ServerEvent = { event: string; data: Record<string, unknown> };
export const CHAT_MODES: readonly ChatMode[];
export const DEFAULT_CHAT_MODE: ChatMode;
export const MAX_HISTORY_ITEMS: number;
export const MAX_HISTORY_CHARS: number;
export const MODE_PROMPTS: Record<ChatMode, string>;
export function normalizeMode(value: unknown): ChatMode | null;
export function sanitizeHistory(history: unknown): { role: 'user' | 'assistant'; content: string }[];
export function buildChatMessages(mode: ChatMode, history: unknown, message: string): { role: 'system' | 'user' | 'assistant'; content: string }[];
export function parseUpstreamLine(line: string): UpstreamItem | null;
export function readChatStream(body: ReadableStream<Uint8Array>): AsyncGenerator<UpstreamItem, void, undefined>;
export function readServerEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<ServerEvent, void, undefined>;

export function classifyAutoMode(message: string): { mode: ChatMode; reason: string };
