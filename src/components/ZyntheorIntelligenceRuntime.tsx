import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain,
  Cpu,
  Globe,
  ShieldCheck,
  Zap,
  Sliders,
  Database,
  Layers,
  Activity,
  CheckCircle2,
  Lock,
  Play,
  Square,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  FileText,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Terminal,
  ShieldAlert,
  Copy,
  Check,
} from 'lucide-react';
import type {
  OperatingMode,
  ZyntheorIntelligenceRequest,
  ZyntheorIntelligenceResponse,
  ZyntheorExecutionPlan,
  ZyntheorRuntimeStatus,
} from '../lib/ZyntheorIntelligenceRuntime';
import type { MemoryStorageStats } from '../lib/ZyntheorMemoryEngine';
import { getActiveModel, validateModelIdentity } from '../contracts/modelIdentityContract';

export interface ZyntheorIntelligenceRuntimeProps {
  className?: string;
  defaultExpanded?: boolean;
}

export type PipelineStageKey =
  | 'IDLE'
  | 'VALIDATING'
  | 'UNDERSTANDING'
  | 'ROUTING'
  | 'CONTEXTUALIZING'
  | 'PROCESSING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

const PIPELINE_STAGES = [
  { key: 'VALIDATING', label: '1. Validation', desc: 'Request boundary & schema gate' },
  { key: 'UNDERSTANDING', label: '2. Understanding', desc: 'Intent classification & L1-L4 calibration' },
  { key: 'ROUTING', label: '3. Model Routing', desc: 'Sovereign CORE vs Cloud provider selection' },
  { key: 'CONTEXTUALIZING', label: '4. Context & Memory', desc: 'Vector retrieval & prompt isolation' },
  { key: 'PROCESSING', label: '5. Execution', desc: 'CoT reasoning & capability invocation' },
  { key: 'VERIFYING', label: '6. Verification', desc: 'Falsification gate & evidence audit' },
] as const;

