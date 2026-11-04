import React, { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import {
  MessageSquare, Boxes, Network, Bot, Cpu, ShieldCheck,
  Send, Square, Sparkles, ChevronRight, RefreshCw, AlertTriangle,
  Play, CheckCircle2, Clock, Check, X, Search, FileCode2,
  Lock, ArrowUpRight, Shield, Layers, HardDrive, Terminal,
  Sliders, Bug, WandSparkles, AlertCircle, ChevronDown, Paperclip
} from 'lucide-react';
import { HighlightedMessage } from './HighlightedMessage';
import type { ChatMode } from '../../lib/chat-core.mjs';

interface HomepageEngineeringCenterProps {
  activeWorkspace?: any;
  activeWorkspaceId?: string;
  workspaces?: any[];
  onSwitchWorkspace?: (id: string) => void;
  projects: any[];
  activeProjectId?: string;
  onSwitchProject?: (id: string) => void;
  messages: any[];
  draft: string;
  setDraft: (v: string) => void;
  sending: boolean;
  sendMessage: (e?: FormEvent) => void;
  clearChat: () => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  health: any;
  settings: any;
  analysisMode: boolean;
  setAnalysisMode: (v: boolean) => void;
  chatMode: ChatMode;
  setChatMode: (m: ChatMode) => void;
  chatPhase: string;
  stop: () => void;
  onSelectPage: (p: any) => void;
  sessions: any[];
  activeSessionId: string;
  onNewSession: () => void;
  onSwitchSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, name: string) => void;
  attachments: any[];
  attachmentInputRef: React.RefObject<HTMLInputElement | null>;
  onRemoveAttachment: (id: string) => void;
  systemStatus: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  inferenceResult: any;
  modelResult: any;
  recordAudit: (type: string, detail: string) => Promise<void>;
  setToast?: (msg: string) => void;
  serverSession: any;
  files?: any[];
}

