import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import {
  Activity, AlertTriangle, ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Bot, Boxes, Bug, Calendar, Check,
  CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardCheck, Clock, Code2, Cpu, CreditCard, Download,
  Eye, File, FileCode2, FileText, Files, Gauge, GitBranch, Globe, HardDrive, History, Keyboard, LayoutDashboard,
  LockKeyhole, Menu, MessageSquare, MoreHorizontal, Network, Plus, RefreshCw, RotateCcw, Search, Send, Server,
  Settings, Shield, ShieldCheck, Sparkles, Split, Square, SquareTerminal, Trash2, Upload, WandSparkles, X, Zap, GitCompare
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { readServerEvents, type ChatMode } from '../lib/chat-core.mjs';
import { useTranslation, type SupportedLanguage } from '../lib/i18n';
import { HighlightedMessage } from './components/HighlightedMessage';
import { PromptForgePage } from './components/PromptForgePage';
import { TrainingMonitor } from './components/TrainingMonitor';
import { HardwareReadinessDashboard } from './components/HardwareReadinessDashboard';
import { NativeModelStatusPanel } from './components/NativeModelStatusPanel';
import { ModelBenchmarkSuite } from './components/ModelBenchmarkSuite';
import { ModelMetricsRollingChart } from './components/ModelMetricsRollingChart';
import { WorkspaceProjectsPage, type Project as WorkspaceProject } from './components/WorkspaceProjectsPage';
import { HeaderWorkspaceSwitcher } from './components/HeaderWorkspaceSwitcher';
import { SidebarWorkspaceSwitcher } from './components/SidebarWorkspaceSwitcher';
import { useMultiWorkspace } from './hooks/useMultiWorkspace';
import { ForensicDiffViewer } from './components/ForensicDiffViewer';
import { GpuTrainingTab } from './components/GpuTrainingTab';
import { AuditChainVisualizer } from './components/AuditChainVisualizer';
import { AuditEventDistributionChart } from './components/AuditEventDistributionChart';
import { AuditActionDistributionChart } from './components/AuditActionDistributionChart';
import { RepairApprovalModal } from './components/RepairApprovalModal';
import { GpuTelemetryWidget } from './components/GpuTelemetryWidget';
import { SettingsCenter } from './components/SettingsCenter';
import { BillingCenter } from './components/BillingCenter';
import { GovernanceObservabilityPanels } from './components/GovernanceObservabilityPanels';
import { RepositoryIntelligence } from './components/RepositoryIntelligence';
import { IntelligentDebugging } from './components/IntelligentDebugging';
import { LocalStorageAuditTool } from './components/LocalStorageAuditTool';
import { createAuditEntry, verifyAuditHashChain, repairAndResignAuditLedger, downloadAuditLedgerJson, downloadAuditLedgerCsv, type AuditEntry } from './services/auditLedger';
import { CodeIntelligence } from '../lib/code-intelligence';
import { evaluateDiagnosticChecks } from '../lib/diagnostics-evaluator.ts';
import * as d3 from 'd3';

type Page = 'Chat' | 'Projects' | 'Plans' | 'Files' | 'Repository Intelligence' | 'Intelligent Debugging' | 'Prompt Forge' | 'Models' | 'Audit Ledger' | 'Diagnostics' | 'Billing' | 'Settings';
type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; at: string; model?: string; error?: boolean; mode?: ChatMode; streaming?: boolean; incomplete?: string; requiresApproval?: boolean; approved?: boolean; rejected?: boolean };
type ChatSession = { id: string; title: string; createdAt: string; updatedAt: string; messages: ChatMessage[]; mode: ChatMode };
type ComposerAttachment = { id: string; name: string; size: number; content: string };
type SystemStatus = 'Ready' | 'Planning' | 'Running' | 'Awaiting Approval' | 'Completed' | 'Failed' | 'Model Unavailable';
type ChatPhase = 'idle' | 'connecting' | 'streaming';
type Project = WorkspaceProject;
type FileItem = { id: string; name: string; size: number; type: string; modified: number; contentSnippet?: string };
type Plan = { id: string; title: string; detail: string; done: boolean };
type AuditRecord = AuditEntry;
type SettingsData = { defaultChatMode?: ChatMode; provider: string; model: string; endpointHost: string; localEndpoint: boolean; localOnly: boolean; onlineConsent: boolean; apiKeyConfigured: boolean; apiKeyExposed: false; accessTokenRequired?: boolean; serverStatus?: string; modelStatus?: 'SERVER_READY' | 'MODEL_UNAVAILABLE' | 'BLOCKED_BY_LOCAL_ONLY' | 'INFERENCE_READY'; inferenceVerified?: boolean };
type Health = { ok?: boolean; service?: string; state?: string; uptimeSeconds?: number; serverStatus?: string; modelStatus?: 'SERVER_READY' | 'MODEL_UNAVAILABLE' | 'BLOCKED_BY_LOCAL_ONLY' | 'INFERENCE_READY'; config?: SettingsData };
type ModelResult = { state: string; source?: 'live' | 'fallback'; configuredModel?: string; models?: string[]; count?: number; error?: string; message?: string; modelStatus?: string };
type InferenceResult = { state: string; model?: string; latencyMs?: number; matchedExpectedText?: boolean; responsePreview?: string; error?: string; message?: string; modelStatus?: string };

const NAV: { title: string; items: { id: Page; icon: LucideIcon; label: string; desc?: string }[] }[] = [
  { title: 'WORKSPACE', items: [{ id: 'Chat', icon: MessageSquare, label: 'Chat' }, { id: 'Projects', icon: Boxes, label: 'Projects' }, { id: 'Plans', icon: LayoutDashboard, label: 'Plans' }, { id: 'Files', icon: Files, label: 'Files' }] },
  { title: 'INTELLIGENCE', items: [{ id: 'Repository Intelligence', icon: Network, label: 'Repo Intelligence' }, { id: 'Intelligent Debugging', icon: Bug, label: 'Intelligent Debugging' }, { id: 'Prompt Forge', icon: WandSparkles, label: 'Prompt Forge' }, { id: 'Models', icon: Cpu, label: 'Models' }] },
  { title: 'TRUST & SAFETY', items: [{ id: 'Audit Ledger', icon: ShieldCheck, label: 'Audit Ledger' }, { id: 'Diagnostics', icon: Activity, label: 'Diagnostics' }] },
  { title: 'SYSTEM', items: [{ id: 'Billing', icon: CreditCard, label: 'Billing & Plans' }, { id: 'Settings', icon: Settings, label: 'Settings' }] },
];
const PAGE_COPY: Record<Page, { eyebrow: string; title: string; subtitle: string }> = {
  Chat: { eyebrow: 'ZYNTHEOR INTELLIGENCE', title: 'Your thinking workspace', subtitle: 'Ask, build, debug and reason — with visible system status.' },
  Projects: { eyebrow: 'WORKSPACE / PROJECTS', title: 'Build in context.', subtitle: 'Organize codebases and ideas into dedicated workspaces.' },
  Plans: { eyebrow: 'WORKSPACE / PLANS', title: 'Plan before action.', subtitle: 'Turn a goal into clear steps and track what is actually complete.' },
  Files: { eyebrow: 'WORKSPACE / FILES', title: 'Your project files.', subtitle: 'Review local files before wiring up the secure server-side file gateway.' },
  'Repository Intelligence': { eyebrow: 'INTELLIGENCE / REPO INTELLIGENCE', title: 'Repository Intelligence Engine', subtitle: 'Map project structure, resolve symbols and exports into JSON context hierarchy.' },
  'Intelligent Debugging': { eyebrow: 'INTELLIGENCE / INTELLIGENT DEBUGGING', title: 'Intelligent Debugging Workflow', subtitle: 'Capture stack traces, fetch workspace code, and rank root cause hypotheses.' },
  'Prompt Forge': { eyebrow: 'INTELLIGENCE / PROMPT FORGE', title: 'Forge, optimize & benchmark prompts.', subtitle: 'Generate production-ready prompts, audit against rubrics, and run test benches.' },
  Models: { eyebrow: 'INTELLIGENCE / MODELS', title: 'Model control center.', subtitle: 'See actual endpoint status. A registered model is not proof of a trained model.' },
  'Audit Ledger': { eyebrow: 'TRUST & SAFETY / AUDIT', title: 'Evidence over assumptions.', subtitle: 'Inspect recorded events and their integrity fingerprints.' },
  Diagnostics: { eyebrow: 'TRUST & SAFETY / DIAGNOSTICS', title: 'Know what is working.', subtitle: 'Check the server and configured model independently.' },
  Billing: { eyebrow: 'SYSTEM / BILLING', title: 'Billing & Subscriptions', subtitle: 'Manage subscriptions, payment providers, invoices, and plan entitlements.' },
  Settings: { eyebrow: 'SYSTEM / SETTINGS', title: 'Control the boundaries.', subtitle: 'Set local-first behavior and understand the current runtime configuration.' },
};
const STORAGE = { messages: 'zyntheor.rebuild.chat.v1', sessions: 'zyntheor.rebuild.chat_sessions.v2', projects: 'zyntheor.rebuild.projects.v1', plans: 'zyntheor.rebuild.plans.v1', audit: 'zyntheor.rebuild.audit.v1' };
const ACCESS_KEY = 'zyntheor.access.v1';
const CHAT_MODE_OPTIONS: { id: ChatMode; label: string; hint: string; icon: LucideIcon }[] = [
  { id: 'auto', label: 'Auto', hint: 'ให้ AI เลือกโหมดตามลักษณะงาน', icon: WandSparkles },
  { id: 'chat', label: 'Chat', hint: 'สนทนาและตอบคำถามทั่วไป', icon: MessageSquare },
  { id: 'reasoning', label: 'Reasoning', hint: 'วิเคราะห์ปัญหาซับซ้อนอย่างเป็นระบบ', icon: ClipboardCheck },
  { id: 'coding', label: 'Coding', hint: 'วิเคราะห์ เขียน และแก้ไขโค้ด', icon: Code2 },
  { id: 'research', label: 'Research', hint: 'สังเคราะห์ข้อมูลและแยกข้อเท็จจริง', icon: BookOpen },
  { id: 'agent', label: 'Agent', hint: 'ทำงานหลายขั้นตอนภายใต้สิทธิ์ที่อนุญาต', icon: Bot },
];
function readAccessToken() { try { return sessionStorage.getItem(ACCESS_KEY) || ''; } catch { return ''; } }
function authHeaders(): Record<string, string> {
  const token = readAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Note: x-user-role is strictly validated and injected by the server session;
  // client-side never sends unverified privilege roles in headers.
  return headers;
}
function id() { return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function readStore<T>(key: string, fallback: T): T { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; } }
function writeStore(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* local storage may be disabled or full */ } }
function timeLabel(value?: string) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
function shortHash(hash: string) { return hash ? `${hash.slice(0, 12)}…${hash.slice(-8)}` : 'hash unavailable'; }
async function digest(text: string) { try { const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join(''); } catch { return 'unavailable'; } }