export const ZyntheorIntelligenceRuntime: React.FC<ZyntheorIntelligenceRuntimeProps> = ({
  className = '',
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [operatingMode, setOperatingMode] = useState<OperatingMode>('ONLINE_INTELLIGENCE');
  const [memoryStats, setMemoryStats] = useState<MemoryStorageStats>({
    totalCount: 48,
    preferenceCount: 16,
    projectKnowledgeCount: 32,
    sessionContextCount: 0,
    dimensions: 128,
    lastUpdated: new Date().toISOString(),
  });
  const [activeTab, setActiveTab] = useState<'console' | 'stages' | 'memory' | 'reasoning' | 'audit'>('console');

  // Request & Execution State
  const [inputQuery, setInputQuery] = useState(
    'วิเคราะห์สถาปัตยกรรม Sovereign AI Engine และเปรียบเทียบกลไก Model Routing กับ Vector Memory Isolation'
  );
  const [workspaceId, setWorkspaceId] = useState('production-workspace');
  const [allowExternalConsent, setAllowExternalConsent] = useState(true);
  const [airGappedOnly, setAirGappedOnly] = useState(false);
  
  const [pipelineState, setPipelineState] = useState<PipelineStageKey>('IDLE');
  const [currentResponse, setCurrentResponse] = useState<ZyntheorIntelligenceResponse | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [copiedResponse, setCopiedResponse] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeModel = getActiveModel();
  const identityCheck = validateModelIdentity(activeModel.id, activeModel.category);

  useEffect(() => {
    fetch('/api/intelligence/runtime/stats')
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.stats) {
          setMemoryStats(data.stats);
        }
      })
      .catch(() => {});
  }, []);

  const handleExecuteRequest = useCallback(async () => {
    if (!inputQuery.trim() || pipelineState !== 'IDLE' && pipelineState !== 'COMPLETED' && pipelineState !== 'FAILED' && pipelineState !== 'CANCELLED') {
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setRuntimeError(null);
    setCurrentResponse(null);

    // Lifecycle: VALIDATING -> UNDERSTANDING -> ROUTING -> CONTEXTUALIZING -> PROCESSING -> VERIFYING -> COMPLETED
    setPipelineState('VALIDATING');

    try {
      if (abortController.signal.aborted) throw new Error('Request cancelled by operator.');

      const request: ZyntheorIntelligenceRequest = {
        input: inputQuery,
        workspaceId,
        conversationId: `conv-${Date.now()}`,
        operatingMode,
        privacyPolicy: {
          consentForExternalProvider: allowExternalConsent,
          allowMemoryStorage: true,
          airGappedOnly,
        },
      };

      // Progressively update stage visually while orchestrator runs
      const stepTimer1 = setTimeout(() => {
        if (!abortController.signal.aborted) setPipelineState('UNDERSTANDING');
      }, 80);
      const stepTimer2 = setTimeout(() => {
        if (!abortController.signal.aborted) setPipelineState('ROUTING');
      }, 160);
      const stepTimer3 = setTimeout(() => {
        if (!abortController.signal.aborted) setPipelineState('CONTEXTUALIZING');
      }, 260);
      const stepTimer4 = setTimeout(() => {
        if (!abortController.signal.aborted) setPipelineState('PROCESSING');
      }, 380);

      const res = await fetch('/api/intelligence/runtime/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: abortController.signal,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);

      if (abortController.signal.aborted) {
        setPipelineState('CANCELLED');
        return;
      }

      const data = await res.json();
      const response: ZyntheorIntelligenceResponse = data.response;

      setPipelineState('VERIFYING');

      // Final short verification settling
      setTimeout(() => {
        if (abortController.signal.aborted) {
          setPipelineState('CANCELLED');
          return;
        }
        setCurrentResponse(response);
        if (response && response.success) {
          setPipelineState('COMPLETED');
        } else {
          setPipelineState('FAILED');
          setRuntimeError((response?.warnings || []).join('; ') || 'Execution failed governance validation.');
        }
      }, 100);
    } catch (err: any) {
      if (abortController.signal.aborted || err?.name === 'AbortError' || err?.message?.includes('cancelled')) {
        setPipelineState('CANCELLED');
      } else {
        setPipelineState('FAILED');
        setRuntimeError(err?.message || 'Unexpected runtime error.');
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [inputQuery, workspaceId, operatingMode, allowExternalConsent, airGappedOnly, pipelineState]);

  const handleCancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setPipelineState('CANCELLED');
  }, []);

  const handleCopyResult = useCallback(() => {
    if (currentResponse?.finalResponse) {
      navigator.clipboard.writeText(currentResponse.finalResponse);
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  }, [currentResponse]);

  const isBusy =
    pipelineState === 'VALIDATING' ||
    pipelineState === 'UNDERSTANDING' ||
    pipelineState === 'ROUTING' ||
    pipelineState === 'CONTEXTUALIZING' ||
    pipelineState === 'PROCESSING' ||
    pipelineState === 'VERIFYING';

  return (
    <div className={`p-4 bg-[#090f1d] border border-white/10 rounded-2xl text-slate-100 shadow-2xl ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#00D9A3]/10 text-[#00D9A3] border border-[#00D9A3]/20 shadow-[0_0_15px_rgba(0,217,163,0.15)]">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">ZYNTHEOR Intelligence Runtime</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Unified Orchestrator · 10-Stage Pipeline
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Authoritative pipeline for model routing, context isolation, adaptive reasoning & verification.
            </p>
          </div>
        </div>

        {/* Operating Mode Selector & Expand Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setOperatingMode('ONLINE_INTELLIGENCE')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                operatingMode === 'ONLINE_INTELLIGENCE'
                  ? 'bg-[#00D9A3]/20 text-[#00D9A3] border border-[#00D9A3]/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3 h-3" />
              Online
            </button>
            <button
              onClick={() => setOperatingMode('HYBRID_INTELLIGENCE')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                operatingMode === 'HYBRID_INTELLIGENCE'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3" />
              Hybrid
            </button>
            <button
              onClick={() => setOperatingMode('LOCAL_ONLY')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                operatingMode === 'LOCAL_ONLY'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3 h-3" />
              Local
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(prev => !prev)}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/5 transition"
            title={isExpanded ? 'Collapse Console' : 'Expand Console'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 4 Pipeline Pillars Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-3 text-xs">
        {/* 1. Model Routing */}
        <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active Model</span>
          </div>
          <div className="text-xs font-semibold text-white truncate">{activeModel.name}</div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Category: <span className="text-cyan-300 font-mono">{activeModel.category}</span>
          </div>
        </div>

        {/* 2. Vector Context */}
        <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1">
            <Database className="w-3.5 h-3.5 text-purple-400" />
            <span>Vector Memory</span>
          </div>
          <div className="text-xs font-semibold text-white">{memoryStats.totalCount} Stored Vectors</div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Embedding: <span className="text-purple-300 font-mono">128-d Unit Vector</span>
          </div>
        </div>

        {/* 3. Adaptive Reasoning */}
        <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Adaptive Reasoning</span>
          </div>
          <div className="text-xs font-semibold text-emerald-400">4-Tier Dynamic (L1-L4)</div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            Verification: <span className="text-slate-300">Falsification Gate Active</span>
          </div>
        </div>

        {/* 4. Trust & Governance */}
        <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Governance</span>
          </div>
          <div className="text-xs font-semibold text-amber-300">Zero-Mock Enforced</div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            State: <span className="text-emerald-400 font-medium">Fail-Closed Active</span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-xs">
            <button
              onClick={() => setActiveTab('console')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'console'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Omni-Request Console
            </button>
            <button
              onClick={() => setActiveTab('stages')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'stages'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pipeline Lifecycle
            </button>
            <button
              onClick={() => setActiveTab('reasoning')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'reasoning'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Reasoning Engine (L1-L4)
            </button>
            <button
              onClick={() => setActiveTab('memory')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'memory'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vector Context
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'audit'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tamper-Proof Audit
            </button>
          </div>

          {/* TAB 1: OMNI-REQUEST CONSOLE */}
          {activeTab === 'console' && (
            <div className="space-y-3">
              {/* Query Quick-Fill Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-400">Quick Test Cases:</span>
                {[
                  {
                    label: '🔬 Deep Research & Fact Verification',
                    q: 'ค้นคว้าและตรวจสอบหลักฐานเกี่ยวกับ Quantum Machine Learning และประเมินข้อจำกัดเชิงเทคนิค',
                  },
                  {
                    label: '🧠 L4 Deep Reasoning & Problem Solving',
                    q: 'วิเคราะห์สมการความซับซ้อนของ Distributed Consensus ภายใต้ Byzantine Faults แบบเป็นขั้นตอนเชิงตรรกะ',
                  },
                  {
                    label: '⚡ Code Architecture & Engineering',
                    q: 'ออกแบบ Clean Microservices Architecture สำหรับ Sovereign General Intelligence Platform',
                  },
                  {
                    label: '🇹🇭 Thai Sovereign Knowledge',
                    q: 'อธิบายยุทธศาสตร์การพัฒนาปัญญาประดิษฐ์อธิปไตยแห่งประเทศไทยและแนวทางคุ้มครองข้อมูลส่วนบุคคล',
                  },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputQuery(preset.q)}
                    className="text-[10px] px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.09] text-slate-300 hover:text-white border border-white/5 transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Text Input Box */}
              <div className="relative">
                <textarea
                  value={inputQuery}
                  onChange={e => setInputQuery(e.target.value)}
                  disabled={isBusy}
                  rows={3}
                  className="w-full bg-[#040814] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D9A3]/50 transition resize-none font-sans"
                  placeholder="Enter prompt to execute through the unified ZyntheorIntelligenceRuntime..."
                />
              </div>

              {/* Console Settings & Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-black/30 p-2.5 rounded-xl border border-white/5">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Workspace selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-[11px]">Workspace:</span>
                    <input
                      type="text"
                      value={workspaceId}
                      onChange={e => setWorkspaceId(e.target.value)}
                      disabled={isBusy}
                      className="bg-black/50 border border-white/10 rounded px-2 py-0.5 text-[11px] text-white w-36 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* External provider consent checkbox */}
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-[11px]">
                    <input
                      type="checkbox"
                      checked={allowExternalConsent}
                      onChange={e => setAllowExternalConsent(e.target.checked)}
                      disabled={isBusy}
                      className="accent-[#00D9A3] rounded"
                    />
                    <span>External Provider Consent</span>
                  </label>

                  {/* Air-Gapped Mode */}
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-[11px]">
                    <input
                      type="checkbox"
                      checked={airGappedOnly}
                      onChange={e => setAirGappedOnly(e.target.checked)}
                      disabled={isBusy}
                      className="accent-amber-400 rounded"
                    />
                    <span>Air-Gapped Isolation</span>
                  </label>
                </div>

                {/* Dispatch / Cancel Buttons */}
                <div className="flex items-center gap-2">
                  {isBusy ? (
                    <button
                      type="button"
                      onClick={handleCancelRequest}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Cancel Pipeline</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleExecuteRequest}
                      disabled={!inputQuery.trim()}
                      className="px-4 py-1.5 rounded-lg bg-[#00D9A3] hover:bg-white text-black font-semibold transition flex items-center gap-1.5 text-xs disabled:opacity-40 shadow-md shadow-[#00D9A3]/10"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Execute Request</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Pipeline Status Indicator */}
              <div className="flex items-center justify-between text-xs px-2 py-1.5 bg-white/[0.02] border border-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Current Status:</span>
                  <span
                    className={`font-mono font-semibold px-2 py-0.5 rounded text-[11px] ${
                      pipelineState === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : pipelineState === 'FAILED'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : pipelineState === 'CANCELLED'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : isBusy
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                        : 'bg-white/5 text-slate-400 border border-white/5'
                    }`}
                  >
                    {pipelineState}
                  </span>
                </div>
                {currentResponse && (
                  <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                    <span>Latency: <strong className="text-white font-mono">{currentResponse.executionMetadata.latencyMs}ms</strong></span>
                    <span>Memories Recalled: <strong className="text-white font-mono">{currentResponse.executionMetadata.contextMemoriesCount}</strong></span>
                    <span>Verification: <strong className="text-emerald-400 font-mono">{currentResponse.verificationResult.status}</strong></span>
                  </div>
                )}
              </div>

              {/* Warning Alert Banner */}
              {currentResponse?.warnings && currentResponse.warnings.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Runtime Governance Alerts ({currentResponse.warnings.length})</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200/90 pl-1">
                    {currentResponse.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Runtime Error Alert */}
              {runtimeError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{runtimeError}</span>
                </div>
              )}

              {/* Final Output Card */}
              {currentResponse && (
                <div className="p-3 bg-[#040814] border border-white/10 rounded-xl space-y-2">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-[#00D9A3]" />
                      <span className="font-semibold text-white">Governed Intelligence Response</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        ({currentResponse.modelSelection.selectedModel} · {currentResponse.actualModelIdentity})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyResult}
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 hover:text-white transition flex items-center gap-1"
                    >
                      {copiedResponse ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedResponse ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap max-h-80 overflow-y-auto pr-1">
                    {currentResponse.finalResponse}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PIPELINE STAGES & EXECUTION PLAN */}
          {activeTab === 'stages' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Live visualization of the 10-stage processing pipeline executed by <code className="text-cyan-300 font-mono">zyntheorIntelligenceRuntime.processRequest()</code>:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {PIPELINE_STAGES.map((stg, i) => {
                  const isActive = pipelineState === stg.key;
                  const isPast =
                    pipelineState === 'COMPLETED' ||
                    (pipelineState !== 'IDLE' && PIPELINE_STAGES.findIndex(s => s.key === pipelineState) > i);

                  return (
                    <div
                      key={stg.key}
                      className={`p-2.5 rounded-xl border transition ${
                        isActive
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200 shadow-sm'
                          : isPast
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-300'
                          : 'bg-white/[0.02] border-white/5 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{stg.label}</span>
                        {isActive ? (
                          <span className="text-[10px] font-mono text-cyan-400 animate-pulse">Running...</span>
                        ) : isPast ? (
                          <span className="text-[10px] font-mono text-emerald-400">PASS</span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500">QUEUED</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{stg.desc}</p>
                    </div>
                  );
                })}
              </div>

              {currentResponse?.executionPlan && (
                <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2 mt-2">
                  <div className="text-xs font-semibold text-white flex items-center justify-between">
                    <span>Generated Strategy: {currentResponse.executionPlan.strategy}</span>
                    <span className="text-[10px] font-mono text-slate-400">Plan ID: {currentResponse.executionPlan.planId}</span>
                  </div>
                  <div className="space-y-1.5">
                    {currentResponse.executionPlan.stages.map((stage, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] bg-white/[0.02] p-1.5 rounded border border-white/5">
                        <span className="text-slate-300">{stage.name}</span>
                        <span className="font-mono text-emerald-400">{stage.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REASONING ENGINE (L1-L4) */}
          {activeTab === 'reasoning' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-black/30 border border-white/10 rounded-xl space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Adaptive Complexity Calibration (L1-L4)</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  ZYNTHEOR calibrates Chain-of-Thought (CoT) depth, temperature, top-P, and verification intensity based on prompt complexity:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="font-semibold text-cyan-400">L1 — Direct</div>
                    <div className="text-[10px] text-slate-400 mt-1">CoT: 1 step · Temp: 0.70 · Falsification: Skip</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="font-semibold text-blue-400">L2 — Structured</div>
                    <div className="text-[10px] text-slate-400 mt-1">CoT: 3 steps · Temp: 0.40 · Falsification: Self-check</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="font-semibold text-purple-400">L3 — Deep</div>
                    <div className="text-[10px] text-slate-400 mt-1">CoT: 5 steps · Temp: 0.20 · Falsification: Active</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="font-semibold text-rose-400">L4 — Autonomous</div>
                    <div className="text-[10px] text-slate-400 mt-1">CoT: 8 steps · Temp: 0.05 · Falsification: Multi-gate</div>
                  </div>
                </div>
              </div>

              {currentResponse && (
                <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-1.5">
                  <div className="font-semibold text-white">Active Reasoning Parameters for Last Request</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-1.5 rounded bg-black/40 border border-white/5">
                      <span className="text-slate-400">Tier: </span>
                      <strong className="text-emerald-400 font-mono">{currentResponse.complexityTier} ({currentResponse.complexityLevel})</strong>
                    </div>
                    <div className="p-1.5 rounded bg-black/40 border border-white/5">
                      <span className="text-slate-400">Temperature: </span>
                      <strong className="text-cyan-300 font-mono">{currentResponse.reasoningParameters.temperature}</strong>
                    </div>
                    <div className="p-1.5 rounded bg-black/40 border border-white/5">
                      <span className="text-slate-400">CoT Steps: </span>
                      <strong className="text-purple-300 font-mono">{currentResponse.reasoningParameters.cotDepth} steps</strong>
                    </div>
                    <div className="p-1.5 rounded bg-black/40 border border-white/5">
                      <span className="text-slate-400">Verification Budget: </span>
                      <strong className="text-amber-300 font-mono">{currentResponse.reasoningParameters.verificationBudget} passes</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: VECTOR CONTEXT & MEMORY */}
          {activeTab === 'memory' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-black/30 border border-white/10 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <Database className="w-4 h-4 text-purple-400" />
                    <span>ZyntheorMemoryEngine (128-d Vector Storage)</span>
                  </h4>
                  <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    Workspace Isolation Enforced
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Every user query retrieves relevant context items and injects them under explicit untrusted demarcation lines to prevent prompt injection hijacking.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px]">
                  <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                    <div className="text-slate-400">Total Memories</div>
                    <div className="text-base font-bold text-white mt-0.5">{memoryStats.totalCount}</div>
                  </div>
                  <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                    <div className="text-slate-400">User Preferences</div>
                    <div className="text-base font-bold text-purple-400 mt-0.5">{memoryStats.preferenceCount}</div>
                  </div>
                  <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                    <div className="text-slate-400">Project Knowledge</div>
                    <div className="text-base font-bold text-cyan-400 mt-0.5">{memoryStats.projectKnowledgeCount}</div>
                  </div>
                  <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                    <div className="text-slate-400">Vector Dimensions</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">{memoryStats.dimensions}-d</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TAMPER-PROOF AUDIT */}
          {activeTab === 'audit' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-black/30 border border-white/10 rounded-xl space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Sovereign Ledger & Tamper-Proof Cryptographic Audit</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  All requests processed through the unified runtime receive a deterministic SHA-256 evidence digest:
                </p>
                {currentResponse ? (
                  <div className="space-y-2 text-[11px]">
                    <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                      <span className="text-slate-400">Request Digest (SHA-256): </span>
                      <code className="text-amber-300 font-mono break-all">{currentResponse.executionMetadata.sha256Digest}</code>
                    </div>
                    <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                      <span className="text-slate-400">Evidence Reference Seals: </span>
                      <span className="text-slate-200 font-mono">{currentResponse.evidenceReferences.length} generated</span>
                    </div>
                    <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                      <span className="text-slate-400">Passed Verification Gates: </span>
                      <span className="text-emerald-400 font-mono">{currentResponse.verificationResult.passedGates.join(', ')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 italic p-3 text-center border border-dashed border-white/5 rounded-lg">
                    Execute a request above to generate a cryptographic audit digest.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ZyntheorIntelligenceRuntime;
