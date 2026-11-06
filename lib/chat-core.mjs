// Pure helpers shared by the server and the browser (no Node-only imports).

/**
 * @typedef {'auto' | 'chat' | 'reasoning' | 'coding' | 'research' | 'agent'} ChatMode
 * @typedef {{ type: 'done' } | { type: 'error', message: string } | { type: 'delta', text: string }} StreamItem
 */

export const CHAT_MODES = ['auto', 'chat', 'reasoning', 'coding', 'research', 'agent'];
export const DEFAULT_CHAT_MODE = 'auto';
export const MAX_HISTORY_ITEMS = 16;
export const MAX_HISTORY_CHARS = 12000;

const BASE_RULES = 'You are ZYNTHEOR AI ENGINE. Reply in the language the user writes in (Thai or English). Never claim that you ran code, executed tests, read files or browsed the web unless that is shown in the conversation. If you are unsure, say so.';

export const MODE_PROMPTS = {
  auto: `${BASE_RULES} Automatically adapt to the user's intent. Answer simple questions directly; use structured analysis for complex problems; use code-focused responses for software tasks; research only when search tools are actually available. Never claim tool execution without evidence.`,
  chat: `${BASE_RULES} Chat mode: answer conversationally and directly. Keep the response clear, natural, and proportionate to the question.`,
  reasoning: `${BASE_RULES} Reasoning mode: analyze complex problems carefully, state assumptions, compare relevant options, and provide a concise conclusion with verifiable steps. Do not reveal hidden chain-of-thought.`,
  coding: `${BASE_RULES} Coding mode: focus on software engineering, code analysis, implementation, and debugging. Use language-tagged code blocks, state assumptions, and distinguish verified results from suggestions.`,
  research: `${BASE_RULES} Research mode: synthesize information, distinguish facts from uncertainty, and cite sources only when actual sources are available. Never claim to have browsed without evidence.`,
  agent: `${BASE_RULES} Agent mode: break multi-step tasks into actions and use only tools actually available and authorized. Respect permission checks and human approval requirements; never imply elevated privileges.`,
};

/** Returns a valid mode, the default for an absent value, or null for an invalid value. */
export function normalizeMode(value) {
  if (value === undefined || value === null || value === '') return DEFAULT_CHAT_MODE;
  if (typeof value !== 'string') return null;
  const raw = value.trim().toLowerCase();
  const aliases = { plan: 'reasoning', code: 'coding' };
  const mode = aliases[raw] || raw;
  return CHAT_MODES.includes(mode) ? mode : null;
}

export function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-MAX_HISTORY_ITEMS).flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const { role, content } = item;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return [];
    return [{ role, content: content.slice(0, MAX_HISTORY_CHARS) }];
  });
}

/** Deterministic AUTO routing. Differentiates general knowledge queries from technical engineering queries. */
export function classifyAutoMode(message) {
  const text = String(message || '').toLowerCase();
  
  // 1. Agent workflows & tool execution
  if (/\b(agent|execute|run command|modify files|edit files|apply patch|terminal|bash|shell)\b/.test(text) || /เรียกใช้เครื่องมือ|แก้ไฟล์|รันคำสั่ง|ดำเนินการแทน|อัปเดตไฟล์|เขียนไฟล์/.test(text)) {
    return { mode: 'agent', intentType: 'agent_workflow', labelTh: 'กระบวนการอัตโนมัติ (Agent Workflow)', reason: 'คำขอต้องดำเนินงานหลายขั้นตอนหรือใช้เครื่องมือระบบ' };
  }

  // 2. Technical Engineering & Software Development
  if (/\b(code|coding|debug|bug|typescript|javascript|python|sql|html|css|api|endpoint|function|component|repository|repo|stack trace|compile|build|refactor|git)\b/.test(text) || /เขียนโค้ด|แก้บั๊ก|ดีบัก|ตรวจโค้ด|โปรแกรม|ไฟล์โค้ด|สถาปัตยกรรมโค้ด|อัลกอริทึม|คลาส|ฟังก์ชัน/.test(text)) {
    return { mode: 'coding', intentType: 'technical_engineering', labelTh: 'วิศวกรรมซอฟต์แวร์ (Technical Engineering)', reason: 'ตรวจพบบริบทด้านการพัฒนาซอฟต์แวร์ การเขียนหรือแก้ไขโค้ด' };
  }

  // 3. Research, Source Synthesis & Grounding
  if (/\b(research|sources|citations|latest|compare studies|evidence|paper|literature|benchmark|survey)\b/.test(text) || /ค้นหา|แหล่งข้อมูล|ค้นคว้า|อ้างอิง|ข้อมูลล่าสุด|เปรียบเทียบงานวิจัย|เอกสารวิชาการ/.test(text)) {
    return { mode: 'research', intentType: 'research_synthesis', labelTh: 'การวิจัยและสังเคราะห์ข้อมูล (Research & Synthesis)', reason: 'คำขอต้องสังเคราะห์ข้อมูล ค้นคว้า หรือตรวจสอบแหล่งอ้างอิง' };
  }

  // 4. Structured Reasoning & Strategic Analysis
  if (/\b(analyze|reason|architecture|trade.?off|strategy|multi.?step|root cause|deduce|logic puzzle|proof)\b/.test(text) || /วิเคราะห์|สถาปัตยกรรม|วางแผน|สาเหตุราก|ข้อดีข้อเสีย|เปรียบเทียบเชิงลึก|ตรรกศาสตร์/.test(text)) {
    return { mode: 'reasoning', intentType: 'structured_reasoning', labelTh: 'การคิดวิเคราะห์เชิงระบบ (Structured Reasoning)', reason: 'คำขอต้องใช้การวิเคราะห์เชิงลึก หรือการเปรียบเทียบหลายแง่มุม' };
  }

  // 5. General Knowledge & General-Purpose Conversational Intelligence
  return { mode: 'chat', intentType: 'general_knowledge', labelTh: 'ความรู้ทั่วไปและการสนทนา (General Knowledge)', reason: 'คำถามความรู้ทั่วไป การเขียน สรุปความ หรือการสนทนาโต้ตอบ' };
}

export function buildChatMessages(mode, history, message) {
  return [
    { role: 'system', content: MODE_PROMPTS[mode] ?? MODE_PROMPTS[DEFAULT_CHAT_MODE] },
    ...sanitizeHistory(history),
    { role: 'user', content: message },
  ];
}

/**
 * Parses one line of an OpenAI-compatible SSE stream. Returns null for lines to ignore.
 * @param {string} line
 * @returns {StreamItem | null}
 */
export function parseUpstreamLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return null;
  const payload = trimmed.slice(5).trim();
  if (payload === '[DONE]') return { type: 'done' };
  let obj;
  try { obj = JSON.parse(payload); } catch { return null; }
  if (obj && obj.error) {
    const message = typeof obj.error === 'string' ? obj.error : obj.error.message;
    return { type: 'error', message: String(message || 'Model stream error') };
  }
  const content = obj?.choices?.[0]?.delta?.content;
  const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map(part => part?.text || '').join('') : '';
  return text ? { type: 'delta', text } : null;
}

/**
 * Reads a streaming fetch body from an OpenAI-compatible endpoint and yields delta/error/done items.
 * @param {ReadableStream<Uint8Array>} body
 * @returns {AsyncGenerator<StreamItem, void, unknown>}
 */
export async function* readChatStream(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = done ? '' : (lines.pop() ?? '');
      for (const line of lines) {
        const item = parseUpstreamLine(line);
        if (!item) continue;
        yield item;
        if (item.type === 'done' || item.type === 'error') return;
      }
      if (done) return;
    }
  } finally {
    try { await reader.cancel(); } catch { /* stream already closed */ }
  }
}

/** Reads this app's own SSE stream in the browser and yields { event, data }. */
export async function* readServerEvents(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = done ? '' : (blocks.pop() ?? '');
      for (const block of blocks) {
        let event = 'message';
        const dataLines = [];
        for (const line of block.split(/\r?\n/)) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
        }
        if (!dataLines.length) continue;
        let data;
        try { data = JSON.parse(dataLines.join('\n')); } catch { continue; }
        yield { event, data: data && typeof data === 'object' ? data : {} };
      }
      if (done) return;
    }
  } finally {
    try { await reader.cancel(); } catch { /* stream already closed */ }
  }
}
