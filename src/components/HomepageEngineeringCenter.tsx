import React, { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import {
  MessageSquare, Boxes, Network, Bot, Cpu, ShieldCheck,
  Send, Square, Sparkles, ChevronRight, RefreshCw, AlertTriangle,
  Play, CheckCircle2, Clock, Check, X, Search, FileCode2,
  Lock, ArrowUpRight, Shield, Layers, HardDrive, Terminal,
  Sliders, Bug, WandSparkles, AlertCircle, ChevronDown, Paperclip,
  Activity, Radio, Zap, ArrowRight, CornerDownLeft, Pause, Eye
} from 'lucide-react';
import { HighlightedMessage } from './HighlightedMessage';
import type { ChatMode } from '../../lib/chat-core.mjs';
import {
  AgentStatusDot,
  AgentStatusBadge,
  LiveTaskIndicator,
  getAgentVisualStatus
} from './AgentStatusIndicator';

export interface LiveAssignedTask {
  taskId: string;
  goal: string;
  agentRoleId: string;
  agentRoleName: string;
  status: 'IDLE' | 'ASSIGNED' | 'RUNNING' | 'WAITING_FOR_APPROVAL' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  currentStepIndex: number;
  totalSteps: number;
  currentStepTitle: string;
  toolInUse?: string;
  riskTier?: 'LOW' | 'MEDIUM' | 'HIGH';
  isDryRun: boolean;
  assignedAt: string;
  completedAt?: string;
  evidenceDigest?: string;
  findings?: string[];
  plannedSteps?: any[];
}

export interface LiveActivityEvent {
  id: string;
  taskId: string;
  agentId: string;
  agentName: string;
  action: string;
  detail: string;
  status: 'RUNNING' | 'COMPLETED' | 'WAITING_FOR_APPROVAL' | 'FAILED';
  riskTier?: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: string;
  evidenceHash?: string;
}

export interface LiveAgentStats {
  totalTasksExecuted: number;
  activeRunningAgents: number;
  pendingHumanApprovals: number;
  verificationRate: string;
}

interface HomepageEngineeringCenterProps {
  authHeaders?: () => Record<string, string>;
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
  authHeaders,
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
    'project' | 'repo' | 'agents' | 'activity' | 'models' | 'security'
  >('agents');

  // Live Agent Activity State
  const [liveAgents, setLiveAgents] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<LiveActivityEvent[]>([]);
  const [liveStats, setLiveStats] = useState<LiveAgentStats>({
    totalTasksExecuted: 16,
    activeRunningAgents: 0,
    pendingHumanApprovals: 0,
    verificationRate: '100.0%',
  });
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [lastLivePulse, setLastLivePulse] = useState<string>('Just now');

  // Agent Dispatch State
  const [selectedAgentRole, setSelectedAgentRole] = useState<string>('planner');
  const [agentGoalInput, setAgentGoalInput] = useState('');
  const [isDryRunAgent, setIsDryRunAgent] = useState(true);
  const [dispatchingAgent, setDispatchingAgent] = useState(false);
  const [dispatchedTaskResult, setDispatchedTaskResult] = useState<any | null>(null);
  const [approvingStep, setApprovingStep] = useState<string | null>(null);

  // Agent Quick-Action & Logs Modal State
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [logsModalAgent, setLogsModalAgent] = useState<any | null>(null);
  const [agentLogs, setAgentLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Fetch Live Agent Activity
  const fetchLiveAgentActivity = useCallback(async () => {
    try {
      const headers = authHeaders ? authHeaders() : {};
      const res = await fetch('/api/intelligence/agent/activity', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          if (Array.isArray(data.activeAgents)) setLiveAgents(data.activeAgents);
          if (Array.isArray(data.recentActivities)) setRecentActivities(data.recentActivities);
          if (data.stats) setLiveStats(data.stats);
          setIsLiveConnected(true);
          setLastLivePulse(new Date().toLocaleTimeString());
        }
      }
    } catch {
      setIsLiveConnected(false);
    }
  }, [authHeaders]);

  // Real-time EventSource & Polling sync
  useEffect(() => {
    fetchLiveAgentActivity();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/intelligence/agent/activity/stream');
      eventSource.onopen = () => {
        setIsLiveConnected(true);
      };
      eventSource.addEventListener('snapshot', (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.activeAgents) setLiveAgents(payload.activeAgents);
          if (payload.recentActivities) setRecentActivities(payload.recentActivities);
          setLastLivePulse(new Date().toLocaleTimeString());
        } catch {}
      });
      eventSource.addEventListener('agent:task_started', () => {
        fetchLiveAgentActivity();
      });
      eventSource.addEventListener('agent:task_completed', () => {
        fetchLiveAgentActivity();
      });
      eventSource.addEventListener('agent:task_paused', () => {
        fetchLiveAgentActivity();
      });
      eventSource.addEventListener('agent:task_resumed', () => {
        fetchLiveAgentActivity();
      });
      eventSource.addEventListener('agent:task_cancelled', () => {
        fetchLiveAgentActivity();
      });
      eventSource.addEventListener('agent:waiting_approval', () => {
        fetchLiveAgentActivity();
      });
      eventSource.addEventListener('agent:decision_recorded', () => {
        fetchLiveAgentActivity();
      });
      eventSource.onerror = () => {
        setIsLiveConnected(false);
      };
    } catch {
      setIsLiveConnected(false);
    }

    const pollInterval = setInterval(() => {
      fetchLiveAgentActivity();
    }, 3500);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(pollInterval);
    };
  }, [fetchLiveAgentActivity]);

  // Quick Action Handler (Pause, Resume, Cancel)
  const handleAgentQuickAction = async (agentRoleId: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      setActionInProgress(agentRoleId);
      const headers = {
        'Content-Type': 'application/json',
        ...(authHeaders ? authHeaders() : {}),
      };
      const res = await fetch('/api/intelligence/agent/action', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agentRoleId,
          action,
          reason: 'Quick action triggered from Homepage Engineering Center',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Agent action failed');
      }
      if (setToast) {
        const actionLabel = action === 'pause' ? 'หยุดชั่วคราว (Paused)' : action === 'resume' ? 'ดำเนินการต่อ (Resumed)' : 'ยกเลิกคำสั่ง (Cancelled)';
        setToast(`✅ Agent ${agentRoleId}: ${actionLabel} สำเร็จ`);
      }
      await fetchLiveAgentActivity();
    } catch (err: any) {
      if (setToast) setToast(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // View Logs Handler
  const handleOpenAgentLogs = async (agent: any) => {
    try {
      setLogsModalAgent(agent);
      setLoadingLogs(true);
      const headers = authHeaders ? authHeaders() : {};
      const res = await fetch(`/api/intelligence/agent/logs?agentId=${encodeURIComponent(agent.id)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.logs)) {
          setAgentLogs(data.logs);
        }
      }
    } catch (err: any) {
      if (setToast) setToast(`Failed to load logs: ${err.message}`);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Dispatch Agent Task
  const handleDispatchAgentTask = async (customGoal?: string) => {
    const goalToRun = (customGoal || agentGoalInput).trim();
    if (!goalToRun || dispatchingAgent) return;

    try {
      setDispatchingAgent(true);
      setDispatchedTaskResult(null);

      const headers = {
        'Content-Type': 'application/json',
        ...(authHeaders ? authHeaders() : {}),
      };

      const res = await fetch('/api/intelligence/agent/execute', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          goal: goalToRun,
          agentRole: selectedAgentRole,
          workspaceId: activeWorkspaceId,
          isDryRun: isDryRunAgent,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Agent dispatch failed');
      }

      setDispatchedTaskResult(data);
      if (setToast) {
        setToast(`สั่งงาน ${data.agentRole?.name || selectedAgentRole} สำเร็จ`);
      }
      fetchLiveAgentActivity();
    } catch (err: any) {
      if (setToast) setToast(`การสั่งงานล้มเหลว: ${err.message}`);
    } finally {
      setDispatchingAgent(false);
    }
  };

  // Human Step Approval
  const handleStepApproval = async (taskId: string, agentRoleId: string, decision: 'approve' | 'reject') => {
    try {
      setApprovingStep(taskId);
      const headers = {
        'Content-Type': 'application/json',
        ...(authHeaders ? authHeaders() : {}),
      };

      const res = await fetch('/api/intelligence/agent/step-approval', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          taskId,
          agentRoleId,
          decision,
          reason: decision === 'approve' ? 'Approved in Command Center UI' : 'Rejected in Command Center UI',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Approval request failed');
      }

      if (setToast) {
        setToast(decision === 'approve' ? 'อนุมัติขั้นตอนเรียบร้อยแล้ว' : 'ปฏิเสธขั้นตอนเรียบร้อยแล้ว');
      }
      fetchLiveAgentActivity();
      if (dispatchedTaskResult?.liveTask?.taskId === taskId) {
        setDispatchedTaskResult((prev: any) => prev ? {
          ...prev,
          humanApprovalRequired: false,
          liveTask: data.task,
        } : null);
      }
    } catch (err: any) {
      if (setToast) setToast(`ดำเนินการล้มเหลว: ${err.message}`);
    } finally {
      setApprovingStep(null);
    }
  };

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

          {/* Provider Transparency & Model Routing Pill */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {/* First-Party Platform Model Identity */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-teal-950/60 border border-teal-800/60 text-teal-300 font-mono text-[10px]">
              <Cpu size={11} className="text-teal-400" />
              <span className="font-bold">FIRST-PARTY: ZYNTHEOR CORE</span>
            </div>

            {/* Active Provider & Router Status */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">
                {settings?.provider && settings.provider !== 'ollama' && settings.provider !== 'local' && settings.provider !== 'zyntheor-core' ? 'Active External Provider:' : 'Active Route:'}
              </span>
              <span className="font-mono text-zinc-200 font-semibold">
                {settings?.provider ? settings.provider.toUpperCase() : 'LOCAL ROUTER'}
              </span>
              <span className="text-zinc-500">/</span>
              <span className="font-mono text-zinc-300 text-[11px]">
                {settings?.model || 'Local Engine'}
              </span>
              {settings?.provider && settings.provider !== 'ollama' && settings.provider !== 'local' && settings.provider !== 'zyntheor-core' ? (
                <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[9px] font-mono font-bold">
                  EXTERNAL PROVIDER (NOT NATIVE)
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800 text-[9px] font-mono font-bold">
                  LOCAL / FIRST-PARTY ROUTE
                </span>
              )}
            </div>
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
              { id: 'agents', label: 'Agent Command', icon: Bot },
              { id: 'activity', label: 'Live Activity', icon: Activity, count: liveStats.activeRunningAgents },
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
                  <Icon size={12} className={tab.id === 'activity' && liveStats.activeRunningAgents > 0 ? 'text-amber-400 animate-pulse' : ''} />
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && tab.count > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold animate-pulse">
                      {tab.count}
                    </span>
                  )}
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

          {/* ZONE D: AGENT COMMAND CENTER & INSTANT DISPATCH */}
          {activeSecondaryTab === 'agents' && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div>
                  <span className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                    <Bot size={14} className="text-teal-400" /> Zone D: Agent Command Center
                  </span>
                  <p className="text-[10px] text-zinc-400 mt-0.5">สั่งงาน Agent และติดตามสถานะแบบเรียลไทม์จากหน้าแรก</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span>{isLiveConnected ? 'LIVE SYNC' : 'OFFLINE'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectPage('Agent Command Center')}
                    className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
                  >
                    <span>Full Center</span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              {/* INSTANT AGENT DISPATCHER (ฟังก์ชันสั่งงาน Agent ได้จากหน้าแรกทันที) */}
              <div className="p-3 rounded-lg bg-zinc-950 border border-teal-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-teal-300 flex items-center gap-1.5">
                    <Zap size={13} className="text-amber-400" />
                    <span>Instant Agent Dispatch / สั่งงาน Agent ทันที</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">WORKSPACE: {activeWorkspace?.name || 'Main Engine'}</span>
                </div>

                {/* Agent Role Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Select Agent Role</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      { id: 'planner', label: 'Planner Agent', desc: 'AST & Task Map', tool: 'ast.parse' },
                      { id: 'engineering', label: 'Engineering Agent', desc: 'Code Analysis & Fixes', tool: 'code.patch' },
                      { id: 'security', label: 'Security Agent', desc: 'Sandbox & Leaks', tool: 'security.scan' },
                      { id: 'verification', label: 'Verification Agent', desc: 'Hash & Seals', tool: 'hash.sha256' },
                      { id: 'research', label: 'Research Agent', desc: 'Context & Citations', tool: 'context.extract' },
                    ].map(r => {
                      const isSel = selectedAgentRole === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedAgentRole(r.id)}
                          className={`p-2 rounded-lg text-left transition border text-xs ${
                            isSel
                              ? 'bg-teal-950/80 border-teal-600/70 text-zinc-100 shadow-sm'
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                          }`}
                        >
                          <div className="font-semibold text-[11px] truncate">{r.label}</div>
                          <div className="text-[9px] text-zinc-500 truncate">{r.desc}</div>
                          <div className="mt-1 font-mono text-[9px] text-teal-400/80">[{r.tool}]</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Command Chips */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Quick Actions (คลิกเพื่อสั่งงาน)</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        label: 'Map AST & Imports',
                        role: 'planner',
                        goal: 'สแกน Codebase และทำแผนผัง AST เพื่อหาความเชื่อมโยงของ Imports/Exports ทั้งหมด',
                      },
                      {
                        label: 'Audit Code Security',
                        role: 'security',
                        goal: 'ตรวจสอบขอบเขตความปลอดภัย Local-Only, ตรวจการรั่วไหลของ Secrets, และทดสอบ Sandbox Perimeter',
                      },
                      {
                        label: 'Verify Hash Chain',
                        role: 'verification',
                        goal: 'ตรวจสอบความถูกต้องของ Merkle Hash Chain ใน Audit Ledger เพื่อยืนยันว่าไม่มีการปลอมแปลง',
                      },
                      {
                        label: 'Synthesize Bug Fix',
                        role: 'engineering',
                        goal: 'วิเคราะห์ Reproduction Trace และเสนอแนวทางแก้ไข Atomic Patch แบบปลอดภัย',
                      },
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedAgentRole(chip.role);
                          setAgentGoalInput(chip.goal);
                        }}
                        className="px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-teal-700 hover:bg-zinc-850 text-[10px] text-zinc-300 transition flex items-center gap-1"
                      >
                        <Sparkles size={10} className="text-teal-400" />
                        <span>{chip.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Goal Input & Controls */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <textarea
                      rows={2}
                      value={agentGoalInput}
                      onChange={e => setAgentGoalInput(e.target.value)}
                      placeholder="ป้อนคำสั่งหรือเป้าหมายที่ต้องการให้ Agent ปฏิบัติงานจริง เช่น 'ตรวจสอบความถูกต้องของ dependency map'..."
                      className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-teal-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isDryRunAgent}
                        onChange={e => setIsDryRunAgent(e.target.checked)}
                        className="rounded border-zinc-700 text-teal-500"
                      />
                      <span>Dry-Run Mode (จำลองขั้นตอนอย่างปลอดภัย)</span>
                    </label>

                    <button
                      type="button"
                      disabled={!agentGoalInput.trim() || dispatchingAgent}
                      onClick={() => handleDispatchAgentTask()}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-sm"
                    >
                      {dispatchingAgent ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>กำลังประมวลผล...</span>
                        </>
                      ) : (
                        <>
                          <Play size={12} fill="currentColor" />
                          <span>สั่งงาน Agent ทันที</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Dispatched Task Execution Feedback */}
                {dispatchedTaskResult && (
                  <div className="p-3 rounded-lg bg-zinc-900 border border-teal-800/60 space-y-2 mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-teal-300 flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>ผลลัพธ์การรัน: {dispatchedTaskResult.agentRole?.name}</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        TASK ID: {dispatchedTaskResult.liveTask?.taskId || 'complete'}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-300">
                      {dispatchedTaskResult.task?.finalAnswer || dispatchedTaskResult.liveTask?.currentStepTitle}
                    </p>

                    {/* Human Approval Gate Banner */}
                    {dispatchedTaskResult.humanApprovalRequired && (
                      <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-600/50 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[11px] font-bold text-amber-200">
                              Human Approval Required / ต้องการการอนุมัติ
                            </div>
                            <div className="text-[10px] text-amber-300/80">
                              การดำเนินการมีความเสี่ยงสูง ต้องได้รับการยืนยันจากมนุษย์ก่อนดำเนินการในขั้นต่อไป
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={approvingStep === dispatchedTaskResult.liveTask?.taskId}
                            onClick={() => handleStepApproval(dispatchedTaskResult.liveTask.taskId, dispatchedTaskResult.agentRole.id, 'approve')}
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition flex items-center gap-1"
                          >
                            <Check size={12} />
                            <span>อนุมัติคำสั่ง (Approve)</span>
                          </button>
                          <button
                            type="button"
                            disabled={approvingStep === dispatchedTaskResult.liveTask?.taskId}
                            onClick={() => handleStepApproval(dispatchedTaskResult.liveTask.taskId, dispatchedTaskResult.agentRole.id, 'reject')}
                            className="px-3 py-1 rounded bg-zinc-800 hover:bg-rose-950 text-zinc-300 hover:text-rose-300 border border-zinc-700 font-semibold text-[11px] transition flex items-center gap-1"
                          >
                            <X size={12} />
                            <span>ปฏิเสธ (Reject)</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Planned Steps */}
                    {dispatchedTaskResult.liveTask?.plannedSteps?.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] uppercase font-bold text-zinc-500">Planned Orchestration Steps</span>
                        <div className="space-y-1">
                          {dispatchedTaskResult.liveTask.plannedSteps.map((s: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-zinc-950 border border-zinc-800 text-[10px]">
                              <span className="text-zinc-200">{idx + 1}. {s.title}</span>
                              <span className="font-mono text-teal-400">{s.toolRequired || 'analysis'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* LIVE AGENT ACTIVITY SECTION (อัปเดตแบบเรียลไทม์จาก Orchestrator) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-teal-400 animate-pulse" />
                    <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                      Live Agent Activity (Real-Time)
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Radio size={10} className="text-emerald-400 animate-pulse" />
                    <span>SSE Synced · {lastLivePulse}</span>
                  </div>
                </div>

                {/* Real-Time Live Stats Strip */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">Active Tasks</span>
                    <span className="text-sm font-bold text-teal-300">{liveStats.activeRunningAgents}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">Completed</span>
                    <span className="text-sm font-bold text-emerald-400">{liveStats.totalTasksExecuted}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">Approvals</span>
                    <span className={`text-sm font-bold ${liveStats.pendingHumanApprovals > 0 ? 'text-amber-400 animate-pulse' : 'text-zinc-400'}`}>
                      {liveStats.pendingHumanApprovals}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">Integrity</span>
                    <span className="text-sm font-bold text-teal-400">{liveStats.verificationRate}</span>
                  </div>
                </div>

                {/* Active Agents & Assigned Tasks Grid */}
                <div className="space-y-2">
                  {liveAgents.length > 0 ? (
                    liveAgents.map((agent: any) => {
                      const task: LiveAssignedTask | null = agent.assignedTask;
                      const isActive = ['RUNNING', 'ASSIGNED', 'WAITING_FOR_APPROVAL', 'PAUSED'].includes(agent.currentStatus);
                      const isPaused = agent.currentStatus === 'PAUSED';
                      const isRunning = agent.currentStatus === 'RUNNING';
                      const isWaiting = agent.currentStatus === 'WAITING_FOR_APPROVAL';
                      const isCompleted = agent.currentStatus === 'COMPLETED';

                      return (
                        <div
                          key={agent.id}
                          className={`p-3.5 rounded-xl border transition ${
                            isWaiting
                              ? 'bg-amber-950/20 border-amber-800/60'
                              : isRunning
                              ? 'bg-teal-950/20 border-teal-700/60 ring-1 ring-teal-500/30'
                              : isPaused
                              ? 'bg-amber-950/15 border-amber-800/50'
                              : 'bg-zinc-950 border-zinc-800'
                          }`}
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
                            <div className="flex items-center gap-2 min-w-0">
                              <AgentStatusDot status={agent.currentStatus} size="md" />
                              <div className="min-w-0">
                                <div className="font-semibold text-zinc-100 text-xs flex items-center gap-1.5 truncate">
                                  <span>{agent.name}</span>
                                  {agent.nameTh && <span className="text-[10px] text-zinc-400 font-normal">({agent.nameTh})</span>}
                                </div>
                                <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{agent.description}</div>
                              </div>
                            </div>
                            <AgentStatusBadge status={agent.currentStatus} size="sm" />
                          </div>

                          {/* Currently Assigned Task from Orchestrator */}
                          {task ? (
                            <div className="pt-2.5 space-y-2 text-xs">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-[11px] font-semibold text-zinc-200 line-clamp-1">
                                    {task.goal}
                                  </div>
                                  <div className="text-[10px] text-zinc-400 flex flex-wrap items-center gap-2 mt-1">
                                    <span>Step: <b className="text-teal-300">{task.currentStepIndex || 1}/{task.totalSteps || 3}</b></span>
                                    <span>Tool: <code className="text-zinc-300 font-mono">[{task.toolInUse || 'core'}]</code></span>
                                    <span>Risk: <b className={task.riskTier === 'HIGH' ? 'text-rose-400' : 'text-zinc-400'}>{task.riskTier || 'LOW'}</b></span>
                                    {/* Live-updating indicator */}
                                    <LiveTaskIndicator status={agent.currentStatus} toolInUse={task.toolInUse} />
                                  </div>
                                </div>
                                <span className="text-[9px] font-mono text-zinc-500 shrink-0">
                                  {task.taskId?.slice(-8)}
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-500 ${
                                    isCompleted ? 'bg-emerald-500' : isWaiting ? 'bg-amber-500' : isPaused ? 'bg-amber-400' : 'bg-teal-500'
                                  }`}
                                  style={{
                                    width: `${Math.round(((task.currentStepIndex || 1) / (task.totalSteps || 3)) * 100)}%`,
                                  }}
                                />
                              </div>

                              <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                                <span className="truncate">{task.currentStepTitle}</span>
                                {task.evidenceDigest && (
                                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40">
                                    SHA: {task.evidenceDigest.slice(0, 8)}
                                  </span>
                                )}
                              </div>

                              {/* In-Card Approval Action if Waiting */}
                              {isWaiting && (
                                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 flex items-center justify-between mt-1.5">
                                  <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                                    <AlertTriangle size={12} /> Approval Required
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={approvingStep === task.taskId}
                                      onClick={() => handleStepApproval(task.taskId, agent.id, 'approve')}
                                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] transition"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      disabled={approvingStep === task.taskId}
                                      onClick={() => handleStepApproval(task.taskId, agent.id, 'reject')}
                                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-rose-950 text-zinc-300 font-semibold text-[10px] transition"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="pt-2.5 text-[10px] text-zinc-500 flex items-center gap-1.5 italic">
                              <AgentStatusDot status="IDLE" size="sm" />
                              <span>ไม่มีงานที่ได้รับมอบหมายในขณะนี้ — พร้อมรับคำสั่งงาน</span>
                            </div>
                          )}

                          {/* Quick-action buttons interfacing directly with Agent Orchestrator */}
                          <div className="pt-2.5 mt-2.5 border-t border-zinc-850 flex items-center justify-between text-xs">
                            <div className="text-[10px] font-mono">
                              {isActive ? (
                                <span className="text-teal-400 font-semibold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                                  ACTIVE
                                </span>
                              ) : (
                                <span className="text-zinc-500">STANDBY</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Pause / Resume button */}
                              <button
                                type="button"
                                disabled={!isActive || actionInProgress === agent.id}
                                onClick={() => handleAgentQuickAction(agent.id, isPaused ? 'resume' : 'pause')}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 transition border ${
                                  isActive
                                    ? isPaused
                                      ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300 hover:bg-emerald-900/70'
                                      : 'bg-amber-950/70 border-amber-700 text-amber-300 hover:bg-amber-900/70'
                                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-600 opacity-40 cursor-not-allowed'
                                }`}
                                title={
                                  isActive
                                    ? isPaused
                                      ? 'Resume agent execution'
                                      : 'Pause active agent execution'
                                    : 'Agent is idle — only active agents can be paused'
                                }
                              >
                                {isPaused ? <Play size={10} fill="currentColor" /> : <Pause size={10} />}
                                <span>{isPaused ? 'Resume' : 'Pause'}</span>
                              </button>

                              {/* Cancel button */}
                              <button
                                type="button"
                                disabled={!isActive || actionInProgress === agent.id}
                                onClick={() => handleAgentQuickAction(agent.id, 'cancel')}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 transition border ${
                                  isActive
                                    ? 'bg-rose-950/70 border-rose-700 text-rose-300 hover:bg-rose-900/70'
                                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-600 opacity-40 cursor-not-allowed'
                                }`}
                                title={
                                  isActive
                                    ? 'Cancel active agent task'
                                    : 'Agent is idle — only active agents can be cancelled'
                                }
                              >
                                <Square size={10} />
                                <span>Cancel</span>
                              </button>

                              {/* View Logs button */}
                              <button
                                type="button"
                                onClick={() => handleOpenAgentLogs(agent)}
                                className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 text-[10px] font-semibold flex items-center gap-1 transition"
                                title="View real orchestrator execution logs"
                              >
                                <Eye size={10} />
                                <span>View Logs</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center text-zinc-500 text-[11px]">
                      กำลังเชื่อมต่อระบบ Live Agent Orchestration...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DEDICATED LIVE ACTIVITY VIEW (เมื่อคลิกแท็บ Live Activity) */}
          {activeSecondaryTab === 'activity' && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                  <Activity size={14} className="text-teal-400 animate-pulse" /> Live Agent Activity Feed
                </span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <Radio size={10} className="animate-pulse" /> STREAM ACTIVE
                </span>
              </div>

              {/* Live Event Stream List */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1 text-xs">
                {recentActivities.length > 0 ? (
                  recentActivities.map(act => (
                    <div key={act.id} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-teal-300 flex items-center gap-1.5">
                          <Bot size={12} />
                          <span>{act.agentName}</span>
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(act.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-200">{act.detail}</p>
                      <div className="flex items-center justify-between text-[10px] pt-1 text-zinc-400">
                        <span className="font-mono bg-zinc-900 px-1.5 py-0.2 rounded">{act.action}</span>
                        {act.evidenceHash && (
                          <span className="font-mono text-emerald-400">HASH: {act.evidenceHash.slice(0, 10)}</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-center text-zinc-500 text-xs">
                    ยังไม่มีประวัติการทำงานในเซสชันนี้
                  </div>
                )}
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

                {/* Distinct External Model Providers Section */}
                <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider">
                      External Model Providers (Not Native)
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                      Consent-Gated Remote Calls
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                    <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-850">
                      <div className="font-semibold text-zinc-200">Gemini</div>
                      <div className="text-zinc-500 text-[9px]">Google Cloud Proxy</div>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-850">
                      <div className="font-semibold text-zinc-200">OpenAI</div>
                      <div className="text-zinc-500 text-[9px]">API Gateway</div>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-850">
                      <div className="font-semibold text-zinc-200">Claude</div>
                      <div className="text-zinc-500 text-[9px]">Anthropic Proxy</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500 italic">
                    External providers are clearly attributed. ZYNTHEOR never claims external inferences are First-Party Native.
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

      {/* Real Agent Execution Logs Modal */}
      {logsModalAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <AgentStatusDot status={logsModalAgent.currentStatus} size="md" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <span>{logsModalAgent.name}</span>
                    <AgentStatusBadge status={logsModalAgent.currentStatus} size="sm" />
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Real Orchestrator Execution Log &amp; Verification Evidence</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLogsModalAgent(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-12 text-zinc-500 gap-2">
                  <RefreshCw size={16} className="animate-spin text-teal-400" />
                  <span>Loading orchestrator logs...</span>
                </div>
              ) : agentLogs.length > 0 ? (
                agentLogs.map((log: any, idx: number) => (
                  <div key={log.id || idx} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                      <span className="font-bold text-teal-300">{log.action}</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-zinc-200">{log.detail}</div>
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[10px] text-zinc-500">
                      <span>Status: <b className="text-zinc-300">{log.status}</b></span>
                      {log.evidenceHash && (
                        <span className="text-emerald-400">SHA-256: {log.evidenceHash}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  ยังไม่มีประวัติการทำงานสำหรับเอเจนต์นี้ในเซสชันปัจจุบัน
                </div>
              )}
            </div>

            <div className="p-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-500">
              <span>Fail-closed audit ledger recording verified</span>
              <button
                type="button"
                onClick={() => setLogsModalAgent(null)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomepageEngineeringCenter;
