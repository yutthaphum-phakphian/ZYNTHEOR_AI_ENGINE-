// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Send,
  Globe,
  Sparkles,
  Bot,
  User,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Square,
  Copy,
  Check,
  Cpu,
  Layers,
  Clock,
  ExternalLink,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { getActiveModel } from '../lib/modelIdentityContract';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  groundingUsed?: boolean;
  taskType?: string;
  taskState?: string;
  durationMs?: number;
  verificationArtifacts?: Array<{
    category: string;
    source: string;
    message: string;
    sha256Digest?: string;
  }>;
  groundingSources?: Array<{
    title: string;
    url: string;
  }>;
  modelMetadata?: {
    modelId: string;
    providerId: string;
    modelCategory: string;
    isFirstParty: boolean;
    zeroMockNotice: string;
  };
  error?: boolean;
  errorMessage?: string;
}

export function MainChat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlQuery = searchParams.get('q') || '';
  const urlGrounding = searchParams.get('grounding') === '1';

  const [input, setInput] = useState('');
  const [grounding, setGrounding] = useState<boolean>(urlGrounding);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeModel] = useState(() => getActiveModel());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedQueryRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Execute request to ZYNTHEOR INTELLIGENCE Runtime
  const executeQuery = useCallback(async (queryText: string, useGrounding: boolean) => {
    if (!queryText.trim()) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: queryText.trim(),
      timestamp: new Date().toISOString(),
      groundingUsed: useGrounding,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const assistantMessageId = `assist-${Date.now()}`;

    try {
      // Direct call to ZYNTHEOR INTELLIGENCE Runtime
      const res = await fetch('/api/intelligence/orchestrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: queryText.trim(),
          workspaceId: 'default',
          language: 'th',
          responseLanguage: 'th',
          onlineConsent: useGrounding,
          isDryRun: false,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errMessage = `HTTP ${res.status}: ${res.statusText}`;
        try {
          const errData = await res.json();
          errMessage = errData.error || errData.message || errMessage;
        } catch {
          // Response body was not JSON
        }

        const failMsg: ChatMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          error: true,
          errorMessage: errMessage,
          groundingUsed: useGrounding,
        };
        setMessages((prev) => [...prev, failMsg]);
        return;
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: data.finalAnswer || data.answer || 'ประมวลผลสำเร็จโดยไม่มีข้อความเพิ่มเติม',
        timestamp: new Date().toISOString(),
        groundingUsed: useGrounding,
        taskType: data.taskType,
        taskState: data.taskState,
        durationMs: data.durationMs,
        verificationArtifacts: data.verificationArtifacts || [],
        groundingSources: data.groundingSources || [],
        modelMetadata: data.modelMetadata,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const cancelMsg: ChatMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: 'การประมวลผลถูกยกเลิกโดยผู้ใช้',
          timestamp: new Date().toISOString(),
          error: true,
          errorMessage: 'User cancelled query execution',
        };
        setMessages((prev) => [...prev, cancelMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          error: true,
          errorMessage: err.message || 'Cannot connect to ZYNTHEOR INTELLIGENCE Runtime',
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  // Handle incoming query and grounding from URL parameters
  useEffect(() => {
    if (urlQuery && initializedQueryRef.current !== urlQuery) {
      initializedQueryRef.current = urlQuery;
      setInput(urlQuery);
      setGrounding(urlGrounding);
      executeQuery(urlQuery, urlGrounding);
    }
  }, [urlQuery, urlGrounding, executeQuery]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const currentText = input;
    setInput('');
    // Clear URL param after user continues conversation
    if (searchParams.has('q')) {
      searchParams.delete('q');
      setSearchParams(searchParams, { replace: true });
    }
    executeQuery(currentText, grounding);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    if (isLoading) handleStop();
    setMessages([]);
    setInput('');
    if (searchParams.has('q')) {
      searchParams.delete('q');
      setSearchParams(searchParams, { replace: true });
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#050810] text-white overflow-hidden">
      {/* Top Header Bar */}
      <header className="shrink-0 h-14 border-b border-white/[0.08] bg-[#0b1020]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D9A3] to-[#00b386] grid place-items-center text-black font-black text-sm">
            Z
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight">ZYNTHEOR INTELLIGENCE</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono">
                RUNTIME ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-white/40">
              Model: {activeModel?.displayName || 'ZYNTHEOR CORE'} (Sovereign Zero-Mock)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-white/40 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition flex items-center gap-1.5"
              title="Clear Conversation"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">ล้างการสนทนา</span>
            </button>
          )}
        </div>
      </header>

      {/* Messages Thread Container */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/10 mx-auto grid place-items-center text-[#00D9A3]">
              <Sparkles size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">ZYNTHEOR INTELLIGENCE WORKSPACE</h2>
              <p className="text-sm text-white/50 max-w-md mx-auto leading-6">
                เริ่มการสนทนา ค้นคว้าความรู้ หรือวิเคราะห์ปัญหาเชิงลึก ระบบประมวลผลด้วยโมเดล First-Party ภายใต้ Sovereign Truth Principle
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {[
                'อธิบายแนวคิดของ Sovereign AI',
                'ช่วยวิเคราะห์สถาปัตยกรรม ZYNTHEOR CORE',
                'เขียนฟังก์ชัน TypeScript สำหรับ Rate Limiting',
                'ค้นคว้าข้อมูลล่าสุดพร้อมแหล่งอ้างอิง',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setInput(example);
                    executeQuery(example, grounding);
                  }}
                  className="text-xs text-white/60 bg-white/[0.04] border border-white/[0.08] hover:border-[#00D9A3]/40 hover:text-white px-3.5 py-2 rounded-xl transition text-left"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00D9A3] to-[#00b386] grid place-items-center text-black shrink-0 shadow-md">
                    <Bot size={17} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 sm:p-5 ${
                    msg.role === 'user'
                      ? 'bg-[#111a2d] border border-white/10 text-white shadow-sm'
                      : msg.error
                      ? 'bg-red-950/20 border border-red-500/30 text-red-200'
                      : 'bg-[#0b1020] border border-white/[0.08] text-white shadow-md'
                  }`}
                >
                  {/* Message Metadata Header */}
                  <div className="flex items-center justify-between gap-3 mb-2 text-[11px] text-white/40">
                    <span className="font-semibold text-white/70">
                      {msg.role === 'user' ? 'คุณ' : 'ZYNTHEOR INTELLIGENCE'}
                    </span>
                    <div className="flex items-center gap-2">
                      {msg.groundingUsed && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-0.5 rounded-full border border-[#38bdf8]/20">
                          <Globe size={11} />
                          Grounding
                        </span>
                      )}
                      {msg.durationMs !== undefined && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-white/40">
                          <Clock size={11} />
                          {msg.durationMs}ms
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message Content */}
                  {msg.error ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                        <AlertCircle size={15} />
                        ข้อผิดพลาดจาก Backend Runtime:
                      </div>
                      <p className="text-xs font-mono bg-black/40 p-3 rounded-lg border border-red-500/20 text-red-300 break-words leading-relaxed">
                        {msg.errorMessage || 'Unknown execution error'}
                      </p>
                      <p className="text-[11px] text-red-300/60 leading-5">
                        ระบบไม่แต่งคำตอบจำลองเมื่อเกิดข้อผิดพลาด ตามระเบียบ Sovereign Truth Zero-Mock
                      </p>
                    </div>
                  ) : (
                    <div className="text-sm leading-7 whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                  )}

                  {/* Model Identity & Zero-Mock Attribution */}
                  {msg.modelMetadata && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            msg.modelMetadata.isFirstParty
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                              : 'bg-purple-950/40 text-purple-300 border-purple-500/30'
                          }`}
                        >
                          {msg.modelMetadata.isFirstParty
                            ? 'ZYNTHEOR CORE (First-Party)'
                            : `EXTERNAL: ${msg.modelMetadata.providerId} (${msg.modelMetadata.modelId})`}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/40 italic">
                        {msg.modelMetadata.zeroMockNotice}
                      </span>
                    </div>
                  )}

                  {/* Grounding Web Sources */}
                  {msg.groundingSources && msg.groundingSources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                      <div className="text-[10px] tracking-wider uppercase font-bold text-[#38bdf8] flex items-center gap-1.5">
                        <Globe size={12} />
                        Internet Grounding Sources ({msg.groundingSources.length})
                      </div>
                      <div className="grid gap-1.5">
                        {msg.groundingSources.map((source, sIdx) => (
                          <a
                            key={sIdx}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-white/70 hover:text-white bg-white/[0.02] border border-white/[0.06] hover:border-[#38bdf8]/40 p-2 rounded-lg flex items-center justify-between gap-2 transition group"
                          >
                            <span className="truncate">{source.title || source.url}</span>
                            <ExternalLink size={12} className="text-[#38bdf8] shrink-0 opacity-70 group-hover:opacity-100" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verification Artifacts / Provenance */}
                  {msg.verificationArtifacts && msg.verificationArtifacts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                      <div className="text-[10px] tracking-wider uppercase font-bold text-white/40 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck size={12} className="text-[#00D9A3]" />
                          Evidence & SHA-256 Provenance ({msg.verificationArtifacts.length})
                        </div>
                        <span className="text-[9px] text-[#00D9A3] font-mono">
                          CRYPTOGRAPHICALLY HASHED
                        </span>
                      </div>
                      <div className="grid gap-1.5">
                        {msg.verificationArtifacts.map((art, idx) => (
                          <div
                            key={idx}
                            className="text-[11px] bg-white/[0.02] border border-white/[0.05] p-2.5 rounded-lg font-mono text-white/60 flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-[#00D9A3] font-bold">[{art.category}]</span>{' '}
                              <span className="text-white/80">{art.message}</span>
                              <div className="text-[10px] text-white/30 mt-0.5">Source: {art.source}</div>
                            </div>
                            {art.sha256Digest && (
                              <span
                                className="text-[10px] text-white/40 shrink-0 select-all font-mono bg-black/30 px-2 py-0.5 rounded border border-white/5"
                                title={`Full SHA-256: ${art.sha256Digest}`}
                              >
                                {art.sha256Digest.slice(0, 10)}…
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Copy Button */}
                  {!msg.error && (
                    <div className="mt-3 pt-2 flex items-center justify-end">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="text-[11px] text-white/40 hover:text-white flex items-center gap-1 transition"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check size={12} className="text-[#00D9A3]" />
                            <span className="text-[#00D9A3]">คัดลอกแล้ว</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>คัดลอก</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-white/[0.08] grid place-items-center text-white/70 shrink-0">
                    <User size={17} />
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-3.5 justify-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00D9A3] to-[#00b386] grid place-items-center text-black shrink-0">
                  <Bot size={17} />
                </div>
                <div className="bg-[#0b1020] border border-white/[0.08] rounded-2xl p-4 flex items-center gap-3">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-2 h-2 rounded-full bg-[#00D9A3] animate-pulse" />
                    <span className="w-2 h-2 rounded-full bg-[#00D9A3] animate-pulse delay-150" />
                    <span className="w-2 h-2 rounded-full bg-[#00D9A3] animate-pulse delay-300" />
                  </div>
                  <span className="text-xs text-white/50">
                    ZYNTHEOR INTELLIGENCE กำลังประมวลผลคำขอ...
                  </span>
                  <button
                    onClick={handleStop}
                    className="ml-4 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 border border-red-500/30 px-2 py-1 rounded-lg"
                  >
                    <Square size={10} />
                    หยุด
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom Composer Area */}
      <div className="shrink-0 border-t border-white/[0.08] bg-[#070a14] p-4 sm:p-5">
        <div className="max-w-3xl mx-auto space-y-3">
          <form onSubmit={handleSubmit} className="zy-composer p-2.5 sm:p-3 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="พิมพ์คำถาม หรือข้อความสำหรับ ZYNTHEOR INTELLIGENCE (กด Enter เพื่อส่ง)..."
              rows={2}
              className="w-full resize-none text-sm p-1 leading-6 placeholder:text-white/30"
              disabled={isLoading}
            />

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] mt-2">
              <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={grounding}
                  onChange={(e) => setGrounding(e.target.checked)}
                  className="accent-[#00D9A3]"
                />
                <Globe
                  size={14}
                  className={grounding ? 'text-[#00D9A3]' : 'text-white/30'}
                />
                <span className={grounding ? 'text-white' : 'text-white/50'}>
                  Internet Intelligence (Grounding)
                </span>
              </label>

              <div className="flex items-center gap-2">
                {isLoading ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="h-9 px-4 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 font-bold text-xs flex items-center gap-1.5 hover:bg-red-500/30 transition"
                  >
                    <Square size={12} />
                    Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="h-9 px-5 rounded-full bg-[#00D9A3] text-black font-bold text-xs flex items-center gap-1.5 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <Send size={13} />
                    Send
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="flex items-center justify-between text-[11px] text-white/30 px-1">
            <span>Sovereign First-Party Intelligence Platform</span>
            <span>Shift + Enter สำหรับขึ้นบรรทัดใหม่</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainChat;