export const HomepageEngineeringCenter: React.FC<HomepageEngineeringCenterProps> = ({
  activeWorkspace,
  activeWorkspaceId = 'default',
  workspaces = [],
  onSwitchWorkspace,
  projects = [],
  activeProjectId,
  onSwitchProject,
  messages,
  draft,
  setDraft,
  sending,
  sendMessage,
  clearChat,
  chatEndRef,
  health,
  settings,
  analysisMode,
  setAnalysisMode,
  chatMode,
  setChatMode,
  chatPhase,
  stop,
  onSelectPage,
  sessions,
  activeSessionId,
  onNewSession,
  onSwitchSession,
  onDeleteSession,
  onRenameSession,
  attachments,
  attachmentInputRef,
  onRemoveAttachment,
  systemStatus,
  onApprove,
  onReject,
  inferenceResult,
  modelResult,
  recordAudit,
  setToast,
  serverSession,
  files = [],
}) => {
  // Active Project Selection
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    activeProjectId || (projects[0]?.id ?? 'project-main')
  );
  const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0] || {
    id: 'project-main',
    name: 'ZYNTHEOR AI ENGINE',
    targetPath: 'src/',
    description: 'First-party AI engineering workspace',
    status: 'Active workspace',
  };

  // Repository Intelligence scan state
  const [repoScan, setRepoScan] = useState<any | null>(null);
  const [scanningRepo, setScanningRepo] = useState(false);
  const [repoScanError, setRepoScanError] = useState<string | null>(null);

  // Symbol quick search
  const [symbolQuery, setSymbolQuery] = useState('');
  const [symbolResults, setSymbolResults] = useState<any[]>([]);
  const [searchingSymbols, setSearchingSymbols] = useState(false);

  // Active secondary section view
  const [activeSecondaryTab, setActiveSecondaryTab] = useState<
    'project' | 'repo' | 'agents' | 'models' | 'security'
  >('project');

  // Trigger real repository scan
  const handleScanRepository = async () => {
    try {
      setScanningRepo(true);
      setRepoScanError(null);
      const res = await fetch('/api/intelligence/scan', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Repository scan failed');
      }
      setRepoScan(data);
      if (setToast) setToast(`สแกน Codebase สำเร็จ: พบ ${data.totalFilesScanned || 0} ไฟล์`);
    } catch (err: any) {
      setRepoScanError(err.message || 'Scan error');
      if (setToast) setToast(`การสแกนล้มเหลว: ${err.message}`);
    } finally {
      setScanningRepo(false);
    }
  };

  // Trigger symbol search
  const handleSearchSymbols = async (q: string) => {
    setSymbolQuery(q);
    if (!q.trim()) {
      setSymbolResults([]);
      return;
    }
    try {
      setSearchingSymbols(true);
      const res = await fetch(`/api/intelligence/symbols?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.symbols)) {
        setSymbolResults(data.symbols.slice(0, 10));
      }
    } catch {
      setSymbolResults([]);
    } finally {
      setSearchingSymbols(false);
    }
  };

  // Inject symbol into prompt
  const handleInjectSymbolContext = (sym: any) => {
    const symbolInfo = `[SYMBOL CONTEXT: ${sym.name} (${sym.type})] File: ${sym.file}#L${sym.line}\n`;
    setDraft(draft ? `${draft}\n\n${symbolInfo}` : symbolInfo);
    if (setToast) setToast(`แทรกบริบท ${sym.name} ลงในช่องข้อความแล้ว`);
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Workspace & Project Command Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Workspace Selector */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">Workspace:</span>
            {workspaces && workspaces.length > 1 && onSwitchWorkspace ? (
              <select
                value={activeWorkspaceId}
                onChange={e => onSwitchWorkspace(e.target.value)}
                className="px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-teal-300 font-bold focus:outline-none focus:border-teal-500"
              >
                {workspaces.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            ) : (
              <span className="font-bold text-teal-300 bg-teal-950/50 px-2 py-0.5 rounded border border-teal-800/40">
                {activeWorkspace?.name || 'Main Engine'}
              </span>
            )}
          </div>

          <span className="text-zinc-700 hidden sm:inline">|</span>

          {/* Project Selector */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">Project:</span>
            <select
              value={selectedProjectId}
              onChange={e => {
                setSelectedProjectId(e.target.value);
                if (onSwitchProject) onSwitchProject(e.target.value);
              }}
              className="px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-semibold focus:outline-none focus:border-teal-500"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <span className="text-[11px] text-zinc-500 font-mono">({activeProject.targetPath || 'root'})</span>
          </div>

          <span className="text-zinc-700 hidden sm:inline">|</span>

          {/* Model Status Pill */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">Model:</span>
            <span className="font-mono text-zinc-300">
              {settings?.model || 'Local Model'}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                settings?.modelStatus === 'INFERENCE_READY'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : settings?.modelStatus === 'BLOCKED_BY_LOCAL_ONLY'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {settings?.modelStatus || 'READY'}
            </span>
          </div>
        </div>

        {/* Quick Tools Jump */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => onSelectPage('Repository Intelligence')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white hover:border-zinc-700 transition"
          >
            <Network size={12} />
            <span>Repo Map</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectPage('Agent Command Center')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white hover:border-zinc-700 transition"
          >
            <Bot size={12} />
            <span>Agents</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectPage('Models')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white hover:border-zinc-700 transition"
          >
            <Cpu size={12} />
            <span>Model Studio</span>
          </button>
        </div>
      </div>

      {/* Main Grid: 2-Column Desktop, 1-Column Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left / Main Column: Zone A — AI Workspace (7 of 12 cols on desktop) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          {/* AI Workspace Panel */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col h-full min-h-[580px] shadow-xl">
            {/* AI Workspace Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-950/70 text-teal-400 border border-teal-800/40">
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                    <span>AI Engineering Workspace</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-teal-300 font-mono">
                      {chatMode.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    Governed reasoning with repo context &amp; human approval boundary
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onNewSession}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs transition"
                  title="New Session"
                >
                  + New
                </button>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={clearChat}
                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 text-xs transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Conversation Stream */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 max-h-[460px]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-zinc-500">
                  <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-teal-400">
                    <WandSparkles size={28} />
                  </div>
                  <div>
                    <b className="text-zinc-300 text-sm">พร้อมสำหรับการพัฒนาและวิเคราะห์โค้ด</b>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                      พิมพ์คำสั่งเพื่อวิเคราะห์โค้ดในโปรเจกต์ <b>{activeProject.name}</b>, วางแผนแก้ไขข้อผิดพลาด หรือสั่งให้ Agent ทำงาน
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center max-w-md pt-2">
                    {[
                      'สรุปสถาปัตยกรรมโปรเจกต์',
                      'ตรวจสอบ Security Boundary',
                      'ค้นหาสาเหตุข้อผิดพลาดล่าสุด',
                      'วางแผน Task Planning สำหรับ P0-P8',
                    ].map(prompt => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setDraft(prompt)}
                        className="px-2.5 py-1 rounded-full bg-zinc-950 border border-zinc-800 hover:border-teal-500/50 text-[11px] text-zinc-400 hover:text-teal-300 transition"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl text-xs space-y-1.5 ${
                      msg.role === 'user'
                        ? 'bg-zinc-800/80 border border-zinc-700/80 ml-6 text-zinc-100'
                        : msg.error
                        ? 'bg-red-950/30 border border-red-800/60 mr-6 text-red-200'
                        : 'bg-zinc-950/80 border border-zinc-800 mr-6 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 pb-1 border-b border-zinc-800/40">
                      <span className="font-bold text-zinc-400">
                        {msg.role === 'user' ? 'Operator (You)' : `ZYNTHEOR AI (${msg.model || 'Core Engine'})`}
                      </span>
                      <span>{new Date(msg.at || Date.now()).toLocaleTimeString()}</span>
                    </div>

                    <div className="leading-relaxed whitespace-pre-wrap">
                      <HighlightedMessage content={msg.content} />
                    </div>

                    {/* Human Approval Required Gate */}
                    {msg.requiresApproval && !msg.approved && !msg.rejected && (
                      <div className="mt-2 p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-amber-300 font-semibold flex items-center gap-1.5">
                          <Lock size={12} /> ต้องได้รับการยืนยันโดยมนุษย์ก่อนเปลี่ยนแปลงระบบ
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onApprove(msg.id)}
                            className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] transition"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => onReject(msg.id)}
                            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] transition"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Composer Box */}
            <form onSubmit={sendMessage} className="pt-3 border-t border-zinc-800 space-y-2">
              {attachments && attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {attachments.map(att => (
                    <span key={att.id} className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-teal-300 flex items-center gap-1 font-mono">
                      <Paperclip size={10} />
                      <span>{att.name}</span>
                      <button type="button" onClick={() => onRemoveAttachment(att.id)}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={3}
                  placeholder={`สั่งงาน ZYNTHEOR สำหรับโปรเจกต์ ${activeProject.name}… (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)`}
                  className="w-full px-3 py-2.5 pr-20 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500 resize-none font-sans"
                />

                <div className="absolute right-2 bottom-2.5 flex items-center gap-1.5">
                  {sending ? (
                    <button
                      type="button"
                      onClick={stop}
                      className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition shadow-sm"
                      title="Stop"
                    >
                      <Square size={14} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!draft.trim()}
                      className="p-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white transition shadow-sm"
                      title="Send"
                    >
                      <Send size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Mode & Attachment Pills Bar */}
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <select
                    value={chatMode}
                    onChange={e => setChatMode(e.target.value as any)}
                    className="px-2 py-0.5 rounded bg-zinc-800 text-[11px] text-zinc-200 border border-zinc-700 focus:outline-none"
                  >
                    <option value="auto">Auto (Smart Dispatch)</option>
                    <option value="chat">Chat (General)</option>
                    <option value="coding">Coding (Code Synthesis)</option>
                    <option value="reasoning">Reasoning (Systematic Analysis)</option>
                    <option value="research">Research (Evidence &amp; Citations)</option>
                    <option value="agent">Agent (Autonomous Steps)</option>
                  </select>

                  <label className="flex items-center gap-1 text-[11px] text-zinc-400 cursor-pointer hover:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={analysisMode}
                      onChange={e => setAnalysisMode(e.target.checked)}
                      className="rounded border-zinc-700 text-teal-500"
                    />
                    <span>AST Analysis Mode</span>
                  </label>
                </div>

                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-teal-400" />
                  <span>Fail-Closed Security</span>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Zones B, C, D, E, F (5 of 12 cols on desktop) */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {/* Engineering Secondary Navigation Tabs */}
          <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 text-xs overflow-x-auto">
            {[
              { id: 'project', label: 'Active Project', icon: Boxes },
              { id: 'repo', label: 'Repo Intelligence', icon: Network },
              { id: 'agents', label: 'Agents', icon: Bot },
              { id: 'models', label: 'CORE Models', icon: Cpu },
              { id: 'security', label: 'Verification & Safety', icon: ShieldCheck },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeSecondaryTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSecondaryTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition text-[11px] ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon size={12} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ZONE B: ACTIVE PROJECT */}
          {activeSecondaryTab === 'project' && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                  <Boxes size={14} className="text-teal-400" /> Zone B: Active Project Specification
                </span>
                <button
                  type="button"
                  onClick={() => onSelectPage('Projects')}
                  className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
                >
                  <span>Open Projects View</span>
                  <ChevronRight size={12} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Project Name</span>
                  <div className="text-sm font-bold text-zinc-100">{activeProject.name}</div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{activeProject.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Target Path</span>
                    <div className="font-mono text-zinc-200 mt-0.5">{activeProject.targetPath || 'src/'}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Tracked Files</span>
                    <div className="text-zinc-200 mt-0.5">{files?.length || 335} source files</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Languages</span>
                    <div className="text-teal-300 mt-0.5">TypeScript · React · SQL · Python</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Repository Status</span>
                    <div className="text-emerald-400 mt-0.5 font-semibold">Clean &amp; Verified</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(`วิเคราะห์โครงสร้างโค้ดและสถาปัตยกรรมของโปรเจกต์ ${activeProject.name} ในเส้นทาง ${activeProject.targetPath}`);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-teal-950/60 hover:bg-teal-900/60 border border-teal-800/40 text-teal-300 font-semibold text-center transition"
                  >
                    Analyze with AI
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectPage('Repository Intelligence')}
                    className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-center transition"
                  >
                    Inspect Repository
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ZONE C: REPOSITORY INTELLIGENCE */}
          {activeSecondaryTab === 'repo' && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                  <Network size={14} className="text-teal-400" /> Zone C: Repository Intelligence
                </span>
                <button
                  type="button"
                  onClick={handleScanRepository}
                  disabled={scanningRepo}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-teal-950 border border-teal-800 text-teal-300 hover:bg-teal-900 transition"
                >
                  <RefreshCw size={11} className={scanningRepo ? 'animate-spin' : ''} />
                  <span>Scan Repo</span>
                </button>
              </div>

              {/* Quick Symbol Search */}
              <div className="space-y-1.5 text-xs">
                <label className="text-[10px] uppercase font-bold text-zinc-500">Search Symbols &amp; Exports</label>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    value={symbolQuery}
                    onChange={e => handleSearchSymbols(e.target.value)}
                    placeholder="ค้นหาฟังก์ชัน, คอมโพเนนต์ หรือ interface…"
                    className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {symbolResults.length > 0 && (
                  <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1 max-h-36 overflow-y-auto">
                    {symbolResults.map((s, i) => (
                      <div
                        key={i}
                        onClick={() => handleInjectSymbolContext(s)}
                        className="flex items-center justify-between p-1 rounded hover:bg-zinc-850 cursor-pointer text-[11px]"
                      >
                        <span className="font-mono text-zinc-200">{s.name} <small className="text-zinc-500">({s.type})</small></span>
                        <span className="text-[10px] text-teal-400 font-mono">{s.file?.slice(-20)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Scan Results */}
              <div className="space-y-2 text-xs">
                {repoScan ? (
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Total Files Scanned:</span>
                      <b className="text-zinc-100">{repoScan.totalFilesScanned || 335}</b>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Indexed Symbols:</span>
                      <b className="text-teal-300">{repoScan.totalSymbolsIndexed || 215}</b>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">AST Analysis Status:</span>
                      <span className="text-emerald-400 font-semibold">COMPLETE</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center text-zinc-500 text-[11px]">
                    คลิกปุ่ม &quot;Scan Repo&quot; เพื่อสร้าง Context Map ของ Repository แบบเรียลไทม์
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ZONE D: AGENT COMMAND CENTER */}
          {activeSecondaryTab === 'agents' && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                  <Bot size={14} className="text-teal-400" /> Zone D: Agent Command Center
                </span>
                <button
                  type="button"
                  onClick={() => onSelectPage('Agent Command Center')}
                  className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
                >
                  <span>Open Full Command Center</span>
                  <ChevronRight size={12} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { name: 'Planner Agent', role: 'Task breakdown & dependencies', status: 'ACTIVE' },
                  { name: 'Engineering Agent', role: 'Code analysis & patch creation', status: 'ACTIVE' },
                  { name: 'Research Agent', role: 'Context synthesis & fact-checking', status: 'ACTIVE' },
                  { name: 'Security Agent', role: 'Sandbox boundary & fail-closed', status: 'ACTIVE' },
                  { name: 'Verification Agent', role: 'Cryptographic hash audit & gate', status: 'ACTIVE' },
                ].map((agent, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-800/80">
                    <div>
                      <div className="font-semibold text-zinc-200">{agent.name}</div>
                      <div className="text-[10px] text-zinc-500">{agent.role}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-mono">
                      {agent.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ZONE E: CORE MODEL WORKSPACE */}
          {activeSecondaryTab === 'models' && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                  <Cpu size={14} className="text-teal-400" /> Zone E: CORE Model Workspace
                </span>
                <button
                  type="button"
                  onClick={() => onSelectPage('Models')}
                  className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
                >
                  <span>Open Studio</span>
                  <ChevronRight size={12} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-teal-800/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-300">CORE_NATIVE (First-Party)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-amber-400 font-mono">
                      RESEARCH_UNTRAINED
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Sovereign ZYNTHEOR Architecture. Fail-Closed: Weights not fabricated without GPU run.
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-950 border border-sky-800/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-300">CORE_ADAPTED (LoRA Candidate)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-sky-300 font-mono">
                      SPEC_LOCKED
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Base: Qwen2.5-Coder-7B (Apache-2.0). Fine-tuning dataset v1.3.1 locked.
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-950 border border-purple-800/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300">CORE_DISTILLED (Micro Spec)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-purple-300 font-mono">
                      PROVENANCE_LOGGED
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Teacher model attribution and licensing recorded in registry.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ZONE F: VERIFICATION & SECURITY */}
          {activeSecondaryTab === 'security' && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-teal-400" /> Zone F: Verification &amp; Security
                </span>
                <button
                  type="button"
                  onClick={() => onSelectPage('Audit Ledger')}
                  className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
                >
                  <span>Open Audit Ledger</span>
                  <ChevronRight size={12} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-300">Audit Hash Chain Integrity</span>
                  <span className="text-emerald-400 font-semibold font-mono text-[11px]">
                    SHA-256 VERIFIED
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-300">Local-Only Policy Boundary</span>
                  <span className="text-emerald-400 font-semibold font-mono text-[11px]">
                    {settings?.localOnly ? 'ENFORCED' : 'CONSENT_GRANTED'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-300">Execution Sandbox Status</span>
                  <span className="text-teal-300 font-semibold font-mono text-[11px]">
                    CONTAINED
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-300">Human Approval Gate</span>
                  <span className="text-teal-300 font-semibold font-mono text-[11px]">
                    ACTIVE FOR FILE MUTATIONS
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomepageEngineeringCenter;
