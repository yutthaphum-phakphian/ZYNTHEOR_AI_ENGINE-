// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot, ShieldCheck, CheckCircle2, Clock, AlertTriangle, Play,
  Lock, ArrowRight, RefreshCw, Cpu, FileCode2,
  Check, X, FileText, Sparkles, AlertCircle, Pause, Square, Eye, Activity, Radio
} from 'lucide-react';
import {
  AgentStatusDot,
  AgentStatusBadge,
  LiveTaskIndicator,
  getAgentVisualStatus
} from './AgentStatusIndicator';

export interface AgentRole {
  id: string;
  name: string;
  nameTh: string;
  description: string;
  permissions: string[];
  allowedTools: string[];
  requiresApprovalFor: string[];
  status: string;
  currentStatus?: string;
  assignedTask?: any;
}

export interface AgentStep {
  id: string;
  order: number;
  priority: string;
  stage: string;
  title: string;
  description: string;
  toolRequired?: string;
  isConsequential: boolean;
  requiresHumanApproval: boolean;
  approvalStatus: string;
  executionStatus: string;
  verificationStatus: string;
  findings?: string[];
  evidence?: {
    digest: string;
    source: string;
    status: string;
  };
}

interface AgentCommandCenterProps {
  authHeaders?: () => Record<string, string>;
  workspaceId?: string;
  setToast?: (msg: string) => void;
  onOpenAuditLedger?: () => void;
}