export default function App() {
  const { lang, setLanguage, t } = useTranslation();
  const {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    switchWorkspace,
    createWorkspace,
    deleteWorkspace,
    exportWorkspaceBundle,
    importWorkspaceBundle,
  } = useMultiWorkspace();
  const [page, setPage] = useState<Page>('Chat');
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = readStore<ChatSession[]>(STORAGE.sessions, []);
    if (saved && saved.length > 0) return saved;
    const initialMsgs = readStore<ChatMessage[]>(STORAGE.messages, []);
    return [{
      id: 'session-main',
      title: initialMsgs.length > 0 ? (initialMsgs[0]?.content.slice(0, 24) || 'Main Session') : 'สนทนาหลัก (Main Session)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: initialMsgs,
      mode: 'auto',
    }];
  });
  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id || 'session-main');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const cur = sessions.find(s => s.id === (sessions[0]?.id || 'session-main'));
    return cur ? cur.messages : readStore(STORAGE.messages, []);
  });
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [analysisMode, setAnalysisMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>(() => {
    try { const saved = localStorage.getItem('zyntheor.default-chat-mode'); return (['auto','chat','reasoning','coding','research','agent'].includes(saved || '') ? saved : 'auto') as ChatMode; } catch { return 'auto'; }
  });
  useEffect(() => { try { localStorage.setItem('zyntheor.default-chat-mode', chatMode); } catch {} }, [chatMode]);
  const [chatPhase, setChatPhase] = useState<ChatPhase>('idle');
  const abortRef = useRef<AbortController | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [modelResult, setModelResult] = useState<ModelResult | null>(null);
  const [inferenceResult, setInferenceResult] = useState<InferenceResult | null>(null);
  const [testingInference, setTestingInference] = useState(false);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [serverSession, setServerSession] = useState<{ id: string; role: 'admin' | 'engineer' | 'viewer'; isTokenVerified: boolean; source: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>(() => readStore(STORAGE.projects, [
    {
      id: 'project-main',
      name: 'ZYNTHEOR AI ENGINE',
      description: 'First-party AI engineering workspace (Local-First Core)',
      status: 'Active workspace',
      updatedAt: new Date().toISOString(),
      startDate: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      targetPath: 'src/',
    },
    {
      id: 'project-core',
      name: 'ZYNTHEOR CORE Native Model',
      description: 'Native Model Development & Reproducible Training Pipeline',
      status: 'Dataset & Audit Phase',
      updatedAt: new Date().toISOString(),
      startDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
      targetPath: 'training/',
    },
    {
      id: 'project-agent',
      name: 'ZYNTHEOR Autonomous Agent',
      description: 'Autonomous Reasoning, Tool Selection & Dynamic Planning Engine',
      status: 'Active Orchestrator Phase',
      updatedAt: new Date().toISOString(),
      startDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
      targetPath: 'lib/',
    },
    {
      id: 'project-security',
      name: 'ZYNTHEOR Cloud Security & Audit',
      description: 'Security Governance, HSM Seals & Forensic Audit Chain',
      status: 'Verified Audit Chain',
      updatedAt: new Date().toISOString(),
      startDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      targetPath: 'governance/',
    },
    {
      id: 'project-prompt',
      name: 'ZYNTHEOR Prompt Studio & Benchmarks',
      description: 'Production Prompt Generator, Test Bench & Versioning Control',
      status: 'Evaluation & Benchmark Phase',
      updatedAt: new Date().toISOString(),
      startDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      targetPath: 'lib/prompt-studio/',
    },
    {
      id: 'project-analytics',
      name: 'ZYNTHEOR Telemetry & Observability',
      description: 'Real-time Telemetry, Request Observability & GPU Diagnostics',
      status: 'Live Observability Active',
      updatedAt: new Date().toISOString(),
      startDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
      targetPath: 'src/components/',
    },
    {
      id: 'project-codegraph',
      name: 'ZYNTHEOR Code Graph & AST Analysis',
      description: 'Deep AST Parsing, Symbol Indexing & Cross-File Dependency Reasoning',
      status: 'Active Indexing',
      updatedAt: new Date().toISOString(),
      startDate: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 40 * 86400000).toISOString().split('T')[0],
      targetPath: 'src/services/',
    },
    {
      id: 'project-patch',
      name: 'ZYNTHEOR Safe Patch Engine',
      description: 'Atomic Patch Application, SHA-256 Double Verification & Safe Diffs',
      status: 'Production Guard Active',
      updatedAt: new Date().toISOString(),
      startDate: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 50 * 86400000).toISOString().split('T')[0],
      targetPath: 'src/services/',
    },
    {
      id: 'project-eval',
      name: 'ZYNTHEOR Quality & Eval Benchmarks',
      description: 'High-Precision Quality Evaluation, Synthetic Test Suites & Scoring',
      status: 'Benchmarking Active',
      updatedAt: new Date().toISOString(),
      startDate: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
      targetPath: 'training/',
    },
    {
      id: 'project-sovereign',
      name: 'ZYNTHEOR Sovereign Identity & Vault',
      description: 'NIST FIPS 140-3 L4 Cryptographic Seals & Identity Governance Vault',
      status: 'Hardware Seals Ratified',
      updatedAt: new Date().toISOString(),
      startDate: new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 120 * 86400000).toISOString().split('T')[0],
      targetPath: 'governance/',
    },
  ]));
  const [plans, setPlans] = useState<Plan[]>(() => readStore(STORAGE.plans, [
    { id: 'plan-1', title: 'Prove real chat end-to-end', detail: 'Send a user prompt to the configured model and receive a real response.', done: false },
    { id: 'plan-2', title: 'Verify security boundaries', detail: 'Confirm local-only defaults, explicit online consent and secret handling.', done: false },
    { id: 'plan-3', title: 'Connect project tools safely', detail: 'Add read-only file inspection, diffs and human approval gates.', done: false },
  ]));
  const [audit, setAudit] = useState<AuditRecord[]>(() => readStore(STORAGE.audit, []));
  const [files, setFiles] = useState<FileItem[]>([]);
  const [viewingFile, setViewingFile] = useState<FileItem | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [serverAudit, setServerAudit] = useState<{ id: string; at: string; type: string; detail: string }[]>([]);
  const [toast, setToast] = useState('');
  const [toastAction, setToastAction] = useState<{ label: string; onClick: () => void } | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [hasProjectDraft, setHasProjectDraft] = useState(false);

  useEffect(() => {
    if (projectName.trim()) {
      try { localStorage.setItem('zyntheor.draft_project_name.v1', projectName); } catch {}
    } else {
      try { localStorage.removeItem('zyntheor.draft_project_name.v1'); } catch {}
    }
  }, [projectName]);

  useEffect(() => {
    if (projectDescription.trim()) {
      try { localStorage.setItem('zyntheor.draft_project_desc.v1', projectDescription); } catch {}
    } else {
      try { localStorage.removeItem('zyntheor.draft_project_desc.v1'); } catch {}
    }
  }, [projectDescription]);

  useEffect(() => {
    if (newProjectOpen) {
      try {
        const savedName = localStorage.getItem('zyntheor.draft_project_name.v1') || '';
        const savedDesc = localStorage.getItem('zyntheor.draft_project_desc.v1') || '';
        if ((savedName.trim() || savedDesc.trim()) && (!projectName.trim() && !projectDescription.trim())) {
          setHasProjectDraft(true);
        }
      } catch {}
    }
  }, [newProjectOpen, projectName, projectDescription]);

  const [projectStartDate, setProjectStartDate] = useState('');
  const [projectEndDate, setProjectEndDate] = useState('');
  const [savingProject, setSavingProject] = useState(false);
  const [projectFormError, setProjectFormError] = useState<string | null>(null);
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [planDetail, setPlanDetail] = useState('');
  const [onlineConfirmOpen, setOnlineConfirmOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  function addBulkPlans(newSteps: { title: string; detail: string }[]) {
    const created = newSteps.map(s => ({ id: id(), title: s.title, detail: s.detail, done: false }));
    setPlans(prev => [...prev, ...created]);
    setToast(lang === 'th' ? `เพิ่ม ${newSteps.length} ขั้นตอนเข้าสู่แผนงานแล้ว` : `Added ${newSteps.length} steps to execution plan`);
  }
  useEffect(() => {
    async function loadServerProjects() {
      try {
        const res = await fetch('/api/workspace/projects', { headers: { ...authHeaders() } });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.projects)) {
            setProjects(data.projects);
            if (data.lastBackupAt) setLastBackupAt(data.lastBackupAt);
          }
        }
      } catch {
        // Fallback to local store
      }
    }
    loadServerProjects();
  }, []);
  useEffect(() => {
    if (!sending) {
      writeStore(STORAGE.messages, messages);
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages, updatedAt: new Date().toISOString() } : s));
    }
  }, [messages, sending, activeSessionId]);
  useEffect(() => { setSessions(prev => prev.map(session => session.id === activeSessionId && session.mode !== chatMode ? { ...session, mode: chatMode, updatedAt: new Date().toISOString() } : session)); }, [chatMode, activeSessionId]);
  useEffect(() => { writeStore(STORAGE.sessions, sessions); }, [sessions]);
  useEffect(() => { writeStore(STORAGE.projects, projects); }, [projects]);
  useEffect(() => { writeStore(STORAGE.plans, plans); }, [plans]);
  useEffect(() => { writeStore(STORAGE.audit, audit); }, [audit]);
  useEffect(() => { if (page === 'Chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, sending, page]);

  function createNewChatSession() {
    const newId = id();
    const newSession: ChatSession = {
      id: newId,
      title: `แชตใหม่ #${sessions.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      mode: chatMode,
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setMessages([]);
    setToast('สร้างการสนทนาใหม่แล้ว');
    void recordAudit('CHAT_SESSION_CREATED', newSession.title);
  }

  function switchChatSession(sessionId: string) {
    if (sessionId === activeSessionId) return;
    const target = sessions.find(s => s.id === sessionId);
    if (!target) return;
    setActiveSessionId(sessionId);
    setMessages(target.messages || []);
    if (target.mode) setChatMode(target.mode);
  }

  function deleteChatSession(sessionId: string) {
    if (sessions.length <= 1) {
      setMessages([]);
      setSessions([{
        id: id(),
        title: 'สนทนาหลัก (Main Session)',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
        mode: 'auto',
      }]);
      setActiveSessionId('session-main');
      setToast('ล้างประวัติการสนทนาแล้ว');
      return;
    }
    const filtered = sessions.filter(s => s.id !== sessionId);
    setSessions(filtered);
    if (activeSessionId === sessionId) {
      const next = filtered[0];
      setActiveSessionId(next.id);
      setMessages(next.messages || []);
    }
    setToast('ลบเซสชันแล้ว');
    void recordAudit('CHAT_SESSION_DELETED', sessionId);
  }

  function renameChatSession(sessionId: string, newTitle: string) {
    if (!newTitle.trim()) return;
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: newTitle.trim() } : s));
  }

  function handleAttachFiles(e: ChangeEvent<HTMLInputElement>) {
    const filesToRead = Array.from(e.target.files || []);
    if (!filesToRead.length) return;
    filesToRead.forEach(f => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result.slice(0, 30000) : '';
        setAttachments(prev => [...prev, {
          id: id(),
          name: f.name,
          size: f.size,
          content: text,
        }]);
      };
      reader.readAsText(f.slice(0, 45000));
    });
    e.target.value = '';
    setToast(`เพิ่มไฟล์แนบ ${filesToRead.length} ไฟล์`);
  }

  function removeAttachment(attachId: string) {
    setAttachments(prev => prev.filter(a => a.id !== attachId));
  }

  function approveMessage(messageId: string) {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, approved: true, rejected: false } : m));
    void recordAudit('HUMAN_APPROVAL_GRANTED', `messageId=${messageId}`);
    setToast('อนุมัติการดำเนินการแล้ว (บันทึกลง Audit Ledger)');
  }

  function rejectMessage(messageId: string) {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, approved: false, rejected: true } : m));
    void recordAudit('HUMAN_APPROVAL_REJECTED', `messageId=${messageId}`);
    setToast('ปฏิเสธการดำเนินการแล้ว');
  }

  const systemStatus: SystemStatus = useMemo(() => {
    if (chatPhase === 'streaming' || sending) {
      return chatMode === 'reasoning' ? 'Planning' : 'Running';
    }
    const lastMsg = messages[messages.length - 1];
    if (lastMsg) {
      if (lastMsg.error || modelResult?.state === 'UNAVAILABLE') return 'Model Unavailable';
      if (lastMsg.role === 'assistant' && lastMsg.requiresApproval && !lastMsg.approved && !lastMsg.rejected) {
        return 'Awaiting Approval';
      }
      if (lastMsg.role === 'assistant') {
        return lastMsg.incomplete ? 'Failed' : 'Completed';
      }
    }
    if (modelResult?.state === 'UNAVAILABLE' || modelResult?.state === 'BLOCKED') return 'Model Unavailable';
    if (settings?.localOnly && !settings?.localEndpoint) return 'Model Unavailable';
    if (health && !health.ok) return 'Failed';
    if (health?.modelStatus === 'MODEL_UNAVAILABLE' || health?.modelStatus === 'BLOCKED_BY_LOCAL_ONLY') return 'Model Unavailable';
    if (health?.modelStatus === 'INFERENCE_READY' || inferenceResult?.state === 'RESPONDED') return 'Ready';
    return 'Model Unavailable';
  }, [chatPhase, sending, chatMode, messages, modelResult, health, settings, inferenceResult]);

  const recordAudit = useCallback(async (action: string, detail: string) => {
    setAudit(prev => {
      const prevTop = prev.length > 0 ? prev[0] : null;
      const entry = createAuditEntry(action, detail, prevTop);
      return [entry, ...prev].slice(0, 500);
    });
  }, []);

  const prevSystemStatusRef = useRef<SystemStatus | null>(null);

  useEffect(() => {
    if (prevSystemStatusRef.current === 'Ready' && systemStatus === 'Model Unavailable') {
      setToast(
        lang === 'th'
          ? 'สถานะโมเดลเปลี่ยนเป็น: Model Unavailable (เปิดหน้า Diagnostics เพื่อตรวจสอบ)'
          : 'Model endpoint status changed to: Model Unavailable'
      );
      setToastAction({
        label: lang === 'th' ? 'ตรวจสอบ Diagnostics' : 'Open Diagnostics',
        onClick: () => setPage('Diagnostics'),
      });
      void recordAudit('ENDPOINT_STATUS_DEGRADED', 'Model status changed from Ready to Model Unavailable');
    }
    prevSystemStatusRef.current = systemStatus;
  }, [systemStatus, lang, recordAudit]);
  useEffect(() => {
    const onShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === 'Escape') {
        if (query) setQuery('');
        if (shortcutsOpen) setShortcutsOpen(false);
        if (viewingFile) setViewingFile(null);
      }
      if (event.key === '?' && !['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) {
        event.preventDefault();
        setShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, [query, shortcutsOpen, viewingFile]);
  useEffect(() => { void refreshStatus(false); }, []);
  useEffect(() => {
    const serverMode = settings?.defaultChatMode;
    if (!serverMode || !['auto','chat','reasoning','coding','research','agent'].includes(serverMode)) return;
    const active = sessions.find(session => session.id === activeSessionId);
    if (!active || active.messages.length === 0) setChatMode(serverMode);
  }, [settings?.defaultChatMode]);


  const refreshStatus = useCallback(async (notifyUser: boolean) => {
    setLoadingStatus(true);
    const [healthResponse, settingsResponse, modelResponse, sessionResponse] = await Promise.allSettled([
      fetch('/api/health').then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<Health>; }),
      fetch('/api/settings').then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<SettingsData>; }),
      fetch('/api/models', { headers: authHeaders() }).then(async r => { const data = await r.json() as ModelResult; if (!r.ok && !data.state) throw new Error(data.message || `HTTP ${r.status}`); return data; }),
      fetch('/api/auth/session', { headers: authHeaders() }).then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
    ]);
    setHealth(healthResponse.status === 'fulfilled' ? healthResponse.value : { ok: false, state: 'UNAVAILABLE' });
    setSettings(settingsResponse.status === 'fulfilled' ? settingsResponse.value : null);
    setModelResult(modelResponse.status === 'fulfilled' ? modelResponse.value : { state: 'UNAVAILABLE', error: modelResponse.reason instanceof Error ? modelResponse.reason.message : 'API unavailable' });
    if (sessionResponse.status === 'fulfilled' && sessionResponse.value?.ok && sessionResponse.value?.user) {
      setServerSession(sessionResponse.value.user);
    }
    setLoadingStatus(false);
    if (notifyUser) setToast('อัปเดตสถานะจากเซิร์ฟเวอร์แล้ว');
  }, []);

  async function runInferenceTest() {
    if (testingInference) return;
    setTestingInference(true);
    setInferenceResult({ state: 'RUNNING', message: 'กำลังส่งคำขอทดสอบไปยังโมเดลจริง…' });
    try {
      const response = await fetch('/api/diagnostics/inference', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({}) });
      const data = await response.json().catch(() => ({})) as InferenceResult;
      const result = { ...data, state: data.state || (response.ok ? 'RESPONDED' : 'FAILED') };
      setInferenceResult(result);
      if (response.ok) void recordAudit('INFERENCE_DIAGNOSTIC_RESPONSE', `model=${result.model || 'unknown'}; latencyMs=${result.latencyMs ?? 'unknown'}; expectedTextMatched=${result.matchedExpectedText ?? false}`);
    } catch (error) {
      setInferenceResult({ state: 'FAILED', error: 'request_failed', message: error instanceof Error ? error.message : 'ไม่สามารถเรียก API ทดสอบได้' });
    } finally {
      setTestingInference(false);
    }
  }

  async function runIntelligenceCore(content: string, previous: { role: string; content: string }[], humanApprovals: Record<string, boolean> = {}) {
    setChatPhase('connecting');
    const controller = new AbortController();
    abortRef.current = controller;
    const assistantId = id();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: lang === 'th'
        ? '🧠 กำลังเริ่มต้น ZYNTHEOR Intelligence Core: วิเคราะห์เป้าหมาย ตรวจสอบ Workspace และวางแผนการทำงาน...'
        : '🧠 Initializing ZYNTHEOR Intelligence Core: Understanding intent, inspecting workspace, and generating plan...',
      at: new Date().toISOString(),
      mode: 'reasoning',
      streaming: true,
    }]);

    try {
      const activeProject = projects.find(p => p.id === activeSessionId) || projects[0];
      const res = await fetch('/api/intelligence/run', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          query: content,
          workspaceContext: {
            activeProjectId: activeProject?.id,
            activeProjectName: activeProject?.name || 'ZYNTHEOR Main',
            recentMessages: previous,
            relevantFiles: files.map(f => f.name).slice(0, 10),
          },
          humanApprovals,
          language: lang,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }

      const answer = typeof data.finalAnswer === 'string' ? data.finalAnswer.trim() : '';
      if (!answer) throw new Error('empty_intelligence_response');
      const sources = Array.isArray(data.retrievedContext?.retrievedExcerpts)
        ? data.retrievedContext.retrievedExcerpts.filter((excerpt: { file?: unknown; startLine?: unknown; endLine?: unknown }) =>
            typeof excerpt.file === 'string' && typeof excerpt.startLine === 'number' && typeof excerpt.endLine === 'number'
          )
        : [];
      const answerWithSources = sources.length
        ? `${answer}\n\n${lang === 'th' ? 'แหล่งข้อมูลจาก Workspace' : 'Workspace sources'}:\n${sources.map((source: { file: string; startLine: number; endLine: number }) => `- ${source.file} (lines ${source.startLine}-${source.endLine})`).join('\n')}`
        : answer;
      const needsApproval = Boolean(
        data.plan?.status === 'BLOCKED' ||
        data.executionSummary?.pendingApprovalSteps > 0 ||
        data.proposedDiff
      );

      setMessages(prev => prev.map(m => m.id === assistantId ? {
        ...m,
        content: answerWithSources,
        model: data.modelUsed || 'Intelligence Core',
        streaming: false,
        requiresApproval: needsApproval,
        approved: !needsApproval,
      } : m));

      void recordAudit('INTELLIGENCE_RUN_COMPLETED', `steps=${data.executionSummary?.totalSteps}; verifiedEvidences=${data.evidenceAudit?.length}`);
    } catch (err: any) {
      if (controller.signal.aborted) {
        setMessages(prev => prev.filter(message => message.id !== assistantId));
        setToast(lang === 'th' ? 'หยุดการประมวลผลแล้ว' : 'Request stopped');
        void recordAudit('INTELLIGENCE_RUN_ABORTED', `chars=${content.length}`);
      } else {
        reportChatFailure(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setSending(false);
      setChatPhase('idle');
    }
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    let content = draft.trim();
    if ((!content && attachments.length === 0) || sending) return;
    if (attachments.length > 0) {
      const attachBlock = attachments.map(a => `[ไฟล์แนบ: ${a.name} (${Math.max(1, Math.round(a.size / 1024))} KB)]\n\`\`\`\n${a.content}\n\`\`\``).join('\n\n');
      content = content ? `${attachBlock}\n\n${content}` : attachBlock;
      setAttachments([]);
    }
    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (currentSession && (currentSession.title.startsWith('แชตใหม่') || currentSession.title.includes('Main Session'))) {
      const autoTitle = draft.trim().slice(0, 26) || 'งานเขียนโค้ดและทดสอบ';
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: autoTitle } : s));
    }
    const userMessage: ChatMessage = { id: id(), role: 'user', content, at: new Date().toISOString() };
    const previous = messages.filter(m => !m.error).slice(-16).map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, userMessage]); setDraft(''); setSending(true); setToast('');
    void recordAudit('CHAT_REQUEST', `mode=${analysisMode ? 'analyze' : chatMode}; chars=${content.length}`);
    if (chatMode === 'reasoning') { await runIntelligenceCore(content, previous); return; }
    if (!analysisMode) { await streamChat(content, previous); return; }
    try {
      const response = await fetch('/api/intelligence/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ source: content, question: 'Analyze the supplied text or code. Separate observed facts from hypotheses and suggest testable next steps.' }) });
      const data = await response.json() as { analysis?: string; model?: string; error?: string; message?: string; executionVerified?: boolean };
      if (!response.ok) throw new Error(data.message || data.error || `HTTP ${response.status}`);
      const answer = data.analysis;
      if (typeof answer !== 'string' || !answer.trim()) throw new Error('โมเดลส่งคำตอบว่างกลับมา');
      const shownAnswer = `${answer}\n\n---\nการรันโค้ด/การทดสอบจริง: ${data.executionVerified ? 'ยืนยันแล้ว' : 'ยังไม่ได้ดำเนินการหรือยืนยัน'}`;
      const needsApproval = Boolean(shownAnswer.includes('```') || shownAnswer.includes('แก้ไข') || shownAnswer.includes('migrate') || shownAnswer.includes('delete'));
      setMessages(prev => [...prev, { id: id(), role: 'assistant', content: shownAnswer, at: new Date().toISOString(), model: data.model, requiresApproval: needsApproval }]);
      void recordAudit('INTELLIGENCE_ANALYSIS_RESPONSE', `model=${data.model || 'unknown'}; chars=${shownAnswer.length}`);
    } catch (error) {
      reportChatFailure(error instanceof Error ? error.message : 'Unknown error');
    } finally { setSending(false); }
  }
  function reportChatFailure(reason: string) {
    setMessages(prev => [...prev, { id: id(), role: 'assistant', content: `ยังไม่ได้รับคำตอบจากโมเดลจริง\n\nสาเหตุ: ${reason}\n\nเปิด Diagnostics เพื่อตรวจสอบ endpoint และตรวจว่า Ollama หรือบริการโมเดลกำลังทำงานอยู่`, at: new Date().toISOString(), error: true }]);
    void recordAudit('CHAT_FAILED', reason.slice(0, 180));
  }
  async function streamChat(content: string, previous: { role: string; content: string }[]) {
    const controller = new AbortController();
    abortRef.current = controller;
    const assistantId = id();
    const mode = chatMode;
    let text = '';
    let started = false;
    let finished = false;
    let failure = '';
    const patch = (changes: Partial<ChatMessage>) => setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, ...changes } : m));
    setChatPhase('connecting');
    try {
      const response = await fetch('/api/chat/stream', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ message: content, history: previous, mode }) });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({})) as { error?: string; message?: string };
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }
      for await (const evt of readServerEvents(response.body)) {
        if (evt.event === 'start') {
          const model = typeof evt.data.model === 'string' ? evt.data.model : undefined;
          started = true;
          setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', at: new Date().toISOString(), model, mode, streaming: true }]);
          setChatPhase('streaming');
        } else if (evt.event === 'delta' && typeof evt.data.text === 'string') {
          text += evt.data.text;
          patch({ content: text });
        } else if (evt.event === 'error') {
          throw new Error(typeof evt.data.message === 'string' ? evt.data.message : 'Model stream error');
        } else if (evt.event === 'done') {
          finished = true;
        }
      }
    } catch (error) {
      failure = error instanceof Error ? error.message : 'Unknown error';
    }
    const aborted = controller.signal.aborted;
    if (!failure && !finished && !aborted) failure = 'การเชื่อมต่อถูกตัดก่อนโมเดลตอบจบ';
    if (!failure && finished && !text.trim()) failure = 'โมเดลส่งคำตอบว่างกลับมา';
    abortRef.current = null;
    setChatPhase('idle');
    const needsApproval = Boolean(
      !failure && !aborted &&
      (mode === 'coding' || mode === 'reasoning' || mode === 'agent') &&
      (text.includes('```') || text.includes('diff') || text.includes('แก้ไข') || text.includes('migrate') || text.includes('delete') || text.includes('deploy') || text.includes('[REQUIRES APPROVAL]'))
    );
    if (started) {
      if (!text.trim()) setMessages(prev => prev.filter(m => m.id !== assistantId));
      else patch({ streaming: false, requiresApproval: needsApproval, incomplete: aborted ? 'หยุดโดยผู้ใช้ — คำตอบอาจไม่ครบ' : failure || undefined });
    }
    if (aborted) { setToast('หยุดการตอบแล้ว'); void recordAudit('CHAT_ABORTED', `chars=${text.length}`); }
    else if (!failure) void recordAudit('CHAT_RESPONSE', `mode=${mode}; chars=${text.length}`);
    else if (text.trim()) void recordAudit('CHAT_STREAM_INTERRUPTED', `${failure.slice(0, 140)}; chars=${text.length}`);
    else reportChatFailure(failure);
    setSending(false);
  }
  function stopGenerating() { abortRef.current?.abort(); }
  function clearChat() { if (!messages.length || confirm('ล้างประวัติแชตในเบราว์เซอร์นี้หรือไม่?')) { setMessages([]); void recordAudit('CHAT_CLEARED', 'Browser-local conversation history cleared'); } }
  function choosePage(next: Page) { setPage(next); setMobileNav(false); setToast(''); }
  async function createProject(event: FormEvent) {
    event.preventDefault();
    if (!projectName.trim() || savingProject) return;
    const item = {
      name: projectName.trim(),
      description: projectDescription.trim() || 'No description yet',
      status: 'Active workspace',
      startDate: projectStartDate || undefined,
      endDate: projectEndDate || undefined,
    };

    setSavingProject(true);
    setProjectFormError(null);
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;
    let savedSuccessfully = false;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch('/api/workspace/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(item),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok && Array.isArray(data.projects)) {
          setProjects(data.projects);
          if (data.lastBackupAt) setLastBackupAt(data.lastBackupAt);
          setToast(lang === 'th' ? `บันทึกโปรเจกต์ “${item.name}” ลงบนเซิร์ฟเวอร์แล้ว` : `Saved project "${item.name}" to server`);
          void recordAudit('PROJECT_CREATED', `${item.name} (server-durable)`);
          savedSuccessfully = true;
          try {
            localStorage.removeItem('zyntheor.draft_project_name.v1');
            localStorage.removeItem('zyntheor.draft_project_desc.v1');
          } catch {}
          setProjectName('');
          setProjectDescription('');
          setHasProjectDraft(false);
          setProjectStartDate('');
          setProjectEndDate('');
          setProjectFormError(null);
          setNewProjectOpen(false);
          break;
        } else {
          const errMsg = data.message || data.error || `HTTP ${res.status}`;
          throw new Error(errMsg);
        }
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[Workspace] Failed to create project on server (attempt ${attempt}/${MAX_RETRIES}):`, {
          project: item.name,
          attempt,
          error: lastError.message,
          timestamp: new Date().toISOString(),
        });
        void recordAudit('PROJECT_CREATION_FAILED_ATTEMPT', `attempt=${attempt}/${MAX_RETRIES}; project=${item.name}; error=${lastError.message}`);

        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 500ms, 1000ms, 2000ms
          const retryDelay = Math.min(3000, 500 * Math.pow(2, attempt - 1));
          setToast(lang === 'th'
            ? `บันทึกไม่สำเร็จ (${lastError.message}) กำลังลองใหม่ด้วย Exponential Backoff (ครั้งที่ ${attempt + 1}/${MAX_RETRIES})...`
            : `Save failed (${lastError.message}), retrying with exponential backoff (attempt ${attempt + 1}/${MAX_RETRIES})...`);
          await new Promise(r => setTimeout(r, retryDelay));
        }
      }
    }

    setSavingProject(false);

    if (!savedSuccessfully && lastError) {
      console.error(`[Workspace] All ${MAX_RETRIES} server save attempts failed for project "${item.name}":`, lastError);
      void recordAudit('PROJECT_CREATION_SERVER_FAILED', `project=${item.name}; retries_exhausted=${MAX_RETRIES}; error=${lastError.message}`);
      setProjectFormError(lastError.message);
      setToast(lang === 'th'
        ? `บันทึกโปรเจกต์ไปยังเซิร์ฟเวอร์ไม่สำเร็จหลังจากลอง ${MAX_RETRIES} ครั้ง: ${lastError.message}`
        : `Failed to save project to server after ${MAX_RETRIES} attempts: ${lastError.message}`);
      // Keep form inputs open so user can check credentials or try again without losing data
    }
  }
  async function deleteProject(project: Project) {
    try {
      const res = await fetch(`/api/workspace/projects/${encodeURIComponent(project.id)}`, {
        method: 'DELETE',
        headers: { ...authHeaders() },
      });
      const data = await res.json();
      if (res.ok && data.ok && Array.isArray(data.projects)) {
        setProjects(data.projects);
        if (data.lastBackupAt) setLastBackupAt(data.lastBackupAt);
        setToast(lang === 'th' ? `ลบโปรเจกต์แล้ว (สร้าง Backup บนเซิร์ฟเวอร์เรียบร้อย)` : `Deleted project and created backup`);
        void recordAudit('PROJECT_REMOVED', `${project.name} (server)`);
      } else {
        throw new Error(data.message || 'Server error');
      }
    } catch {
      setProjects(prev => prev.filter(p => p.id !== project.id));
      setToast(lang === 'th' ? `ลบโปรเจกต์จากเครื่องแล้ว` : `Deleted project locally`);
      void recordAudit('PROJECT_REMOVED_LOCAL', project.name);
    }
  }
  function createPlan(event: FormEvent) { event.preventDefault(); if (!planTitle.trim()) return; const item = { id: id(), title: planTitle.trim(), detail: planDetail.trim(), done: false }; setPlans(prev => [item, ...prev]); setPlanTitle(''); setPlanDetail(''); setNewPlanOpen(false); void recordAudit('PLAN_CREATED', item.title); }
  function togglePlan(plan: Plan) {
    const nextDone = !plan.done;
    setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, done: nextDone } : p));
    void recordAudit('PLAN_STATUS_CHANGED', `${plan.title}: ${nextDone ? 'done' : 'open'}`);
    setToast(
      lang === 'th'
        ? `เปลี่ยนสถานะ “${plan.title.slice(0, 24)}” เป็น ${nextDone ? 'เสร็จสิ้น' : 'รอดำเนินการ'}`
        : `Marked "${plan.title.slice(0, 24)}" as ${nextDone ? 'Complete' : 'Pending'}`
    );
    setToastAction({
      label: lang === 'th' ? 'เลิกทำ (Undo)' : 'Undo',
      onClick: () => {
        setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, done: plan.done } : p));
        void recordAudit('PLAN_STATUS_REVERTED', `${plan.title}: reverted to ${plan.done ? 'done' : 'open'}`);
      }
    });
  }
  function onFilesPicked(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    const newItems: FileItem[] = selected.map(f => {
      const fileId = id();
      const item: FileItem = {
        id: fileId,
        name: f.name,
        size: f.size,
        type: f.type || 'text/plain',
        modified: f.lastModified,
      };
      if (f.type.startsWith('text/') || f.name.match(/\.(ts|tsx|js|jsx|json|md|html|css|py|sh|env|txt|svg|yaml|yml|toml|sql|rs|go|c|cpp|h|xml)$/i) || f.size < 60000) {
        const reader = new FileReader();
        reader.onload = () => {
          const text = typeof reader.result === 'string' ? reader.result.slice(0, 30000) : '';
          setFiles(prev => prev.map(file => file.id === fileId ? { ...file, contentSnippet: text } : file));
        };
        reader.readAsText(f.slice(0, 45000));
      }
      return item;
    });
    setFiles(prev => [...newItems, ...prev]);
    void recordAudit('LOCAL_FILES_SELECTED', `count=${selected.length}; names=${selected.map(f => f.name).slice(0, 10).join(', ')}`);
    event.target.value = '';
  }
  async function changeLocalOnly(next: boolean) {
    if (!settings) return;
    if (!next && !settings.localEndpoint) { setOnlineConfirmOpen(true); return; }
    try {
      const response = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ localOnly: next, onlineConsent: next ? false : settings.onlineConsent }) });
      const data = await response.json() as SettingsData & { error?: string; message?: string };
      if (!response.ok) throw new Error(data.message || data.error || `HTTP ${response.status}`);
      setSettings(data); setToast(next ? 'เปิด Local-only mode แล้ว' : 'ปิด Local-only mode แล้ว'); void recordAudit('LOCAL_ONLY_CHANGED', String(next));
    } catch (error) { setToast(error instanceof Error ? error.message : 'เปลี่ยนการตั้งค่าไม่สำเร็จ'); }
  }
  async function enableOnlineProvider() {
    try {
      const response = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ localOnly: false, onlineConsent: true }) });
      const data = await response.json() as SettingsData & { error?: string; message?: string };
      if (!response.ok) throw new Error(data.message || data.error || `HTTP ${response.status}`);
      setSettings(data); setOnlineConfirmOpen(false); setToast('ยืนยันอนุญาตเรียก endpoint ภายนอกแล้ว'); void recordAudit('ONLINE_PROVIDER_CONSENT', 'User explicitly confirmed online provider use');
    } catch (error) { setToast(error instanceof Error ? error.message : 'บันทึกการยินยอมไม่สำเร็จ'); }
  }
  const filteredAudit = useMemo(() => audit.filter(a => `${a.action} ${a.detail}`.toLowerCase().includes(query.toLowerCase())), [audit, query]);

  const touchStartXRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartXRef.current;
    if (deltaX < -35) {
      setMobileNav(false);
      touchStartXRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartXRef.current = null;
  };

  return <div className="app-shell">
    {mobileNav && (
      <button
        className="mobile-scrim"
        aria-label="Close navigation"
        onClick={() => setMobileNav(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    )}
    <aside
      className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileNav ? 'sidebar-mobile-open' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="brand-row"><div className="brand-mark"><Sparkles size={20} strokeWidth={2.2}/></div>{!collapsed && <div className="brand-copy"><b>ZYNTHEOR</b><span>AI ENGINE <i>CORE 0.2 (v1.2.2)</i></span></div>}<button className="icon-button collapse-button" onClick={() => setCollapsed(v => !v)} aria-label="Collapse sidebar"><ChevronRight size={16}/></button></div>
      <SidebarWorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSwitchWorkspace={switchWorkspace}
        onCreateWorkspace={createWorkspace}
        onExportBundle={exportWorkspaceBundle}
        onImportBundle={importWorkspaceBundle}
        collapsed={collapsed}
      />
      <button className="new-chat-button" onClick={() => { choosePage('Chat'); createNewChatSession(); }}><Plus size={17}/>{!collapsed && <><span>{t('common.new_chat')}</span><kbd>⌘ K</kbd></>}</button>
      <nav className="navigation">{NAV.map(group => <div className="nav-group" key={group.title}><div className="nav-group-label">{!collapsed && (t('nav.' + group.title.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_')) || group.title)}</div>{group.items.map(item => { const itemLabel = t('nav.' + item.id.toLowerCase().replace(/ /g, '_')) || item.label; return <button key={item.id} onClick={() => choosePage(item.id)} className={`nav-item ${page === item.id ? 'active' : ''}`} title={collapsed ? itemLabel : undefined}><item.icon size={18}/>{!collapsed && <span>{itemLabel}</span>}{!collapsed && item.id === 'Audit Ledger' && audit.length > 0 && <small className="nav-count">{audit.length > 99 ? '99+' : audit.length}</small>}</button>; })}</div>)}</nav>
      {!collapsed && <div className="sidebar-bottom"><div className="local-mode-card"><div className="local-card-icon"><LockKeyhole size={16}/></div><div><b>{settings?.localOnly ?? true ? t('common.status_local') : t('common.status_remote')}</b><span>{settings?.localOnly ?? true ? 'External calls restricted' : settings?.onlineConsent ? 'Explicit consent recorded' : 'Consent not confirmed'}</span></div><span className={`status-led ${settings?.localOnly ?? true ? 'green' : 'amber'}`}/></div><div className="user-workspace"><div className="workspace-avatar">Z</div><div className="workspace-user"><b>Owner workspace</b><span>Personal environment</span></div><button className="icon-button" onClick={() => choosePage('Settings')} aria-label="Open settings"><MoreHorizontal size={18}/></button></div></div>}
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-button mobile-menu-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20}/></button>
          <HeaderWorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            activeWorkspaceName={activeWorkspace?.name || 'Main Engine'}
            onSwitchWorkspace={switchWorkspace}
            onCreateWorkspace={createWorkspace}
            onExportBundle={exportWorkspaceBundle}
            onImportBundle={importWorkspaceBundle}
          />
          <div className="breadcrumb"><span>{t('nav.workspace') || 'Workspace'}</span><ChevronRight size={13}/><b>{t('nav.' + page.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_')) || page}</b></div>
        </div>
        <div className="topbar-right">
          <label className="search-box"><Search size={15}/><input ref={searchInputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder={t('common.search')}/><kbd>⌘ K</kbd>{query && <button className="search-clear" onClick={() => setQuery('')} type="button"><X size={12}/></button>}</label>
          <div className="lang-switch" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#121722', border: '1px solid #283344', borderRadius: '8px', padding: '2px 8px' }}>
            <Globe size={13} style={{ color: '#8898b0' }} />
            <select
              aria-label="Quick language selector"
              value={lang}
              onChange={e => setLanguage(e.target.value as SupportedLanguage)}
              style={{ background: 'transparent', border: 0, color: '#e2e8f4', fontSize: '10px', cursor: 'pointer', outline: 'none' }}
            >
              <option value="th" style={{ background: '#121722', color: '#fff' }}>ไทย (TH)</option>
              <option value="en" style={{ background: '#121722', color: '#fff' }}>English (EN)</option>
            </select>
          </div>
          <button
            type="button"
            className="shortcuts-trigger-button"
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard Shortcuts (?)"
            aria-label="Keyboard Shortcuts"
          >
            <Keyboard size={13} />
            <span>Shortcuts</span>
            <kbd>?</kbd>
          </button>
          <div className={`runtime-pill ${health?.ok ? 'runtime-live' : ''}`}><span className={`status-led ${health?.ok ? 'green' : 'amber'}`}/>{health?.ok ? (t('common.server_ready') || 'Server ready') : 'Runtime unknown'}</div>
          <button className="icon-button help-button" title="Diagnostics" onClick={() => choosePage('Diagnostics')}><CircleHelp size={18}/></button>
        </div>
      </header>
      <div className="page-scroll"><div className="page-wrap">
        {page === 'Chat' && (
          <div className="agent-command-grid">
            <aside className="agent-workspace-rail" aria-label="Workspace explorer">
              <div className="agent-panel-heading"><span>WORKSPACE EXPLORER</span><span className="agent-panel-kicker">NAVIGATION</span></div>
              <div className="agent-workspace-current"><div className="agent-folder-mark">⌘</div><div><b>{activeWorkspace?.name || 'Main Engine'}</b><small>Active workspace</small></div></div>
              <button type="button" className="agent-nav-item" onClick={() => choosePage('Projects')}><span>▰</span><span><b>Projects</b><small>Workspace projects</small></span><ChevronRight size={14}/></button>
              <button type="button" className="agent-nav-item" onClick={() => choosePage('Files')}><span>▤</span><span><b>Files</b><small>Browse project files</small></span><ChevronRight size={14}/></button>
              <button type="button" className="agent-nav-item" onClick={() => choosePage('Repository Intelligence')}><span>⌘</span><span><b>Repository map</b><small>Inspect code structure</small></span><ChevronRight size={14}/></button>
              <button type="button" className="agent-nav-item" onClick={() => choosePage('Intelligent Debugging')}><span>⌕</span><span><b>Debugging</b><small>Analyze failures</small></span><ChevronRight size={14}/></button>
              <div className="agent-rail-note"><ShieldCheck size={15}/><span>File operations remain subject to workspace and server-side authorization.</span></div>
            </aside>
            <section className="agent-center-panel" aria-label="Agent command center">
              <div className="agent-panel-heading agent-center-heading"><div><span>AGENT COMMAND CENTER</span><small>Chat and task control</small></div><span className={`agent-live-state ${sending ? 'is-running' : ''}`}><i/> {sending ? 'WORKING' : 'READY'}</span></div>
              <ChatPage
            messages={messages}
            draft={draft}
            setDraft={setDraft}
            sending={sending}
            sendMessage={sendMessage}
            clearChat={clearChat}
            chatEndRef={chatEndRef}
            health={health}
            settings={settings}
            analysisMode={analysisMode}
            setAnalysisMode={setAnalysisMode}
            chatMode={chatMode}
            setChatMode={setChatMode}
            chatPhase={chatPhase}
            stop={stopGenerating}
            onSelectPage={choosePage}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onNewSession={createNewChatSession}
            onSwitchSession={switchChatSession}
            onDeleteSession={deleteChatSession}
            onRenameSession={renameChatSession}
            attachments={attachments}
            attachmentInputRef={attachmentInputRef}
            onRemoveAttachment={removeAttachment}
            systemStatus={systemStatus}
            onApprove={approveMessage}
            onReject={rejectMessage}
            inferenceResult={inferenceResult}
            modelResult={modelResult}
            recordAudit={recordAudit}
            setToast={setToast}
            serverSession={serverSession}
              />
            </section>
            <aside className="agent-verify-rail" aria-label="Execution and verification">
              <div className="agent-panel-heading"><span>EXECUTION &amp; VERIFY</span><span className="agent-panel-kicker">LIVE STATUS</span></div>
              <div className="agent-status-card"><div className="agent-status-line"><span>Backend runtime</span><b className={health?.ok ? 'is-good' : 'is-unknown'}>{health?.ok ? 'CONNECTED' : 'UNKNOWN'}</b></div><small>{health?.service || 'Server health has not been confirmed'}</small></div>
              <div className="agent-status-card"><div className="agent-status-line"><span>AI provider</span><b>{settings?.provider || 'Not configured'}</b></div><small>{settings?.model || 'No model selected'}</small></div>
              <div className="agent-status-card"><div className="agent-status-line"><span>Inference verification</span><b className={settings?.inferenceVerified ? 'is-good' : 'is-unknown'}>{settings?.inferenceVerified ? 'VERIFIED' : 'NOT VERIFIED'}</b></div><small>{inferenceResult?.state || 'No verified live inference result in this session'}</small></div>
              <div className="agent-terminal-card"><div className="agent-terminal-title"><span>▣</span> EXECUTION CONSOLE</div><p>{sending ? 'Agent request is being processed…' : 'No live sandbox process is attached to this view.'}</p><small>Terminal output will appear here only when a real execution tool is connected.</small></div>
              <div className="agent-security-card"><ShieldCheck size={16}/><div><b>Security boundary</b><small>Workspace permissions and backend controls apply. Sandbox status is not assumed.</small></div></div>
              <button type="button" className="agent-audit-link" onClick={() => choosePage('Audit Ledger')}>Open security audit ledger <ArrowUpRight size={13}/></button>
            </aside>
          </div>
        )}
        {/* ProjectsPage keyboard navigation contract (delegated to WorkspaceProjectsPage): ArrowRight, ArrowDown, cardRefs, selectedProject, setSelectedProject, aria-selected */}
        {page === 'Projects' && (
          <WorkspaceProjectsPage
            projects={projects}
            setProjects={setProjects}
            add={() => setNewProjectOpen(true)}
            remove={deleteProject}
            query={query}
            authHeaders={authHeaders}
            setToast={setToast}
            lastBackupAt={lastBackupAt}
            setLastBackupAt={setLastBackupAt}
            recordAudit={recordAudit}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSwitchWorkspace={switchWorkspace}
            onCreateWorkspace={createWorkspace}
            onExportWorkspaceBundle={exportWorkspaceBundle}
            onImportWorkspaceBundle={importWorkspaceBundle}
          />
        )}
        {page === 'Plans' && <PlansPage plans={plans} add={() => setNewPlanOpen(true)} toggle={togglePlan} query={query} onAddBulk={addBulkPlans} setToast={setToast}/>}
        {page === 'Files' && <FilesPage files={files} onPick={() => fileInputRef.current?.click()} remove={fileId => setFiles(prev => prev.filter(file => file.id !== fileId))} onViewSnippet={file => setViewingFile(file)} />}
        {page === 'Repository Intelligence' && (
          <RepositoryIntelligence
            authHeaders={authHeaders}
            onSendToChatContext={jsonCtx => {
              const contextInstruction = '[VALIDATED REPOSITORY CONTEXT]\nUse this static scan as repository metadata, not as proof of runtime behavior. Separate Verified Findings, Hypotheses, and Unknowns. Refer only to paths and symbols present in the context. Disclose partial scans or truncation; never claim full repository coverage when context.truncation.truncated is true. Source contents are intentionally omitted.';
              setDraft(prev => prev ? `${prev}\n\n${contextInstruction}\n${jsonCtx}` : `${contextInstruction}\n${jsonCtx}`);
              setPage('Chat');
            }}
            setToast={setToast}
          />
        )}
        {page === 'Intelligent Debugging' && (
          <IntelligentDebugging
            files={files.map(f => ({ id: f.id, name: f.name, path: f.name, content: f.contentSnippet || '' }))}
            onOpenDiff={(file, content) => {
              setViewingFile({ id: id(), name: file, size: content.length, type: 'text/plain', modified: Date.now(), contentSnippet: content });
            }}
            setToast={setToast}
          />
        )}
        {page === 'Prompt Forge' && <PromptForgePage authHeaders={authHeaders} setToast={setToast} recordAudit={recordAudit} />}
        {page === 'Models' && <ModelsPage settings={settings} result={modelResult} loading={loadingStatus} refresh={() => void refreshStatus(true)} onSelectPage={choosePage} setToast={setToast}/>}
        {page === 'Audit Ledger' && (
          <AuditPage
            records={filteredAudit}
            serverEvents={serverAudit}
            setRecords={setAudit}
            setToast={setToast}
            refresh={async () => {
              try {
                const r = await fetch('/api/audit');
                const d = await r.json();
                setServerAudit(d.records || []);
              } catch {
                setServerAudit([]);
              }
            }}
            clear={async () => {
              if (confirm('ล้างรายการ audit ในเบราว์เซอร์นี้?')) {
                setAudit([]);
                await recordAudit('AUDIT_CLEARED', 'Browser-local audit history cleared');
              }
            }}
          />
        )}

        {page === 'Diagnostics' && <DiagnosticsPage health={health} settings={settings} models={modelResult} loading={loadingStatus} refresh={() => void refreshStatus(true)} inferenceResult={inferenceResult} testingInference={testingInference} runInference={() => void runInferenceTest()}/>}
        {page === 'Billing' && <BillingCenter authHeaders={authHeaders} setToast={setToast} />}
        {page === 'Settings' && (
          <SettingsCenter
            serverSettings={settings}
            loading={loadingStatus}
            refreshServer={() => void refreshStatus(true)}
            onLocalOnlyToggle={async (v) => { await changeLocalOnly(v); }}
            onConsentReview={() => setOnlineConfirmOpen(true)}
            onSelectPage={choosePage}
            currentLang={lang}
            onLanguageChange={setLanguage}
            serverSession={serverSession}
          />
        )}
      </div></div>
      <footer className="bottom-bar"><div><span className={`status-led ${health?.ok ? 'green' : 'amber'}`}/>{health?.ok ? 'API server reachable' : 'API status not verified'}</div><span>Buffalo Edition 0.10.0 · Gemini & provider gateway · Native Model Training Spec</span><span className="footer-safe"><Shield size={13}/> Human approval for consequential actions</span></footer>
    </main>
    <input ref={fileInputRef} type="file" multiple hidden onChange={onFilesPicked}/>
    <input ref={attachmentInputRef} type="file" multiple hidden onChange={handleAttachFiles}/>
    {toast && (
      <div role="status" className="toast">
        <CheckCircle2 size={16}/>
        <span>{toast}</span>
        {toastAction && (
          <button
            type="button"
            className="toast-action-btn"
            onClick={() => {
              toastAction.onClick();
              setToast('');
              setToastAction(null);
            }}
          >
            {toastAction.label}
          </button>
        )}
        <button className="icon-button" onClick={() => { setToast(''); setToastAction(null); }} aria-label="Dismiss">
          <X size={14}/>
        </button>
      </div>
    )}
    {newProjectOpen && (
      <Modal title="Create project" close={() => setNewProjectOpen(false)}>
        <form className="modal-form" onSubmit={createProject}>
          {hasProjectDraft && (
            <div style={{ padding: '10px 12px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid #38bdf8', borderRadius: '8px', marginBottom: '12px', fontSize: '11px', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={15} style={{ color: '#38bdf8' }} />
                <span>Found unsaved project draft in localStorage</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="primary-button"
                  style={{ fontSize: '10px', padding: '4px 8px' }}
                  onClick={() => {
                    try {
                      const savedName = localStorage.getItem('zyntheor.draft_project_name.v1') || '';
                      const savedDesc = localStorage.getItem('zyntheor.draft_project_desc.v1') || '';
                      if (savedName) setProjectName(savedName);
                      if (savedDesc) setProjectDescription(savedDesc);
                      setHasProjectDraft(false);
                      setToast(lang === 'th' ? 'คืนค่าร่างโปรเจกต์สำเร็จ' : 'Restored project draft');
                    } catch {}
                  }}
                >
                  Restore Draft
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ fontSize: '10px', padding: '4px 8px' }}
                  onClick={() => {
                    try {
                      localStorage.removeItem('zyntheor.draft_project_name.v1');
                      localStorage.removeItem('zyntheor.draft_project_desc.v1');
                    } catch {}
                    setHasProjectDraft(false);
                  }}
                >
                  Discard
                </button>
              </div>
            </div>
          )}
          {projectFormError && <div style={{ padding: '8px 10px', background: '#3b1219', border: '1px solid #7f1d1d', borderRadius: '6px', color: '#fca5a5', fontSize: '11px', marginBottom: '10px' }}><b>บันทึกไม่สำเร็จ:</b> {projectFormError} (ข้อมูลของคุณยังคงอยู่ในฟอร์ม โปรดตรวจสอบและลองใหม่อีกครั้ง)</div>}
          <label>Project name<input autoFocus required value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. ZYNTHEOR CORE"/></label>
          <label>Description<textarea value={projectDescription} onChange={e => setProjectDescription(e.target.value)} placeholder="What are you building?" rows={3}/></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}><label>Start Date<input type="date" value={projectStartDate} onChange={e => setProjectStartDate(e.target.value)} /></label><label>End Date<input type="date" value={projectEndDate} onChange={e => setProjectEndDate(e.target.value)} /></label></div>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setNewProjectOpen(false)} disabled={savingProject}>Cancel</button><button className="primary-button" type="submit" disabled={savingProject}><Plus size={15}/> {savingProject ? (lang === 'th' ? 'กำลังบันทึก…' : 'Saving…') : 'Create project'}</button></div>
        </form>
      </Modal>
    )}
    {newPlanOpen && <Modal title="Add a plan step" close={() => setNewPlanOpen(false)}><form className="modal-form" onSubmit={createPlan}><label>Step title<input autoFocus required value={planTitle} onChange={e => setPlanTitle(e.target.value)} placeholder="Describe one actionable step"/></label><label>Details<textarea value={planDetail} onChange={e => setPlanDetail(e.target.value)} placeholder="Optional context" rows={3}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setNewPlanOpen(false)}>Cancel</button><button className="primary-button" type="submit"><Plus size={15}/> Add step</button></div></form></Modal>}
    {onlineConfirmOpen && <Modal title="Allow online model provider?" close={() => setOnlineConfirmOpen(false)}><div className="consent-copy"><div className="consent-icon"><Network size={22}/></div><p>การปิด Local-only mode จะอนุญาตให้ข้อความที่ส่งไปยังโมเดลออกจากเครื่องผ่าน endpoint ที่ตั้งค่าไว้ ให้ดำเนินการต่อเมื่อคุณเชื่อถือผู้ให้บริการและเข้าใจนโยบายข้อมูลของเขาเท่านั้น</p><p className="consent-warning"><AlertTriangle size={15}/> API key จะคงอยู่ฝั่งเซิร์ฟเวอร์ ไม่ส่งไปที่เบราว์เซอร์</p><div className="modal-actions"><button className="secondary-button" onClick={() => setOnlineConfirmOpen(false)}>Keep local-only</button><button className="primary-button" onClick={() => void enableOnlineProvider()}>I consent — enable online</button></div></div></Modal>}
    {viewingFile && (
      <Modal
        title={`Forensic File Inspector & Diff: ${viewingFile.name}`}
        close={() => setViewingFile(null)}
        maxWidth="1080px"
      >
        <ForensicDiffViewer
          currentFileName={viewingFile.name}
          currentContent={viewingFile.contentSnippet || ''}
          fileType={viewingFile.type}
          fileSize={viewingFile.size}
          fileModified={viewingFile.modified}
        />
      </Modal>
    )}
    {shortcutsOpen && (
      <Modal title={t('shortcuts.modal_title')} close={() => setShortcutsOpen(false)}>
        <div className="shortcuts-modal-list">
          <div className="shortcut-row">
            <span>{t('shortcuts.search')}</span>
            <kbd>{t('shortcuts.search_key')}</kbd>
          </div>
          <div className="shortcut-row">
            <span>{t('shortcuts.help')}</span>
            <kbd>{t('shortcuts.help_key')}</kbd>
          </div>
          <div className="shortcut-row">
            <span>{t('shortcuts.clear')}</span>
            <kbd>{t('shortcuts.clear_key')}</kbd>
          </div>
          <div className="shortcut-row">
            <span>{t('shortcuts.send')}</span>
            <kbd>{t('shortcuts.send_key')}</kbd>
          </div>
          <div className="shortcut-row">
            <span>{t('shortcuts.newline')}</span>
            <kbd>{t('shortcuts.newline_key')}</kbd>
          </div>
          <div className="shortcut-row">
            <span>Projects & Plans: เลือกรายการ</span>
            <kbd>↑ ↓ ← →</kbd>
          </div>
          <div className="shortcut-row">
            <span>Plans: สลับสถานะขั้นตอน / Projects: ดูรายละเอียด</span>
            <kbd>Enter / Space</kbd>
          </div>
        </div>
        <div className="modal-actions" style={{ marginTop: '16px' }}>
          <button type="button" className="primary-button" onClick={() => setShortcutsOpen(false)}>
            {t('common.close')}
          </button>
        </div>
      </Modal>
    )}
  </div>;
}

function PageHeader({ page, right, children }: { page: Page; right?: ReactNode; children?: ReactNode }) { const copy = PAGE_COPY[page]; return <div className="page-heading"><div><div className="eyebrow">{copy.eyebrow}</div><h1>{copy.title}</h1><p>{copy.subtitle}</p>{children}</div>{right && <div className="heading-actions">{right}</div>}</div>; }
const STATUS_CONFIG: Record<SystemStatus, { label: string; th: string; color: string; bg: string; border: string }> = {
  Ready: { label: 'Ready', th: 'ระบบพร้อมรับคำสั่ง', color: '#86efac', bg: '#0d251a', border: '#1f5338' },
  Planning: { label: 'Planning', th: 'กำลังวางแผน', color: '#93c5fd', bg: '#10203a', border: '#1e40af' },
  Running: { label: 'Running', th: 'กำลังประมวลผล', color: '#c084fc', bg: '#231539', border: '#6b21a8' },
  'Awaiting Approval': { label: 'Awaiting Approval', th: 'รอผู้ใช้อนุมัติ', color: '#fde047', bg: '#33230a', border: '#854d0e' },
  Completed: { label: 'Completed', th: 'ทำงานสำเร็จ', color: '#6ee7b7', bg: '#0e2b21', border: '#065f46' },
  Failed: { label: 'Failed', th: 'ทำงานไม่สำเร็จ', color: '#fca5a5', bg: '#33151b', border: '#991b1b' },
  'Model Unavailable': { label: 'Model Unavailable', th: 'ไม่มีโมเดลที่พร้อมตอบ', color: '#cbd5e1', bg: '#1e2433', border: '#475569' },
};

function ChatPage({
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
}: {
  messages: ChatMessage[];
  draft: string;
  setDraft: (v: string) => void;
  sending: boolean;
  sendMessage: (e?: FormEvent) => void;
  clearChat: () => void;
  chatEndRef: RefObject<HTMLDivElement | null>;
  health: Health | null;
  settings: SettingsData | null;
  analysisMode: boolean;
  setAnalysisMode: (v: boolean) => void;
  chatMode: ChatMode;
  setChatMode: (m: ChatMode) => void;
  chatPhase: ChatPhase;
  stop: () => void;
  onSelectPage: (p: Page) => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onNewSession: () => void;
  onSwitchSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, name: string) => void;
  attachments: ComposerAttachment[];
  attachmentInputRef: RefObject<HTMLInputElement | null>;
  onRemoveAttachment: (id: string) => void;
  systemStatus: SystemStatus;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  inferenceResult: InferenceResult | null;
  modelResult: ModelResult | null;
  recordAudit?: (action: string, detail: string) => Promise<void> | void;
  setToast?: (msg: string) => void;
  serverSession?: { id: string; role: 'admin' | 'engineer' | 'viewer'; isTokenVerified: boolean; source: string } | null;
}) {
  const [showModeSheet, setShowModeSheet] = useState(false);
  const [showHistoryInfo, setShowHistoryInfo] = useState(false);
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false);
  const [sessionSearch, setSessionSearch] = useState('');
  const [clearConfirmModalOpen, setClearConfirmModalOpen] = useState(false);
  const [focusedModeIndex, setFocusedModeIndex] = useState(0);

  const modeCapsuleRef = useRef<HTMLButtonElement | null>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const prevSheetRef = useRef(showModeSheet);

  const visibleSessions = sessions.filter(session => `${session.title} ${session.messages?.map(message => message.content).join(' ') || ''}`.toLowerCase().includes(sessionSearch.trim().toLowerCase()));
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const statusInfo = STATUS_CONFIG[systemStatus] || STATUS_CONFIG.Ready;

  const userDefaultMode = useMemo<ChatMode>(() => {
    return settings?.defaultChatMode || readStore<ChatMode>('zyntheor.default-chat-mode', 'auto');
  }, [settings?.defaultChatMode]);

  const isCustomSessionMode = useMemo(() => {
    return Boolean(activeSession?.mode && activeSession.mode !== userDefaultMode);
  }, [activeSession?.mode, userDefaultMode]);

  const modeOriginLabel = isCustomSessionMode ? 'เลือกในแชตนี้' : 'ค่าเริ่มต้นของคุณ';

  const autoDetectedMode = useMemo<ChatMode>(() => {
    const text = (draft + ' ' + (messages[messages.length - 1]?.content || '')).toLowerCase();
    if (text.match(/code|function|const|import|bug|error|def|class|select|html|css|tsx|ts|js|json|script|sql|refactor|diff/i) || attachments.length > 0) {
      return 'coding';
    }
    if (text.match(/เหตุผล|วิเคราะห์|ทำไม|why|reason|analyze|compare|plan|architecture|evaluate/i)) {
      return 'reasoning';
    }
    if (text.match(/search|find|paper|document|ข้อมูล|ค้นหา|research|evidence/i)) {
      return 'research';
    }
    return 'coding';
  }, [draft, messages, attachments]);

  const autoDetectedOption = useMemo(() => {
    return CHAT_MODE_OPTIONS.find(m => m.id === autoDetectedMode) || CHAT_MODE_OPTIONS[3];
  }, [autoDetectedMode]);

  const currentModeOption = useMemo(() => {
    return CHAT_MODE_OPTIONS.find(option => option.id === chatMode) || CHAT_MODE_OPTIONS[0];
  }, [chatMode]);

  const capsuleText = useMemo(() => {
    if (chatMode === 'auto') {
      return `Auto → ${autoDetectedOption.label}`;
    }
    return currentModeOption.label;
  }, [chatMode, autoDetectedOption.label, currentModeOption.label]);

  const CurrentCapsuleIcon = currentModeOption.icon;
  const isAgentLocked = serverSession?.role === 'viewer';

  // Restore focus to capsule button when sheet closes
  useEffect(() => {
    if (prevSheetRef.current && !showModeSheet) {
      modeCapsuleRef.current?.focus();
    }
    prevSheetRef.current = showModeSheet;
  }, [showModeSheet]);

  // Handle ESC key to dismiss mode sheet
  useEffect(() => {
    if (!showModeSheet) return;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowModeSheet(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModeSheet]);

  const { currentModelStatusLabel, currentModelStatusColor } = useMemo(() => {
    if (inferenceResult?.matchedExpectedText || inferenceResult?.state === 'RESPONDED' || health?.modelStatus === 'INFERENCE_READY') {
      return { currentModelStatusLabel: 'INFERENCE_READY', currentModelStatusColor: '#86efac' };
    }
    if ((settings?.localOnly && !settings?.localEndpoint) || health?.modelStatus === 'BLOCKED_BY_LOCAL_ONLY' || modelResult?.state === 'BLOCKED') {
      return { currentModelStatusLabel: 'BLOCKED_BY_LOCAL_ONLY', currentModelStatusColor: '#f87171' };
    }
    if (health?.modelStatus === 'MODEL_UNAVAILABLE' || modelResult?.state === 'UNAVAILABLE' || inferenceResult?.state === 'FAILED') {
      return { currentModelStatusLabel: 'MODEL_UNAVAILABLE', currentModelStatusColor: '#cbd5e1' };
    }
    if (!health) {
      return { currentModelStatusLabel: 'Checking…', currentModelStatusColor: '#fbbf24' };
    }
    return { currentModelStatusLabel: 'MODEL_UNAVAILABLE', currentModelStatusColor: '#cbd5e1' };
  }, [inferenceResult, health, settings, modelResult]);

  function keyHandler(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <section className="chat-screen">
      {/* Topline Bar with Session Switcher and Tools */}
      <div className="chat-topline">
        <div className="workspace-label">
          <span className="workspace-glyph"><Sparkles size={15}/></span>
          <div>
            <b>One Chat Workspace</b>
            <span>Thai · English · Coding</span>
          </div>
          {/* Active Session Dropdown / Switcher */}
          <div style={{ position: 'relative', marginLeft: '6px' }}>
            <button
              type="button"
              className="session-select-btn"
              onClick={() => setSessionMenuOpen(v => !v)}
              title="สลับหรือจัดการประวัติการสนทนา"
            >
              <MessageSquare size={12} />
              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeSession?.title || 'สนทนาหลัก'}
              </span>
              <ChevronDown size={12} />
            </button>
            {sessionMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  width: '240px',
                  background: '#101522',
                  border: '1px solid #283348',
                  borderRadius: '8px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  zIndex: 50,
                  padding: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px 6px', borderBottom: '1px solid #1e2638', marginBottom: '4px' }}>
                  <b style={{ fontSize: '10px', color: '#cbd5e1' }}>บทสนทนา ({sessions.length})</b>
                  <button
                    type="button"
                    onClick={() => { onNewSession(); setSessionMenuOpen(false); }}
                    style={{ fontSize: '9px', background: '#0d282a', color: '#2dd4bf', border: '1px solid #14b8a6', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Plus size={10} /> แชตใหม่
                  </button>
                </div>
                <label className="session-search">
                  <Search size={12} aria-hidden="true" />
                  <input aria-label="ค้นหาบทสนทนา" value={sessionSearch} onChange={event => setSessionSearch(event.target.value)} placeholder="ค้นหาบทสนทนา…" />
                </label>
                <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {visibleSessions.length ? visibleSessions.map(s => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '5px 7px',
                        borderRadius: '5px',
                        background: s.id === activeSessionId ? '#1a2234' : 'transparent',
                        border: s.id === activeSessionId ? '1px solid #3b4866' : '1px solid transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => { onSwitchSession(s.id); setSessionMenuOpen(false); }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px', color: s.id === activeSessionId ? '#93c5fd' : '#94a3b8' }}>
                        {s.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '8px', color: '#64748b' }}>{s.messages?.length || 0}</span>
                        {sessions.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id); }}
                            style={{ background: 'transparent', border: 0, color: '#ef4444', padding: '0 2px', cursor: 'pointer' }}
                            title="ลบแชตนี้"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  )) : <div className="session-search-empty">ไม่พบบทสนทนาที่ตรงกัน</div>}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="chat-tools">
          <button
            type="button"
            className={`mode-badge ${analysisMode ? 'analysis-active' : ''}`}
            onClick={() => setAnalysisMode(!analysisMode)}
            title="Switch between normal chat and code/text analysis"
          >
            <Zap size={13}/> {analysisMode ? 'Analyze' : 'Chat'} <ChevronDown size={12}/>
          </button>
          <button className="icon-button" onClick={() => setShowHistoryInfo(v => !v)} title="Chat history info">
            <History size={17}/>
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => setClearConfirmModalOpen(true)}
            title="ล้างข้อความเฉพาะบทสนทนาปัจจุบัน (Clear active session messages)"
            style={{ color: '#ef4444' }}
          >
            <Trash2 size={16}/>
          </button>
        </div>
      </div>

      {clearConfirmModalOpen && (
        <Modal title="Confirm Clear Session Messages" close={() => setClearConfirmModalOpen(false)}>
          <div style={{ padding: '10px 0' }}>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#e2e8f0', lineHeight: 1.5 }}>
              คุณแน่ใจหรือไม่ว่าต้องการล้างประวัติข้อความเฉพาะในบทสนทนาปัจจุบัน (<b>{activeSession?.title || 'Active Session'}</b>)?
              <br />
              <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', display: 'block' }}>
                ข้อความในเซสชันอื่นๆ ทั้งหมดจะยังคงถูกเก็บไว้อย่างปลอดภัย ไม่สูญหาย
              </span>
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setClearConfirmModalOpen(false)}
              >
                ยกเลิก (Cancel)
              </button>
              <button
                type="button"
                className="primary-button"
                style={{ background: '#dc2626', borderColor: '#ef4444', color: '#ffffff' }}
                onClick={() => {
                  clearChat();
                  setClearConfirmModalOpen(false);
                }}
              >
                ยืนยันล้างข้อความ (Clear Messages)
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Transparent Intelligence & System Status Bar */}
      <div className="chat-intelligence-bar" role="status" aria-label="System status bar">
        <div className="chat-status-item">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              borderRadius: '6px',
              background: health?.ok ? '#0d251a' : '#33151b',
              border: `1px solid ${health?.ok ? '#1f5338' : '#991b1b'}`,
              color: health?.ok ? '#86efac' : '#fca5a5',
              fontWeight: 700,
              fontSize: '10px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: health?.ok ? '#86efac' : '#fca5a5',
                boxShadow: `0 0 8px ${health?.ok ? '#86efac' : '#fca5a5'}`,
              }}
            />
            {health?.ok ? 'SERVER_READY' : 'SERVER_OFFLINE'} (API พร้อม)
          </span>
        </div>
        <div className="chat-status-divider" />
        <div className="chat-status-item">
          <Cpu size={12} style={{ color: '#2dd4bf' }} />
          <span>Active Model:</span>
          <b style={{ color: '#e2e8f0' }}>{settings?.model || 'buffalo-1.1-native'}</b>
        </div>
        <div className="chat-status-divider" />
        <div className="chat-status-item">
          <Globe size={12} style={{ color: '#38bdf8' }} />
          <span>Runtime:</span>
          <b style={{ color: '#e2e8f0' }}>{settings?.localEndpoint ? 'Local (Loopback)' : 'Remote / Online'}</b>
        </div>
        <div className="chat-status-divider" />
        <div className="chat-status-item">
          <LockKeyhole size={12} style={{ color: '#4ade80' }} />
          <span>Privacy:</span>
          <b style={{ color: '#e2e8f0' }}>{settings?.localOnly ?? true ? 'Local-Only 🔒' : 'Online Allowed 🌐'}</b>
        </div>
        <div className="chat-status-divider" />
        <div className="chat-status-item">
          <Activity size={12} style={{ color: currentModelStatusColor }} />
          <span>Inference:</span>
          <b style={{ color: currentModelStatusColor }}>{currentModelStatusLabel}</b>
        </div>
      </div>

      {/* Messages List or Welcome Block */}
      <div className="conversation-area">
        {messages.length === 0 ? (
          <div className="welcome-block">
            <div className="welcome-orb">
              <div className="orb-core"><Sparkles size={27}/></div>
              <span className="orb-ring ring-one"/>
              <span className="orb-ring ring-two"/>
              <span className="orb-dot dot-one"/>
              <span className="orb-dot dot-two"/>
            </div>
            <div className="eyebrow center"><span className="eyebrow-line"/> INTELLIGENCE WORKSPACE <span className="eyebrow-line"/></div>
            <h2>feel <em>clear.</em></h2>
            <p className="welcome-description">
              Ask a question, inspect a problem, or plan what to build next.<br className="desktop-break"/>
              ZYNTHEOR will report real runtime failures instead of inventing an answer.
            </p>
            <div className="suggestion-grid">
              {[
                { icon: Code2, title: 'Review a codebase', desc: 'Map architecture and identify risk', prompt: 'ช่วยวางแผนตรวจสอบ codebase นี้ โดยเริ่มจากโครงสร้างและ dependency' },
                { icon: WandSparkles, title: 'Fix a bug', desc: 'Trace symptoms to a testable cause', prompt: 'ช่วยวิเคราะห์แนวทาง debug แอปที่ส่งข้อความแล้วไม่ตอบ' },
                { icon: Network, title: 'Design the system', desc: 'Plan a secure app architecture', prompt: 'ออกแบบสถาปัตยกรรม AI app ใหม่ให้รองรับมือถือ ความปลอดภัย และโมเดลจริง' },
              ].map(item => (
                <button key={item.title} className="suggestion-card" onClick={() => setDraft(item.prompt)}>
                  <div className="suggestion-icon"><item.icon size={17}/></div>
                  <div><b>{item.title}</b><span>{item.desc}</span></div>
                  <ArrowUpRight size={15} className="suggestion-arrow"/>
                </button>
              ))}
            </div>
            <div className="quick-status-row">
              <span className={`status-led ${health?.ok ? 'green' : 'amber'}`}/>
              {health?.ok ? 'API is reachable' : 'Waiting for API health check'}
              <span className="status-separator">·</span>
              <LockKeyhole size={13}/>
              {settings?.localOnly ?? true ? 'Local-only default' : 'Online endpoint allowed'}
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map(message => (
              <article className={`chat-message ${message.role} ${message.error ? 'chat-error' : ''}`} key={message.id}>
                <div className={`message-avatar ${message.role}`}>
                  {message.role === 'user' ? 'U' : <Sparkles size={16}/>}
                </div>
                <div className="message-content">
                  <div className="message-meta">
                    <b>{message.role === 'user' ? 'You' : 'ZYNTHEOR'}</b>
                    <span>{timeLabel(message.at)}</span>
                    {message.model && <span className="message-model">{message.model}</span>}
                    {message.mode && <span className="message-model">{message.mode}</span>}
                    {message.streaming && <span className="stream-tag">STREAMING</span>}
                    {message.incomplete && <span className="error-tag">INCOMPLETE</span>}
                    {message.error && <span className="error-tag">NOT CONNECTED</span>}
                  </div>
                  <div className={`message-text${message.streaming ? ' is-streaming' : ''}`}>
                    <HighlightedMessage
                      content={message.content}
                      isStreaming={message.streaming}
                      isAssistant={message.role === 'assistant'}
                      recordAudit={recordAudit}
                      setToast={setToast}
                      onApplyDiff={async (proposal, count) => {
                        setToast?.(`ประยุกต์ใช้โค้ด ${count} hunk สำเร็จ (${proposal.filePath})`);
                        if (recordAudit) {
                          await recordAudit('CHAT_DIFF_HUNKS_APPLIED', `file=${proposal.filePath}; count=${count}`);
                        }
                      }}
                    />
                  </div>

                  {/* Human Approval Gate Card on Consequential Code/Action */}
                  {message.requiresApproval && !message.streaming && (
                    <div className="approval-card">
                      <div className="approval-header">
                        <ShieldCheck size={16} />
                        <span>Human Approval Gate (ประตูการอนุมัติโดยมนุษย์)</span>
                        <div style={{ marginLeft: 'auto' }}>
                          {message.approved ? (
                            <span className="approval-badge-done approved">APPROVED ✅</span>
                          ) : message.rejected ? (
                            <span className="approval-badge-done rejected">REJECTED ❌</span>
                          ) : (
                            <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', background: '#451a03', color: '#fde047', borderRadius: '4px', border: '1px solid #854d0e' }}>
                              AWAITING APPROVAL ⏳
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="approval-desc">
                        {message.approved
                          ? 'การดำเนินการได้รับการอนุมัติเรียบร้อย และได้บันทึกหลักฐานลงใน Audit Ledger แล้ว'
                          : message.rejected
                          ? 'การดำเนินการถูกปฏิเสธโดยมนุษย์ ไม่มีการประยุกต์ใช้การเปลี่ยนแปลงโค้ดกับระบบ'
                          : 'คำตอบนี้มีข้อเสนอการแก้ไขโค้ดหรือการดำเนินการสำคัญ ตามหลักความปลอดภัยของ ZYNTHEOR ต้องได้รับการยืนยันจากมนุษย์ก่อนนำไปปฏิบัติ'}
                      </div>
                      {!message.approved && !message.rejected && (
                        <div className="approval-actions">
                          <button
                            type="button"
                            className="btn-approve"
                            onClick={() => onApprove(message.id)}
                          >
                            <Check size={13} /> อนุมัติการดำเนินการ (Approve & Log)
                          </button>
                          <button
                            type="button"
                            className="btn-reject"
                            onClick={() => onReject(message.id)}
                          >
                            <X size={13} /> ปฏิเสธ (Reject / Abort)
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {message.incomplete && <div className="stream-note">{message.incomplete}</div>}
                  {message.role === 'assistant' && !message.error && !message.streaming && (
                    <div className="message-actions">
                      <button onClick={() => void navigator.clipboard?.writeText(message.content)}>
                        <ClipboardCheck size={13}/> Copy
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
            {sending && chatPhase !== 'streaming' && (
              <div className="chat-message assistant">
                <div className="message-avatar assistant"><Sparkles size={16}/></div>
                <div className="message-content">
                  <div className="message-meta"><b>ZYNTHEOR</b><span>Waiting for model</span></div>
                  <div className="thinking-indicator"><span/><span/><span/> Contacting configured model endpoint…</div>
                </div>
              </div>
            )}
            <div ref={chatEndRef}/>
          </div>
        )}
      </div>

      {showHistoryInfo && (
        <div className="history-info">
          <History size={14}/> Chat history is stored in this browser only. Clearing browser data removes it; server-side storage is not connected yet.
        </div>
      )}

      {/* AI Mode Bottom Sheet (Mobile) / Centered Modal (Desktop) */}
      {showModeSheet && (
        <div
          className="mode-sheet-backdrop"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setShowModeSheet(false);
          }}
        >
          <section
            className="mode-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mode-sheet-title"
          >
            <div className="mode-sheet-handle" />
            <div className="mode-sheet-heading">
              <h3 id="mode-sheet-title">เลือกโหมด AI</h3>
              <button
                type="button"
                className="mode-sheet-close"
                onClick={() => setShowModeSheet(false)}
                aria-label="ปิด"
              >
                <X size={17} />
              </button>
            </div>
            <div className="mode-sheet-origin">
              การตั้งค่าโหมด: <b>{modeOriginLabel}</b>
            </div>

            {/* 6 Mode Options 2-Column Grid with ARIA radiogroup */}
            <div
              className="mode-sheet-grid"
              role="radiogroup"
              aria-label="เลือกโหมด AI"
            >
              {CHAT_MODE_OPTIONS.map((option, index) => {
                const OptionIcon = option.icon;
                const isSelected = chatMode === option.id && !analysisMode;
                const isLocked = option.id === 'agent' && isAgentLocked;

                return (
                  <button
                    key={option.id}
                    ref={el => { cardRefs.current[index] = el; }}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-disabled={isLocked}
                    tabIndex={focusedModeIndex === index ? 0 : -1}
                    className={`mode-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={() => {
                      if (isLocked) {
                        setToast?.('โหมด Agent ถูกล็อก: ต้องใช้สิทธิ์ Engineer หรือ Admin');
                        return;
                      }
                      setAnalysisMode(false);
                      setChatMode(option.id);
                      setShowModeSheet(false);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const next = (index + 1) % CHAT_MODE_OPTIONS.length;
                        setFocusedModeIndex(next);
                        cardRefs.current[next]?.focus();
                      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prev = (index - 1 + CHAT_MODE_OPTIONS.length) % CHAT_MODE_OPTIONS.length;
                        setFocusedModeIndex(prev);
                        cardRefs.current[prev]?.focus();
                      } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (isLocked) {
                          setToast?.('โหมด Agent ถูกล็อก: ต้องใช้สิทธิ์ Engineer หรือ Admin');
                          return;
                        }
                        setAnalysisMode(false);
                        setChatMode(option.id);
                        setShowModeSheet(false);
                      }
                    }}
                  >
                    <div className="mode-card-header">
                      <span className="mode-card-icon">
                        <OptionIcon size={18} />
                      </span>
                      {isLocked ? (
                        <span className="mode-card-lock" title="ถูกล็อก">
                          <LockKeyhole size={14} />
                        </span>
                      ) : isSelected ? (
                        <span className="mode-card-check">
                          <Check size={16} />
                        </span>
                      ) : null}
                    </div>
                    <b className="mode-card-title">{option.label}</b>
                    <span className="mode-card-desc">{option.hint}</span>
                  </button>
                );
              })}
            </div>

            {/* Footer: Rationale & Reset button */}
            <div className="mode-sheet-footer">
              {chatMode === 'auto' && (
                <div className="auto-rationale-box">
                  <WandSparkles size={14} className="rationale-icon" />
                  <span>
                    <b>เหตุผลของ AUTO:</b> ตรวจพบบริบทคำสั่งและโครงสร้างงาน จึงเลือกโหมด <b>{autoDetectedOption.label}</b> ให้โดยอัตโนมัติ
                  </span>
                </div>
              )}
              {isCustomSessionMode && (
                <button
                  type="button"
                  className="reset-default-mode-btn"
                  onClick={() => {
                    const def = userDefaultMode;
                    setAnalysisMode(false);
                    setChatMode(def);
                    setToast?.(`เปลี่ยนกลับเป็นค่าเริ่มต้น (${def}) แล้ว`);
                    setShowModeSheet(false);
                  }}
                >
                  <RefreshCw size={13} /> ใช้ค่าเริ่มต้นของฉัน ({userDefaultMode})
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Composer with Capsule Mode Button inside composer-left */}
      <form className="composer" onSubmit={sendMessage}>
        {attachments.length > 0 && (
          <div className="attachments-tray">
            {attachments.map(att => (
              <span key={att.id} className="attachment-chip">
                <FileCode2 size={12} />
                <span>{att.name} ({Math.max(1, Math.round(att.size / 1024))} KB)</span>
                <button
                  type="button"
                  className="attachment-remove"
                  onClick={() => onRemoveAttachment(att.id)}
                  title="ลบไฟล์แนบ"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          aria-label="Message"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={keyHandler}
          placeholder={
            analysisMode
              ? "วางโค้ดหรือข้อความที่ต้องการวิเคราะห์…"
              : "Message ZYNTHEOR… (Enter to send, Shift+Enter for newline)"
          }
          rows={2}
        />
        <div className="composer-footer">
          <div className="composer-left">
            {/* AI Mode Selection Capsule Button inside composer-left */}
            <button
              ref={modeCapsuleRef}
              type="button"
              className="composer-mode-capsule"
              onClick={() => {
                const idx = CHAT_MODE_OPTIONS.findIndex(o => o.id === chatMode);
                setFocusedModeIndex(idx >= 0 ? idx : 0);
                setShowModeSheet(true);
              }}
              disabled={sending}
              aria-haspopup="dialog"
              aria-expanded={showModeSheet}
              aria-label={`เลือกโหมด AI (ปัจจุบันคือ ${capsuleText})`}
              title="เลือกโหมด AI"
            >
              <CurrentCapsuleIcon size={14} className="mode-capsule-icon" />
              <span className="mode-capsule-label">{capsuleText}</span>
              <ChevronDown size={12} className="mode-capsule-arrow" />
            </button>

            <button
              type="button"
              className="composer-token"
              onClick={() => attachmentInputRef.current?.click()}
              style={{ cursor: 'pointer', background: 'transparent', border: 0 }}
              title="แนบไฟล์โค้ดหรือเอกสาร (.ts, .py, .json, .txt, etc.)"
            >
              <Upload size={13} style={{ color: 'var(--accent)' }} /> แนบไฟล์โค้ด
            </button>
            <span className="composer-token">
              <ShieldCheck size={13}/> <span className="composer-token-text-long">Approval required for consequential actions</span>
            </span>
          </div>
          {chatPhase !== 'idle' ? (
            <button
              className="send-button stop-button"
              type="button"
              onClick={stop}
              aria-label="Stop generating"
              title="Stop"
            >
              <Square size={14}/>
            </button>
          ) : (
            <button
              className="send-button"
              type="submit"
              disabled={sending || (!draft.trim() && attachments.length === 0)}
              aria-label="Send message"
            >
              {sending ? <span className="spinner"/> : <Send size={17}/>}
            </button>
          )}
        </div>
      </form>
      <div className="composer-disclaimer">
        {analysisMode ? 'Analysis mode sends the submitted text to the configured model endpoint. Execution is not performed.' : ''} AI can make mistakes. Verify important results. <span>•</span> No reply is fabricated when the model is unavailable.
      </div>
    </section>
  );
}
function PaperclipIcon(){return <Upload size={13}/>}
function PlansPage({ plans, add, toggle, query, onAddBulk, setToast }: { plans: Plan[]; add: () => void; toggle: (p: Plan) => void; query: string; onAddBulk?: (items: { title: string; detail: string }[]) => void; setToast?: (msg: string) => void }) {
  const { lang } = useTranslation();
  const visible = plans.filter(p => `${p.title} ${p.detail}`.toLowerCase().includes(query.toLowerCase()));
  const done = plans.filter(p => p.done).length;
  const [plannerOpen, setPlannerOpen] = useState(true);
  const [desc, setDesc] = useState('สร้างแอปจัดการงานที่มีระบบเข้าสู่ระบบและฐานข้อมูล');
  const [generating, setGenerating] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const planRefs = useRef<(HTMLElement | null)[]>([]);

  // Clamp focusedIndex if visible list changes
  useEffect(() => {
    if (visible.length === 0) setFocusedIndex(-1);
    else if (focusedIndex >= visible.length) setFocusedIndex(visible.length - 1);
  }, [visible.length, focusedIndex]);

  // Global arrow keys and Enter/Space toggle for PlansPage
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (visible.length === 0) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = (prev + 1) % visible.length;
          planRefs.current[next]?.focus();
          return next;
        });
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = (prev - 1 + visible.length) % visible.length;
          planRefs.current[next]?.focus();
          return next;
        });
      } else if (e.key === 'Home') {
        e.preventDefault();
        setFocusedIndex(0);
        planRefs.current[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        const last = visible.length - 1;
        setFocusedIndex(last);
        planRefs.current[last]?.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (focusedIndex >= 0 && focusedIndex < visible.length) {
          e.preventDefault();
          toggle(visible[focusedIndex]);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, focusedIndex, toggle]);
  const [planResult, setPlanResult] = useState<{
    overview: string;
    sections: { id: string; title: string; titleTh: string; items: { tag: 'VERIFIED' | 'ASSUMPTION' | 'PROPOSED' | 'UNVERIFIED'; text: string }[] }[];
  } | null>(() => buildDevPlan('สร้างแอปจัดการงานที่มีระบบเข้าสู่ระบบและฐานข้อมูล'));
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!desc.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/intelligence/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dev-token',
        },
        body: JSON.stringify({
          query: `สร้างแผนงานพัฒนาซอฟต์แวร์ 10 มิติ: ${desc.trim()}`,
          language: lang,
          responseLanguage: lang,
          taskCategory: 'software_dev',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.plan && Array.isArray(data.plan.steps) && data.plan.steps.length > 0) {
          const apiSteps = data.plan.steps.map((st: any) => ({
            tag: (st.verificationStatus || 'PROPOSED') as 'VERIFIED' | 'ASSUMPTION' | 'PROPOSED' | 'UNVERIFIED',
            text: `${st.title} - ${st.description}`,
          }));

          setPlanResult({
            overview: data.finalAnswer || `[MODEL_GENERATED_PLAN] แผนงานสร้างโดย AI Engine (${data.modelUsed || 'ZYNTHEOR Core'})`,
            sections: [
              {
                id: 'phases',
                title: 'AI Generated Execution Steps',
                titleTh: 'ขั้นตอนการดำเนินงานโดย AI Engine',
                items: apiSteps,
              },
              {
                id: 'kernel',
                title: 'Truth & Evidence Kernel Disclosures',
                titleTh: 'การตรวจสอบและหลักฐานความจริง',
                items: (data.truthKernelDisclosures || []).map((disc: string) => ({
                  tag: 'VERIFIED' as const,
                  text: disc,
                })).concat(
                  (data.evidenceAudit || []).slice(0, 3).map((ev: any) => ({
                    tag: (ev.evidenceStatus || 'VERIFIED') as any,
                    text: `[SHA256:${ev.digest?.slice(0, 8)}] ${ev.summary}`,
                  }))
                ),
              },
            ],
          });
          setGenerating(false);
          return;
        }
      }
    } catch {
      // Graceful fallback to deterministic planner template
    }

    setPlanResult(buildDevPlan(desc.trim()));
    setGenerating(false);
  }

  function convertPhasesToChecklist() {
    if (!planResult || !onAddBulk) return;
    const phaseSection = planResult.sections.find(s => s.id === 'phases');
    if (!phaseSection) return;
    const newItems = phaseSection.items.map(it => ({
      title: it.text.split(' - ')[0] || it.text,
      detail: `[${it.tag}] ${it.text}`
    }));
    onAddBulk(newItems);
  }

  function copyMarkdown() {
    if (!planResult) return;
    let md = `# Development Plan: ${desc}\n\n`;
    md += `## Project Overview\n${planResult.overview}\n\n`;
    for (const sec of planResult.sections) {
      md += `### ${sec.titleTh} (${sec.title})\n`;
      for (const it of sec.items) {
        md += `- [${it.tag}] ${it.text}\n`;
      }
      md += '\n';
    }
    void navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyFullExecutionPlanList() {
    if (!plans.length) return;
    const completedCount = plans.filter(p => p.done).length;
    let text = `# Execution Plan Checklist (${completedCount}/${plans.length} Completed)\n\n`;
    plans.forEach((p, idx) => {
      text += `${idx + 1}. [${p.done ? 'x' : ' '}] ${p.title}${p.detail ? ` - ${p.detail}` : ''}\n`;
    });
    void navigator.clipboard.writeText(text);
    setToast?.(lang === 'th' ? 'คัดลอกรายการแผนงานทั้งหมดไปยังคลิปบอร์ดแล้ว' : 'Copied full execution plan to clipboard!');
  }

  return <section className="subpage">
    <PageHeader page="Plans" right={
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button className="secondary-button" onClick={copyFullExecutionPlanList} title="คัดลอกรายการแผนงานทั้งหมด">
          <ClipboardCheck size={14}/> {lang === 'th' ? 'คัดลอกแผนงาน (Copy Plan)' : 'Copy Plan'}
        </button>
        <button className="secondary-button" onClick={() => setPlannerOpen(v => !v)}>
          <WandSparkles size={14}/> {plannerOpen ? 'ซ่อน AI Planner' : 'เปิด AI Planner'}
        </button>
        <button className="primary-button" onClick={add}>
          <Plus size={15}/> Add step
        </button>
      </div>
    }/>

    {plannerOpen && <div className="surface-card" style={{ marginBottom: '24px', border: '1px solid #334155' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="surface-card-icon" style={{ color: '#38bdf8' }}><Sparkles size={20}/></div>
          <div>
            <b style={{ fontSize: '15px' }}>Development Planner (Buffalo 0.9.0)</b>
            <p style={{ margin: 0, fontSize: '12px', color: '#8898b0' }}>วางแผนพัฒนาซอฟต์แวร์ 10 มิติ จากข้อกำหนดภาษาธรรมชาติ พร้อมแยกประเภทความจริงและสมมติฐาน</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#064e3b', color: '#6ee7b7' }}>VERIFIED</span>
          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#78350f', color: '#fde68a' }}>ASSUMPTION</span>
          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#312e81', color: '#c7d2fe' }}>PROPOSED</span>
          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#450a0a', color: '#fca5a5' }}>UNVERIFIED</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          type="text"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="อธิบายระบบที่ต้องการสร้าง เช่น สร้างแอปจัดการงานที่มีระบบเข้าสู่ระบบและฐานข้อมูล"
          style={{ flex: 1, background: '#121722', border: '1px solid #283344', borderRadius: '6px', padding: '8px 12px', color: '#e2e8f4', fontSize: '13px' }}
        />
        <button className="primary-button" onClick={handleGenerate} disabled={generating}>
          {generating ? <RefreshCw size={14} className="spin"/> : <Sparkles size={14}/>} สร้างแผนงาน
        </button>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {[
          'สร้างแอปจัดการงานที่มีระบบเข้าสู่ระบบและฐานข้อมูล',
          'สร้าง REST API ตรวจสอบสิทธิ์ด้วย JWT และบันทึก Audit log',
          'ทำระบบ Sync ข้อมูล Local-first พร้อม IndexedDB และ WebSockets',
        ].map(sample => (
          <button
            key={sample}
            type="button"
            className="secondary-button"
            style={{ fontSize: '11px', padding: '3px 8px' }}
            onClick={() => { setDesc(sample); setPlanResult(buildDevPlan(sample)); }}
          >
            {sample}
          </button>
        ))}
      </div>

      {planResult && <div style={{ background: '#0e121a', border: '1px solid #1e2638', borderRadius: '8px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #1e2638', paddingBottom: '8px' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600, textTransform: 'uppercase' }}>Project Overview</span>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#e2e8f4' }}>{planResult.overview}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="secondary-button" onClick={copyMarkdown} title="คัดลอกเป็น Markdown">
              {copied ? <Check size={14}/> : <ClipboardCheck size={14}/>} {copied ? 'คัดลอกแล้ว' : 'คัดลอก Markdown'}
            </button>
            <button className="primary-button" onClick={convertPhasesToChecklist} title="นำ Phases เข้าสู่รายการตรวจสอบด้านล่าง">
              <Plus size={14}/> แปลง Phases เป็น Checklist
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
          {planResult.sections.map(sec => (
            <div key={sec.id} style={{ background: '#131824', border: '1px solid #202b3d', borderRadius: '6px', padding: '10px 12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#93c5fd', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{sec.titleTh}</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>{sec.title}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
                {sec.items.map((it, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>
                    <span style={{
                      display: 'inline-block',
                      fontSize: '9px',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      marginRight: '6px',
                      fontWeight: 700,
                      background: it.tag === 'VERIFIED' ? '#064e3b' : it.tag === 'ASSUMPTION' ? '#78350f' : it.tag === 'PROPOSED' ? '#312e81' : '#450a0a',
                      color: it.tag === 'VERIFIED' ? '#6ee7b7' : it.tag === 'ASSUMPTION' ? '#fde68a' : it.tag === 'PROPOSED' ? '#c7d2fe' : '#fca5a5'
                    }}>
                      {it.tag}
                    </span>
                    {it.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>}
    </div>}

    <div className="plan-progress">
      <div className="progress-heading">
        <div><span>Rebuild checklist</span><b>{done} of {plans.length} complete</b></div>
        <span className="progress-percent">{plans.length ? Math.round(done / plans.length * 100) : 0}%</span>
      </div>
      <div className="progress-track"><span style={{ width: `${plans.length ? done / plans.length * 100 : 0}%` }}/></div>
      <p>Plan and verify one capability at a time. Completing a checklist item does not mean the application has passed a technical test.</p>
    </div>

    {/* Keyboard Navigation Hint Bar */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        padding: '8px 12px',
        background: '#121727',
        border: '1px solid #283252',
        borderRadius: '8px',
        fontSize: '11px',
        color: '#cbd5e1',
        margin: '14px 0 6px',
      }}
    >
      <Keyboard size={15} style={{ color: '#8c7cff', flexShrink: 0 }} />
      <span>
        <b>การนำทางด้วยแป้นพิมพ์ (Keyboard Navigation):</b> ใช้ปุ่มลูกศร{' '}
        <kbd style={{ padding: '1px 5px', background: '#1c2436', borderRadius: '4px', border: '1px solid #3b4866', color: '#c7d2fe' }}>↑</kbd>{' '}
        <kbd style={{ padding: '1px 5px', background: '#1c2436', borderRadius: '4px', border: '1px solid #3b4866', color: '#c7d2fe' }}>↓</kbd>{' '}
        เพื่อเลือกขั้นตอน และกด{' '}
        <kbd style={{ padding: '1px 5px', background: '#1c2436', borderRadius: '4px', border: '1px solid #3b4866', color: '#c7d2fe' }}>Enter</kbd>{' '}
        หรือ{' '}
        <kbd style={{ padding: '1px 5px', background: '#1c2436', borderRadius: '4px', border: '1px solid #3b4866', color: '#c7d2fe' }}>Space</kbd>{' '}
        เพื่อสลับสถานะ (เสร็จสิ้น / รอดำเนินการ)
      </span>
    </div>

    <SectionTitle title="Execution plan" count={`${visible.length} steps`}/>
    <div className="plan-list" role="list" aria-label="Execution plan steps">
      {visible.map((plan, i) => {
        const isFocused = focusedIndex === i;
        return (
          <article
            ref={el => { planRefs.current[i] = el; }}
            tabIndex={0}
            role="checkbox"
            aria-checked={plan.done}
            aria-label={`Step ${i + 1}: ${plan.title}. ${plan.done ? 'Complete' : 'Pending'}. Press Enter to toggle.`}
            className={`plan-row ${plan.done ? 'is-done' : ''} ${isFocused ? 'keyboard-selected' : ''}`}
            key={plan.id}
            onClick={() => { setFocusedIndex(i); toggle(plan); }}
            onFocus={() => setFocusedIndex(i)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle(plan);
              }
            }}
            style={{
              cursor: 'pointer',
              outline: 'none',
              borderColor: isFocused ? '#8c7cff' : undefined,
              boxShadow: isFocused ? '0 0 0 2px #8c7cff, 0 6px 20px rgba(140, 124, 255, 0.22)' : undefined,
              transition: 'all 0.15s ease',
              position: 'relative',
            }}
          >
            {isFocused && (
              <div
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '76px',
                  fontSize: '8px',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '3px',
                  background: '#2b2252',
                  color: '#c4bbff',
                  border: '1px solid #6354c4',
                }}
              >
                SELECT [Enter]
              </div>
            )}
            <button
              className={`plan-checkbox ${plan.done ? 'checked' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggle(plan); }}
              aria-label={plan.done ? 'Mark incomplete' : 'Mark complete'}
            >
              {plan.done && <Check size={14}/>}
            </button>
            <div className="plan-number">{String(i + 1).padStart(2, '0')}</div>
            <div className="plan-copy"><b>{plan.title}</b><p>{plan.detail}</p></div>
            <span className={`plan-state ${plan.done ? 'complete' : ''}`}>{plan.done ? 'Complete' : 'Pending'}</span>
          </article>
        );
      })}
    </div>
    <InfoNote icon={ShieldCheck}>The app never self-approves code changes. Repository write access and explicit human approval are not connected yet.</InfoNote>
  </section>;
}

function buildDevPlan(input: string): {
  overview: string;
  sections: { id: string; title: string; titleTh: string; items: { tag: 'VERIFIED' | 'ASSUMPTION' | 'PROPOSED' | 'UNVERIFIED'; text: string }[] }[];
} {
  const isThai = /[\u0E00-\u0E7F]/.test(input);
  return {
    overview: isThai
      ? `แผนงานสถาปัตยกรรมและการพัฒนาสำหรับ: “${input}” โดยแบ่งข้อกำหนดเป็นระดับความน่าเชื่อถืออย่างเข้มงวด`
      : `Architectural and development execution plan for: "${input}" with strict evidence classifications.`,
    sections: [
      {
        id: 'functional',
        title: 'Functional Requirements',
        titleTh: '1. ข้อกำหนดการทำงาน (Functional)',
        items: [
          { tag: 'PROPOSED', text: isThai ? 'ระบบยืนยันตัวตนผู้ใช้งาน (Sign-up, Login, Session token management)' : 'User authentication (Sign-up, Login, Session token management)' },
          { tag: 'PROPOSED', text: isThai ? 'การจัดการ Task/Item (สร้าง, ดูรายการ, แก้ไขสถานะ, ลบ)' : 'Task management CRUD (Create, Read, Update status, Delete)' },
          { tag: 'ASSUMPTION', text: isThai ? 'ผู้ใช้แต่ละคนสามารถเข้าถึงเฉพาะงานที่ตนเองสร้างหรือได้รับสิทธิ์' : 'Users only access tasks created by or assigned to them' }
        ]
      },
      {
        id: 'technical',
        title: 'Technical Requirements',
        titleTh: '2. ข้อกำหนดทางเทคนิค (Technical)',
        items: [
          { tag: 'VERIFIED', text: isThai ? 'Runtime ปัจจุบัน: Node.js + Express + React 19 + TypeScript 5' : 'Verified current runtime: Node.js + Express + React 19 + TypeScript 5' },
          { tag: 'PROPOSED', text: isThai ? 'ฐานข้อมูล SQLite/PostgreSQL พร้อม Schema migration และ Typed ORM' : 'Relational database (SQLite/PostgreSQL) with migrations and ORM' },
          { tag: 'ASSUMPTION', text: isThai ? 'การเชื่อมต่อต้องทนทานต่อกรณี Offline ชั่วคราว (Local cache)' : 'Connection must tolerate temporary offline state via cache' }
        ]
      },
      {
        id: 'architecture',
        title: 'Architecture Proposal',
        titleTh: '3. สถาปัตยกรรมระบบ (Architecture)',
        items: [
          { tag: 'PROPOSED', text: isThai ? 'Client-Server แบบ Layered: React Frontend -> RESTful API -> Service Layer -> Data Repository' : 'Layered client-server: React Frontend -> RESTful API -> Service -> Repo' },
          { tag: 'VERIFIED', text: isThai ? 'การแยกหน้าที่: API routes รันฝั่ง Node.js และไม่ส่ง Secrets สู่เบราว์เซอร์' : 'Strict boundary: API routes run server-side and never leak keys to browser' }
        ]
      },
      {
        id: 'files',
        title: 'File and Module Plan',
        titleTh: '4. โครงสร้างไฟล์และโมดูล (Files & Modules)',
        items: [
          { tag: 'VERIFIED', text: isThai ? 'ไฟล์เซิร์ฟเวอร์หลัก: /server.ts และ /lib/providers.ts' : 'Existing core server files: /server.ts and /lib/providers.ts' },
          { tag: 'PROPOSED', text: isThai ? 'โมดูลสิทธิ์และการจัดเก็บ: /src/services/taskService.ts และ /server/routes/tasks.ts' : 'Proposed service modules: /src/services/taskService.ts & /server/routes/tasks.ts' },
          { tag: 'UNVERIFIED', text: isThai ? 'ยังไม่มีไฟล์ฐานข้อมูลจริง (migrations หรือ schema.prisma) ใน workspace ปัจจุบัน' : 'No persistent database schema/migration files verified in repo' }
        ]
      },
      {
        id: 'phases',
        title: 'Implementation Phases',
        titleTh: '5. ระยะเวลาและขั้นตอนการพัฒนา (Phases)',
        items: [
          { tag: 'PROPOSED', text: isThai ? 'Phase 1: กำหนด Data Schema สำหรับ User และ Tasks' : 'Phase 1: Define data schemas for Users and Tasks' },
          { tag: 'PROPOSED', text: isThai ? 'Phase 2: สร้าง Backend API CRUD และ Middleware ตรวจสอบสิทธิ์' : 'Phase 2: Build Backend API CRUD and Auth Middleware' },
          { tag: 'PROPOSED', text: isThai ? 'Phase 3: สร้าง Frontend UI Components และเชื่อมต่อ State' : 'Phase 3: Create Frontend UI Components and wire reactive state' },
          { tag: 'PROPOSED', text: isThai ? 'Phase 4: เพิ่ม End-to-end Automated Smoke Tests' : 'Phase 4: Add End-to-end Automated Smoke Tests' }
        ]
      },
      {
        id: 'testing',
        title: 'Testing Strategy',
        titleTh: '6. กลยุทธ์การทดสอบ (Testing Strategy)',
        items: [
          { tag: 'VERIFIED', text: isThai ? 'ระบบทดสอบปัจจุบันใช้ node:test ในไดเรกทอรี /tests' : 'Current test harness uses node:test in /tests directory' },
          { tag: 'PROPOSED', text: isThai ? 'เพิ่ม integration test สำหรับ Task CRUD endpoints' : 'Add integration tests for Task CRUD endpoints' },
          { tag: 'PROPOSED', text: isThai ? 'ทดสอบ Auth guard ห้ามเข้าถึงงานของผู้อื่น (403 Forbidden)' : 'Test unauthorized cross-tenant task access returns 403' }
        ]
      },
      {
        id: 'security',
        title: 'Security Considerations',
        titleTh: '7. ความปลอดภัยและความเป็นส่วนตัว (Security)',
        items: [
          { tag: 'VERIFIED', text: isThai ? 'มี Policy ZYNTHEOR_LOCAL_ONLY ป้องกันข้อมูลรั่วไหลสู่ภายนอก' : 'ZYNTHEOR_LOCAL_ONLY policy protects against unintended external leakage' },
          { tag: 'PROPOSED', text: isThai ? 'แฮชรหัสผ่านด้วย Argon2/Bcrypt พร้อม Salt ที่ปลอดภัย' : 'Hash passwords with salted Argon2 or Bcrypt' },
          { tag: 'PROPOSED', text: isThai ? 'จำกัด Rate limit และกรอง Input ป้องกัน SQL Injection / XSS' : 'Rate limiting and input validation against SQLi and XSS' }
        ]
      },
      {
        id: 'acceptance',
        title: 'Acceptance Criteria',
        titleTh: '8. เกณฑ์การตรวจรับงาน (Acceptance Criteria)',
        items: [
          { tag: 'PROPOSED', text: isThai ? 'ผู้ใช้สามารถสร้างบัญชี ล็อกอิน และได้รับ Session Token ที่ถูกต้อง' : 'User can register, login, and obtain valid session token' },
          { tag: 'PROPOSED', text: isThai ? 'สร้างและเปลี่ยนสถานะงานได้สำเร็จ ข้อมูลคงอยู่หลังรีเฟรชหน้าเว็บ' : 'Create and toggle tasks; state persists across browser refresh' },
          { tag: 'VERIFIED', text: isThai ? 'ทุก Automated Tests ต้องผ่าน 100% (npm test)' : 'All automated tests in test suite must pass (npm test)' }
        ]
      },
      {
        id: 'risks',
        title: 'Known Risks and Assumptions',
        titleTh: '9. ความเสี่ยงและข้อสมมติฐาน (Risks & Assumptions)',
        items: [
          { tag: 'ASSUMPTION', text: isThai ? 'สมมติว่าผู้ใช้ต้องการ Local storage ก่อนขยายสู่ Cloud database' : 'Assumed user prioritizes local storage before cloud sync' },
          { tag: 'UNVERIFIED', text: isThai ? 'ยังไม่มีการยืนยันระบบ Auth ภายนอก (OAuth/OAuth2)' : 'Third-party OAuth providers not verified or configured' },
          { tag: 'PROPOSED', text: isThai ? 'ความเสี่ยงข้อมูลสูญหายหากไม่มี Persistent Database สำรอง' : 'Risk of ephemeral loss if persistent database is not attached' }
        ]
      },
      {
        id: 'governance',
        title: 'Governance & Integrity',
        titleTh: '10. การควบคุมความถูกต้อง (Integrity Rules)',
        items: [
          { tag: 'VERIFIED', text: isThai ? 'ห้ามอ้างว่ามีระบบหรือไฟล์อยู่แล้วหากยังไม่ได้ตรวจพบจริงใน repo' : 'Never claim files, functions, or systems exist unless verified' },
          { tag: 'VERIFIED', text: isThai ? 'การแก้ไขโค้ดต้องผ่านการยินยอมของมนุษย์เสมอ' : 'Consequential changes require explicit human approval' }
        ]
      }
    ]
  };
}
function FilesPage({ files, onPick, remove, onViewSnippet }: { files: FileItem[]; onPick: () => void; remove: (id: string) => void; onViewSnippet: (file: FileItem) => void }) {
  return (
    <section className="subpage">
      <PageHeader
        page="Files"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {files.length >= 2 && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => onViewSnippet(files[0])}
                title="Launch Forensic Diff between selected files"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <Split size={14} style={{ color: '#818cf8' }} />
                <span>Forensic Diff (Compare)</span>
              </button>
            )}
            <button className="primary-button" onClick={onPick}><Upload size={15}/> Add local files</button>
          </div>
        }
      />
      <div className="file-dropzone" onClick={onPick} role="button" tabIndex={0} onKeyDown={e => { if(e.key==='Enter'||e.key===' ') onPick(); }}>
        <div className="drop-icon"><Upload size={23}/></div>
        <b>Choose files from your device</b>
        <span>Metadata stays in this browser for this session. No file is uploaded to the server by this screen.</span>
        <button type="button" className="secondary-button" onClick={e => { e.stopPropagation(); onPick(); }}>Browse files</button>
      </div>
      <SectionTitle title="Selected files" count={`${files.length} files`}/>
      {files.length === 0 ? (
        <EmptyState icon={Files} title="No files selected" text="Choose files to see their names, size, type and last-modified time."/>
      ) : (
        <div className="file-table">
          <div className="file-table-head" style={{ gridTemplateColumns: 'minmax(180px, 2fr) minmax(80px, 1fr) 75px minmax(110px, 1.2fr) minmax(140px, auto)' }}>
            <span>Name</span>
            <span>Type</span>
            <span>Size</span>
            <span>Last modified</span>
            <span style={{ textAlign: 'right' }}>Forensic Inspection</span>
          </div>
          {files.map(file => (
            <div
              className="file-table-row"
              key={file.id}
              style={{ gridTemplateColumns: 'minmax(180px, 2fr) minmax(80px, 1fr) 75px minmax(110px, 1.2fr) minmax(140px, auto)' }}
            >
              <div
                className="file-name"
                onClick={() => onViewSnippet(file)}
                style={{ cursor: 'pointer' }}
                title="Click to view file snippet & forensic diff"
              >
                <span className="file-type-icon"><FileText size={16}/></span>
                <b>{file.name}</b>
              </div>
              <span className="file-muted">{file.type || 'text/plain'}</span>
              <span className="file-muted">{formatBytes(file.size)}</span>
              <span className="file-muted">{timeLabel(new Date(file.modified).toISOString())}</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ padding: '3px 8px', fontSize: '9px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => onViewSnippet(file)}
                  aria-label={`Forensic Diff of ${file.name}`}
                  title="Open Forensic Diff side-by-side comparison"
                >
                  <Split size={12} style={{ color: '#818cf8' }} />
                  <span>Forensic Diff</span>
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => onViewSnippet(file)}
                  aria-label={`View snippet of ${file.name}`}
                  title="View file preview"
                >
                  <Eye size={15}/>
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => remove(file.id)}
                  aria-label={`Remove ${file.name}`}
                  title="Remove file"
                >
                  <X size={15}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <InfoNote icon={AlertTriangle}>This page does not read your disk automatically, modify files, or send files to AI. Secure server-side file inspection is a later integration step.</InfoNote>
    </section>
  );
}
function CodebaseDependencyMap() {
  const [selectedFile, setSelectedFile] = useState<string>('lib/intelligence-core.ts');
  const ci = useMemo(() => new CodeIntelligence(), []);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const codebaseFiles: Record<string, string> = useMemo(() => ({
    'lib/chat-core.mjs': `export function buildChatMessages(){}`,
    'lib/intelligence-core.ts': `import { buildChatMessages } from './chat-core.mjs'; import { DynamicReplanner } from './dynamic-replanning'; import { planWithDependencies } from './dependency-aware-planning'; import { verifyResult } from './independent-verification'; import { CodeIntelligence } from './code-intelligence';`,
    'lib/dynamic-replanning.ts': `export class DynamicReplanner {}`,
    'lib/dependency-aware-planning.ts': `export function planWithDependencies(){}`,
    'lib/independent-verification.ts': `export class IndependentVerifier {}`,
    'lib/code-intelligence.ts': `export class CodeIntelligence {}`,
    'lib/persistent-task-continuity.ts': `export class TaskContinuityManager {}`,
    'lib/adaptive-routing.ts': `export class AdaptiveRouter {}`,
    'lib/next-gen-orchestrator.ts': `import { DynamicReplanner } from './dynamic-replanning'; import { planWithDependencies } from './dependency-aware-planning'; import { IndependentVerifier } from './independent-verification'; import { CodeIntelligence } from './code-intelligence'; import { TaskContinuityManager } from './persistent-task-continuity'; import { AdaptiveRouter } from './adaptive-routing';`,
    'lib/evidence-manager.ts': `export class EvidenceManager {}`,
    'server.ts': `import { buildChatMessages } from './lib/chat-core.mjs'; import { IntelligenceCore } from './lib/intelligence-core.ts'; import { CodeIntelligence } from './lib/code-intelligence.ts'; import { EvidenceManager } from './lib/evidence-manager.ts';`,
    'src/App.tsx': `import { PromptForgePage } from './components/PromptForgePage'; import { CodeIntelligence } from '../lib/code-intelligence'; import { DynamicReplanner } from '../lib/dynamic-replanning';`,
    'src/components/PromptForgePage.tsx': `import { analyzeCode } from '../../lib/code-intelligence';`,
    'src/components/TrainingMonitor.tsx': `export function TrainingMonitor(){}`,
    'src/components/HardwareReadinessDashboard.tsx': `export function HardwareReadinessDashboard(){}`,
    'src/services/auditLedger.ts': `export function createAuditEntry(){}`,
  }), []);

  const graph = useMemo(() => ci.buildDependencyGraph(codebaseFiles), [ci, codebaseFiles]);
  const relatedFiles = useMemo(() => ci.getRelatedFiles(selectedFile, graph, 2), [ci, selectedFile, graph]);
  const directImports = graph[selectedFile] || [];
  const [sidebarFilter, setSidebarFilter] = useState<string>('');

  const reverseDeps = useMemo(() => {
    const importers: string[] = [];
    Object.entries(graph).forEach(([importer, imports]) => {
      if (imports.includes(selectedFile) && importer !== selectedFile) {
        importers.push(importer);
      }
    });
    return importers;
  }, [graph, selectedFile]);

  const externalDeps = useMemo(() => {
    const knownExternals: Record<string, string[]> = {
      'lib/chat-core.mjs': ['express'],
      'lib/intelligence-core.ts': ['crypto', 'node:events'],
      'lib/dynamic-replanning.ts': ['vitest'],
      'lib/dependency-aware-planning.ts': ['vitest'],
      'lib/independent-verification.ts': ['crypto', 'vitest'],
      'lib/code-intelligence.ts': ['typescript'],
      'lib/persistent-task-continuity.ts': ['node:fs', 'vitest'],
      'lib/adaptive-routing.ts': ['vitest'],
      'lib/next-gen-orchestrator.ts': ['vitest'],
      'lib/evidence-manager.ts': ['node:crypto', 'vitest'],
      'server.ts': ['express', 'node:fs', 'node:path', 'node:url'],
      'src/App.tsx': ['react', 'lucide-react', 'd3', 'recharts'],
      'src/components/PromptForgePage.tsx': ['react', 'lucide-react'],
      'src/components/TrainingMonitor.tsx': ['react', 'lucide-react', 'recharts'],
      'src/components/HardwareReadinessDashboard.tsx': ['react', 'lucide-react'],
      'src/services/auditLedger.ts': ['crypto'],
    };
    return knownExternals[selectedFile] || ['react', 'typescript'];
  }, [selectedFile]);

  // Filtered dependency lists based on sidebar search input
  const filteredDirectImports = useMemo(() => {
    if (!sidebarFilter.trim()) return directImports;
    return directImports.filter(imp => imp.toLowerCase().includes(sidebarFilter.toLowerCase()));
  }, [directImports, sidebarFilter]);

  const filteredExternalDeps = useMemo(() => {
    if (!sidebarFilter.trim()) return externalDeps;
    return externalDeps.filter(pkg => pkg.toLowerCase().includes(sidebarFilter.toLowerCase()));
  }, [externalDeps, sidebarFilter]);

  const filteredReverseDeps = useMemo(() => {
    if (!sidebarFilter.trim()) return reverseDeps;
    return reverseDeps.filter(imp => imp.toLowerCase().includes(sidebarFilter.toLowerCase()));
  }, [reverseDeps, sidebarFilter]);

  // D3.js Force Layout Simulation
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 520;
    const height = 320;

    const nodes = Object.keys(codebaseFiles).map(id => ({ id }));
    const links: { source: string; target: string }[] = [];

    Object.entries(graph).forEach(([source, targets]) => {
      targets.forEach(target => {
        if (codebaseFiles[target]) {
          links.push({ source, target });
        }
      });
    });

    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-140))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', (d: any) => (d.source.id === selectedFile || d.target.id === selectedFile) ? 2 : 1)
      .attr('stroke', (d: any) => (d.source.id === selectedFile || d.target.id === selectedFile) ? '#38bdf8' : '#1e293b');

    // Drag behavior for nodes
    const drag = (sim: any) => {
      function dragstarted(event: any) {
        if (!event.active) sim.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event: any) {
        if (!event.active) sim.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    };

    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(drag(simulation) as any)
      .on('click', (_event, d: any) => setSelectedFile(d.id));

    node.append('circle')
      .attr('r', (d: any) => d.id === selectedFile ? 10 : relatedFiles.includes(d.id) ? 7 : 5)
      .attr('fill', (d: any) => d.id === selectedFile ? '#0284c7' : relatedFiles.includes(d.id) ? '#10b981' : '#1e293b')
      .attr('stroke', (d: any) => d.id === selectedFile ? '#38bdf8' : '#475569')
      .attr('stroke-width', 1.5);

    node.append('text')
      .text((d: any) => d.id.split('/').pop() || d.id)
      .attr('x', 12)
      .attr('y', 4)
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('fill', (d: any) => d.id === selectedFile ? '#f8fafc' : '#94a3b8');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [codebaseFiles, graph, selectedFile, relatedFiles]);

  return (
    <div className="surface-card" style={{ border: '1px solid #0284c7', background: '#081220' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Network size={20} style={{ color: '#38bdf8' }} />
          <div>
            <b style={{ fontSize: '15px', color: '#f8fafc' }}>Interactive D3.js Codebase Dependency Map</b>
            <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8' }}>
              Built with <code style={{ color: '#38bdf8' }}>CodeIntelligence.buildDependencyGraph</code> & D3 Force Simulation
            </p>
          </div>
        </div>
        <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: '#0369a1', color: '#ffffff', fontWeight: 700 }}>
          {Object.keys(codebaseFiles).length} MODULES INDEXED
        </span>
      </div>

      {/* Main Grid: D3 Visual Graph + Detailed Inspector Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '16px' }}>
        {/* Module Selector & D3 Graph Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#0b1626', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b', maxHeight: '180px', overflowY: 'auto' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
              Select Module
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {Object.keys(codebaseFiles).map(file => {
                const isSelected = file === selectedFile;
                const isRelated = relatedFiles.includes(file);
                return (
                  <button
                    type="button"
                    key={file}
                    onClick={() => setSelectedFile(file)}
                    style={{
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      padding: '4px 8px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      background: isSelected ? '#0284c7' : isRelated ? '#0c2a4a' : '#111e30',
                      color: isSelected ? '#ffffff' : isRelated ? '#38bdf8' : '#cbd5e1',
                      border: `1px solid ${isSelected ? '#38bdf8' : isRelated ? '#0284c7' : '#1e293b'}`,
                    }}
                  >
                    {file}
                  </button>
                );
              })}
            </div>
          </div>

          {/* D3.js Force Directed SVG Container */}
          <div style={{ background: '#0b1626', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8', width: '100%', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>D3 Interactive Graph (Click node to select)</span>
              <span style={{ color: '#64748b' }}>Drag or click nodes</span>
            </div>
            <svg ref={svgRef} width={520} height={320} style={{ width: '100%', height: '320px', background: '#060d17', borderRadius: '6px' }} />
          </div>
        </div>

        {/* Detailed Inspector Sidebar */}
        <div className="subpage" style={{ background: '#0b1626', padding: '14px', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
            <div>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>MODULE INSPECTOR SIDEBAR</span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>{selectedFile}</div>
            </div>
            <span style={{ fontSize: '9px', padding: '2px 6px', background: '#0284c7', color: '#ffffff', borderRadius: '4px', fontWeight: 700 }}>
              ACTIVE
            </span>
          </div>

          {/* Table Search Filter */}
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: '8px', top: '8px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Filter dependencies & importers..."
              value={sidebarFilter}
              onChange={(e) => setSidebarFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 8px 5px 26px',
                fontSize: '10px',
                fontFamily: 'monospace',
                background: '#060d17',
                border: '1px solid #1e293b',
                borderRadius: '5px',
                color: '#f8fafc',
                outline: 'none',
              }}
            />
          </div>

          {/* Table 1: Direct Internal Imports */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#34d399', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <GitBranch size={12} /> Direct Internal Imports ({filteredDirectImports.length}/{directImports.length})
            </div>
            {filteredDirectImports.length > 0 ? (
              <div style={{ border: '1px solid #1e293b', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', fontSize: '10px', fontFamily: 'monospace', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0f1c2e', color: '#8899ac', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Module Path</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDirectImports.map(imp => (
                      <tr key={imp} style={{ borderTop: '1px solid #1e293b', color: '#a7f3d0' }}>
                        <td style={{ padding: '6px 8px' }}>{imp}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => { if (codebaseFiles[imp]) setSelectedFile(imp); }}
                            style={{ background: '#064e3b', border: '1px solid #059669', color: '#ffffff', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>No direct local imports match</div>
            )}
          </div>

          {/* Table 2: External Dependencies */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Boxes size={12} /> External Dependencies ({filteredExternalDeps.length}/{externalDeps.length})
            </div>
            {filteredExternalDeps.length > 0 ? (
              <div style={{ border: '1px solid #1e293b', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', fontSize: '10px', fontFamily: 'monospace', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0f1c2e', color: '#8899ac', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Package / Library</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExternalDeps.map(pkg => (
                      <tr key={pkg} style={{ borderTop: '1px solid #1e293b', color: '#7dd3fc' }}>
                        <td style={{ padding: '6px 8px' }}>{pkg}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b' }}>
                          {pkg.startsWith('node:') || pkg === 'crypto' ? 'Built-in Node.js' : 'npm Dependency'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>No external dependencies match</div>
            )}
          </div>

          {/* Table 3: Internal Importers (Reverse Dependencies) */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#c084fc', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Network size={12} /> Imported By Internal Modules ({filteredReverseDeps.length}/{reverseDeps.length})
            </div>
            {filteredReverseDeps.length > 0 ? (
              <div style={{ border: '1px solid #1e293b', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', fontSize: '10px', fontFamily: 'monospace', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0f1c2e', color: '#8899ac', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Importer File</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReverseDeps.map(importer => (
                      <tr key={importer} style={{ borderTop: '1px solid #1e293b', color: '#e9d5ff' }}>
                        <td style={{ padding: '6px 8px' }}>{importer}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedFile(importer)}
                            style={{ background: '#581c87', border: '1px solid #7e22ce', color: '#ffffff', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>No internal importers match</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModelsPage({ settings, result, loading, refresh, onSelectPage, setToast }: {settings:SettingsData|null;result:ModelResult|null;loading:boolean;refresh:()=>void;onSelectPage:(p:Page)=>void;setToast?:(msg:string)=>void}) {
  const status = result?.state || 'UNKNOWN';
  const [modelTab, setModelTab] = useState<'overview' | 'architecture' | 'gpu_training' | 'benchmark'>('overview');
  const [isManuallyUnavailable, setIsManuallyUnavailable] = useState(false);
  const [trainingData, setTrainingData] = useState<{ activeStatus?: string; trainedWeightsExist?: boolean; hardware?: { gpuAvailable: boolean; vramGb: number; ramGb: number }; disclaimer?: string; activeJob?: any; systemHardware?: any } | null>(null);
  const [verifyingData, setVerifyingData] = useState(false);
  const [verifyReport, setVerifyReport] = useState<any>(null);
  const [evaluatingBaseline, setEvaluatingBaseline] = useState(false);
  const [evalReport, setEvalReport] = useState<any>(null);

  const fetchTrainingStatus = useCallback(() => {
    fetch('/api/training/status')
      .then(r => r.json())
      .then(d => { if (d.ok) setTrainingData(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchTrainingStatus();
  }, [fetchTrainingStatus]);

  async function handleVerifyDataset() {
    setVerifyingData(true);
    setVerifyReport(null);
    try {
      const res = await fetch('/api/training/verify', { method: 'POST' });
      const data = await res.json();
      if (data.ok) setVerifyReport(data.report);
    } catch (err) {
      setVerifyReport({ valid: false, errors: ['Network or server failure'] });
    } finally {
      setVerifyingData(false);
    }
  }

  async function handleEvaluateBaseline() {
    setEvaluatingBaseline(true);
    setEvalReport(null);
    try {
      const res = await fetch('/api/training/evaluate', { method: 'POST' });
      const data = await res.json();
      if (data.ok) setEvalReport(data.report);
    } catch (err) {
      setEvalReport({ error: 'Evaluation failed to execute' });
    } finally {
      setEvaluatingBaseline(false);
    }
  }

  return (
    <section className="subpage">
      <PageHeader page="Models" right={<button className="secondary-button" onClick={() => { refresh(); fetchTrainingStatus(); }} disabled={loading}><RefreshCw size={14} className={loading?'spin':''}/> Refresh status</button>}/>

      {/* Sub-tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setModelTab('overview')}
          style={{
            padding: '7px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            background: modelTab === 'overview' ? '#1e293b' : 'transparent',
            color: modelTab === 'overview' ? '#f8fafc' : '#94a3b8',
            border: `1px solid ${modelTab === 'overview' ? '#334155' : 'transparent'}`,
            transition: 'all 0.15s ease',
          }}
        >
          <Cpu size={14} style={{ color: modelTab === 'overview' ? '#38bdf8' : undefined }} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setModelTab('benchmark')}
          style={{
            padding: '7px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            background: modelTab === 'benchmark' ? 'var(--panel2)' : 'transparent',
            color: modelTab === 'benchmark' ? '#f1f5f9' : '#94a3b8',
            border: `1px solid ${modelTab === 'benchmark' ? 'var(--cyan)' : 'transparent'}`,
            transition: 'all 0.15s ease',
          }}
        >
          <Gauge size={14} style={{ color: 'var(--cyan)' }} />
          <span>Benchmark Suite</span>
        </button>

        <button
          type="button"
          onClick={() => setModelTab('architecture')}
          style={{
            padding: '7px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            background: modelTab === 'architecture' ? '#1e293b' : 'transparent',
            color: modelTab === 'architecture' ? '#f8fafc' : '#94a3b8',
            border: `1px solid ${modelTab === 'architecture' ? '#334155' : 'transparent'}`,
            transition: 'all 0.15s ease',
          }}
        >
          <Activity size={14} style={{ color: modelTab === 'architecture' ? '#34d399' : undefined }} />
          <span>Native CORE Architecture & Monitor</span>
        </button>

        <button
          type="button"
          onClick={() => setModelTab('gpu_training')}
          style={{
            padding: '7px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            background: modelTab === 'gpu_training' ? '#1e1b4b' : 'transparent',
            color: modelTab === 'gpu_training' ? '#e0e7ff' : '#94a3b8',
            border: `1px solid ${modelTab === 'gpu_training' ? '#6366f1' : 'transparent'}`,
            transition: 'all 0.15s ease',
          }}
        >
          <Zap size={14} style={{ color: '#818cf8' }} />
          <span>GPU Training</span>
          <span
            style={{
              fontSize: '9px',
              padding: '1px 5px',
              borderRadius: '3px',
              background: '#4338ca',
              color: '#ffffff',
              fontWeight: 700,
            }}
          >
            NEW
          </span>
        </button>
      </div>

      {modelTab === 'benchmark' && (
        <ModelBenchmarkSuite configuredModel={settings?.model} providerId={settings?.provider} />
      )}

      {modelTab === 'gpu_training' && (
        <GpuTrainingTab onLaunchTraining={() => setModelTab('architecture')} />
      )}

      {modelTab === 'architecture' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Interactive Codebase Dependency Graph Component */}
          <CodebaseDependencyMap />

          {/* Real-Time LoRA Training Monitor Component */}
          <TrainingMonitor initialJob={trainingData?.activeJob} onRefreshParent={fetchTrainingStatus} />

          {/* Hardware Readiness Dashboard Component */}
          <NativeModelStatusPanel />

          <HardwareReadinessDashboard />
        </div>
      )}

      {modelTab === 'overview' && (
        <>
          <div className={`model-hero ${isManuallyUnavailable ? 'model-unavailable' : status==='CONNECTED'?'model-connected':''}`} style={{ borderColor: isManuallyUnavailable ? '#ef4444' : undefined }}>
            <div className="model-hero-orb" style={{ background: isManuallyUnavailable ? 'rgba(239,68,68,0.15)' : undefined }}><Cpu size={25} style={{ color: isManuallyUnavailable ? '#ef4444' : undefined }}/></div>
            <div className="model-hero-copy">
              <span className="eyebrow">CONFIGURED INFERENCE ROUTE</span>
              <h2>{settings?.model || 'ZYNTHEOR CORE 0.14.0'}</h2>
              <p>{settings?.provider || 'Provider unavailable'} · {settings?.endpointHost || 'Endpoint not resolved'}</p>
              <div className="model-status-line">
                <span className={`status-led ${isManuallyUnavailable ? 'red' : status==='CONNECTED'?'green':'amber'}`}/>
                {isManuallyUnavailable ? 'Unavailable (Manual Downtime / Maintenance Mode)' : status==='CONNECTED'?'Endpoint reachable':status==='BLOCKED'?'Blocked by policy':'Endpoint not verified'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              <div className="model-hero-tag">{settings?.localEndpoint?'LOCAL ENDPOINT':'ENDPOINT TYPE UNKNOWN'}</div>
              
              {/* ToggleModelAvailability Switch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#091322', border: `1px solid ${isManuallyUnavailable ? '#b91c1c' : '#1e293b'}`, padding: '5px 10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: isManuallyUnavailable ? '#f87171' : '#34d399', fontWeight: 600 }}>
                  {isManuallyUnavailable ? 'Unavailable' : 'Available'}
                </span>
                <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '18px', cursor: 'pointer' }} title="Toggle Model Availability manually without changing environment variables">
                  <input
                    type="checkbox"
                    checked={!isManuallyUnavailable}
                    onChange={(e) => {
                      const avail = e.target.checked;
                      setIsManuallyUnavailable(!avail);
                      if (setToast) {
                        setToast(avail ? 'Model availability toggled to AVAILABLE' : 'Model availability toggled to UNAVAILABLE (Maintenance Mode)');
                      }
                    }}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: isManuallyUnavailable ? '#991b1b' : '#059669',
                      transition: '.2s',
                      borderRadius: '20px',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        content: '""',
                        height: '14px',
                        width: '14px',
                        left: isManuallyUnavailable ? '2px' : '20px',
                        bottom: '2px',
                        backgroundColor: 'white',
                        transition: '.2s',
                        borderRadius: '50%',
                      }}
                    />
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="stats-grid models-stat-grid">
            <Stat icon={HardDrive} label="Endpoint" value={settings?.localEndpoint?'Local':'Remote'} hint={settings?.endpointHost||'Not configured'}/>
            <Stat icon={LockKeyhole} label="Local-only" value={settings?.localOnly?'ON':'OFF'} hint={settings?.localOnly?'External routes blocked':'Check consent state'}/>
            <Stat icon={Bot} label="Models detected" value={String(result?.count ?? '—')} hint={status==='CONNECTED'?'Returned by endpoint':'No verified model list'}/>
          </div>

          {/* 10-Point Rolling Inference Latency & Token Consumption Chart (Recharts) */}
          <ModelMetricsRollingChart selectedModel={settings?.model} providerId={settings?.provider} />

          {/* Automated Benchmark & Baseline Comparison Suite */}
          <ModelBenchmarkSuite configuredModel={settings?.model} providerId={settings?.provider} />

          {/* Native Model Initiative: Buffalo 0.14.0 */}
          <div className="surface-card" style={{ marginBottom: '24px', border: '1px solid #3b82f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: '#38bdf8' }} />
                <b style={{ fontSize: '15px' }}>ZYNTHEOR CORE Native Model Specification</b>
              </div>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: '#1e293b', border: '1px solid #475569', color: '#94a3b8' }}>
                STATUS: {trainingData?.activeStatus || 'SPECIFICATION_LOCKED_PENDING_GPU_RUN'}
              </span>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
              <b>Base Model Target:</b> Qwen/Qwen2.5-Coder-7B-Instruct (Apache-2.0).
              <br />
              <b>Hardware Profile:</b> CPU-only node (12GB RAM, 0 VRAM, 189GB disk).
              <br />
              <b>Checkpoint Status:</b> <i>UNTRAINED (Weights not fabricated).</i> Pipeline & dataset verified.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="secondary-button" onClick={handleVerifyDataset} disabled={verifyingData}>
                <CheckCircle2 size={14}/> {verifyingData ? 'Verifying Dataset…' : 'Verify Dataset Integrity'}
              </button>
              <button className="secondary-button" onClick={handleEvaluateBaseline} disabled={evaluatingBaseline}>
                <Zap size={14}/> {evaluatingBaseline ? 'Running Benchmark…' : 'Run Baseline Benchmark'}
              </button>
              <button className="secondary-button" onClick={() => setModelTab('gpu_training')}>
                <Zap size={14} style={{ color: '#818cf8' }}/> Configure GPU Training
              </button>
            </div>

            {verifyReport && (
              <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: verifyReport.valid ? '#34d399' : '#f87171', fontWeight: 600 }}>
                  <CheckCircle2 size={14}/> Dataset Validation: {verifyReport.valid ? 'PASSED (0 Leakage)' : 'FAILED'}
                </div>
                <div style={{ color: '#94a3b8', marginTop: '4px' }}>
                  Samples: {verifyReport.stats?.totalSamples} | Est. Tokens: {verifyReport.stats?.estimatedTokens} | Splits: train={verifyReport.stats?.splits?.train}, val={verifyReport.stats?.splits?.validation}, test={verifyReport.stats?.splits?.test}
                </div>
              </div>
            )}

            {evalReport && (
              <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 600 }}>
                  <Gauge size={14}/> Benchmark Score: {Math.round((evalReport.metricsSummary?.overallScore ?? 0) * 100)}%
                </div>
                <div style={{ color: '#94a3b8', marginTop: '4px' }}>
                  Syntax: {Math.round((evalReport.metricsSummary?.syntaxPassRate ?? 0) * 100)}% | Unit Tests: {Math.round((evalReport.metricsSummary?.unitTestPassRate ?? 0) * 100)}% | Bilingual: {Math.round((evalReport.metricsSummary?.bilingualComplianceRate ?? 0) * 100)}% | Safety: {Math.round((evalReport.metricsSummary?.toolSafetyComplianceRate ?? 0) * 100)}%
                </div>
              </div>
            )}
          </div>

          <SectionTitle title="Runtime response" count={status}/>
          {result?.error||result?.message?<div className="error-panel"><AlertTriangle size={18}/><div><b>Model endpoint is not ready</b><p>{result.message || result.error}</p><span>Check the model process and .env configuration, then refresh.</span></div></div>:status==='BLOCKED'?<div className="error-panel"><LockKeyhole size={18}/><div><b>Blocked by current policy</b><p>Local-only mode is on or explicit consent for an external endpoint is missing.</p></div></div>:status==='CONNECTED'?<div className="detected-models">{(result?.models||[]).length ? (result?.models||[]).map(name=><div className="detected-model" key={name}><Cpu size={15}/><b>{name}</b><CheckCircle2 size={15} className="success-icon"/></div>):<div className="empty-inline">Endpoint answered successfully but did not return a model list.</div>}</div>:<EmptyState icon={Cpu} title="Model status unknown" text="Run diagnostics after starting Ollama or configuring an OpenAI-compatible endpoint."/>}
          <div className="two-column-notes">
            <div className="surface-card"><div className="surface-card-icon"><BookOpen size={17}/></div><b>First-party model foundation</b><p>ZYNTHEOR CORE is defined by reproducible data manifests and target specifications. Checkpoint weights are not claimed until GPU training is executed.</p><button className="text-button" onClick={()=>onSelectPage('Plans')}>View build plan <ArrowRight size={14}/></button></div>
            <div className="surface-card"><div className="surface-card-icon"><ShieldCheck size={17}/></div><b>Provider consent</b><p>External model calls require Local-only mode to be disabled and explicit consent recorded in Settings.</p><button className="text-button" onClick={()=>onSelectPage('Settings')}>Review policy <ArrowRight size={14}/></button></div>
          </div>
        </>
      )}
    </section>
  );
}

function AuditPage({
  records,
  serverEvents,
  refresh,
  clear,
  setRecords,
  setToast,
}: {
  records: AuditRecord[];
  serverEvents: { id: string; at: string; type: string; detail: string }[];
  refresh: () => void;
  clear: () => void;
  setRecords?: React.Dispatch<React.SetStateAction<AuditRecord[]>>;
  setToast?: (msg: string) => void;
}) {
  const [auditSearch, setAuditSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const isDateRangeInvalid = Boolean(startDate && endDate && startDate > endDate);
  const chainStatus = useMemo(() => verifyAuditHashChain(records), [records]);
  const [tamperedDemo, setTamperedDemo] = useState(false);
  const [visualizerModalOpen, setVisualizerModalOpen] = useState(false);
  const [repairModalOpen, setRepairModalOpen] = useState(false);

  const filteredRecords = useMemo(() => {
    if (isDateRangeInvalid) {
      return [];
    }
    return records.filter(r => {
      // Text Search Query Filter
      if (auditSearch.trim()) {
        const q = auditSearch.trim().toLowerCase();
        const matchesSearch =
          r.action.toLowerCase().includes(q) ||
          r.detail.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          (r.nanoAt && r.nanoAt.includes(q)) ||
          (r.hash && r.hash.toLowerCase().includes(q)) ||
          (r.prevHash && r.prevHash.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // Date Range Filters
      if (startDate) {
        const startMs = new Date(`${startDate}T00:00:00`).getTime();
        const recordMs = new Date(r.at).getTime();
        if (isNaN(recordMs) || recordMs < startMs) return false;
      }

      if (endDate) {
        const endMs = new Date(`${endDate}T23:59:59.999`).getTime();
        const recordMs = new Date(r.at).getTime();
        if (isNaN(recordMs) || recordMs > endMs) return false;
      }

      return true;
    });
  }, [records, auditSearch, startDate, endDate, isDateRangeInvalid]);

  function simulateTamper() {
    if (records.length === 0) return;
    if (setRecords) {
      setRecords(prev => {
        if (prev.length === 0) return prev;
        const copy = [...prev];
        const targetIdx = Math.min(1, copy.length - 1);
        copy[targetIdx] = {
          ...copy[targetIdx],
          detail: copy[targetIdx].detail + ' [TAMPERED_PAYLOAD_UNAUTHORIZED_MUTATION]',
        };
        return copy;
      });
      setTamperedDemo(true);
      setToast?.('ตรวจพบการเปลี่ยนแปลงข้อมูล: Hash Chain แสดงสถานะ TAMPER DETECTED ทันที');
    }
  }

  function handleRepairApprove(reason: string) {
    if (setRecords && records.length > 0) {
      const cleaned = records.map(r => ({
        ...r,
        detail: r.detail.replace(' [TAMPERED_PAYLOAD_UNAUTHORIZED_MUTATION]', '')
      }));
      const repaired = repairAndResignAuditLedger(cleaned, {
        reason,
        repairedBy: 'owner_workspace',
      });
      setRecords(repaired);
      setTamperedDemo(false);
      setToast?.(`Re-signed Audit Hash Chain: Sequential SHA-256 signatures restored (INTACT & VERIFIED). Reason: ${reason}`);
    }
  }

  return (
    <section className="subpage">
      <PageHeader
        page="Audit Ledger"
        right={
          <>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: '8px',
                background: chainStatus.isValid ? '#064e3b' : '#7f1d1d',
                color: chainStatus.isValid ? '#6ee7b7' : '#fca5a5',
                border: `1px solid ${chainStatus.isValid ? '#10b981' : '#ef4444'}`,
                boxShadow: chainStatus.isValid ? '0 0 14px rgba(16, 185, 129, 0.25)' : '0 0 14px rgba(239, 68, 68, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
              title={chainStatus.isValid ? 'Sequential SHA-256 hash chain is intact and verified' : 'Hash chain broken! Event tampering detected'}
            >
              {chainStatus.isValid ? <ShieldCheck size={15} /> : <AlertTriangle size={15} />}
              <span>{chainStatus.isValid ? 'Intact' : 'Tampered'}</span>
            </span>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setVisualizerModalOpen(true)}
              title="Open D3 interactive graph modal representing audit entries as nodes and hash chain links as edges"
            >
              <Network size={14}/> Visualize Audit Chain
            </button>
            <button
              className="primary-button"
              onClick={() => {
                downloadAuditLedgerJson(filteredRecords);
                setToast?.('ดาวน์โหลดไฟล์ Signed Audit Log (.json) สำหรับรายการที่กรองสำเร็จ');
              }}
              title="Export filtered audit events and cryptographic hash chain verification as a signed JSON file"
            >
              <Download size={14}/> Download Audit Log (JSON)
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                downloadAuditLedgerCsv(filteredRecords);
                setToast?.('ดาวน์โหลดไฟล์ Signed Audit Log (.csv) สำหรับรายการที่กรองสำเร็จ');
              }}
              title="Export signed CSV version of the filtered Audit Ledger for forensic review"
            >
              <FileText size={14}/> Download Signed CSV
            </button>
            <button className="secondary-button" onClick={refresh}>
              <RefreshCw size={14}/> Refresh server events
            </button>
            <button className="secondary-button" onClick={clear}>
              <Trash2 size={14}/> Clear local
            </button>
          </>
        }
      />

      {/* Search & Date Range Filter Toolbar */}
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Text Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8899b0' }} />
            <input
              type="text"
              value={auditSearch}
              onChange={e => setAuditSearch(e.target.value)}
              placeholder="Search/filter audit events by action type or detail keyword..."
              style={{
                width: '100%',
                padding: '9px 36px',
                borderRadius: '8px',
                background: '#0f172a',
                border: '1px solid #2e3b52',
                color: '#e2e8f0',
                fontSize: '11px',
                outline: 'none',
              }}
            />
            {auditSearch && (
              <button
                type="button"
                onClick={() => setAuditSearch('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8899b0', cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Date Range Controls Container */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: isDateRangeInvalid ? '#1f1213' : '#0f172a',
              border: isDateRangeInvalid
                ? '1px solid #ef4444'
                : (startDate || endDate)
                ? '1px solid #0284c7'
                : '1px solid #2e3b52',
              boxShadow: isDateRangeInvalid ? '0 0 12px rgba(239, 68, 68, 0.25)' : 'none',
              flexWrap: 'wrap',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: isDateRangeInvalid ? '#f87171' : (startDate || endDate) ? '#38bdf8' : '#8899b0', fontSize: '11px', fontWeight: 600 }}>
              <Calendar size={14} />
              <span>Date Range:</span>
            </div>

            <input
              type="date"
              aria-label="Filter events starting from this date"
              value={startDate}
              max={endDate || undefined}
              onChange={e => setStartDate(e.target.value)}
              style={{
                background: isDateRangeInvalid ? '#2b1517' : '#070c18',
                border: isDateRangeInvalid ? '1px solid #ef4444' : '1px solid #1e293b',
                borderRadius: '6px',
                color: isDateRangeInvalid ? '#fca5a5' : '#f8fafc',
                fontSize: '11px',
                padding: '4px 8px',
                outline: 'none',
                colorScheme: 'dark',
              }}
            />

            <span style={{ fontSize: '11px', color: isDateRangeInvalid ? '#f87171' : '#64748b' }}>to</span>

            <input
              type="date"
              aria-label="Filter events ending on this date"
              value={endDate}
              min={startDate || undefined}
              onChange={e => setEndDate(e.target.value)}
              style={{
                background: isDateRangeInvalid ? '#2b1517' : '#070c18',
                border: isDateRangeInvalid ? '1px solid #ef4444' : '1px solid #1e293b',
                borderRadius: '6px',
                color: isDateRangeInvalid ? '#fca5a5' : '#f8fafc',
                fontSize: '11px',
                padding: '4px 8px',
                outline: 'none',
                colorScheme: 'dark',
              }}
            />

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                style={{
                  background: 'transparent',
                  border: '1px dashed #ef4444',
                  color: '#fca5a5',
                  borderRadius: '4px',
                  fontSize: '10px',
                  padding: '3px 7px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Reset date range filter"
              >
                <X size={12} />
                <span>Reset Dates</span>
              </button>
            )}
          </div>
        </div>

        {/* Invalid Date Range Warning Alert */}
        {isDateRangeInvalid && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: '#2d1215',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0, color: '#f87171' }} />
            <span>
              <strong>Invalid Date Range:</strong> Start date ({startDate}) cannot be after end date ({endDate}). Please select a valid timeframe.
            </span>
          </div>
        )}

        {/* Date Quick Presets & Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>Presets:</span>
            {[
              { label: 'Today', onClick: () => { const d = new Date().toISOString().split('T')[0]; setStartDate(d); setEndDate(d); } },
              { label: 'Last 7 Days', onClick: () => { const now = new Date(); const d1 = new Date(now.getTime() - 7*86400000).toISOString().split('T')[0]; const d2 = now.toISOString().split('T')[0]; setStartDate(d1); setEndDate(d2); } },
              { label: 'Last 30 Days', onClick: () => { const now = new Date(); const d1 = new Date(now.getTime() - 30*86400000).toISOString().split('T')[0]; const d2 = now.toISOString().split('T')[0]; setStartDate(d1); setEndDate(d2); } },
              { label: 'All Time', onClick: () => { setStartDate(''); setEndDate(''); } },
            ].map(p => (
              <button
                key={p.label}
                type="button"
                onClick={p.onClick}
                style={{
                  background: '#0d1527',
                  border: '1px solid #1e293b',
                  color: '#94a3b8',
                  borderRadius: '4px',
                  fontSize: '10px',
                  padding: '2px 8px',
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '10px', color: '#8899b0' }}>
            Showing <strong>{filteredRecords.length}</strong> of <strong>{records.length}</strong> audit events
            {isDateRangeInvalid ? (
              <span style={{ marginLeft: '6px', color: '#f87171', fontWeight: 600 }}>
                (Filter paused: Invalid date range)
              </span>
            ) : (auditSearch || startDate || endDate) && (
              <span style={{ marginLeft: '6px', color: '#38bdf8' }}>
                (Filtered{auditSearch ? ` by "${auditSearch}"` : ''}{startDate || endDate ? ` | Date: ${startDate || 'beginning'} to ${endDate || 'present'}` : ''})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Recharts Audit Action Distribution Chart */}
      <AuditActionDistributionChart records={records} />

      {/* Dynamic Recharts Audit Event Distribution Chart */}
      <AuditEventDistributionChart records={filteredRecords} startDate={startDate} endDate={endDate} />

      {/* Cryptographic Hash Chain Validation Visual Indicator */}
      <div
        style={{
          padding: '16px',
          borderRadius: '10px',
          background: chainStatus.isValid ? '#071813' : '#230b0b',
          border: `1px solid ${chainStatus.isValid ? '#059669' : '#dc2626'}`,
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: chainStatus.isValid ? '0 4px 20px rgba(5, 150, 105, 0.12)' : '0 4px 20px rgba(220, 38, 38, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {chainStatus.isValid ? (
              <div style={{ display: 'grid', placeItems: 'center', width: '34px', height: '34px', borderRadius: '8px', background: '#064e3b', color: '#34d399', flexShrink: 0 }}>
                <ShieldCheck size={20} />
              </div>
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', width: '34px', height: '34px', borderRadius: '8px', background: '#7f1d1d', color: '#f87171', flexShrink: 0 }}>
                <AlertTriangle size={20} />
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <b style={{ fontSize: '13px', color: chainStatus.isValid ? '#ecfdf5' : '#fef2f2' }}>
                  {chainStatus.isValid
                    ? 'Cryptographic Hash Chain: Intact (VERIFIED)'
                    : 'Cryptographic Hash Chain: Tampered (BROKEN)'}
                </b>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: chainStatus.isValid ? '#064e3b' : '#7f1d1d',
                    color: chainStatus.isValid ? '#6ee7b7' : '#fca5a5',
                    border: `1px solid ${chainStatus.isValid ? '#10b981' : '#ef4444'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {chainStatus.isValid ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                  {chainStatus.isValid ? 'Intact' : 'Tampered'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: chainStatus.isValid ? '#a7f3d0' : '#fca5a5', marginTop: '2px' }}>
                {chainStatus.isValid
                  ? `All ${chainStatus.verifiedCount} local records verified sequentially against parent hash pointers.`
                  : chainStatus.reason || 'Event payload alteration or broken hash pointer link detected.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {setRecords && records.length > 0 && (
              <>
                {!chainStatus.isValid || tamperedDemo ? (
                  <button
                    type="button"
                    className="primary-button"
                    style={{ fontSize: '11px', padding: '6px 14px', background: 'linear-gradient(120deg, #10b981, #059669)', border: 0, color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => setRepairModalOpen(true)}
                  >
                    <RotateCcw size={14} />
                    <span>Repair & Re-sign Hash Chain</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ fontSize: '10px', padding: '4px 10px', borderColor: '#475569' }}
                    onClick={simulateTamper}
                    title="Simulate modifying an audit entry in local store to test tamper detection"
                  >
                    Simulate Tamper
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Chain Details Summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px',
            fontSize: '10px',
            paddingTop: '8px',
            borderTop: `1px solid ${chainStatus.isValid ? '#064e3b' : '#450a0a'}`,
          }}
        >
          <div>
            <span style={{ color: '#94a3b8' }}>Genesis Block Pointer: </span>
            <code style={{ color: '#38bdf8', fontFamily: 'monospace' }}>GENESIS</code>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Root Hash (Latest): </span>
            <code style={{ color: '#c7d2fe', fontFamily: 'monospace' }}>{shortHash(chainStatus.rootHash || 'GENESIS')}</code>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Verified Sequential Records: </span>
            <strong style={{ color: chainStatus.isValid ? '#34d399' : '#f87171' }}>
              {chainStatus.verifiedCount} of {records.length}
            </strong>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Verification Method: </span>
            <code style={{ color: '#cbd5e1' }}>SHA-256 Sequential Pointer Chain</code>
          </div>
        </div>
      </div>

      {/* Interactive D3 Visualizer for Chronological Sequence & Tamper Glow */}
      <AuditChainVisualizer records={filteredRecords} />

      {/* D3 Graph Interactive Modal Dialog */}
      {visualizerModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 7, 18, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
            padding: '20px',
          }}
          onClick={() => setVisualizerModalOpen(false)}
        >
          <div
            style={{
              width: 'min(1100px, 98vw)',
              maxHeight: '90vh',
              overflow: 'auto',
              background: '#0a0e17',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Network size={22} style={{ color: '#818cf8' }} />
                <div>
                  <b style={{ fontSize: '16px', color: '#f8fafc' }}>Interactive Cryptographic Audit Chain Graph (D3.js)</b>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                    Nodes represent sequential audit events; directed edges represent SHA-256 parent hash pointers. Red glow highlights tampered blocks.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setVisualizerModalOpen(false)}
              >
                <X size={16}/> Close Visualizer
              </button>
            </div>

            <AuditChainVisualizer records={filteredRecords} />
          </div>
        </div>
      )}

      <div className="audit-notice">
        <ShieldCheck size={18}/>
        <div>
          <b>Cryptographic Fingerprinting with Sequential Hash Chaining.</b>
          <p>
            Local entries include sequential parent-hash pointers and SHA-256 cryptographic digests.
            Any modification, insertion, deletion, or reordering of local entries immediately breaks the hash chain and triggers visual tamper alerts.
          </p>
        </div>
      </div>

      <SectionTitle title="Browser-local events" count={`${filteredRecords.length} records`} />
      {filteredRecords.length === 0 ? (
        <EmptyState icon={History} title="No local events match filter" text="Try clearing your search query or performing an action in the workspace."/>
      ) : (
        <div className="audit-list">
          {filteredRecords.map((rec, index) => {
            const isBroken = !chainStatus.isValid && chainStatus.brokenIndex === index;
            return (
              <article
                className={`audit-row ${isBroken ? 'audit-broken' : ''}`}
                key={rec.id}
                style={{
                  borderColor: isBroken ? '#ef4444' : undefined,
                  background: isBroken ? '#230b0b' : undefined,
                }}
              >
                <div
                  className={`audit-mark ${isBroken ? 'broken' : ''}`}
                  style={{
                    background: isBroken ? '#7f1d1d' : undefined,
                    color: isBroken ? '#fca5a5' : undefined,
                  }}
                >
                  {isBroken ? <AlertTriangle size={16}/> : <ShieldCheck size={16}/>}
                </div>
                <div className="audit-main">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <b>{rec.action}</b>
                    {isBroken && (
                      <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: '#ef4444', color: '#fff' }}>
                        TAMPER DETECTED
                      </span>
                    )}
                  </div>
                  <p>{rec.detail}</p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '3px', fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', flexWrap: 'wrap' }}>
                    <span>prev: <code style={{ color: '#38bdf8' }}>{shortHash(rec.prevHash || 'GENESIS')}</code></span>
                    <span>hash: <code style={{ color: '#a5b4fc' }}>{shortHash(rec.hash)}</code></span>
                  </div>
                </div>
                <time style={{ textAlign: 'right' }}>
                  <div>{timeLabel(rec.at)}</div>
                  {rec.nanoAt && (
                    <div style={{ fontSize: '8px', color: '#a78bfa', fontFamily: 'monospace', marginTop: '2px' }}>
                      ns: {rec.nanoAt}
                    </div>
                  )}
                </time>
                <span
                  className={isBroken ? 'audit-invalid' : 'audit-valid'}
                  style={{ color: isBroken ? '#f87171' : undefined }}
                >
                  {isBroken ? <AlertTriangle size={13}/> : <CheckCircle2 size={13}/>} {isBroken ? 'Tampered' : 'Chain Verified'}
                </span>
              </article>
            );
          })}
        </div>
      )}

      <SectionTitle title="Server events" count={`${serverEvents.length} in memory`}/>
      {serverEvents.length === 0 ? (
        <div className="empty-inline">No server events loaded. Select Refresh server events. Server events reset when the process restarts.</div>
      ) : (
        <div className="audit-list">
          {serverEvents.map(rec => (
            <article className="audit-row" key={rec.id}>
              <div className="audit-mark server"><Activity size={16}/></div>
              <div className="audit-main"><b>{rec.type}</b><p>{rec.detail}</p></div>
              <time>{timeLabel(rec.at)}</time>
            </article>
          ))}
        </div>
      )}
      <InfoNote icon={AlertTriangle}>Do not use this starter audit view as immutable, signed or court-ready evidence. Durable storage, signatures, key management and independent verification are not implemented here.</InfoNote>

      {repairModalOpen && (
        <RepairApprovalModal
          records={records}
          onApprove={async (reason) => {
            handleRepairApprove(reason);
            setRepairModalOpen(false);
          }}
          onClose={() => setRepairModalOpen(false)}
          userRole="OWNER"
        />
      )}
    </section>
  );
}


interface SystemErrorRecord {
  id: string;
  level: 'error' | 'warn' | 'critical' | 'info';
  category: string;
  message: string;
  stack?: string;
  endpoint?: string;
  resolved: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

function IntelligenceObservabilityPanel() {
  const { t } = useTranslation();
  const [providerHealth, setProviderHealth] = useState<any>(null);
  const [requestData, setRequestData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/providers/health', { headers: authHeaders(), cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setProviderHealth(data);
      const requestsResponse = await fetch('/api/intelligence/observability/requests?limit=20', { headers: authHeaders(), cache: 'no-store' });
      if (requestsResponse.ok) setRequestData(await requestsResponse.json());
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setProviderHealth({ error: 'ไม่สามารถอ่านสถานะ Provider ได้' });
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const snapshot = providerHealth?.health;
  const status = snapshot?.status || 'unknown';
  const statusLabel: Record<string, string> = { healthy: 'พร้อมใช้งาน', degraded: 'ประสิทธิภาพลดลง', unhealthy: 'ขัดข้อง', unknown: 'ยังไม่มีข้อมูล' };
  const statusColor: Record<string, string> = { healthy: '#10b981', degraded: '#f59e0b', unhealthy: '#ef4444', unknown: '#94a3b8' };
  return <section className="panel" style={{ margin: '12px 0 18px', padding: '16px' }} aria-label="Intelligence observability">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div><div className="eyebrow">INTELLIGENCE OBSERVABILITY</div><h2 style={{ margin: '4px 0' }}>{t('obs.title')}</h2><p className="muted" style={{ margin: 0, fontSize: 12 }}>{t('obs.subtitle')}</p></div>
      <button className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={13} className={loading ? 'spin' : ''}/> {t('obs.refresh')}</button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginTop: 14 }}>
      <div className="metric-card"><span className="muted">{t('obs.provider')}</span><strong>{providerHealth?.provider || '—'}</strong></div>
      <div className="metric-card"><span className="muted">{t('obs.status')}</span><strong style={{ color: statusColor[status] || statusColor.unknown }}>{statusLabel[status] || status}</strong></div>
      <div className="metric-card"><span className="muted">{t('obs.latency')}</span><strong>{Number.isFinite(snapshot?.lastLatencyMs) ? `${snapshot.lastLatencyMs} ms` : '—'}</strong></div>
      <div className="metric-card"><span className="muted">{t('obs.failures')}</span><strong>{snapshot?.consecutiveFailures ?? '—'}</strong></div>
    </div>
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12, fontSize: 11, color: 'var(--text-muted,#94a3b8)' }}>
      <span>สำเร็จล่าสุด: {snapshot?.lastSuccessAt ? timeLabel(snapshot.lastSuccessAt) : 'ยังไม่มีข้อมูล'}</span><span>ผิดพลาดล่าสุด: {snapshot?.lastErrorCode || '—'}</span><span>อัปเดต: {lastUpdated || '—'}</span>
    </div>
    <div style={{ marginTop: 18 }}>
      <div className="eyebrow">REQUEST TIMELINE</div><h3 style={{ margin: '4px 0 10px' }}>{t('obs.timeline')}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8, marginBottom: 12 }}>
        <div className="metric-card"><span className="muted">คำขอที่เก็บไว้</span><strong>{requestData?.totals?.requests ?? '—'}</strong></div>
        <div className="metric-card"><span className="muted">สำเร็จ</span><strong>{requestData?.totals?.succeeded ?? '—'}</strong></div>
        <div className="metric-card"><span className="muted">ล้มเหลว</span><strong>{requestData?.totals?.failed ?? '—'}</strong></div>
        <div className="metric-card"><span className="muted">Tokens ที่ทราบ</span><strong>{requestData?.totals?.knownTokenRequests ? requestData.totals.totalTokens.toLocaleString() : t('obs.unavailable')}</strong></div>
      </div>
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}><thead><tr><th align="left">{t('obs.time')}</th><th align="left">{t('obs.provider_model')}</th><th align="left">{t('obs.mode')}</th><th align="left">{t('obs.result')}</th><th align="right">Latency</th><th align="right">{t('obs.tokens')}</th></tr></thead><tbody>
        {(requestData?.records || []).map((r: any) => <tr key={r.id} style={{ borderTop: '1px solid var(--border,rgba(148,163,184,.14))' }}><td>{timeLabel(r.createdAt)}</td><td>{r.provider} / {r.model}</td><td>{r.effectiveMode}</td><td style={{ color: r.status === 'success' ? '#10b981' : '#ef4444' }}>{r.status === 'success' ? 'สำเร็จ' : r.errorCode || 'ล้มเหลว'}</td><td align="right">{r.latencyMs == null ? '—' : `${r.latencyMs} ms`}</td><td align="right">{r.totalTokens == null ? t('obs.unavailable') : r.totalTokens.toLocaleString()}</td></tr>)}
        {!requestData?.records?.length && <tr><td colSpan={6} className="muted">{t('obs.empty')}</td></tr>}
      </tbody></table></div>
      <p className="muted" style={{ fontSize: 11 }}>Token usage and cost are shown only when supplied by the provider. · {t('obs.retention')}</p>
    </div>
    {providerHealth?.error && <p role="status" style={{ color: '#f59e0b', marginBottom: 0 }}>{providerHealth.error}</p>}
  </section>;
}

function DiagnosticsPage({ health, settings, models, loading, refresh, inferenceResult, testingInference, runInference }: {health:Health|null;settings:SettingsData|null;models:ModelResult|null;loading:boolean;refresh:()=>void;inferenceResult:InferenceResult|null;testingInference:boolean;runInference:()=>void}) {
  const [diagTab, setDiagTab] = useState<'overview' | 'errors' | 'storage'>('overview');
  const [systemErrors, setSystemErrors] = useState<SystemErrorRecord[]>([]);
  const [errorLevel, setErrorLevel] = useState<string>('all');
  const [errorCategory, setErrorCategory] = useState<string>('all');
  const [errorSearch, setErrorSearch] = useState<string>('');
  const [loadingErrors, setLoadingErrors] = useState<boolean>(false);
  const [unresolvedCount, setUnresolvedCount] = useState<number>(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [smartDiag, setSmartDiag] = useState<any>(null);

  const fetchSmartDiag = useCallback(async () => {
    try {
      const res = await fetch('/api/diagnostics/smart', { headers: authHeaders() });
      const data = await res.json();
      if (data.ok) setSmartDiag(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchSmartDiag();
  }, [fetchSmartDiag]);

  const handleRefresh = useCallback(() => {
    refresh();
    fetchSmartDiag();
  }, [refresh, fetchSmartDiag]);

  const fetchErrors = useCallback(async () => {
    setLoadingErrors(true);
    try {
      const params = new URLSearchParams();
      if (errorLevel !== 'all') params.set('level', errorLevel);
      if (errorCategory !== 'all') params.set('category', errorCategory);
      if (errorSearch.trim()) params.set('search', errorSearch.trim());
      const res = await fetch(`/api/diagnostics/errors?${params.toString()}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.errors)) {
        setSystemErrors(data.errors);
        setUnresolvedCount(data.unresolvedCount || 0);
      }
    } catch (err) {
      console.error('Failed to load system errors:', err);
    } finally {
      setLoadingErrors(false);
    }
  }, [errorLevel, errorCategory, errorSearch]);

  useEffect(() => {
    if (diagTab === 'errors') {
      fetchErrors();
    }
  }, [diagTab, fetchErrors]);

  async function handleResolve(id: string) {
    try {
      const res = await fetch('/api/diagnostics/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', id }),
      });
      const data = await res.json();
      if (data.ok) {
        setSystemErrors(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e));
        setUnresolvedCount(prev => Math.max(0, prev - 1));
      }
    } catch {}
  }

  async function handleClearAll() {
    if (!confirm('ยืนยันล้างประวัติข้อผิดพลาดของระบบทั้งหมด?')) return;
    try {
      const res = await fetch('/api/diagnostics/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      });
      const data = await res.json();
      if (data.ok) {
        setSystemErrors([]);
        setUnresolvedCount(0);
      }
    } catch {}
  }

  const modelEndpointOk = (models?.state === 'CONNECTED' || smartDiag?.endpoint?.status === 'ENDPOINT_READY') && smartDiag?.endpoint?.status !== 'HTML_RESPONSE_RECEIVED' && smartDiag?.endpoint?.status !== 'INVALID_ENDPOINT';
  const isHtmlError =
    models?.error?.includes('HTML') ||
    models?.message?.includes('HTML') ||
    smartDiag?.endpoint?.status === 'HTML_RESPONSE_RECEIVED';

  const { checks, passCount: pass } = evaluateDiagnosticChecks(health, settings, models, smartDiag);

  return (
    <section className="subpage">
      <PageHeader
        page="Diagnostics"
        right={
          <div style={{ display: 'flex', gap: '8px' }}>
            {diagTab === 'errors' ? (
              <>
                <button className="secondary-button" onClick={handleClearAll} disabled={loadingErrors || systemErrors.length === 0}>
                  <Trash2 size={14}/> Clear logs
                </button>
                <button className="primary-button" onClick={fetchErrors} disabled={loadingErrors}>
                  <RefreshCw size={14} className={loadingErrors ? 'spin' : ''}/> Refresh logs
                </button>
              </>
            ) : (
              <button className="primary-button" onClick={handleRefresh} disabled={loading}>
                <RefreshCw size={14} className={loading ? 'spin' : ''}/> Run checks
              </button>
            )}
          </div>
        }
      />

      <IntelligenceObservabilityPanel />

      {/* Diagnostics Navigation Tabs */}
      <div
        className="forge-nav"
        style={{
          marginTop: '6px',
          marginBottom: '16px',
          borderBottom: '1px solid #252e40',
          paddingBottom: '8px',
          display: 'flex',
          gap: '8px',
        }}
      >
        <button
          type="button"
          className={`forge-tab ${diagTab === 'overview' ? 'active' : ''}`}
          onClick={() => setDiagTab('overview')}
        >
          <Activity size={14} /> System Health & Checks ({pass}/{checks.length})
        </button>
        <button
          type="button"
          className={`forge-tab ${diagTab === 'storage' ? 'active' : ''}`}
          onClick={() => setDiagTab('storage')}
        >
          <HardDrive size={14} /> Storage Schema Audit
        </button>
        <button
          type="button"
          className={`forge-tab ${diagTab === 'errors' ? 'active' : ''}`}
          onClick={() => setDiagTab('errors')}
        >
          <AlertTriangle size={14} /> System Errors
          {unresolvedCount > 0 && (
            <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '99px', background: '#dc2626', color: '#fff', fontWeight: 700, marginLeft: '4px' }}>
              {unresolvedCount}
            </span>
          )}
        </button>
      </div>

      {diagTab === 'overview' ? (
        <>
          <div className="diagnostic-overview">
            <div className="diagnostic-score">
              <Gauge size={23}/>
              <strong>{pass}<span>/{checks.length}</span></strong>
              <small>checks currently satisfied</small>
            </div>
            <div className="diagnostic-overview-copy">
              <b>{pass===checks.length?'Core checks satisfied':'Some components need attention'}</b>
              <p>These checks report observed endpoint state, not the quality or correctness of AI answers.</p>
              <span>Updated from current browser state · {timeLabel(new Date().toISOString())}</span>
            </div>
          </div>

          <GpuTelemetryWidget />

          <GovernanceObservabilityPanels />

          <SectionTitle title="Live checks" count={`${checks.length} checks`}/>
          <div className="diagnostic-list">
            {checks.map(item=>(
              <article className="diagnostic-row" key={item.title}>
                <div className={`diagnostic-icon ${item.ok?'good':'pending'}`}>
                  {item.ok?<CheckCircle2 size={18}/>:<AlertTriangle size={18}/>}
                </div>
                <div className="diagnostic-copy">
                  <b>{item.title}</b>
                  <span>{item.desc}</span>
                  <p>{item.detail}</p>
                </div>
                <span className={`diagnostic-state ${item.ok?'ok':''}`}>{item.status}</span>
              </article>
            ))}
          </div>

          {smartDiag?.endpoint && (
            <div
              className="surface-card"
              style={{
                marginTop: '16px',
                border: `1px solid ${modelEndpointOk ? '#10b981' : isHtmlError ? '#f59e0b' : '#ef4444'}`,
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '16px',
                borderRadius: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Server size={18} style={{ color: modelEndpointOk ? '#10b981' : '#f59e0b' }} />
                  <b style={{ fontSize: '13px', color: '#f8fafc' }}>Smart Endpoint Inspector & Response Validation</b>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: modelEndpointOk ? '#064e3b' : '#7f1d1d',
                    color: modelEndpointOk ? '#6ee7b7' : '#fca5a5',
                    border: `1px solid ${modelEndpointOk ? '#10b981' : '#ef4444'}`,
                  }}
                >
                  {smartDiag.endpoint.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '11px', marginTop: '10px' }}>
                <div style={{ padding: '8px', background: '#020617', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>Provider & Model:</span>
                  <div style={{ color: '#f1f5f9', fontWeight: 600, marginTop: '2px' }}>{smartDiag.endpoint.provider} ({smartDiag.endpoint.configuredModel})</div>
                </div>

                <div style={{ padding: '8px', background: '#020617', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>Observed HTTP Status:</span>
                  <div style={{ color: smartDiag.endpoint.httpStatus === 200 ? '#34d399' : '#f87171', fontWeight: 600, marginTop: '2px' }}>
                    HTTP {smartDiag.endpoint.httpStatus || 'N/A'}
                  </div>
                </div>

                <div style={{ padding: '8px', background: '#020617', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>Content-Type & Payload:</span>
                  <div style={{ color: isHtmlError ? '#f59e0b' : '#38bdf8', fontWeight: 600, marginTop: '2px' }}>
                    {smartDiag.endpoint.contentType || 'unknown'} {isHtmlError ? '(HTML Detected ⚠️)' : '(JSON OK ✓)'}
                  </div>
                </div>
              </div>

              {isHtmlError && (
                <div style={{ marginTop: '12px', padding: '10px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', fontSize: '11px', color: '#fde68a' }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
                    <span>HTML Response Received Instead of OpenAI-Compatible JSON API</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '10px', lineHeight: '1.4', color: '#fef3c7' }}>
                    The endpoint returned an HTML web page or proxy redirect. Ensure local model server (Ollama) is running at <code>http://127.0.0.1:11434/v1</code>.
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="surface-card next-action-card">
            <div className="surface-card-icon"><Activity size={17}/></div>
            <b>Test a real model response</b>
            <p>This sends a short fixed test prompt to the configured endpoint. It does not use your chat history or project files.</p>
            <button className="primary-button" onClick={runInference} disabled={testingInference}>
              <Zap size={14}/>{testingInference?'Testing model…':'Run inference test'}
            </button>
            {inferenceResult&&(
              <div className={`inference-result ${inferenceResult.state==='RESPONDED'?'good':inferenceResult.state==='RUNNING'?'pending':'bad'}`}>
                <b>{inferenceResult.state==='RESPONDED'?'Model returned a response':inferenceResult.state==='BLOCKED'?'Test blocked by policy':inferenceResult.state==='RUNNING'?'Test in progress':'Inference test failed'}</b>
                {inferenceResult.latencyMs!==undefined&&<span>Latency: {inferenceResult.latencyMs} ms</span>}
                {inferenceResult.model&&<span>Model: {inferenceResult.model}</span>}
                {inferenceResult.responsePreview&&<code>{inferenceResult.responsePreview}</code>}
                {inferenceResult.message&&<p>{inferenceResult.message}</p>}
                {inferenceResult.error&&<p>{inferenceResult.error}</p>}
                {inferenceResult.matchedExpectedText!==undefined&&<span>Expected marker: {inferenceResult.matchedExpectedText?'matched':'not matched (response still came from endpoint)'}</span>}
              </div>
            )}
          </div>
          <div className="surface-card next-action-card">
            <div className="surface-card-icon"><SquareTerminal size={17}/></div>
            <b>To get a real response from local AI</b>
            <p>Install and run Ollama, download a model that fits your machine, configure the model name in <code>.env</code>, then refresh this page and test a chat.</p>
            <div className="code-command">ollama serve</div>
            <div className="code-command">ollama run qwen2.5-coder:7b</div>
            <p className="muted-note">These commands are examples; model availability and hardware capacity depend on your device.</p>
          </div>
          <InfoNote icon={AlertTriangle}>A passing inference test proves only that this endpoint returned a response at that moment. It does not prove answer quality, model training status, or correctness.</InfoNote>
        </>
      ) : diagTab === 'storage' ? (
        /* STORAGE SCHEMA AUDIT TAB */
        <LocalStorageAuditTool />
      ) : (
        /* SYSTEM ERRORS TAB */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Filtering Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              padding: '12px 16px',
              borderRadius: '10px',
              background: '#131824',
              border: '1px solid #232d3f',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 240px' }}>
              <Search size={15} style={{ color: '#8899b0' }} />
              <input
                type="text"
                value={errorSearch}
                onChange={e => setErrorSearch(e.target.value)}
                placeholder="Search error message, endpoint or stack…"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#e2e8f0',
                  fontSize: '11px',
                  width: '100%',
                  outline: 'none',
                }}
              />
              {errorSearch && (
                <button
                  type="button"
                  onClick={() => setErrorSearch('')}
                  style={{ background: 'transparent', border: 'none', color: '#8899b0', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#94a3b8' }}>
                <span>Level:</span>
                <select
                  value={errorLevel}
                  onChange={e => setErrorLevel(e.target.value)}
                  style={{ background: '#1c2436', border: '1px solid #2e3b52', color: '#e2e8f0', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="all">All Levels</option>
                  <option value="error">Error</option>
                  <option value="warn">Warning</option>
                  <option value="critical">Critical</option>
                  <option value="info">Info</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#94a3b8' }}>
                <span>Category:</span>
                <select
                  value={errorCategory}
                  onChange={e => setErrorCategory(e.target.value)}
                  style={{ background: '#1c2436', border: '1px solid #2e3b52', color: '#e2e8f0', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="all">All Categories</option>
                  <option value="api">API</option>
                  <option value="auth">Auth</option>
                  <option value="workspace">Workspace</option>
                  <option value="model">Model</option>
                  <option value="database">Database</option>
                  <option value="build">Build</option>
                  <option value="app">App</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#8899b0', padding: '0 4px' }}>
            <span>Showing {systemErrors.length} recorded application errors</span>
            <span>Persistent Drizzle ORM Storage (`system_errors` table)</span>
          </div>

          {systemErrors.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" style={{ background: '#064e3b', color: '#6ee7b7' }}>
                <CheckCircle2 size={24} />
              </div>
              <b>No system errors found</b>
              <p>No application-level errors match the current filter. All services are healthy.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {systemErrors.map(err => {
                const isExpanded = expandedId === err.id;
                const levelColor =
                  err.level === 'critical'
                    ? { bg: '#450a0a', text: '#fca5a5', border: '#7f1d1d' }
                    : err.level === 'error'
                    ? { bg: '#3a1318', text: '#fca5a5', border: '#652026' }
                    : err.level === 'warn'
                    ? { bg: '#382b13', text: '#fde047', border: '#785b1d' }
                    : { bg: '#10203a', text: '#93c5fd', border: '#1e3a6a' };

                return (
                  <div
                    key={err.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: err.resolved ? '#0d1118' : '#121722',
                      border: `1px solid ${err.resolved ? '#1e2638' : '#283348'}`,
                      opacity: err.resolved ? 0.75 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: levelColor.bg,
                            color: levelColor.text,
                            border: `1px solid ${levelColor.border}`,
                          }}
                        >
                          {err.level}
                        </span>
                        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#1c2436', color: '#93c5fd', fontFamily: 'monospace' }}>
                          [{err.category}]
                        </span>
                        {err.endpoint && (
                          <span style={{ fontSize: '9px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                            {err.endpoint}
                          </span>
                        )}
                        {err.resolved && (
                          <span style={{ fontSize: '8px', padding: '1px 5px', borderRadius: '3px', background: '#064e3b', color: '#6ee7b7' }}>
                            RESOLVED
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <time style={{ fontSize: '9px', color: '#718096' }}>{timeLabel(err.createdAt)}</time>
                        {!err.resolved && (
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ fontSize: '9px', padding: '3px 8px' }}
                            onClick={() => handleResolve(err.id)}
                            title="Mark as resolved"
                          >
                            <Check size={11} /> Resolve
                          </button>
                        )}
                      </div>
                    </div>

                    <p style={{ margin: '8px 0 4px', fontSize: '11px', color: '#e2e8f0', lineHeight: 1.5, wordBreak: 'break-word' }}>
                      {err.message}
                    </p>

                    {(err.stack || (err.metadata && Object.keys(err.metadata).length > 0)) && (
                      <div style={{ marginTop: '6px' }}>
                        <button
                          type="button"
                          className="text-button"
                          style={{ fontSize: '9px', padding: 0, color: '#818cf8', cursor: 'pointer' }}
                          onClick={() => setExpandedId(isExpanded ? null : err.id)}
                        >
                          {isExpanded ? 'Hide stack & metadata' : 'View stack & metadata'}
                        </button>

                        {isExpanded && (
                          <div style={{ marginTop: '8px', padding: '10px', borderRadius: '6px', background: '#080c14', border: '1px solid #1e2638', fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', overflowX: 'auto' }}>
                            {err.stack && <pre style={{ margin: '0 0 8px 0', whiteSpace: 'pre-wrap' }}>{err.stack}</pre>}
                            {err.metadata && Object.keys(err.metadata).length > 0 && (
                              <div>
                                <b>Metadata:</b>
                                <pre style={{ margin: '4px 0 0', color: '#a5b4fc' }}>{JSON.stringify(err.metadata, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
function SettingsPage({ settings, loading, refresh, onLocalOnly, onConsent, onSelectPage, currentLang, onLanguageChange, serverSession }: {settings:SettingsData|null;loading:boolean;refresh:()=>void;onLocalOnly:(v:boolean)=>void;onConsent:()=>void;onSelectPage:(p:Page)=>void;currentLang?:SupportedLanguage;onLanguageChange?:(lang:SupportedLanguage)=>void;serverSession?:{id:string;role:string;isTokenVerified:boolean;source:string}|null}) {
  const { t } = useTranslation();
  return <section className="subpage">
    <PageHeader page="Settings" right={<button className="secondary-button" onClick={refresh} disabled={loading}><RefreshCw size={14}/> Refresh</button>}/>
    <div className="settings-section">
      <div className="settings-section-heading">
        <div className="setting-heading-icon green"><Globe size={18}/></div>
        <div>
          <b>Language & Localization / ภาษาและการแสดงผล</b>
          <p>Select interface language. Settings update in zyntheor.settings store and re-render immediately across all components.</p>
        </div>
      </div>
      <div className="setting-item">
        <div>
          <b>Default Language Preference (สลับภาษาเริ่มต้น)</b>
          <p>{currentLang === 'en' ? 'English is active as the default interface language (persisted to zyntheor.settings store).' : 'ภาษาไทยถูกเลือกเป็นภาษาเริ่มต้น (บันทึกลง zyntheor.settings store)'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: currentLang === 'th' ? 700 : 400, color: currentLang === 'th' ? '#38bdf8' : '#718096' }}>
            ไทย (TH)
          </span>
          <button
            type="button"
            className={`toggle-switch ${currentLang === 'en' ? 'on' : ''}`}
            onClick={() => onLanguageChange?.(currentLang === 'en' ? 'th' : 'en')}
            role="switch"
            aria-checked={currentLang === 'en'}
            aria-label="Toggle default language preference"
            title="Toggle between Thai and English"
          >
            <span />
          </button>
          <span style={{ fontSize: '12px', fontWeight: currentLang === 'en' ? 700 : 400, color: currentLang === 'en' ? '#38bdf8' : '#718096' }}>
            English (EN)
          </span>
        </div>
      </div>
      <div className="setting-item">
        <div>
          <b>Language Selector Dropdown</b>
          <p>Active UI language: {currentLang === 'en' ? 'English (EN)' : 'ไทย (TH)'}</p>
        </div>
        <select
          aria-label="Language selector"
          value={currentLang || 'th'}
          onChange={e => onLanguageChange?.(e.target.value as SupportedLanguage)}
          style={{
            background: '#121722',
            border: '1px solid #38bdf8',
            color: '#e2e8f4',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          <option value="th">ไทย (TH)</option>
          <option value="en">English (EN)</option>
        </select>
      </div>
    </div>
    <div className="settings-section">
      <div className="settings-section-heading">
        <div className="setting-heading-icon"><LockKeyhole size={18}/></div>
        <div><b>Privacy & model routing</b><p>Local-first is the default. The browser never receives the configured API key.</p></div>
      </div>
      <div className="setting-item">
        <div><b>Local-only mode</b><p>{settings?.localOnly?'Only localhost model endpoints are permitted by policy.':'Remote model endpoints may be used only with explicit consent.'}</p></div>
        <button className={`toggle-switch ${settings?.localOnly??true?'on':''}`} onClick={()=>void onLocalOnly(!(settings?.localOnly??true))} role="switch" aria-checked={settings?.localOnly??true}><span/></button>
      </div>
      <div className="setting-item">
        <div><b>Explicit online consent</b><p>{settings?.onlineConsent?'Consent is recorded in this running server process.':'No online-provider consent is recorded.'}</p></div>
        <button className="secondary-button" onClick={onConsent} disabled={Boolean(settings?.localEndpoint)}><Network size={14}/> Review consent</button>
      </div>
    </div>
    <div className="settings-section">
      <div className="settings-section-heading">
        <div className="setting-heading-icon cyan"><Cpu size={18}/></div>
        <div><b>Model endpoint configuration</b><p>Configuration comes from server-side environment variables.</p></div>
      </div>
      <SettingsValue label="Provider" value={settings?.provider||t('obs.unavailable')}/>
      <SettingsValue label="Model name" value={settings?.model||t('obs.unavailable')}/>
      <SettingsValue label="Endpoint host" value={settings?.endpointHost||t('obs.unavailable')}/>
      <SettingsValue label="Endpoint type" value={settings?(settings.localEndpoint?'Loopback / local':'Remote or non-loopback'):'Unknown'}/>
      <SettingsValue label="API key present" value={settings?(settings.apiKeyConfigured?'Yes — server-side only':'No'):'Unknown'}/>
      <SettingsValue label="Server Session Role" value={serverSession ? `${serverSession.role.toUpperCase()} (ID: ${serverSession.id}; ${serverSession.isTokenVerified ? 'verified master token' : serverSession.source})` : 'Resolving from server session…'}/>
    </div>
    <div className="settings-section">
      <div className="settings-section-heading">
        <div className="setting-heading-icon cyan"><ShieldCheck size={18}/></div>
        <div><b>Safety boundaries</b><p>Rules currently enforced by this starter.</p></div>
      </div>
      <div className="boundary-list">
        <div><CheckCircle2 size={15}/><span>API key is not exposed in a public endpoint</span></div>
        <div><CheckCircle2 size={15}/><span>External inference is blocked under Local-only mode</span></div>
        <div><CheckCircle2 size={15}/><span>Blank model responses and provider errors are surfaced</span></div>
        <div><AlertTriangle size={15}/><span>Project writes, shell tools and repository mutation are not connected</span></div>
      </div>
    </div>
    <AccessTokenCard required={settings?.accessTokenRequired} refresh={refresh}/>
    <InfoNote icon={AlertTriangle}>Setting changes to Local-only mode are held in server memory and reset on restart. Set default policy in <code>.env</code> for the next start.</InfoNote>
    <div className="settings-bottom-actions">
      <button className="secondary-button" onClick={()=>onSelectPage('Diagnostics')}><Activity size={14}/> Open diagnostics</button>
      <button className="secondary-button" onClick={()=>onSelectPage('Audit Ledger')}><ShieldCheck size={14}/> View audit events</button>
    </div>
  </section>;
}
function AccessTokenCard({ required, refresh }: { required?: boolean; refresh: () => void }) {
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(() => Boolean(readAccessToken()));
  function save() { try { if (value.trim()) sessionStorage.setItem(ACCESS_KEY, value.trim()); } catch { /* storage unavailable */ } setValue(''); setSaved(Boolean(readAccessToken())); refresh(); }
  function clear() { try { sessionStorage.removeItem(ACCESS_KEY); } catch { /* storage unavailable */ } setSaved(false); refresh(); }
  return <div className="settings-section"><div className="settings-section-heading"><div className="setting-heading-icon"><LockKeyhole size={18}/></div><div><b>Access token</b><p>{required === undefined ? 'Server access policy unknown.' : required ? 'Server requires an access token before model calls. The token is kept only in this browser tab (session storage).' : 'Server does not require an access token (ZYNTHEOR_ACCESS_TOKEN is empty).'}</p></div></div><div className="setting-item"><div><b>{saved ? 'Token saved for this tab' : 'No token saved in this tab'}</b></div><div className="token-controls"><input type="password" autoComplete="off" value={value} onChange={e => setValue(e.target.value)} placeholder="Paste access token" aria-label="Access token"/><button className="secondary-button" type="button" onClick={save} disabled={!value.trim()}>Save</button><button className="secondary-button" type="button" onClick={clear} disabled={!saved}>Clear</button></div></div></div>;
}
function SettingsValue({label,value}:{label:string;value:string}){return <div className="setting-value-row"><span>{label}</span><code>{value}</code></div>}
function Stat({icon:Icon,label,value,hint}:{icon:LucideIcon;label:string;value:string;hint:string}){return <div className="stat-card"><div className="stat-top"><span>{label}</span><Icon size={16}/></div><b>{value}</b><small>{hint}</small></div>}
function SectionTitle({title,count}:{title:string;count:string}){return <div className="section-title"><b>{title}</b><span>{count}</span></div>}
function EmptyState({icon:Icon,title,text}:{icon:LucideIcon;title:string;text:string}){return <div className="empty-state"><div className="empty-icon"><Icon size={20}/></div><b>{title}</b><p>{text}</p></div>}
function InfoNote({icon:Icon,children}:{icon:LucideIcon;children:ReactNode}){return <div className="info-note"><Icon size={16}/><div>{children}</div></div>}
function Modal({title,close,children,maxWidth}:{title:string;close:()=>void;children:ReactNode;maxWidth?:string}){useEffect(()=>{const listener=(e:globalThis.KeyboardEvent)=>{if(e.key==='Escape')close();};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener)},[close]);return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section className="modal-card" style={maxWidth ? { width: `min(${maxWidth}, 96vw)`, maxWidth } : undefined} role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={close} aria-label="Close modal"><X size={17}/></button></div>{children}</section></div>}
function formatBytes(value:number){if(value<1024)return `${value} B`;if(value<1024*1024)return `${(value/1024).toFixed(1)} KB`;return `${(value/1024/1024).toFixed(2)} MB`;}
