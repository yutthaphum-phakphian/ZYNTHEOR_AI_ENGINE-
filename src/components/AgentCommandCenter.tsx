import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot, ShieldCheck, CheckCircle2, Clock, AlertTriangle, Play,
  Lock, ArrowRight, RefreshCw, Cpu, FileCode2,
  Check, X, FileText, Sparkles, AlertCircle
} from 'lucide-react';

export interface AgentRole {
  id: string;
  name: string;
  nameTh: string;
  description: string;
  permissions: string[];
  allowedTools: string[];
  requiresApprovalFor: string[];
  status: string;
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

  const fetchRoles = useCallback(async () => {
    try {
      setLoadingRoles(true);
      const res = await fetch('/api/intelligence/agent/roles', {
        headers: authHeaders ? authHeaders() : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.roles)) {
        setRoles(data.roles);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load agent roles');
    } finally {
      setLoadingRoles(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

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

  const currentRole = roles.find(r => r.id === selectedRole) || roles[0];

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
            Governed 7-stage multi-step intelligence engine with strict Human-in-the-Loop approval gate & fail-closed sandbox.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchRoles}
            disabled={loadingRoles}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-xs text-zinc-200 hover:bg-zinc-750 transition"
          >
            <RefreshCw size={13} className={loadingRoles ? 'animate-spin' : ''} />
            <span>Reload Roles</span>
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

      {/* Role Selector Grid */}
      <div>
        <div className="text-xs font-semibold text-zinc-300 mb-2 flex items-center justify-between">
          <span>Active Agent Roles (Strict Least-Privilege Separation)</span>
          <span className="text-[11px] text-zinc-500">{roles.length} Governed Roles</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {roles.map(r => {
            const isSelected = r.id === selectedRole;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRole(r.id)}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? 'border-teal-400/60 bg-teal-950/30 shadow-lg shadow-teal-950/40'
                    : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-850/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-zinc-200">{r.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/40">
                      {r.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-teal-400 font-medium mb-1">{r.nameTh}</div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">{r.description}</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
                  <span>{r.allowedTools.length} tools allowed</span>
                  {r.requiresApprovalFor.length > 0 && (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Lock size={10} /> Gate
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Role Capabilities Bar */}
      {currentRole && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-800 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <span className="font-semibold text-teal-300">{currentRole.name}</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">{currentRole.description}</span>
            </div>
            <div className="text-[11px] text-zinc-400">
              Workspace Context: <b className="text-zinc-200">{workspaceId}</b>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 text-xs">
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
              <span className="text-[10px] uppercase font-bold text-amber-500/90 tracking-wider flex items-center gap-1">
                <Lock size={11} /> Human Approval Mandatory For
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {currentRole.requiresApprovalFor.length === 0 ? (
                  <span className="text-[10px] text-zinc-500 italic">None (Read-only / Safe operations only)</span>
                ) : (
                  currentRole.requiresApprovalFor.map(a => (
                    <span key={a} className="text-[10px] px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300 font-mono">
                      {a}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Dispatch Form */}
      <form onSubmit={handleExecuteAgent} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <label className="block text-xs font-semibold text-zinc-200">
          Agent Command / Goal
          <textarea
            value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder="เช่น: ตรวจสอบโครงสร้างโปรเจกต์ วางแผนปรับปรุง Security Isolation และสร้าง Patch สำหรับระบบจัดการความจำ..."
            rows={3}
            className="w-full mt-1.5 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500"
          />
        </label>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
              <input
                type="checkbox"
                checked={isDryRun}
                onChange={e => setIsDryRun(e.target.checked)}
                className="rounded border-zinc-700 text-teal-500 focus:ring-0"
              />
              <span>Dry Run Simulation (Pre-flight only, zero state mutation)</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={running || !goal.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-teal-900/30"
            >
              {running ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Orchestrating 7-Stage Workflow…</span>
                </>
              ) : (
                <>
                  <Play size={13} />
                  <span>Execute Goal via {currentRole?.name}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* 7-Stage Workflow Visualization Bar */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="text-xs font-semibold text-zinc-300 mb-3 flex items-center justify-between">
          <span>7-Stage Governed Autonomous Pipeline</span>
          <span className="text-[11px] text-zinc-500">Fail-Closed Verification Contract</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { id: 'understand', num: '1', title: 'Understand', desc: 'Intent & Scope' },
            { id: 'inspect', num: '2', title: 'Inspect', desc: 'Workspace Context' },
            { id: 'plan', num: '3', title: 'Plan', desc: 'Atomic Breakdown' },
            { id: 'route', num: '4', title: 'Route', desc: 'Tool & Model' },
            { id: 'execute', num: '5', title: 'Execute', desc: 'Sandbox Run' },
            { id: 'verify', num: '6', title: 'Verify', desc: 'Evidence Gate' },
            { id: 'respond', num: '7', title: 'Respond', desc: 'Audit Ledger' },
          ].map(s => {
            const isCompleted = activeTask?.stagesCompleted?.includes(s.id);
            return (
              <div
                key={s.id}
                className={`p-2.5 rounded-lg border text-center transition ${
                  isCompleted
                    ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                }`}
              >
                <div className="text-[10px] font-bold text-zinc-400">STAGE {s.num}</div>
                <div className="text-xs font-bold text-zinc-200 mt-0.5">{s.title}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{s.desc}</div>
                <div className="mt-2 text-[10px]">
                  {isCompleted ? (
                    <span className="text-emerald-400 font-semibold flex items-center justify-center gap-1">
                      <Check size={11} /> Pass
                    </span>
                  ) : (
                    <span className="text-zinc-600">Pending</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
            <div className="text-xs font-semibold text-zinc-300">Atomic Steps & Human Approval Status</div>
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
    </div>
  );
};

export default AgentCommandCenter;
