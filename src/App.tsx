// @ts-nocheck
/**
 * ZYNTHEOR AI ENGINE
 * Universal Intelligence Workspace
 *
 * Product: ZYNTHEOR AI ENGINE
 * Intelligence: ZYNTHEOR INTELLIGENCE
 * Model Family: ZYNTHEOR CORE
 *
 * Principles:
 * - Universal AI Workspace: general-purpose AI platform
 * - Home is the operational center
 * - Capability groups are dedicated workspaces
 * - CORE is the engine underneath
 * - 5-hub unified navigation (Home, Explore, Intelligence, Library, More)
 * - Clean mobile-first design, ready for native mobile & desktop
 */

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  NavLink,
  useLocation
} from 'react-router-dom';

import {
  Brain,
  Cpu,
  Files,
  Globe,
  MessageSquare,
  Network,
  Send,
  Sparkles,
  Zap,
  BookOpen,
  PenLine,
  BarChart3,
  Wrench,
  Compass,
  ShieldCheck,
  Home,
  ChevronRight,
  Search,
  Activity,
  Flame,
  Lock,
  AlertTriangle,
  Paperclip,
  Clock,
  ArrowRight,
  Settings,
  Layers,
  GraduationCap,
  FileText,
  Palette,
  Sliders,
  User,
  Mic,
  MicOff,
  Info,
  Download
} from 'lucide-react';

import { useVoiceIntelligenceInput, appendTranscriptWithSmartSpacing } from './hooks/useVoiceIntelligenceInput';

import {
  CAPABILITIES,
  classifyAutoMode,
  type CapabilityId
} from './lib/capabilityEngine';

import {
  getActiveModel,
  validateModelIdentity,
  validateDefaultInferenceModel
} from './lib/modelIdentityContract';

import { ZyntheorCoreHealthWidget } from './components/ZyntheorCoreHealthWidget';
import { ZyntheorIntelligenceRuntime } from './components/ZyntheorIntelligenceRuntime';
import { ControlCenterModal } from './components/ControlCenterModal';
import { MainChat } from './components/MainChat';
import AIWorkspace from './pages/AIWorkspace';
import ModelStudio from './components/model-studio/ModelStudio';
import EvaluationLab from './pages/EvaluationLab';
import AgentCommandCenter from './pages/AgentCommandCenter';
import MemoryCenter from './pages/MemoryCenter';
import Diagnostics from './pages/Diagnostics';
import ExplorePage from './pages/ExplorePage';
import LibraryPage from './pages/LibraryPage';
import MorePage from './pages/MorePage';
import { HardwareEnclaveTelemetryWidget } from './components/HardwareEnclaveTelemetryWidget';
import { GpuTelemetryWidget } from './components/GpuTelemetryWidget';
import { ErrorBoundary } from './components/ErrorBoundary';

import AuditFoundationPage from './pages/AuditFoundationPage';

/* =========================================================
   CANONICAL CAPABILITIES
   ZYNTHEOR Universal Intelligence Capabilities
========================================================= */

const CANONICAL_CAPABILITIES = [
  {
    id: 'research',
    symbol: '◈',
    title: 'Research',
    sub: 'Discover',
    titleThai: 'ค้นคว้าและสืบค้นข้อมูลเชิงลึก',
    color: '#38bdf8',
    prompt: 'ช่วยค้นคว้าและสังเคราะห์ข้อมูลเชิงลึกเกี่ยวกับ: ',
    grounding: true
  },
  {
    id: 'reasoning',
    symbol: '◇',
    title: 'Reasoning',
    sub: 'Deep Analysis',
    titleThai: 'วิเคราะห์ตรรกะและให้เหตุผล',
    color: '#a78bfa',
    prompt: 'ช่วยวิเคราะห์และให้เหตุผลเชิงตรรกะแบบเป็นขั้นตอนเรื่อง: ',
    grounding: false
  },
  {
    id: 'creation',
    symbol: '◈',
    title: 'Creation',
    sub: 'Create Work',
    titleThai: 'สร้างสรรค์และเขียนงาน',
    color: '#fb7185',
    prompt: 'ช่วยเขียน เรียบเรียง หรือสร้างสรรค์เนื้อหาเรื่อง: ',
    grounding: false
  },
  {
    id: 'knowledge',
    symbol: '◇',
    title: 'Knowledge',
    sub: 'Knowledge Base',
    titleThai: 'จัดเก็บ ค้นหา และเรียกคืนความรู้',
    color: '#34d399',
    prompt: 'ช่วยอธิบาย ค้นหา หรือเรียกคืนองค์ความรู้เรื่อง: ',
    grounding: false
  },
  {
    id: 'technical',
    symbol: '◈',
    title: 'Technical',
    sub: 'Engineering',
    titleThai: 'วิศวกรรมระบบและโค้ด',
    color: '#00D9A3',
    prompt: 'ช่วยตรวจสอบ แนะนำ หรือเขียนโค้ดและสถาปัตยกรรมสำหรับ: ',
    grounding: false
  },
  {
    id: 'learning',
    symbol: '◇',
    title: 'Learning',
    sub: 'Education',
    titleThai: 'อธิบาย สอน และประเมินความเข้าใจ',
    color: '#60a5fa',
    prompt: 'ช่วยสอน อธิบายแนวคิด และจัดทำแบบประเมินความเข้าใจสำหรับ: ',
    grounding: false
  }
];