export const AgentCommandCenter: React.FC<AgentCommandCenterProps> = ({
  authHeaders,
  workspaceId = 'default',
  setToast,
  onOpenAuditLedger,
}) => {
  const [roles, setRoles] = useState<AgentRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('planner');
  const [goal, setGoal] = useState('');
  const [isDryRun, setIsDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [humanApprovals, setHumanApprovals] = useState<Record<string, boolean>>({});
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Action & Logs Modal State
  const [statusFilter, setStatusFilter] = useState<'all' | 'Working' | 'Blocked' | 'Idle' | 'Error'>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [logsModalAgent, setLogsModalAgent] = useState<AgentRole | null>(null);
  const [agentLogs, setAgentLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [isSseConnected, setIsSseConnected] = useState(false);

  const fetchActivity = useCallback(async () => {
    try {
      setLoadingRoles(true);
      const headers = authHeaders ? authHeaders() : {};
      const res = await fetch('/api/intelligence/agent/activity', { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.activeAgents)) {
        setRoles(data.activeAgents);
        setLastSyncTime(new Date().toLocaleTimeString());
      } else {
        // Fallback to roles
        const roleRes = await fetch('/api/intelligence/agent/roles', { headers });
        const roleData = await roleRes.json();
        if (roleData.ok && Array.isArray(roleData.roles)) {
          setRoles(roleData.roles.map((r: any) => ({ ...r, currentStatus: 'IDLE' })));
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load agent activity');
    } finally {
      setLoadingRoles(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchActivity();

    // SSE Real-time synchronization
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/intelligence/agent/activity/stream');
      eventSource.onopen = () => setIsSseConnected(true);
      eventSource.addEventListener('snapshot', (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          if (Array.isArray(payload.activeAgents)) {
            setRoles(payload.activeAgents);
            setLastSyncTime(new Date().toLocaleTimeString());
          }
        } catch {}
      });
      eventSource.addEventListener('agent:task_started', () => fetchActivity());
      eventSource.addEventListener('agent:task_completed', () => fetchActivity());
      eventSource.addEventListener('agent:task_paused', () => fetchActivity());
      eventSource.addEventListener('agent:task_resumed', () => fetchActivity());
      eventSource.addEventListener('agent:task_cancelled', () => fetchActivity());
      eventSource.addEventListener('agent:waiting_approval', () => fetchActivity());
      eventSource.addEventListener('agent:decision_recorded', () => fetchActivity());
      eventSource.onerror = () => setIsSseConnected(false);
    } catch {
      setIsSseConnected(false);
    }

    const interval = setInterval(fetchActivity, 4000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [fetchActivity]);

  const handleExecuteAgent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!goal.trim() || running) return;

    try {
      setRunning(true);
      setError(null);
      const res = await fetch('/api/intelligence/agent/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeaders ? authHeaders() : {}),
        },
        body: JSON.stringify({
          goal: goal.trim(),
          agentRole: selectedRole,
          workspaceId,
          humanApprovals,
          isDryRun,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.message || `Execution failed with status ${res.status}`);
      }

      setActiveTask(data.task);
      if (setToast) {
        setToast(data.humanApprovalRequired ? '⚠️ งานสำเร็จบางส่วนและต้องการการอนุมัติโดยมนุษย์' : '✅ กระบวนการ Agent ทำงานสำเร็จ');
      }
      fetchActivity();
    } catch (err: any) {
      setError(err.message || 'Execution error');
      if (setToast) setToast(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleStepApproval = (stepId: string, approved: boolean) => {
    setHumanApprovals(prev => ({ ...prev, [stepId]: approved }));
    if (setToast) {
      setToast(approved ? `อนุมัติขั้นตอน ${stepId} แล้ว` : `ปฏิเสธขั้นตอน ${stepId} แล้ว`);
    }
  };

  // Quick Action Handler (Pause, Resume, Cancel)
  const handleAgentAction = async (agentRoleId: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      setActionInProgress(agentRoleId);
      const res = await fetch('/api/intelligence/agent/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeaders ? authHeaders() : {}),
        },
        body: JSON.stringify({
          agentRoleId,
          action,
          reason: 'Manual command from Agent Command Center',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Action failed');
      }

      if (setToast) {
        const actionLabel = action === 'pause' ? 'หยุดชั่วคราว (Paused)' : action === 'resume' ? 'ดำเนินการต่อ (Resumed)' : 'ยกเลิกคำสั่ง (Cancelled)';
        setToast(`✅ Agent ${agentRoleId}: ${actionLabel} สำเร็จ`);
      }
      fetchActivity();
    } catch (err: any) {
      if (setToast) setToast(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // View Logs Handler
  const handleViewLogs = async (agent: AgentRole) => {
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

  const currentRole = roles.find(r => r.id === selectedRole) || roles[0];
  const currentTask = currentRole?.assignedTask;
  const isCurrentActive = ['RUNNING', 'ASSIGNED', 'WAITING_FOR_APPROVAL', 'PAUSED'].includes(currentRole?.currentStatus || '');
  const isCurrentPaused = currentRole?.currentStatus === 'PAUSED';

  // Fleet counts
  const workingCount = roles.filter(r => ['RUNNING', 'ASSIGNED'].includes(r.currentStatus || '')).length;
  const blockedCount = roles.filter(r => ['WAITING_FOR_APPROVAL', 'BLOCKED', 'PAUSED'].includes(r.currentStatus || '')).length;
  const errorCount = roles.filter(r => ['FAILED', 'ERROR'].includes(r.currentStatus || '')).length;
  const idleCount = roles.filter(r => !['RUNNING', 'ASSIGNED', 'WAITING_FOR_APPROVAL', 'BLOCKED', 'PAUSED', 'FAILED', 'ERROR'].includes(r.currentStatus || '')).length;

  return (
    <div className="w-full space-y-6 p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="text-xs font-bold text-teal-400 tracking-wider uppercase flex items-center gap-2">
            <Bot size={15} /> ZYNTHEOR CORE X / AGENT COMMAND CENTER
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1">Autonomous Agent Orchestrator</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Governed 7-stage multi-step intelligence engine with strict Human-in-the-Loop approval gate &amp; fail-closed sandbox.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 font-mono">
            <Radio size={11} className={isSseConnected ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'} />
            <span>{isSseConnected ? 'LIVE SYNC' : 'POLLING'}</span>
            <span className="text-zinc-600">·</span>
            <span>{lastSyncTime}</span>
          </div>
          <button
            type="button"
            onClick={fetchActivity}
            disabled={loadingRoles}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-xs text-zinc-200 hover:bg-zinc-750 transition"
          >
            <RefreshCw size={13} className={loadingRoles ? 'animate-spin' : ''} />
            <span>Reload Status</span>
          </button>
          {onOpenAuditLedger && (
            <button
              type="button"
              onClick={onOpenAuditLedger}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-500/30 bg-teal-950/40 text-teal-300 text-xs hover:bg-teal-900/40 transition"
            >
              <ShieldCheck size={13} />
              <span>Audit Ledger</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
          <AlertCircle size={16} className="shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Monitoring Bar (Fleet Status Overview & Quick Filters) */}
      <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
            <Activity size={14} className="text-teal-400 animate-pulse" />
            <span>Fleet Health Monitor:</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {/* All Filter */}
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[11px] transition border ${
                statusFilter === 'all'
                  ? 'bg-teal-950/90 border-teal-500 text-teal-200 ring-1 ring-teal-400/50'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All: <b>{roles.length}</b>
            </button>

            {/* Running / Working Filter */}
            <button
              type="button"
              onClick={() => setStatusFilter('Working')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[11px] transition border ${
                statusFilter === 'Working'
                  ? 'bg-sky-950 border-sky-400 text-sky-200 ring-1 ring-sky-400/50'
                  : 'bg-sky-950/40 border-sky-850/60 text-sky-300 hover:border-sky-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              Running: <b>{workingCount}</b>
            </button>

            {/* Blocked Filter */}
            <button
              type="button"
              onClick={() => setStatusFilter('Blocked')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[11px] transition border ${
                statusFilter === 'Blocked'
                  ? 'bg-amber-950 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                  : 'bg-amber-950/40 border-amber-850/60 text-amber-300 hover:border-amber-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Blocked: <b>{blockedCount}</b>
            </button>

            {/* Idle Filter */}
            <button
              type="button"
              onClick={() => setStatusFilter('Idle')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[11px] transition border ${
                statusFilter === 'Idle'
                  ? 'bg-zinc-800 border-zinc-400 text-zinc-200 ring-1 ring-zinc-400/50'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              Idle: <b>{idleCount}</b>
            </button>

            {/* Error Filter */}
            {errorCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('Error')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[11px] transition border ${
                  statusFilter === 'Error'
                    ? 'bg-rose-950 border-rose-400 text-rose-200 ring-1 ring-rose-400/50'
                    : 'bg-rose-950/40 border-rose-850/60 text-rose-300 hover:border-rose-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Error: <b>{errorCount}</b>
              </button>
            )}
          </div>
        </div>

        {/* Quick Agent Dots Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {roles.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRole(r.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition border ${
                selectedRole === r.id
                  ? 'bg-teal-950/80 border-teal-500/70 text-teal-200 shadow-sm'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
              title={`${r.name}: ${getAgentVisualStatus(r.currentStatus).labelEn} (${getAgentVisualStatus(r.currentStatus).labelTh})`}
            >
              <AgentStatusDot status={r.currentStatus} size="sm" />
              <span className="font-semibold">{r.name.replace(' Agent', '')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Role Selector Grid with Visual Status Indicators */}
      <div>
        <div className="text-xs font-semibold text-zinc-300 mb-2.5 flex items-center justify-between">
          <span>Active Agent Roles (Strict Least-Privilege Separation)</span>
          <span className="text-[11px] text-zinc-500">
            {roles.filter(r => statusFilter === 'all' || getAgentVisualStatus(r.currentStatus).status === statusFilter).length} of {roles.length} Roles Shown
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {roles
            .filter(r => statusFilter === 'all' || getAgentVisualStatus(r.currentStatus).status === statusFilter)
            .map(r => {
            const isSelected = r.id === selectedRole;
            const task = r.assignedTask;
            const statusCfg = getAgentVisualStatus(r.currentStatus);

            return (
              <div
                key={r.id}
                onClick={() => setSelectedRole(r.id)}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-teal-400/70 bg-teal-950/30 shadow-lg shadow-teal-950/40 ring-1 ring-teal-500/40'
                    : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-850/60'
                }`}
              >
                <div>
                  {/* Status Indicator & Role Name */}
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AgentStatusDot status={r.currentStatus} size="md" />
                      <span className="text-xs font-bold text-zinc-100 truncate">{r.name}</span>
                    </div>
                    <AgentStatusBadge status={r.currentStatus} size="sm" showDot={false} />
                  </div>

                  <div className="text-[11px] text-teal-400 font-medium mb-1">{r.nameTh}</div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">{r.description}</p>

                  {/* Assigned Task Preview if active */}
                  {task && (
                    <div className="mt-2 p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-[10px] space-y-1">
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="font-semibold truncate max-w-[110px]">{task.goal}</span>
                        <LiveTaskIndicator status={r.currentStatus} toolInUse={task.toolInUse} />
                      </div>
                      <div className="text-zinc-500 truncate">{task.currentStepTitle}</div>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
                  <span>{r.allowedTools.length} tools allowed</span>
                  {r.requiresApprovalFor.length > 0 && (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Lock size={10} /> Gate
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Role Capabilities Bar with Quick-Actions */}
      {currentRole && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-800 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-zinc-300">
              <AgentStatusDot status={currentRole.currentStatus} size="lg" />
              <span className="font-bold text-teal-300 text-sm">{currentRole.name}</span>
              <span className="text-zinc-600">|</span>
              <AgentStatusBadge status={currentRole.currentStatus} size="md" />
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">{currentRole.description}</span>
            </div>

            {/* Quick Action Buttons for Current Agent */}
            <div className="flex items-center gap-2">
              {/* Pause / Resume */}
              <button
                type="button"
                disabled={!isCurrentActive || actionInProgress === currentRole.id}
                onClick={() => handleAgentAction(currentRole.id, isCurrentPaused ? 'resume' : 'pause')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                  isCurrentActive
                    ? isCurrentPaused
                      ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300 hover:bg-emerald-900/70'
                      : 'bg-amber-950/70 border-amber-700 text-amber-300 hover:bg-amber-900/70'
                    : 'bg-zinc-950 border-zinc-850 text-zinc-600 opacity-40 cursor-not-allowed'
                }`}
                title={isCurrentActive ? (isCurrentPaused ? 'Resume Agent execution' : 'Pause Agent execution') : 'Agent is idle — only active agents can be paused'}
              >
                {isCurrentPaused ? <Play size={11} fill="currentColor" /> : <Pause size={11} />}
                <span>{isCurrentPaused ? 'Resume' : 'Pause'}</span>
              </button>

              {/* Cancel */}
              <button
                type="button"
                disabled={!isCurrentActive || actionInProgress === currentRole.id}
                onClick={() => handleAgentAction(currentRole.id, 'cancel')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                  isCurrentActive
                    ? 'bg-rose-950/70 border-rose-700 text-rose-300 hover:bg-rose-900/70'
                    : 'bg-zinc-950 border-zinc-850 text-zinc-600 opacity-40 cursor-not-allowed'
                }`}
                title={isCurrentActive ? 'Abort Agent execution safely' : 'Agent is idle — only active agents can be cancelled'}
              >
                <Square size={11} />
                <span>Cancel</span>
              </button>

              {/* View Logs */}
              <button
                type="button"
                onClick={() => handleViewLogs(currentRole)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 text-xs font-semibold transition"
              >
                <Eye size={11} />
                <span>View Logs</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Granted Permissions</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {currentRole.permissions.map(p => (
                  <span key={p} className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono">
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Tool Gateway Allowlist</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {currentRole.allowedTools.map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-teal-950/40 border border-teal-800/40 text-teal-300 font-mono">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Human-In-The-Loop Approval Gates</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {currentRole.requiresApprovalFor.length > 0 ? (
                  currentRole.requiresApprovalFor.map(a => (
                    <span key={a} className="text-[10px] px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300 font-mono flex items-center gap-1">
                      <Lock size={9} /> {a}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-zinc-500 italic">No restrictive approval gate required for read-only tools</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Dispatcher */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
        <div className="text-xs font-semibold text-zinc-200">
          Dispatch Goal to <span className="text-teal-400 font-bold">{currentRole?.name}</span>
        </div>
        <form onSubmit={handleExecuteAgent} className="space-y-3">
          <textarea
            value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder="ป้อนเป้าหมายการทำงานของ Agent เช่น 'ตรวจสอบความถูกต้องของ Merkle Hash Chain ใน Audit Ledger' หรือ 'สแกน Dependency Graph'..."
            className="w-full h-24 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-teal-500 resize-none font-mono"
            disabled={running}
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isDryRun}
                onChange={e => setIsDryRun(e.target.checked)}
                className="rounded border-zinc-700 text-teal-500 focus:ring-0"
              />
              <span>Dry-Run Simulation (Do not commit modifications to disk)</span>
            </label>

            <button
              type="submit"
              disabled={!goal.trim() || running}
              className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold text-xs transition"
            >
              {running ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Executing Plan...</span>
                </>
              ) : (
                <>
                  <Play size={13} fill="currentColor" />
                  <span>Execute Governed Workflow</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Execution Results & Steps */}
      {activeTask && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div>
              <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                <span>Task: {activeTask.taskId}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    activeTask.status === 'COMPLETED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : activeTask.status === 'BLOCKED'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}
                >
                  {activeTask.status}
                </span>
                {activeTask.isDryRun && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                    DRY RUN
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-400 mt-1">Goal: {activeTask.goal}</div>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <div>
                Steps: <b className="text-zinc-200">{activeTask.steps?.length || 0}</b>
              </div>
              <div>
                Duration: <b className="text-zinc-200">{activeTask.durationMs || 0}ms</b>
              </div>
              <div>
                Model: <b className="text-teal-300">{activeTask.modelUsed || 'Deterministic'}</b>
              </div>
            </div>
          </div>

          {/* Atomic Step Breakdown with Approval Gates */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-zinc-300">Atomic Steps &amp; Human Approval Status</div>
            {activeTask.steps?.map((step: AgentStep, idx: number) => {
              const isApproved = humanApprovals[step.id] === true;
              const isRejected = humanApprovals[step.id] === false;
              return (
                <div
                  key={step.id || idx}
                  className={`p-3 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                    step.requiresHumanApproval && !isApproved && !isRejected
                      ? 'border-amber-500/60 bg-amber-950/20'
                      : 'border-zinc-800 bg-zinc-950/60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 font-mono">#{step.order}</span>
                      <b className="text-zinc-200">{step.title}</b>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                        {step.stage}
                      </span>
                      {step.toolRequired && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-950/70 text-teal-300 border border-teal-800/40 font-mono">
                          {step.toolRequired}
                        </span>
                      )}
                      {step.isConsequential && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          Consequential
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">{step.description}</p>
                    {step.evidence && (
                      <div className="text-[10px] text-zinc-500 font-mono">
                        Evidence Digest: {step.evidence.digest?.slice(0, 20)}… ({step.evidence.status})
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {step.requiresHumanApproval ? (
                      isApproved ? (
                        <span className="text-[11px] px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Operator Approved
                        </span>
                      ) : isRejected ? (
                        <span className="text-[11px] px-2.5 py-1 rounded bg-red-950 text-red-300 border border-red-800 flex items-center gap-1">
                          <X size={12} /> Operator Rejected
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStepApproval(step.id, true)}
                            className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold flex items-center gap-1 transition"
                          >
                            <Check size={11} /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStepApproval(step.id, false)}
                            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] flex items-center gap-1 transition"
                          >
                            <X size={11} /> Reject
                          </button>
                        </div>
                      )
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {step.executionStatus || 'Complete'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Final Answer / Findings Summary */}
          {activeTask.finalAnswer && (
            <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
              <div className="font-bold text-teal-400 mb-1 flex items-center gap-1.5">
                <Sparkles size={13} /> Synthesized Agent Findings
              </div>
              <div className="text-zinc-200 whitespace-pre-wrap leading-relaxed">{activeTask.finalAnswer}</div>
            </div>
          )}
        </div>
      )}

      {/* Agent Execution Logs Modal */}
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
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition"
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

export default AgentCommandCenter;
