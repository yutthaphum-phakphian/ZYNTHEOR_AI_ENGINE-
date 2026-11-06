// @ts-nocheck
/**
 * ZYNTHEOR AI ENGINE — MAIN CHAT & OMNI COMPOSER
 * ===============================================
 * Online-First Sovereign General Intelligence Workspace
 *
 * Core Capabilities:
 * - Online-First Default: Live Search Grounding & Knowledge Integration
 * - 3 Operating Modes: ONLINE_INTELLIGENCE (Default), HYBRID_INTELLIGENCE, LOCAL_ONLY
 * - Multimodal Omni Composer: Text, Voice (1.1 Web Speech), Document & Code, Vision
 * - Adaptive Reasoning Integration: Real-time complexity inference & parameter tuning
 * - Long-Term Vector Memory: Contextual user preferences & project knowledge recall
 * - Intelligence Dossier: Evidence verification artifacts & model sovereignty proof
 */

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
  ArrowRight,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Mic,
  MicOff,
  X,
  Zap,
  Database,
  Radio,
  FileCode,
  ShieldAlert
} from 'lucide-react';
import { getActiveModel, validateDefaultInferenceModel } from '../lib/modelIdentityContract';
import { useVoiceIntelligenceInput, appendTranscriptWithSmartSpacing } from '../hooks/useVoiceIntelligenceInput';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  operatingMode?: 'ONLINE_INTELLIGENCE' | 'HYBRID_INTELLIGENCE' | 'LOCAL_ONLY';
  groundingUsed?: boolean;
  taskType?: string;
  taskState?: string;
  adaptiveReasoning?: {
    tier: string;
    complexityScore: number;
    tierLabel: string;
    tierLabelThai: string;
    parameters: {
      temperature: number;
      topP: number;
      cotDepth: number;
      reasoningEffort: string;
      executionStrategy: string;
    };
    reasoningPlan: string[];
    explanation: string;
  };
  recalledMemories?: Array<{
    id: string;
    title: string;
    category: string;
    score: number;
  }>;
  multimodalSummary?: {
    documentsCount: number;
    imagesCount: number;
  };
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
  attachedFiles?: Array<{
    name: string;
    type: string;
    size: number;
    isImage?: boolean;
  }>;
  error?: boolean;
  errorMessage?: string;
}

export interface AttachedDoc {
  name: string;
  type: string;
  size: number;
  content?: string;
}

export interface AttachedImg {
  name: string;
  mimeType: string;
  dataUrl: string;
}

export function MainChat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlQuery = searchParams.get('q') || '';
  const urlMode = (searchParams.get('mode') as any) || 'ONLINE_INTELLIGENCE';

  const [input, setInput] = useState('');
  // Online-First Sovereign Platform default
  const [operatingMode, setOperatingMode] = useState<'ONLINE_INTELLIGENCE' | 'HYBRID_INTELLIGENCE' | 'LOCAL_ONLY'>(urlMode);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeModel] = useState(() => getActiveModel());
  const [contractValidation] = useState(() => validateDefaultInferenceModel(getActiveModel()));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState<boolean>(true);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);

  // Multimodal Attachments State
  const [attachedDocs, setAttachedDocs] = useState<AttachedDoc[]>([]);
  const [attachedImgs, setAttachedImgs] = useState<AttachedImg[]>([]);

  const fileDocInputRef = useRef<HTMLInputElement>(null);
  const fileImgInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedQueryRef = useRef<string | null>(null);

  // Voice Intelligence Input 1.1 Integration
  const {
    isListening,
    toggleListening: toggleVoiceInput,
    interimTranscript,
    language: voiceLang,
    setLanguage: setVoiceLang,
    errorMessage: speechError,
  } = useVoiceIntelligenceInput({
    initialLanguage: 'th-TH',
    onFinalTranscript: (finalText: string) => {
      setInput(prev => appendTranscriptWithSmartSpacing(prev, finalText));
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Handle Document Attachment
  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = () => {
        const textContent = typeof reader.result === 'string' ? reader.result : '';
        setAttachedDocs(prev => [
          ...prev,
          {
            name: file.name,
            type: file.name.split('.').pop() || 'text',
            size: file.size,
            content: textContent.slice(0, 50000), // Max 50KB text per file client-side
          },
        ]);
      };
      reader.readAsText(file);
    }
    if (fileDocInputRef.current) fileDocInputRef.current.value = '';
  };

  // Handle Image Attachment
  const handleImgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        setAttachedImgs(prev => [
          ...prev,
          {
            name: file.name,
            mimeType: file.type || 'image/png',
            dataUrl,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
    if (fileImgInputRef.current) fileImgInputRef.current.value = '';
  };

  const removeDoc = (index: number) => {
    setAttachedDocs(prev => prev.filter((_, i) => i !== index));
  };

  const removeImg = (index: number) => {
    setAttachedImgs(prev => prev.filter((_, i) => i !== index));
  };

  // Execute request to ZYNTHEOR INTELLIGENCE Runtime
  const executeQuery = useCallback(
    async (
      queryText: string,
      mode: 'ONLINE_INTELLIGENCE' | 'HYBRID_INTELLIGENCE' | 'LOCAL_ONLY',
      docs: AttachedDoc[],
      imgs: AttachedImg[]
    ) => {
      if (!queryText.trim() && docs.length === 0 && imgs.length === 0) return;

      const userMessageId = `user-${Date.now()}`;
      const userMsg: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content: queryText.trim(),
        timestamp: new Date().toISOString(),
        operatingMode: mode,
        groundingUsed: mode !== 'LOCAL_ONLY',
        attachedFiles: [
          ...docs.map(d => ({ name: d.name, type: d.type, size: d.size, isImage: false })),
          ...imgs.map(img => ({ name: img.name, type: img.mimeType, size: 0, isImage: true })),
        ],
      };

      setMessages(prev => [...prev, userMsg]);
      setIsLoading(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const assistantMessageId = `assist-${Date.now()}`;

      try {
        const isOnline = mode !== 'LOCAL_ONLY';
        const urlGrounding = searchParams.get('grounding');
        const forceGrounding = urlGrounding === '1' || urlGrounding === 'true';
        const enableInternetSearch = isOnline && (urlGrounding === null ? true : forceGrounding);

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
            onlineConsent: isOnline,
            enableInternetSearch,
            isDryRun: false,
            multimodalInputs: {
              documents: docs.map(d => ({ name: d.name, type: d.type, size: d.size, content: d.content })),
              images: imgs.map(img => ({ name: img.name, mimeType: img.mimeType, dataUrl: img.dataUrl })),
            },
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          let errMessage = `HTTP ${res.status}: ${res.statusText}`;
          try {
            const errData = await res.json();
            errMessage = errData.error || errData.message || errMessage;
          } catch {
            // Non-JSON error
          }

          const failMsg: ChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            error: true,
            errorMessage: errMessage,
            operatingMode: mode,
            groundingUsed: isOnline,
          };
          setMessages(prev => [...prev, failMsg]);
          setSelectedMessage(failMsg);
          return;
        }

        const data = await res.json();

        const assistantMsg: ChatMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: data.finalAnswer || data.answer || 'ประมวลผลสำเร็จภายใต้การควบคุมของ ZYNTHEOR INTELLIGENCE',
          timestamp: new Date().toISOString(),
          operatingMode: mode,
          groundingUsed: isOnline,
          taskType: data.taskType,
          taskState: data.taskState,
          adaptiveReasoning: data.adaptiveReasoning,
          recalledMemories: data.recalledMemories || [],
          multimodalSummary: data.multimodalSummary,
          plan: data.plan,
          durationMs: data.durationMs,
          verificationArtifacts: data.verificationArtifacts || [],
          groundingSources: data.groundingSources || [],
          modelMetadata: data.modelMetadata,
        };

        setMessages(prev => [...prev, assistantMsg]);
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
          setMessages(prev => [...prev, cancelMsg]);
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
          setMessages(prev => [...prev, errorMsg]);
          setSelectedMessage(errorMsg);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    []
  );

  // Handle URL query on load
  useEffect(() => {
    if (urlQuery && initializedQueryRef.current !== urlQuery) {
      initializedQueryRef.current = urlQuery;
      executeQuery(urlQuery, operatingMode, [], []);
      setSearchParams({}, { replace: true });
    }
  }, [urlQuery, operatingMode, executeQuery, setSearchParams]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachedDocs.length === 0 && attachedImgs.length === 0) || isLoading) return;
    const q = input;
    const docs = [...attachedDocs];
    const imgs = [...attachedImgs];
    setInput('');
    setAttachedDocs([]);
    setAttachedImgs([]);
    executeQuery(q, operatingMode, docs, imgs);
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

  const activeInspectionMessage = selectedMessage || messages[messages.length - 1];

  return (
    <div className="flex flex-col h-full bg-[#050810] text-white">
      {/* =========================================================
          1. HEADER & OPERATING MODE CONTROL
      ========================================================= */}
      <header className="h-14 border-b border-white/[0.08] px-4 md:px-6 flex items-center justify-between bg-[#080d1a]/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00D9A3] to-[#00b386] grid place-items-center text-black font-black text-xs shadow-lg shadow-[#00D9A3]/20">
            Z
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">ZYNTHEOR INTELLIGENCE</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Online-First Sovereign
              </span>
            </div>
            <div className="text-[11px] text-white/40 flex items-center gap-1.5 font-mono">
              <span>{activeModel.displayName}</span>
              <span>•</span>
              <span className="text-emerald-400">Verifiable Sovereign Truth</span>
            </div>
          </div>
        </div>

        {/* 3-Mode Operating Switcher */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center bg-[#0b1020] border border-white/10 rounded-xl p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setOperatingMode('ONLINE_INTELLIGENCE')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                operatingMode === 'ONLINE_INTELLIGENCE'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 shadow'
                  : 'text-white/40 hover:text-white'
              }`}
              title="Online Intelligence (Default): ค้นคว้าข้อมูลสดทั่วโลกและเข้าถึง Cloud Models"
            >
              <Globe size={13} className={operatingMode === 'ONLINE_INTELLIGENCE' ? 'text-cyan-400' : ''} />
              <span>Online Intelligence</span>
            </button>

            <button
              type="button"
              onClick={() => setOperatingMode('HYBRID_INTELLIGENCE')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                operatingMode === 'HYBRID_INTELLIGENCE'
                  ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 shadow'
                  : 'text-white/40 hover:text-white'
              }`}
              title="Hybrid Intelligence: ผสาน ZYNTHEOR CORE เข้ากับข้อมูลออนไลน์สด"
            >
              <Zap size={13} className={operatingMode === 'HYBRID_INTELLIGENCE' ? 'text-purple-400' : ''} />
              <span>Hybrid</span>
            </button>

            <button
              type="button"
              onClick={() => setOperatingMode('LOCAL_ONLY')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                operatingMode === 'LOCAL_ONLY'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 shadow'
                  : 'text-white/40 hover:text-white'
              }`}
              title="Local-Only (Privacy): ประมวลผลภายในอุปกรณ์เท่านั้น ปิดกั้นเครือข่ายภายนอก 100%"
            >
              <Lock size={13} className={operatingMode === 'LOCAL_ONLY' ? 'text-amber-400' : ''} />
              <span>Local-Only</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowInspector(!showInspector)}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              showInspector
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
            }`}
            title={showInspector ? 'ซ่อน Intelligence Dossier' : 'แสดง Intelligence Dossier'}
          >
            {showInspector ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>
        </div>
      </header>

      {/* =========================================================
          2. WORKSPACE BODY: CONVERSATION + DOSSIER INSPECTOR
      ========================================================= */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Main Conversation Stream */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#050810]">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#00D9A3]/20 to-cyan-500/10 border border-[#00D9A3]/30 grid place-items-center shadow-2xl">
                  <Brain size={32} className="text-[#00D9A3]" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    ZYNTHEOR AI ENGINE
                  </h2>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Sovereign General Intelligence Platform — ใช้งานความสามารถในการค้นคว้า ให้เหตุผล 
                    ทำความเข้าใจเอกสาร และประมวลผลงานผ่าน Intelligence Core
                  </p>
                </div>

                {/* Quick Capability Prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                  {[
                    {
                      label: 'ค้นคว้าความรู้สด (Online Research)',
                      icon: Globe,
                      color: 'text-cyan-400',
                      query: 'ช่วยค้นคว้าความคืบหน้าล่าสุดเกี่ยวกับ Quantum Computing และ AI ในปี 2026',
                    },
                    {
                      label: 'วิเคราะห์ตรรกะเชิงลึก (Deep Reasoning)',
                      icon: Brain,
                      color: 'text-purple-400',
                      query: 'ช่วยวิเคราะห์ trade-offs และข้อดีข้อเสียระหว่าง Microservices กับ Modular Monolith',
                    },
                    {
                      label: 'ประมวลผลเอกสาร & โค้ด (Doc Intelligence)',
                      icon: FileText,
                      color: 'text-emerald-400',
                      query: 'ช่วยอธิบายสถาปัตยกรรมและโครงสร้างไฟล์ของ ZYNTHEOR AI ENGINE ใน server.ts',
                    },
                    {
                      label: 'ตรวจสอบความถูกต้อง (Truth & Verification)',
                      icon: ShieldCheck,
                      color: 'text-amber-400',
                      query: 'อธิบายหลักการ Sovereign Truth Principle และการป้องกันโมเดลภายนอกแอบอ้างเป็น CORE',
                    },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => executeQuery(item.query, operatingMode, [], [])}
                        className="p-3 rounded-2xl bg-[#0b1020] border border-white/5 hover:border-cyan-500/30 hover:bg-[#0f1629] text-xs transition cursor-pointer text-left space-y-1 group"
                      >
                        <div className="flex items-center gap-2 font-bold text-white group-hover:text-cyan-300">
                          <Icon size={14} className={item.color} />
                          <span>{item.label}</span>
                        </div>
                        <p className="text-[11px] text-white/40 line-clamp-1">{item.query}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              messages.map(msg => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`max-w-3xl mx-auto flex gap-3.5 transition cursor-pointer ${
                      selectedMessage?.id === msg.id ? 'ring-1 ring-cyan-500/40 rounded-2xl p-2 bg-white/[0.02]' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                        isUser
                          ? 'bg-white/10 text-white'
                          : 'bg-gradient-to-br from-[#00D9A3] to-[#00b386] text-black shadow-md shadow-[#00D9A3]/20'
                      }`}
                    >
                      {isUser ? <User size={15} /> : <Brain size={15} />}
                    </div>

                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center justify-between text-[11px] text-white/40 font-mono">
                        <span className="font-bold text-white/70">
                          {isUser ? 'USER COMMAND' : 'ZYNTHEOR INTELLIGENCE'}
                        </span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      </div>

                      {/* Attached Files Badges for User Message */}
                      {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pb-1">
                          {msg.attachedFiles.map((f, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/10 text-[10px] text-cyan-300 font-mono"
                            >
                              {f.isImage ? <ImageIcon size={10} /> : <FileText size={10} />}
                              <span>{f.name}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Assistant Adaptive Reasoning Card if Present */}
                      {!isUser && msg.adaptiveReasoning && (
                        <div className="p-2.5 rounded-xl bg-[#0b1020] border border-cyan-500/20 text-xs font-mono space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                              <Zap size={12} />
                              <span>{msg.adaptiveReasoning.tierLabel}</span>
                            </span>
                            <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded">
                              Complexity: {msg.adaptiveReasoning.complexityScore}/100
                            </span>
                          </div>
                          <div className="text-[10px] text-white/40 flex flex-wrap gap-2">
                            <span>Temp: {msg.adaptiveReasoning.parameters.temperature}</span>
                            <span>•</span>
                            <span>CoT Depth: {msg.adaptiveReasoning.parameters.cotDepth} steps</span>
                            <span>•</span>
                            <span>Effort: {msg.adaptiveReasoning.parameters.reasoningEffort}</span>
                          </div>
                        </div>
                      )}

                      {/* Recalled Memory Badge */}
                      {!isUser && msg.recalledMemories && msg.recalledMemories.length > 0 && (
                        <div className="p-2 rounded-xl bg-purple-950/20 border border-purple-500/20 text-[11px] font-mono flex items-center gap-2 text-purple-300">
                          <Database size={13} className="text-purple-400 shrink-0" />
                          <span className="truncate">
                            Recalled {msg.recalledMemories.length} long-term memories ({msg.recalledMemories[0].title})
                          </span>
                        </div>
                      )}

                      {/* Content Box */}
                      <div
                        className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap select-text ${
                          isUser
                            ? 'bg-[#0b1020] border border-white/[0.08] text-white'
                            : msg.error
                            ? 'bg-red-950/30 border border-red-500/30 text-red-200'
                            : 'bg-[#0b1020]/70 border border-white/[0.06] text-white/90 shadow-xl'
                        }`}
                      >
                        {msg.content || msg.errorMessage}
                      </div>

                      {/* Grounding Sources Chips */}
                      {msg.groundingSources && msg.groundingSources.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[10px] font-mono uppercase text-cyan-400 flex items-center gap-1">
                            <Globe size={11} />
                            <span>Verified Grounding Sources ({msg.groundingSources.length})</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.groundingSources.map((src, idx) => (
                              <a
                                key={idx}
                                href={src.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-[11px] text-cyan-300 hover:text-white transition"
                              >
                                <span>{src.title}</span>
                                <ExternalLink size={10} />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Bar */}
                      {!isUser && (
                        <div className="flex items-center gap-2 pt-1 text-xs">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center gap-1 transition cursor-pointer text-[10px]"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check size={11} className="text-emerald-400" />
                                <span>คัดลอกแล้ว</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span>คัดลอกคำตอบ</span>
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
                    <span>ทำความเข้าใจเจตนา (Intent) และปรับแต่งพารามิเตอร์ผ่าน Adaptive Reasoning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>ค้นหาบริบทจาก Long-Term Vector Memory & Verified Online Knowledge</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* =========================================================
              3. MULTIMODAL OMNI COMPOSER AT BOTTOM
          ========================================================= */}
          <div className="p-4 border-t border-white/[0.08] bg-[#070b16]">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div className="rounded-2xl border border-white/10 bg-[#0b1020] p-2.5 shadow-2xl focus-within:border-cyan-500/50 transition">
                {/* Attached Files Preview Chips */}
                {(attachedDocs.length > 0 || attachedImgs.length > 0) && (
                  <div className="flex flex-wrap gap-2 p-2 border-b border-white/[0.06] mb-2">
                    {attachedDocs.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200"
                      >
                        <FileText size={13} className="text-cyan-400" />
                        <span className="font-mono text-[11px] truncate max-w-[140px]">{doc.name}</span>
                        <span className="text-[9px] text-white/40">({(doc.size / 1024).toFixed(1)}KB)</span>
                        <button
                          type="button"
                          onClick={() => removeDoc(idx)}
                          className="hover:text-red-400 p-0.5 cursor-pointer ml-1"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}

                    {attachedImgs.map((img, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200"
                      >
                        <img src={img.dataUrl} alt={img.name} className="w-5 h-5 rounded object-cover" />
                        <span className="font-mono text-[11px] truncate max-w-[120px]">{img.name}</span>
                        <button
                          type="button"
                          onClick={() => removeImg(idx)}
                          className="hover:text-red-400 p-0.5 cursor-pointer ml-1"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Voice Interim Transcript Banner */}
                {isListening && interimTranscript && (
                  <div className="p-2 mb-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-pulse">
                    <Mic size={14} className="text-emerald-400 shrink-0" />
                    <span>กำลังฟัง: "{interimTranscript}"</span>
                  </div>
                )}

                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder={
                    isListening
                      ? 'กำลังรับเสียงพูดแบบเรียลไทม์ (Web Speech Input 1.1)...'
                      : 'สั่งงาน ถามคำถาม หรือแนบเอกสารและรูปภาพให้ ZYNTHEOR INTELLIGENCE...'
                  }
                  rows={2}
                  className="w-full resize-none bg-transparent outline-none text-sm text-white placeholder:text-white/30 p-2"
                />

                {/* Hidden File Inputs */}
                <input
                  type="file"
                  ref={fileDocInputRef}
                  onChange={handleDocUpload}
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.md,.json,.csv,.ts,.tsx,.py,.sql"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={fileImgInputRef}
                  onChange={handleImgUpload}
                  multiple
                  accept="image/*"
                  className="hidden"
                />

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] mt-1 px-1">
                  {/* Left: Multimodal Attachment Tools */}
                  <div className="flex items-center gap-1.5">
                    {/* Voice Mic Button */}
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      className={`h-8 px-2.5 rounded-xl border flex items-center gap-1.5 text-xs transition cursor-pointer ${
                        isListening
                          ? 'bg-emerald-500 text-black font-bold border-emerald-400 animate-pulse'
                          : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
                      }`}
                      title={isListening ? 'กดเพื่อหยุดรับเสียง' : 'พูดคำสั่งเสียง (Voice Input 1.1)'}
                    >
                      {isListening ? <MicOff size={13} /> : <Mic size={13} />}
                      <span className="hidden sm:inline">{isListening ? 'กำลังฟัง...' : 'เสียง'}</span>
                    </button>

                    {/* Document Upload Button */}
                    <button
                      type="button"
                      onClick={() => fileDocInputRef.current?.click()}
                      className="h-8 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                      title="แนบเอกสาร (PDF, TXT, DOCX, Code)"
                    >
                      <Paperclip size={13} />
                      <span className="hidden sm:inline">เอกสาร</span>
                    </button>

                    {/* Image Upload Button */}
                    <button
                      type="button"
                      onClick={() => fileImgInputRef.current?.click()}
                      className="h-8 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                      title="แนบรูปภาพ (Vision Input)"
                    >
                      <ImageIcon size={13} />
                      <span className="hidden sm:inline">รูปภาพ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/library')}
                      title="เปิดคลังความรู้ (Library & Memory)"
                      className="h-8 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/50 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Database size={13} />
                      <span className="hidden sm:inline">Memory</span>
                    </button>
                  </div>

                  {/* Right: Submit Button */}
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
                        disabled={!input.trim() && attachedDocs.length === 0 && attachedImgs.length === 0}
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

        {/* =========================================================
            4. RIGHT INSPECTOR: INTELLIGENCE DOSSIER
        ========================================================= */}
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

            {/* 1. Operating Mode & Model Identity */}
            <div className="p-3.5 rounded-xl bg-[#0b1020] border border-white/[0.06] space-y-2">
              <div className="text-[11px] font-bold text-white/60 flex items-center gap-1.5">
                <Globe size={13} className="text-cyan-400" />
                <span>Operating Mode & Routing</span>
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="text-white font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{operatingMode}</span>
                </div>
                <div className="text-cyan-400 text-[10px]">
                  Model: {activeModel.displayName}
                </div>
                <div className="text-white/40 text-[10px]">
                  Category: {activeModel.category} (Sovereign Verified)
                </div>
              </div>
            </div>

            {/* 2. Adaptive Reasoning Calibration */}
            <div className="p-3.5 rounded-xl bg-[#0b1020] border border-white/[0.06] space-y-2.5">
              <div className="text-[11px] font-bold text-white/60 flex items-center gap-1.5">
                <Brain size={13} className="text-purple-400" />
                <span>Adaptive Reasoning Engine</span>
              </div>

              {activeInspectionMessage?.adaptiveReasoning ? (
                <div className="space-y-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-black/40 border border-white/5 space-y-1">
                    <div className="text-[10px] text-white/40 uppercase">Complexity Tier</div>
                    <div className="text-purple-300 font-bold">
                      {activeInspectionMessage.adaptiveReasoning.tierLabel} ({activeInspectionMessage.adaptiveReasoning.complexityScore}/100)
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="p-1.5 rounded bg-black/30 border border-white/5">
                      <span className="text-white/40">Temp: </span>
                      <span className="text-white font-bold">{activeInspectionMessage.adaptiveReasoning.parameters.temperature}</span>
                    </div>
                    <div className="p-1.5 rounded bg-black/30 border border-white/5">
                      <span className="text-white/40">CoT: </span>
                      <span className="text-white font-bold">{activeInspectionMessage.adaptiveReasoning.parameters.cotDepth} steps</span>
                    </div>
                  </div>

                  {activeInspectionMessage.adaptiveReasoning.reasoningPlan && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-white/40 uppercase">Reasoning Stages</div>
                      <div className="space-y-1">
                        {activeInspectionMessage.adaptiveReasoning.reasoningPlan.map((stage, idx) => (
                          <div key={idx} className="p-1.5 rounded bg-black/30 border border-white/5 text-[10px] text-white/70 flex items-center gap-1.5">
                            <span className="text-purple-400 font-bold">{idx + 1}.</span>
                            <span>{stage}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-white/40 p-2 rounded bg-black/20 text-center font-mono">
                  Adaptive parameters calibrate dynamically per message
                </div>
              )}
            </div>

            {/* 3. Long-Term Vector Memory Recall */}
            <div className="p-3.5 rounded-xl bg-[#0b1020] border border-white/[0.06] space-y-2.5">
              <div className="text-[11px] font-bold text-white/60 flex items-center gap-1.5">
                <Database size={13} className="text-emerald-400" />
                <span>Long-Term Vector Memory</span>
              </div>

              {activeInspectionMessage?.recalledMemories && activeInspectionMessage.recalledMemories.length > 0 ? (
                <div className="space-y-1.5">
                  {activeInspectionMessage.recalledMemories.map((mem, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-black/40 border border-white/5 text-[10px] font-mono space-y-0.5">
                      <div className="flex items-center justify-between text-emerald-300">
                        <span className="truncate">{mem.title}</span>
                        <span className="text-white/40">{(mem.score * 100).toFixed(0)}%</span>
                      </div>
                      <div className="text-white/40 text-[9px] uppercase">{mem.category}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-white/40 p-2 rounded bg-black/20 text-center font-mono">
                  Contextual memories indexed across sessions
                </div>
              )}
            </div>

            {/* 4. Verification Artifacts (Cryptographic Evidence) */}
            <div className="p-3.5 rounded-xl bg-[#0b1020] border border-white/[0.06] space-y-2.5">
              <div className="text-[11px] font-bold text-white/60 flex items-center gap-1.5">
                <Hash size={13} className="text-cyan-400" />
                <span>Verification Evidence</span>
              </div>

              {activeInspectionMessage?.verificationArtifacts && activeInspectionMessage.verificationArtifacts.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {activeInspectionMessage.verificationArtifacts.map((art, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-black/40 border border-white/5 text-[10px] font-mono space-y-0.5">
                      <div className="flex items-center justify-between text-cyan-300">
                        <span>{art.category}</span>
                        <span className="text-white/40 truncate max-w-[100px]">{art.source}</span>
                      </div>
                      <div className="text-white/70 line-clamp-2">{art.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-white/40 p-2 rounded bg-black/20 text-center font-mono">
                  ยังไม่มี Artifacts ในการสนทนานี้
                </div>
              )}
            </div>

            {/* 5. Link to Diagnostics */}
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
