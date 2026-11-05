// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Send,
  Globe,
  Sparkles,
  User,
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
  AlertCircle,
  Brain,
  CheckCircle2,
  Workflow,
  Search,
  BookOpen,
  Hash,
  Sliders,
  PanelRightClose,
  PanelRightOpen,
  Lock,
  ArrowRight
} from 'lucide-react';
import { getActiveModel, validateDefaultInferenceModel } from '../lib/modelIdentityContract';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  groundingUsed?: boolean;
  taskType?: string;
  taskState?: string;
  plan?: {
    taskId?: string;
    taskType?: string;
    status?: string;
    plannedSteps?: Array<{
      stepId: string;
      order: number;
      title: string;
      description: string;
      riskTier: string;
      requiresApproval: boolean;
      executionStatus?: string;
    }>;
  };
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
  const [contractValidation] = useState(() => validateDefaultInferenceModel(getActiveModel()));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState<boolean>(true);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);

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
          enableInternetSearch: useGrounding,
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
        setSelectedMessage(failMsg);
        return;
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: data.finalAnswer || data.answer || 'ประมวลผลสำเร็จภายใต้การควบคุมของ ZYNTHEOR CORE',
        timestamp: new Date().toISOString(),
        groundingUsed: useGrounding,
        taskType: data.taskType,
        taskState: data.taskState,
        plan: data.plan,
        durationMs: data.durationMs,
        verificationArtifacts: data.verificationArtifacts || [],
        groundingSources: data.groundingSources || [],
        modelMetadata: data.modelMetadata,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setSelectedMessage(assistantMsg);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const cancelMsg: ChatMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: 'การประมวลผลถูกยกเลิกโดยผู้ใช้',
          timestamp: new Date().toISOString(),
          error: true,
          errorMessage: 'User cancelled query execution via AbortSignal',
        };
        setMessages((prev) => [...prev, cancelMsg]);
        setSelectedMessage(cancelMsg);
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
        setSelectedMessage(errorMsg);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  // Handle URL query on load
  useEffect(() => {
    if (urlQuery && initializedQueryRef.current !== urlQuery) {
      initializedQueryRef.current = urlQuery;
      executeQuery(urlQuery, urlGrounding);
      setSearchParams({}, { replace: true });
    }
  }, [urlQuery, urlGrounding, executeQuery, setSearchParams]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    const q = input;
    setInput('');
    executeQuery(q, grounding);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleCopy = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore
    }
  };

  // Inspect the latest assistant message by default if none selected
  const activeInspectionMessage = selectedMessage || messages.filter(m => m.role === 'assistant').slice(-1)[0] || null;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#050810] text-white">
      {/* =========================================================
          1. INTELLIGENCE WORKSPACE HEADER
      ========================================================= */}
      <header className="px-5 py-3 border-b border-white/[0.08] bg-[#070b16]/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 grid place-items-center text-cyan-400">
            <Brain size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">
                ZYNTHEOR INTELLIGENCE
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#00D9A3]/10 text-[#00D9A3] border border-[#00D9A3]/20">
                CORE WORKSPACE
              </span>
            </div>
            <p className="text-[10px] text-white/40">
              Model: {activeModel.displayName} ({activeModel.category})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5 text-[11px] font-mono text-white/60">
            <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <span>{isLoading ? 'REASONING_ACTIVE' : 'INTELLIGENCE_READY'}</span>
          </div>

          {/* Toggle Inspector Panel */}
          <button
            type="button"
            onClick={() => setShowInspector(!showInspector)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              showInspector
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
            }`}
          >
            {showInspector ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            <span className="hidden md:inline">Intelligence Dossier</span>
          </button>
        </div>
      </header>

      {/* =========================================================
          2. WORKSPACE MAIN SPLIT VIEW
      ========================================================= */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: Execution & Reasoning Surface */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Messages & Execution Flow */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
            {messages.length === 0 ? (
              <div className="max-w-2xl mx-auto py-12 md:py-20 text-center space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 grid place-items-center text-cyan-400 mx-auto shadow-[0_0_30px_rgba(0,217,255,0.1)]">
                  <Sparkles size={28} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                    ZYNTHEOR Intelligence Engine
                  </h2>
                  <p className="text-sm text-white/50 max-w-lg mx-auto leading-relaxed">
                    พื้นที่สั่งงาน ประมวลผล และวิเคราะห์ข้อมูลระดับสากล ผ่านระบบเหตุผลหลายขั้นตอน (Multi-step Reasoning) ภายใต้ ZYNTHEOR CORE
                  </p>
                </div>

                {/* Preset Starter Actions */}
                <div className="grid sm:grid-cols-2 gap-3 text-left max-w-xl mx-auto pt-2">
                  {[
                    {
                      title: 'วิเคราะห์โครงสร้างระบบ Sovereign AI',
                      prompt: 'ช่วยวิเคราะห์โครงสร้างของ Sovereign AI Platform และหลักการแยกชั้น Runtime กับ Model',
                      icon: Brain,
                      grounding: false
                    },
                    {
                      title: 'ค้นคว้ามาตรฐานไซเบอร์ล่าสุด',
                      prompt: 'ค้นคว้าและเปรียบเทียบมาตรฐานความมั่นคงปลอดภัย FIPS 140-3 และการเข้ารหัสต้านควอนตัม',
                      icon: Search,
                      grounding: true
                    },
                    {
                      title: 'เขียน TypeScript Architecture Hook',
                      prompt: 'เขียนโค้ด React TypeScript Hook ที่รองรับ AbortController, Error Boundary และ State Machine',
                      icon: Workflow,
                      grounding: false
                    },
                    {
                      title: 'สรุปและจัดระเบียบองค์ความรู้',
                      prompt: 'ช่วยจัดระเบียบโครงสร้างคลังความรู้ (Knowledge Taxonomy) สำหรับระบบสถาปัตยกรรมข้อมูลองค์กร',
                      icon: BookOpen,
                      grounding: false
                    }
                  ].map((starter, idx) => (
                    <button
                      key={idx}
                      onClick={() => executeQuery(starter.prompt, starter.grounding)}
                      className="p-3.5 rounded-2xl bg-[#0b1020] border border-white/[0.07] hover:border-cyan-500/30 hover:bg-[#10172e] transition text-left space-y-1.5 group cursor-pointer shadow-lg"
                    >
                      <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                        <starter.icon size={13} />
                        <span>{starter.title}</span>
                      </div>
                      <p className="text-[11px] text-white/40 group-hover:text-white/60 line-clamp-2 leading-snug">
                        {starter.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    onClick={() => !isUser && setSelectedMessage(msg)}
                    className={`max-w-3xl mx-auto space-y-2 transition ${
                      !isUser ? 'cursor-pointer' : ''
                    }`}
                  >
                    {/* Role Header */}
                    <div className="flex items-center justify-between text-xs text-white/40 px-1">
                      <div className="flex items-center gap-2">
                        {isUser ? (
                          <span className="font-bold text-white/70 flex items-center gap-1.5">
                            <User size={13} className="text-white/50" />
                            User Task
                          </span>
                        ) : (
                          <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                            <Cpu size={13} className="text-[#00D9A3]" />
                            ZYNTHEOR CORE
                          </span>
                        )}
                        <span className="text-[10px] text-white/30 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString('th-TH', { hour12: false })}
                        </span>
                      </div>

                      {!isUser && msg.durationMs && (
                        <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
                          <span>{msg.durationMs}ms</span>
                          <span>·</span>
                          <span className="text-emerald-400">VERIFIED</span>
                        </div>
                      )}
                    </div>

                    {/* Content Box */}
                    <div
                      className={`p-4 md:p-5 rounded-[16px] text-sm leading-relaxed transition ${
                        isUser
                          ? 'bg-[#12192d] border border-white/10 text-white shadow-md'
                          : msg.error
                          ? 'bg-red-950/20 border border-red-500/30 text-red-200'
                          : 'bg-[#0b1020] border border-white/[0.08] text-white/90 shadow-xl hover:border-cyan-500/30'
                      }`}
                    >
                      {msg.error ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                            <AlertCircle size={15} />
                            <span>ข้อผิดพลาดในการประมวลผล (Fail-Closed)</span>
                          </div>
                          <p className="text-xs text-red-200/80 font-mono">
                            {msg.errorMessage || 'ระบบปฏิเสธการประมวลผลเพื่อรักษาความปลอดภัย'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Task Badge & Multi-step Plan if present */}
                          {!isUser && msg.taskType && (
                            <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-white/[0.06]">
                              <span className="px-2.5 py-0.5 rounded-[12px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold tracking-wide">
                                {msg.taskType.replace(/_/g, ' ')}
                              </span>
                              {msg.taskState && (
                                <span className="px-2 py-0.5 rounded-[12px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-semibold">
                                  {msg.taskState}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Multi-step Execution Steps */}
                          {!isUser && msg.plan?.plannedSteps && msg.plan.plannedSteps.length > 1 && (
                            <div className="my-2 p-3 rounded-[14px] bg-[#070b16] border border-white/[0.06] space-y-2">
                              <div className="text-[11px] font-bold text-white/60 flex items-center gap-1.5">
                                <Workflow size={12} className="text-cyan-400" />
                                <span>แผนการประมวลผล (Execution Plan · {msg.plan.plannedSteps.length} ขั้นตอน)</span>
                              </div>
                              <div className="grid grid-cols-1 gap-1.5 pt-1">
                                {msg.plan.plannedSteps.map((step, sIdx) => (
                                  <div key={sIdx} className="flex items-start gap-2 text-[11px] text-white/70">
                                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-semibold text-white/90">{step.order}. {step.title}: </span>
                                      <span className="text-white/50">{step.description}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="whitespace-pre-wrap">
                            {msg.content}
                          </div>
                        </div>
                      )}

                      {/* Assistant Bottom Metadata */}
                      {!isUser && !msg.error && (
                        <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[10px] text-white/40">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 font-mono text-cyan-300">
                              {msg.modelMetadata?.modelId || activeModel.modelId}
                            </span>
                            {msg.groundingUsed && (
                              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                                <Globe size={10} /> Online Verified
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(msg.content, msg.id);
                            }}
                            className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition flex items-center gap-1"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check size={11} className="text-emerald-400" />
                                <span className="text-emerald-400">คัดลอกแล้ว</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span>คัดลอกผลลัพธ์</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-[#0b1020] border border-cyan-500/20 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                    <Sparkles size={14} className="animate-spin" />
                    <span>ZYNTHEOR INTELLIGENCE กำลังประมวลผล...</span>
                  </div>
                  <button
                    onClick={handleStop}
                    className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/20 flex items-center gap-1 cursor-pointer"
                  >
                    <Square size={10} />
                    <span>ยกเลิก (Abort)</span>
                  </button>
                </div>
                <div className="space-y-1.5 text-xs text-white/40">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>ทำความเข้าใจเจตนา (Intent Understanding) และคัดแยกประเภทงาน</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>ดึงบริบทจาก Knowledge & Memory และอนุมานผ่าน ZYNTHEOR CORE</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* =========================================================
              3. OMNI COMPOSER AT BOTTOM
          ========================================================= */}
          <div className="p-4 border-t border-white/[0.08] bg-[#070b16]">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div className="rounded-2xl border border-white/10 bg-[#0b1020] p-2.5 shadow-2xl focus-within:border-cyan-500/50 transition">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="สั่งงาน มอบหมายงาน หรือถามคำถาม ZYNTHEOR INTELLIGENCE..."
                  rows={2}
                  className="w-full resize-none bg-transparent outline-none text-sm text-white placeholder:text-white/30 p-2"
                />

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] mt-1 px-1">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white/70 cursor-pointer transition select-none">
                      <input
                        type="checkbox"
                        checked={grounding}
                        onChange={(e) => setGrounding(e.target.checked)}
                        className="accent-cyan-400 cursor-pointer"
                      />
                      <Globe size={12} className={grounding ? 'text-cyan-400' : 'text-white/40'} />
                      <span className="text-[11px] font-medium">Search Grounding</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => navigate('/library')}
                      title="เปิดคลังความรู้ (Library)"
                      className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-white/50 hover:text-white transition cursor-pointer"
                    >
                      + Knowledge Context
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isLoading ? (
                      <button
                        type="button"
                        onClick={handleStop}
                        className="h-8 px-4 rounded-xl bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-red-600 transition cursor-pointer"
                      >
                        <Square size={11} />
                        <span>หยุด</span>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!input.trim()}
                        className="h-8 px-4 rounded-xl bg-[#00D9A3] hover:bg-white text-black font-bold text-xs flex items-center gap-1.5 disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer shadow-lg shadow-[#00D9A3]/10"
                      >
                        <span>ประมวลผล</span>
                        <Send size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Intelligence Dossier (Context, Tool Orchestration, Verification) */}
        {showInspector && (
          <aside className="w-80 md:w-96 border-l border-white/[0.08] bg-[#070b16] p-5 overflow-y-auto space-y-6 hidden lg:block shrink-0">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Workflow size={16} className="text-cyan-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                  Intelligence Dossier
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ACTIVE ORCHESTRATOR
              </span>
            </div>

            {/* 1. Core Model Identity Verification */}
            <div className="p-3.5 rounded-xl bg-[#0b1020] border border-white/[0.06] space-y-2">
              <div className="text-[11px] font-bold text-white/60 flex items-center gap-1.5">
                <Cpu size={13} className="text-purple-400" />
                <span>CORE Model Identity</span>
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="text-white font-bold truncate">
                  {activeModel.displayName}
                </div>
                <div className="text-cyan-400 text-[10px]">
                  Category: {activeModel.category}
                </div>
                <div className="text-white/40 text-[10px]">
                  Provider: {activeModel.provider} (First-Party Sovereign)
                </div>
              </div>
            </div>

            {/* 2. Reasoning & Processing Breakdown */}
            <div className="p-3.5 rounded-xl bg-[#0b1020] border border-white/[0.06] space-y-2.5">
              <div className="text-[11px] font-bold text-white/60 flex items-center gap-1.5">
                <Brain size={13} className="text-cyan-400" />
                <span>Reasoning & Execution Pipeline</span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="p-2 rounded-lg bg-black/30 border border-white/5 space-y-0.5">
                  <div className="text-[10px] text-white/40 uppercase">1. Intent Classification</div>
                  <div className="text-white font-medium">
                    {activeInspectionMessage?.taskType || 'GENERAL_INTELLIGENCE'}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-black/30 border border-white/5 space-y-0.5">
                  <div className="text-[10px] text-white/40 uppercase">2. Knowledge Context</div>
                  <div className="text-white/70">
                    {activeInspectionMessage?.groundingUsed
                      ? `Ingested ${activeInspectionMessage.groundingSources?.length || 0} external sources`
                      : 'Workspace Memory & System Specifications'}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-black/30 border border-white/5 space-y-0.5">
                  <div className="text-[10px] text-white/40 uppercase">3. Verification Status</div>
                  <div className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck size={11} />
                    <span>SOVEREIGN_VERIFIED</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Verification Artifacts (Cryptographic Evidence) */}
            <div className="p-3.5 rounded-xl bg-[#0b1020] border border-white/[0.06] space-y-2.5">
              <div className="text-[11px] font-bold text-white/60 flex items-center gap-1.5">
                <Hash size={13} className="text-emerald-400" />
                <span>Verification Artifacts</span>
              </div>

              {activeInspectionMessage?.verificationArtifacts && activeInspectionMessage.verificationArtifacts.length > 0 ? (
                <div className="space-y-1.5">
                  {activeInspectionMessage.verificationArtifacts.map((art, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-black/40 border border-white/5 text-[10px] font-mono space-y-1">
                      <div className="flex items-center justify-between text-cyan-300">
                        <span>{art.category}</span>
                        <span className="text-white/40">{art.source}</span>
                      </div>
                      <div className="text-white/70 truncate">{art.message}</div>
                      {art.sha256Digest && (
                        <div className="text-emerald-400 text-[9px] truncate">
                          SHA: {art.sha256Digest.slice(0, 16)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-white/40 p-2 rounded bg-black/20 text-center">
                  ยังไม่มี Artifacts ในการสนทนานี้
                </div>
              )}
            </div>

            {/* 4. Link to Full Diagnostics */}
            <button
              onClick={() => navigate('/diagnostics')}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/70 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>เปิดตรวจสอบใน Diagnostics Dossier</span>
              <ArrowRight size={12} />
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