/* =========================================================
   HOME EXPERIENCE — UNIVERSAL INTELLIGENCE WORKSPACE
   ZYNTHEOR Universal Intelligence Platform
========================================================= */

function HomeExperience() {
  const navigate = useNavigate();

  const [input, setInput] = useState('');
  const [grounding, setGrounding] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // Voice Intelligence Input 1.1 Hook
  const {
    lifecycle: voiceLifecycle,
    isListening,
    isSupported: speechSupported,
    language: voiceLang,
    interimTranscript,
    errorMessage: speechError,
    showPrivacyNotice,
    privacyDisclosure,
    toggleListening: toggleVoiceInput,
    setLanguage: setVoiceLang,
    dismissError,
    togglePrivacyNotice,
  } = useVoiceIntelligenceInput({
    initialLanguage: 'th-TH',
    onFinalTranscript: useCallback((finalText: string) => {
      setInput(prev => appendTranscriptWithSmartSpacing(prev, finalText));
    }, []),
  });

  // Live recent work & project state fetched from real backend services
  const [recentWork, setRecentWork] = useState<Array<{ id: string; title: string; time: string }>>([
    { id: '1', title: 'วิเคราะห์โครงสร้าง Sovereign AI Engine', time: 'วันนี้' },
    { id: '2', title: 'สรุปมาตรฐานความมั่นคง Enclave & FIPS 140-3', time: 'เมื่อวานนี้' },
    { id: '3', title: 'ตรวจสอบโค้ด React Hook & Navigation Guard', time: '3 วันก่อน' },
  ]);

  const [projectInfo, setProjectInfo] = useState<{ name: string; branch: string; status: string }>({
    name: 'ZYNTHEOR AI ENGINE',
    branch: 'main',
    status: 'Connected Workspace · Process Enclave Active',
  });

  // Quick Command input & command palette state
  const [quickCmdQuery, setQuickCmdQuery] = useState('');
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);
  const quickCmdInputRef = useRef<HTMLInputElement>(null);

  const QUICK_COMMANDS = useMemo(() => [
    { id: 'diagnostics', title: 'Diagnostics & Forensic Audit', path: '/diagnostics', icon: ShieldCheck, badge: 'System' },
    { id: 'model-studio', title: 'Model Studio (ZYNTHEOR CORE)', path: '/model-studio', icon: Cpu, badge: 'Models' },
    { id: 'agents', title: 'Agent Command Center', path: '/agents', icon: Brain, badge: 'Agents' },
    { id: 'evaluation', title: 'Evaluation Lab', path: '/evaluation', icon: BarChart3, badge: 'Eval' },
    { id: 'memory', title: 'Memory Center & Vector Store', path: '/memory', icon: BookOpen, badge: 'Knowledge' },
    { id: 'workspace', title: 'AI Workspace & File Explorer', path: '/workspace', icon: Layers, badge: 'Project' },
    { id: 'explore', title: 'Explore Capabilities', path: '/explore', icon: Compass, badge: 'Discover' },
    { id: 'chat', title: 'Main Chat & Intelligence', path: '/chat', icon: Sparkles, badge: 'Chat' },
  ], []);

  const filteredQuickCommands = useMemo(() => {
    if (!quickCmdQuery.trim()) return QUICK_COMMANDS;
    const q = quickCmdQuery.toLowerCase();
    return QUICK_COMMANDS.filter(cmd => cmd.title.toLowerCase().includes(q) || cmd.badge.toLowerCase().includes(q));
  }, [quickCmdQuery, QUICK_COMMANDS]);

  // Global Cmd+K / Ctrl+K shortcut listener to focus Quick Command
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        quickCmdInputRef.current?.focus();
        setIsCmdPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // 1. Fetch live workspace memory / recent work
    fetch('/api/intelligence/workspace-memory')
      .then(res => res.json())
      .then(data => {
        if (data.ok && Array.isArray(data.entries) && data.entries.length > 0) {
          const mapped = data.entries.slice(0, 3).map((e: any) => ({
            id: e.id,
            title: e.title,
            time: new Date(e.createdAt).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
          }));
          setRecentWork(mapped);
        }
      })
      .catch(() => {});

    // 2. Fetch live workspace projects and git status
    Promise.all([
      fetch('/api/workspace/projects').then(r => r.json()).catch(() => null),
      fetch('/api/workspace/git').then(r => r.json()).catch(() => null),
    ]).then(([projData, gitData]) => {
      const activeProj = projData?.projects?.[0]?.name || 'ZYNTHEOR AI ENGINE';
      const branch = gitData?.branch || 'main';
      setProjectInfo({
        name: activeProj,
        branch,
        status: gitData?.isClean ? 'Repository Clean · Enclave Guard Active' : 'Repository Synced · Process Enclave Active',
      });
    });
  }, []);

  const activeModel = useMemo(() => {
    try {
      return getActiveModel();
    } catch {
      return null;
    }
  }, []);

  // Strict Model Identity contract validation
  const contractValidation = useMemo(() => {
    return validateDefaultInferenceModel(activeModel);
  }, [activeModel]);

  const handleExportWorkspace = useCallback(() => {
    const manifestData = {
      name: projectInfo.name,
      branch: projectInfo.branch,
      status: projectInfo.status,
      exportedAt: new Date().toISOString(),
      platform: 'ZYNTHEOR AI ENGINE',
      version: '1.3.1-clean-first-party',
      workspace: {
        type: 'Universal Intelligence Workspace',
        capabilities: CANONICAL_CAPABILITIES.map(c => ({ id: c.id, title: c.title })),
        recentWorkCount: recentWork.length,
        recentWork,
      },
      metadata: {
        owner: 'ZYNTHEOR',
        identity: activeModel?.modelId || 'zyntheor-core-native-v1',
        environment: 'Sovereign Process Enclave',
      }
    };

    const blob = new Blob([JSON.stringify(manifestData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-manifest.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [projectInfo, activeModel, recentWork]);

  const handleStart = useCallback(
    (text?: string, forceGrounding?: boolean) => {
      if (isMaintenanceMode) return;
      if (!contractValidation.valid) {
        console.error('[Model Identity Contract] Default inference blocked:', contractValidation.reason);
        return;
      }
      const query = (text ?? input).trim();

      if (!query) return;

      const params = new URLSearchParams();
      params.set('q', query);
      params.set('grounding', (forceGrounding ?? grounding) ? '1' : '0');
      params.set('model', activeModel?.modelId || 'zyntheor-core-0.10.0-foundation');

      navigate(`/chat?${params.toString()}`);
    },
    [input, grounding, navigate, isMaintenanceMode, contractValidation, activeModel]
  );

  return (
    <div className="relative flex-1 min-h-full flex flex-col bg-[#050810] text-white">
      {/* Subtle ambient gradient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[70%] h-[40%] bg-gradient-to-b from-[#2563EB]/10 via-[#00D9A3]/5 to-transparent blur-[140px]" />
      </div>

      <div className="relative max-w-[1100px] mx-auto w-full px-4 sm:px-6 md:px-8 py-5 md:py-7 space-y-6 md:space-y-7">
        
        {/* =========================================================
            1. BRAND HEADER (COMPACT & BALANCED)
            ◈ ZYNTHEOR AI ENGINE · Universal Intelligence Platform
        ========================================================= */}
        <header className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-1 relative">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-[#00D9A3] to-[#2563EB] grid place-items-center shadow-[0_0_15px_rgba(0,217,163,0.2)] text-black font-black text-base select-none">
              ◈
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-base sm:text-lg text-white">
                  ◈ ZYNTHEOR AI ENGINE
                </span>
              </div>
              <div className="text-[11px] text-white/40 tracking-wide font-medium">
                Universal Intelligence Platform
              </div>
            </div>
          </div>

          {/* Quick Command Input Field & Command Palette */}
          <div className="relative flex-1 max-w-xs mx-0 sm:mx-2">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-3 text-white/40 pointer-events-none" />
              <input
                ref={quickCmdInputRef}
                type="text"
                value={quickCmdQuery}
                onChange={e => {
                  setQuickCmdQuery(e.target.value);
                  setIsCmdPaletteOpen(true);
                }}
                onFocus={() => setIsCmdPaletteOpen(true)}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setIsCmdPaletteOpen(false);
                  } else if (e.key === 'Enter' && filteredQuickCommands.length > 0) {
                    e.preventDefault();
                    const target = filteredQuickCommands[0];
                    navigate(target.path);
                    setIsCmdPaletteOpen(false);
                    setQuickCmdQuery('');
                  }
                }}
                placeholder="Quick Command... (⌘K)"
                className="w-full pl-8 pr-12 py-1.5 rounded-[12px] bg-white/[0.04] hover:bg-white/[0.08] focus:bg-[#070b16] border border-white/10 focus:border-[#00D9A3]/50 text-xs text-white placeholder:text-white/30 outline-none transition"
              />
              <kbd className="absolute right-2.5 px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-white/40 pointer-events-none">
                ⌘K
              </kbd>
            </div>

            {/* Command Palette Dropdown */}
            {isCmdPaletteOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsCmdPaletteOpen(false)}
                />
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-[14px] bg-[#0b1020] border border-white/15 shadow-2xl p-1.5 space-y-1 max-h-64 overflow-y-auto">
                  <div className="px-2 py-1 text-[10px] font-semibold text-white/40 uppercase tracking-wider flex items-center justify-between">
                    <span>Quick Navigation</span>
                    <span>⌘K</span>
                  </div>
                  {filteredQuickCommands.length === 0 ? (
                    <div className="p-3 text-center text-xs text-white/40">
                      No matching page found
                    </div>
                  ) : (
                    filteredQuickCommands.map(cmd => {
                      const IconComp = cmd.icon;
                      return (
                        <button
                          key={cmd.id}
                          type="button"
                          onClick={() => {
                            navigate(cmd.path);
                            setIsCmdPaletteOpen(false);
                            setQuickCmdQuery('');
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-[10px] hover:bg-white/10 flex items-center justify-between text-xs text-white/90 hover:text-white transition group cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <IconComp size={14} className="text-[#00D9A3] group-hover:scale-110 transition-transform" />
                            <span className="font-medium text-[11px]">{cmd.title}</span>
                          </div>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                            {cmd.badge}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('zyntheor:open-control-center'))}
              title="Open ZYNTHEOR Control Center (Cmd+,)"
              className="px-3 py-1.5 rounded-[12px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#00D9A3]/40 text-[11px] font-medium text-white/80 hover:text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Sliders size={13} className="text-[#00D9A3]" />
              <span>Control Center</span>
              <kbd className="hidden sm:inline-block ml-1 px-1 py-0.2 rounded bg-white/10 text-[9px] font-mono text-white/40">⌘,</kbd>
            </button>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('zyntheor:open-control-center', { detail: { category: 'profile' } }))}
              title="My Profile & Account"
              className="px-3 py-1.5 rounded-[12px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-[11px] font-medium text-white/80 hover:text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <User size={13} className="text-cyan-400" />
              <span className="hidden sm:inline">Profile</span>
            </button>
          </div>
        </header>

        {/* Maintenance Mode Read-Only Banner */}
        {isMaintenanceMode && (
          <div className="p-3.5 rounded-[14px] bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-xs text-red-200">
            <Lock size={16} className="text-red-400 shrink-0" />
            <div>
              <span className="font-bold text-red-300">READ-ONLY MAINTENANCE MODE:</span> ตรวจพบการเบี่ยงเบนของ SSoT Drift ระบบระงับคำสั่งแก้ไขชั่วคราวเพื่อปกป้องความมั่นคงปลอดภัย
            </div>
          </div>
        )}

        {/* Strict Model Identity Contract Alert if Invalid */}
        {!contractValidation.valid && (
          <div className="p-3.5 rounded-[14px] bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300">
                MODEL IDENTITY CONTRACT VIOLATION: UNAUTHORIZED DEFAULT FALLBACK BLOCKED
              </div>
              <div className="text-amber-200/80 mt-0.5">
                {contractValidation.reason}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            2. INTELLIGENCE HERO
            Intelligence Without Boundaries
            One workspace. Unlimited possibilities.
        ========================================================= */}
        <section className="text-center pt-2 sm:pt-4 space-y-2 max-w-xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-[42px] font-black tracking-tight text-white leading-tight">
            Intelligence Without Boundaries
          </h1>
          <p className="text-sm sm:text-base text-white/50 font-normal">
            One workspace. Unlimited possibilities.
          </p>
        </section>

        {/* =========================================================
            3. OMNI COMPOSER (PRIMARY ACTION AREA)
            "What would you like to accomplish today?"
        ========================================================= */}
        <section className="max-w-3xl mx-auto w-full">
          <div className="rounded-[18px] border border-white/10 bg-[#0b1020]/95 backdrop-blur-xl p-4 sm:p-5 shadow-2xl transition focus-within:border-[#00D9A3]/50 focus-within:shadow-[0_0_25px_rgba(0,217,163,0.1)]">
            <div className="text-xs font-semibold text-white/80 mb-2.5">
              What would you like to accomplish today?
            </div>
            
            <div className="rounded-[14px] bg-[#070b16]/80 border border-white/[0.06] p-3 focus-within:border-white/20 transition">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleStart();
                  }
                }}
                disabled={isMaintenanceMode || !contractValidation.valid}
                placeholder="Ask ZYNTHEOR to research, create, analyze..."
                rows={3}
                aria-label="Ask ZYNTHEOR to research, create, analyze..."
                className="w-full resize-none bg-transparent outline-none text-sm text-white placeholder:text-white/30 leading-relaxed font-sans"
              />

              {/* Inside Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.04] mt-1 text-xs">
                <div className="flex items-center gap-2">
                  {/* + Attach */}
                  <button
                    type="button"
                    onClick={() => navigate('/library')}
                    title="แนบเอกสารหรือเชื่อมคลังความรู้"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer text-[11px] font-medium"
                  >
                    <Paperclip size={12} className="text-white/50" />
                    <span>Attach</span>
                  </button>

                  {/* ◈ CORE badge */}
                  <NavLink
                    to="/model-studio"
                    title="ตรวจสอบ ZYNTHEOR CORE Model Identity"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] bg-white/[0.04] border border-white/5 text-[11px] font-mono text-cyan-400 hover:text-white transition cursor-pointer"
                  >
                    <span className="text-[#00D9A3] text-xs">◈</span>
                    <span>CORE</span>
                  </NavLink>

                  {/* ◎ Online Search Toggle */}
                  <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-white/70 cursor-pointer select-none transition">
                    <input
                      type="checkbox"
                      checked={grounding}
                      onChange={e => setGrounding(e.target.checked)}
                      className="accent-[#00D9A3] cursor-pointer"
                    />
                    <Search size={11} className={grounding ? 'text-[#00D9A3]' : 'text-white/40'} />
                    <span className="hidden sm:inline">Online Search</span>
                    <span className="sm:hidden">Search</span>
                  </label>

                  {/* Voice Intelligence Input 1.1 Microphone Button */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      title={
                        !speechSupported
                          ? 'เบราว์เซอร์นี้ยังไม่รองรับ Web Speech API'
                          : isListening
                          ? 'กำลังฟังเสียง... คลิกเพื่อหยุด'
                          : `พิมพ์ด้วยเสียง (${voiceLang === 'th-TH' ? 'ภาษาไทย' : 'English'})`
                      }
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] text-[11px] font-medium transition cursor-pointer select-none ${
                        isListening
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                          : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5'
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff size={12} className="text-rose-400" />
                          <span className="text-rose-300 font-semibold">กำลังฟัง...</span>
                        </>
                      ) : (
                        <>
                          <Mic size={12} className="text-white/50" />
                          <span className="hidden sm:inline">Voice</span>
                        </>
                      )}
                    </button>

                    {/* Language Switcher (TH / EN) */}
                    <button
                      type="button"
                      onClick={() => setVoiceLang(voiceLang === 'th-TH' ? 'en-US' : 'th-TH')}
                      title={`สลับภาษาการฟังเสียง: ปัจจุบันคือ ${voiceLang === 'th-TH' ? 'ภาษาไทย (th-TH)' : 'English (en-US)'}`}
                      className="px-1.5 py-1 rounded-[8px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-[10px] font-mono text-white/60 hover:text-white transition cursor-pointer"
                    >
                      {voiceLang === 'th-TH' ? 'TH' : 'EN'}
                    </button>

                    {/* Privacy & Engine Transparency Disclosure Toggle */}
                    <button
                      type="button"
                      onClick={togglePrivacyNotice}
                      title="ตรวจสอบคำชี้แจงความเป็นส่วนตัวของระบบรับเสียง (Web Speech API Transparency)"
                      className="p-1 rounded-[8px] bg-white/[0.02] hover:bg-white/[0.06] text-white/40 hover:text-cyan-400 transition cursor-pointer"
                    >
                      <Info size={11} />
                    </button>
                  </div>
                </div>

                {/* Submit Button (↑) */}
                <button
                  type="button"
                  onClick={() => handleStart()}
                  disabled={!input.trim() || isMaintenanceMode || !contractValidation.valid}
                  className="w-8 h-8 rounded-[10px] bg-[#00D9A3] hover:bg-white text-black font-bold flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer shadow-md shadow-[#00D9A3]/10"
                  title="Submit Task"
                >
                  <Send size={13} />
                </button>
              </div>

              {/* Live Interim Transcript Preview Banner */}
              {isListening && (
                <div className="mt-2.5 p-2.5 rounded-[10px] bg-rose-500/10 border border-rose-500/25 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-rose-300">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping inline-block" />
                      <span className="font-medium">
                        กำลังฟัง ({voiceLang === 'th-TH' ? 'ภาษาไทย th-TH' : 'English en-US'})... พูดคำสั่งแล้วระบบจะประมวลผลข้อความเมื่อจบประโยค
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      className="px-2 py-0.5 rounded-[6px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[10px] font-medium cursor-pointer"
                    >
                      เสร็จสิ้น / หยุด
                    </button>
                  </div>
                  {interimTranscript && (
                    <div className="text-xs italic text-white/80 bg-black/30 px-2 py-1.5 rounded-[6px] border border-white/5">
                      "{interimTranscript}"
                    </div>
                  )}
                </div>
              )}

              {/* Temporary Speech Error Notice */}
              {speechError && (
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 mt-2.5 rounded-[10px] bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={12} className="text-amber-400 shrink-0" />
                    <span>{speechError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={dismissError}
                    className="text-amber-300/60 hover:text-amber-300 text-[11px] cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Sovereign Privacy Disclosure Card */}
              {showPrivacyNotice && (
                <div className="mt-2.5 p-3 rounded-[12px] bg-cyan-950/20 border border-cyan-500/30 text-xs text-cyan-200/90 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-cyan-300 text-[11px] tracking-wide uppercase">
                    <div className="flex items-center gap-1.5">
                      <Info size={12} className="text-cyan-400" />
                      <span>Web Speech API Privacy & Sovereign Disclosure</span>
                    </div>
                    <button
                      type="button"
                      onClick={togglePrivacyNotice}
                      className="text-cyan-400/60 hover:text-white cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed text-white/70">
                    {privacyDisclosure.providerDisclosure}
                  </p>
                  <div className="text-[10px] font-mono text-cyan-400/80">
                    • นโยบายจัดเก็บ: {privacyDisclosure.dataRetention}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Pills Directly Below Input */}
            <div className="flex flex-wrap items-center gap-2 pt-3">
              {[
                { label: '+ Create', prompt: 'ช่วยสร้างสรรค์และเขียนงานเรื่อง: ' },
                { label: '+ Analyze', prompt: 'ช่วยวิเคราะห์และประเมินผลเชิงลึกเรื่อง: ' },
                { label: '+ Research', prompt: 'ช่วยค้นคว้าข้อมูลล่าสุดเกี่ยวกับ: ', grounding: true },
                { label: '+ Technical', prompt: 'ช่วยตรวจสอบและออกแบบระบบหรือโค้ด: ' }
              ].map((act, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setInput(act.prompt);
                    if (act.grounding) setGrounding(true);
                  }}
                  className="px-2.5 py-1 rounded-[10px] bg-white/[0.04] hover:bg-white/[0.09] text-[11px] font-medium text-white/70 hover:text-white border border-white/5 transition cursor-pointer"
                >
                  {act.label}
                </button>
              ))}
              <NavLink
                to="/explore"
                className="px-2.5 py-1 rounded-[10px] bg-white/[0.02] hover:bg-white/[0.06] text-[11px] font-medium text-[#00D9A3] hover:underline transition cursor-pointer"
              >
                + More
              </NavLink>
            </div>
          </div>
        </section>

        {/* =========================================================
            4. CORE INTELLIGENCE STATUS & UNIFIED RUNTIME
        ========================================================= */}
        <section className="space-y-4">
          <ZyntheorCoreHealthWidget
            onMaintenanceModeChange={setIsMaintenanceMode}
          />
          <ZyntheorIntelligenceRuntime defaultExpanded={false} />
        </section>

        {/* =========================================================
            5. EXPLORE CAPABILITIES (3 COLUMNS × 2 ROWS)
        ========================================================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-widest text-white/50 uppercase">
              EXPLORE CAPABILITIES
            </h2>
            <NavLink
              to="/explore"
              className="text-xs font-medium text-[#00D9A3] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight size={12} />
            </NavLink>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {CANONICAL_CAPABILITIES.map(item => (
              <button
                key={item.id}
                onClick={() => handleStart(item.prompt, item.grounding)}
                className="text-left rounded-[16px] border border-white/[0.08] bg-[#0b1020]/90 p-4 space-y-2 hover:border-white/20 hover:bg-[#111a2d] hover:scale-[1.02] transition group cursor-pointer shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: item.color }}>
                      {item.symbol}
                    </span>
                    <h3 className="font-bold text-sm text-white group-hover:text-[#00D9A3] transition">
                      {item.title}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-white/30 group-hover:text-white/60 transition">
                    {item.sub}
                  </span>
                </div>
                <p className="text-[11px] text-white/40 leading-snug">
                  {item.titleThai}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* =========================================================
            6. YOUR WORKSPACE (RECENT WORK & KNOWLEDGE)
        ========================================================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-widest text-white/50 uppercase">
              YOUR WORKSPACE
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-3.5">
            {/* Left: Recent Work */}
            <div className="rounded-[16px] border border-white/[0.08] bg-[#0b1020]/90 p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-sm">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <Clock size={14} />
                    Recent Work
                  </span>
                  <span className="text-[10px] text-white/30 font-normal">Recent activities</span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {recentWork.map((s, idx) => (
                    <div
                      key={idx}
                      onClick={() => navigate('/chat')}
                      className="p-2.5 rounded-[12px] bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between text-xs cursor-pointer transition"
                    >
                      <span className="truncate pr-2 text-white/80 text-[11px] font-medium">{s.title}</span>
                      <span className="text-[10px] text-white/40 shrink-0 font-mono">{s.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => navigate('/chat')}
                className="w-full py-2.5 rounded-[12px] bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Continue working</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {/* Right: Knowledge & Memory */}
            <div className="rounded-[16px] border border-white/[0.08] bg-[#0b1020]/90 p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-sm">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-1.5 text-purple-400">
                    <BookOpen size={14} />
                    Knowledge &amp; Memory
                  </span>
                  <span className="text-[10px] text-white/30 font-normal">Your knowledge base</span>
                </div>

                <p className="text-[11px] text-white/40 leading-relaxed pt-1">
                  คลังความรู้และบริบท Semantic Memory ที่แยกตามสิทธิ์ เพื่อนำมาใช้ในการค้นคว้าและตัดสินใจอย่างต่อเนื่อง
                </p>

                <div className="p-2.5 rounded-[12px] bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Brain size={14} className="text-[#00D9A3]" />
                    <span className="text-[11px] text-white font-medium">Semantic Memory Active</span>
                  </div>
                  <NavLink
                    to="/memory"
                    className="text-[11px] text-[#00D9A3] hover:underline font-semibold"
                  >
                    Manage
                  </NavLink>
                </div>
              </div>

              <button
                onClick={() => navigate('/library')}
                className="w-full py-2.5 rounded-[12px] bg-purple-500/10 hover:bg-purple-500/20 text-xs font-semibold text-purple-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Browse Library</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================
            7. PROJECTS (CONNECTED WORKSPACE)
        ========================================================= */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold tracking-widest text-white/50 uppercase">
              PROJECTS
            </div>
            <button
              type="button"
              onClick={handleExportWorkspace}
              title="Export workspace manifest JSON"
              className="px-2.5 py-1 rounded-[10px] bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-[#00D9A3]/40 text-[11px] font-medium text-white/70 hover:text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download size={12} className="text-[#00D9A3]" />
              <span>Export Workspace</span>
            </button>
          </div>
          <div className="rounded-[16px] border border-white/[0.08] bg-[#0b1020]/90 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-sm hover:border-white/20 transition">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Layers size={15} className="text-[#00D9A3]" />
                <span>{projectInfo.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/60">
                  {projectInfo.branch}
                </span>
              </div>
              <div className="text-xs text-white/40">
                Your projects and connected workspaces · {projectInfo.status}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportWorkspace}
                className="px-3 py-2 rounded-[12px] bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 hover:text-white transition flex items-center gap-1.5 cursor-pointer border border-white/5"
              >
                <Download size={13} className="text-[#00D9A3]" />
                <span>Export Manifest</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/workspace')}
                className="px-4 py-2 rounded-[12px] bg-[#00D9A3]/10 hover:bg-[#00D9A3]/20 text-xs font-semibold text-[#00D9A3] transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Open</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================
            8. SOVEREIGN PLATFORM FOOTER
        ========================================================= */}
        <footer className="pt-4 pb-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-white tracking-wider">◈ ZYNTHEOR</span>
            <span>·</span>
            <span className="text-[#00D9A3] font-medium">ZYNTHEOR CORE</span>
            <span>·</span>
            <span>Universal Intelligence Platform</span>
          </div>

          <div className="flex items-center gap-3">
            <NavLink
              to="/diagnostics"
              className="flex items-center gap-1.5 px-3 py-1 rounded-[10px] bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[11px] text-white/60 hover:text-white transition cursor-pointer"
            >
              <ShieldCheck size={12} className="text-[#00D9A3]" />
              <span>Forensic Audit Dossier</span>
              <ChevronRight size={12} className="text-white/40" />
            </NavLink>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* =========================================================
   APP SHELL & 5-ITEM UNIFIED NAVIGATION
========================================================= */

import SettingsPage from './pages/SettingsPage';

function AppShell() {
  const location = useLocation();
  const [isControlCenterOpen, setIsControlCenterOpen] = useState(false);

  // Global shortcut (Cmd/Ctrl+,) and custom event listener for Control Center
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsControlCenterOpen(prev => !prev);
      }
    };
    const handleOpenEvent = () => setIsControlCenterOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('zyntheor:open-control-center', handleOpenEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('zyntheor:open-control-center', handleOpenEvent);
    };
  }, []);

  const current = useMemo(() => {
    const path = location.pathname;
    if (path === '/' || path.startsWith('/chat') || path.startsWith('/workspace')) return 'chat';
    if (path.startsWith('/explore')) return 'explore';
    if (path.startsWith('/library') || path.startsWith('/knowledge') || path.startsWith('/memory')) return 'library';
    if (path.startsWith('/agents') || path.startsWith('/agent')) return 'agents';
    if (path.startsWith('/settings') || path.startsWith('/more') || path.startsWith('/model') || path.startsWith('/eval') || path.startsWith('/diagnostics')) return 'settings';
    return 'chat';
  }, [location.pathname]);

  /* 
   * 5 Main Hubs as specified by Mobile-First UX Architecture:
   * 1. Chat
   * 2. Explore
   * 3. Library
   * 4. Agents
   * 5. Settings
   */
  const navItems = [
    {
      id: 'chat',
      path: '/chat',
      icon: MessageSquare,
      label: 'Chat',
      th: 'แชท'
    },
    {
      id: 'explore',
      path: '/explore',
      icon: Compass,
      label: 'Explore',
      th: 'สำรวจ'
    },
    {
      id: 'library',
      path: '/library',
      icon: BookOpen,
      label: 'Library',
      th: 'คลังข้อมูล'
    },
    {
      id: 'agents',
      path: '/agents',
      icon: Brain,
      label: 'Agents',
      th: 'เอเจนต์'
    },
    {
      id: 'settings',
      path: '/settings',
      icon: Settings,
      label: 'Settings',
      th: 'ตั้งค่า'
    }
  ];

  return (
    <div className="app-shell flex flex-col md:flex-row h-[100dvh] min-h-[100dvh] w-full overflow-hidden antialiased bg-[#050810]">

      {/* =================================================
          DESKTOP SIDEBAR (72px centered, clean)
      ================================================= */}
      <aside className="hidden md:flex w-[72px] shrink-0 flex-col items-center py-5 gap-3 bg-[#070a14] border-r border-white/[0.06] select-none h-full">
        <NavLink
          to="/"
          title="ZYNTHEOR Home"
          className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00D9A3] to-[#00b386] grid place-items-center font-black text-black text-lg shadow-[0_0_20px_rgba(0,217,163,0.25)] transition hover:scale-105"
        >
          Z
        </NavLink>

        <div className="w-8 h-px bg-white/10 my-2" />

        <div className="flex flex-col gap-2 flex-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = current === item.id;

            return (
              <NavLink
                key={item.id}
                to={item.path}
                title={item.label}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={`relative w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition cursor-pointer ${
                  active
                    ? 'bg-white text-black shadow-lg shadow-white/10'
                    : 'bg-white/[0.03] text-white/40 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <Icon size={19} />
                {active && (
                  <span className="absolute -left-1 w-1 h-5 rounded-full bg-[#00D9A3]" />
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Quick Control Center launch button */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('zyntheor:open-control-center'))}
          title="ZYNTHEOR Control Center (Cmd+,)"
          className="w-9 h-9 rounded-xl bg-white/[0.03] hover:bg-white/10 grid place-items-center text-white/40 hover:text-[#00D9A3] transition cursor-pointer"
        >
          <Sliders size={16} />
        </button>

        {/* Bottom system status indicator */}
        <NavLink
          to="/diagnostics"
          title="Diagnostics & Forensic Status"
          className="w-9 h-9 rounded-xl bg-white/[0.03] hover:bg-white/10 grid place-items-center text-white/40 hover:text-white transition cursor-pointer"
        >
          <ShieldCheck size={16} className="text-emerald-400" />
        </NavLink>
      </aside>

      {/* =================================================
          MAIN SHELL CONTAINER (Flex column, fills viewport)
      ================================================= */}
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden relative">
        {/* =================================================
            DEDICATED CONTENT SCROLLING CONTAINER
            Fills available space between header and mobile nav
        ================================================= */}
        <div className="app-content-container flex-1 min-h-0 min-w-0 flex flex-col relative overflow-hidden">
          <main className="app-content flex-1 min-h-0 min-w-0 flex flex-col overflow-y-auto overflow-x-hidden relative">
            <ErrorBoundary>
              <Routes>
                {/* Primary 5 Hubs */}
                <Route path="/" element={<HomeExperience />} />
                <Route path="/home" element={<HomeExperience />} />
                <Route path="/chat" element={<MainChat />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/agents" element={<AgentCommandCenter />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/more" element={<MorePage />} />

                {/* Workspaces & Knowledge Routes */}
                <Route path="/workspace" element={<AIWorkspace />} />
                <Route path="/knowledge" element={<LibraryPage />} />
                <Route path="/knowledge/files" element={<LibraryPage />} />
                <Route path="/files" element={<LibraryPage />} />
                <Route path="/memory" element={<MemoryCenter />} />
                <Route path="/model-studio" element={<ModelStudio />} />
                <Route path="/evaluation" element={<EvaluationLab />} />
                <Route path="/audit" element={<AuditFoundationPage />} />
                <Route path="/diagnostics" element={<><GpuTelemetryWidget /><Diagnostics /></>} />

                <Route path="*" element={<MainChat />} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>

        {/* =================================================
            MOBILE BOTTOM NAVIGATION (Fixed at viewport bottom)
            Shrink-0, safe-bottom, fixed height tab bar
        ================================================= */}
        <nav
          aria-label="Main navigation"
          className="bottom-tab md:hidden shrink-0 bg-[#070a14]/95 backdrop-blur-xl border-t border-white/[0.08] safe-bottom z-30"
        >
          <div className="mobile-navigation">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = current === item.id;

              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={`mobile-navigation-item relative transition select-none cursor-pointer ${
                    active
                      ? 'text-[#00D9A3]'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {active && (
                    <span className="absolute top-0 w-8 h-0.5 rounded-full bg-[#00D9A3] shadow-[0_0_8px_#00D9A3]" />
                  )}
                  <Icon size={20} className={active ? 'scale-110 transition-transform text-[#00D9A3]' : ''} />
                  <span className={`text-[10px] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis ${active ? 'font-bold text-[#00D9A3]' : 'font-medium'}`}>
                    {item.th}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Global ZYNTHEOR Control Center Modal */}
      <ControlCenterModal
        isOpen={isControlCenterOpen}
        onClose={() => setIsControlCenterOpen(false)}
      />
    </div>
  );
}

/* =========================================================
   APP ROOT
========================================================= */

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
