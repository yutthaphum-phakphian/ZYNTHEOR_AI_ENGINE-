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

import React, { useCallback, useMemo, useState } from 'react';
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
  Palette
} from 'lucide-react';

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
import { ErrorBoundary } from './components/ErrorBoundary';

/* =========================================================
   QUICK ACCESS CAPABILITY CARDS
   Mapped to Universal Workspace categories
========================================================= */

const QUICK_ACCESS_ITEMS = [
  {
    id: 'research',
    title: 'Research',
    titleThai: 'ค้นคว้าข้อมูล',
    icon: BookOpen,
    color: '#38bdf8',
    prompt: 'ช่วยค้นคว้าและสรุปข้อมูลล่าสุดเกี่ยวกับ: ',
    grounding: true
  },
  {
    id: 'writing',
    title: 'Writing',
    titleThai: 'เขียนเนื้อหา & แปล',
    icon: PenLine,
    color: '#fb7185',
    prompt: 'ช่วยเขียนบทความหรือเรียบเรียงเนื้อหาเรื่อง: ',
    grounding: false
  },
  {
    id: 'reasoning',
    title: 'Reasoning',
    titleThai: 'วิเคราะห์ & ตรรกะ',
    icon: Brain,
    color: '#a78bfa',
    prompt: 'ช่วยวิเคราะห์และเปรียบเทียบเชิงเหตุผลเรื่อง: ',
    grounding: false
  },
  {
    id: 'analysis',
    title: 'Analysis',
    titleThai: 'วิเคราะห์ข้อมูล & สถิติ',
    icon: BarChart3,
    color: '#34d399',
    prompt: 'ช่วยวิเคราะห์ชุดข้อมูลและสรุปสาระสำคัญ: ',
    grounding: false
  },
  {
    id: 'learning',
    title: 'Learning',
    titleThai: 'เรียนรู้ & การศึกษา',
    icon: GraduationCap,
    color: '#38bdf8',
    prompt: 'ช่วยอธิบายและสอนแนวคิดนี้ให้เข้าใจง่าย: ',
    grounding: false
  },
  {
    id: 'creative',
    title: 'Creative',
    titleThai: 'สร้างสรรค์ & ไอเดีย',
    icon: Palette,
    color: '#fb923c',
    prompt: 'ช่วยระดมความคิดและคิดคอนเซปต์ใหม่สำหรับ: ',
    grounding: false
  },
  {
    id: 'documents',
    title: 'Documents',
    titleThai: 'จัดการเอกสาร & สรุป',
    icon: FileText,
    color: '#a78bfa',
    prompt: 'ช่วยสรุปใจความสำคัญและสาระสำคัญของเอกสารนี้: ',
    grounding: false
  },
  {
    id: 'technical',
    title: 'Technical',
    titleThai: 'งานเทคนิค & โค้ด',
    icon: Wrench,
    color: '#00D9A3',
    prompt: 'ช่วยตรวจสอบ แนะนำ หรือเขียนโค้ดสำหรับ: ',
    grounding: false
  }
];

/* =========================================================
   HOME EXPERIENCE
   Universal AI Workspace Architecture
========================================================= */

function HomeExperience() {
  const navigate = useNavigate();

  const [input, setInput] = useState('');
  const [grounding, setGrounding] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  const activeModel = useMemo(() => {
    try {
      return getActiveModel();
    } catch {
      return null;
    }
  }, []);

  // Strict Model Identity contract validation: Only ZYNTHEOR CORE family accepted for default inference
  const contractValidation = useMemo(() => {
    return validateDefaultInferenceModel(activeModel);
  }, [activeModel]);

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
    <main className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[#050810] text-white">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[25%] left-1/2 -translate-x-1/2 w-[90%] h-[55%] bg-gradient-to-b from-[#00D9A3]/10 via-[#8b5cf6]/5 to-transparent blur-[120px]" />
        <div className="absolute top-[45%] -right-[20%] w-[50%] h-[35%] bg-gradient-to-l from-[#38bdf8]/5 to-transparent blur-[100px]" />
      </div>

      <div className="relative max-w-[1040px] mx-auto w-full px-4 sm:px-6 md:px-8 py-6 md:py-10 space-y-8 md:space-y-10">
        
        {/* =================================================
            1. TOP HEADER & BRAND
        ================================================= */}
        <header className="flex items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00D9A3] to-[#00b386] grid place-items-center shadow-[0_0_20px_rgba(0,217,163,0.25)]">
              <span className="font-black text-black text-lg">Z</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-lg text-white">ZYNTHEOR</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#00D9A3]/10 text-[#00D9A3] border border-[#00D9A3]/20">
                  AI ENGINE
                </span>
              </div>
              <div className="text-[11px] text-white/40">
                Universal Intelligence Platform
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NavLink
              to="/more"
              className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-white/70 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <Settings size={13} className="text-white/50" />
              <span>Profile & Settings</span>
            </NavLink>
          </div>
        </header>

        {/* Maintenance Mode Read-Only Banner */}
        {isMaintenanceMode && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3.5 text-xs text-red-200">
            <Lock size={18} className="text-red-400 shrink-0" />
            <div>
              <span className="font-bold text-red-300">READ-ONLY MAINTENANCE MODE ACTIVE:</span> ระบบตรวจพบการเบี่ยงเบนของ SSoT Drift เกินเกณฑ์แคนอนิคัล (Δ0.00%) คำสั่งสร้างหรือแก้ไขข้อมูลถูกระงับชั่วคราว
            </div>
          </div>
        )}

        {/* Strict Model Identity Contract Alert if Invalid or Unauthorized Fallback Detected */}
        {!contractValidation.valid && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5 text-xs text-amber-200">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300">
                MODEL IDENTITY CONTRACT VIOLATION: UNAUTHORIZED DEFAULT FALLBACK BLOCKED
              </div>
              <div className="text-amber-200/80 mt-1">
                {contractValidation.reason}
              </div>
              <div className="text-[11px] text-amber-300/60 mt-1.5">
                ข้อกำหนด Model Sovereignty: การทำงานพื้นฐานต้องใช้โมเดลในกลุ่ม ZYNTHEOR CORE เท่านั้น ไม่อนุญาตให้เปลี่ยนไปใช้โมเดลภายนอกโดยอัตโนมัติ
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            2. HERO & OMNI-COMPOSER
        ================================================= */}
        <section className="space-y-6 pt-2 md:pt-4 text-center">
          <div className="space-y-2 max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
              What can I help you accomplish?
            </h1>
            <p className="text-sm md:text-base text-white/50">
              ถาม ค้นคว้า วิเคราะห์ หรือสร้างสรรค์สิ่งที่คุณต้องการผ่าน First-Party Intelligence Core
            </p>
          </div>

          {/* Omni Composer Box */}
          <div className="max-w-2xl mx-auto text-left rounded-3xl border border-white/10 bg-[#0b1020]/90 backdrop-blur-xl p-3 shadow-2xl transition focus-within:border-[#00D9A3]/50 focus-within:shadow-[0_0_30px_rgba(0,217,163,0.12)]">
            <div className="p-2 sm:p-3">
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
                placeholder={
                  isMaintenanceMode
                    ? "ระบบอยู่ในโหมด Read-Only Maintenance Mode (ระงับการส่งคำสั่ง)"
                    : !contractValidation.valid
                    ? "ระงับการส่งคำสั่ง: ตรวจพบข้อผิดพลาดด้าน Model Identity Contract"
                    : "Ask ZYNTHEOR... (ถาม ค้นคว้า วิเคราะห์ หรือสั่งงาน)"
                }
                rows={3}
                aria-label="Ask ZYNTHEOR prompt input"
                className="w-full resize-none bg-transparent outline-none text-sm text-white placeholder:text-white/25 leading-relaxed"
              />

              {/* Bottom Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06] mt-2">
                <div className="flex items-center gap-2">
                  {/* Attachment button */}
                  <button
                    type="button"
                    title="แนบไฟล์หรือเอกสาร"
                    onClick={() => navigate('/library')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition cursor-pointer text-xs"
                  >
                    <span className="font-bold text-sm leading-none">＋</span>
                    <span className="text-[11px] font-medium hidden sm:inline">Attach</span>
                  </button>

                  {/* Online Search Toggle */}
                  <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white/70 cursor-pointer select-none transition">
                    <input
                      type="checkbox"
                      checked={grounding}
                      onChange={e => setGrounding(e.target.checked)}
                      className="accent-[#00D9A3] cursor-pointer"
                    />
                    <Search size={13} className={grounding ? 'text-[#00D9A3]' : 'text-white/40'} />
                    <span className="text-[11px] font-medium">Search</span>
                  </label>

                  {/* Active CORE Model Badge */}
                  <NavLink
                    to="/model-studio"
                    title="ตรวจสอบโมเดล ZYNTHEOR CORE"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] font-mono text-white/60 hover:text-white transition cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00D9A3]" />
                    <span>ZYNTHEOR CORE</span>
                  </NavLink>
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={() => handleStart()}
                  disabled={!input.trim() || isMaintenanceMode || !contractValidation.valid}
                  className="h-10 px-5 rounded-2xl bg-[#00D9A3] text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <span>ส่งคำสั่ง</span>
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            3. ZYNTHEOR CORE HEALTH WIDGET
            Real-time QOPS & Enclave Integrity Monitoring
        ================================================= */}
        <section className="space-y-2">
          <ZyntheorCoreHealthWidget
            onMaintenanceModeChange={setIsMaintenanceMode}
          />
        </section>

        {/* =================================================
            3. QUICK ACCESS CAPABILITY CARDS
        ================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase">
              Quick Access · ความสามารถหลัก
            </h2>
            <NavLink
              to="/explore"
              className="text-xs font-bold text-[#00D9A3] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>ดูทั้งหมด (Explore)</span>
              <ChevronRight size={13} />
            </NavLink>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_ACCESS_ITEMS.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleStart(item.prompt, item.grounding)}
                  className="text-left rounded-2xl border border-white/[0.07] bg-[#0b1020]/80 p-4 space-y-3 hover:border-white/20 hover:bg-[#111a2d] transition group cursor-pointer"
                >
                  <div
                    className="w-10 h-10 rounded-xl grid place-items-center border"
                    style={{
                      backgroundColor: `${item.color}15`,
                      borderColor: `${item.color}30`,
                      color: item.color
                    }}
                  >
                    <Icon size={18} />
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-white group-hover:text-[#00D9A3] transition">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-white/40 mt-0.5 leading-snug">
                      {item.titleThai}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* =================================================
            4. RECENT WORK & YOUR KNOWLEDGE
        ================================================= */}
        <section className="grid sm:grid-cols-2 gap-4">
          
          {/* Recent Work */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0b1020] p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-2 text-white">
                  <Clock size={15} className="text-[#38bdf8]" />
                  Recent Work · งานล่าสุด
                </span>
                <NavLink to="/library" className="text-[11px] text-[#38bdf8] hover:underline">
                  ดูประวัติ
                </NavLink>
              </div>

              <div className="space-y-2">
                {[
                  { title: 'วิเคราะห์โครงสร้าง Sovereign AI Engine', time: 'วันนี้' },
                  { title: 'สรุปมาตรฐาน FIPS 140-3 Hardware Enclave', time: 'เมื่อวานนี้' },
                  { title: 'เขียนโค้ด React Hook & Universal Navigation', time: '3 วันที่แล้ว' }
                ].map((session, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate('/chat')}
                    className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between text-xs cursor-pointer transition"
                  >
                    <span className="truncate pr-2 text-white/80">{session.title}</span>
                    <span className="text-[10px] text-white/30 shrink-0">{session.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => navigate('/chat')}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>เปิดประวัติงานใน Intelligence</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Your Knowledge & Memory */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0b1020] p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-2 text-white">
                  <BookOpen size={15} className="text-[#a78bfa]" />
                  Your Knowledge · คลังความรู้
                </span>
                <NavLink to="/library" className="text-[11px] text-[#a78bfa] hover:underline">
                  เปิด Library
                </NavLink>
              </div>

              <p className="text-xs text-white/40 leading-relaxed">
                จัดเก็บเอกสาร สรุปบทความ และหน่วยความจำส่วนบุคคล (Memory Center) เพื่อให้ AI นำบริบทมาใช้ในการตอบคำถามอย่างต่อเนื่อง
              </p>

              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Brain size={16} className="text-[#00D9A3]" />
                  <div>
                    <div className="font-bold text-white">Semantic Memory</div>
                    <div className="text-[10px] text-white/40">พร้อมใช้งานตลอดทุกการสนทนา</div>
                  </div>
                </div>
                <NavLink
                  to="/memory"
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-[#00D9A3] font-bold"
                >
                  จัดการ
                </NavLink>
              </div>
            </div>

            <button
              onClick={() => navigate('/library')}
              className="w-full py-2.5 rounded-xl bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20 text-xs font-bold text-[#a78bfa] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>เข้าสู่ Knowledge & Documents Library</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </section>

        {/* =================================================
            5. SOVEREIGN PLATFORM FOOTER
        ================================================= */}
        <footer className="pt-4 pb-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <div className="flex items-center gap-2.5">
            <span className="font-black text-white tracking-wider">ZYNTHEOR</span>
            <span>·</span>
            <span className="text-[#00D9A3] font-medium">ZYNTHEOR CORE</span>
            <span>·</span>
            <span>First-Party Sovereign Intelligence</span>
          </div>

          <div className="flex items-center gap-3">
            <NavLink
              to="/diagnostics"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-[11px] text-white/60 hover:text-white transition cursor-pointer"
            >
              <ShieldCheck size={12} className="text-[#00D9A3]" />
              <span>Forensic Audit Dossier</span>
              <ChevronRight size={12} className="text-white/40" />
            </NavLink>
          </div>
        </footer>

      </div>
    </main>
  );
}

/* =========================================================
   APP SHELL & 5-ITEM UNIFIED NAVIGATION
========================================================= */

function AppShell() {
  const location = useLocation();

  const current = useMemo(() => {
    const path = location.pathname;
    if (path === '/' || path === '/home') return 'home';
    if (path.startsWith('/explore')) return 'explore';
    if (path.startsWith('/chat') || path.startsWith('/workspace')) return 'chat';
    if (path.startsWith('/library') || path.startsWith('/knowledge') || path.startsWith('/memory')) return 'library';
    if (path.startsWith('/more') || path.startsWith('/model') || path.startsWith('/agent') || path.startsWith('/eval') || path.startsWith('/diagnostics')) return 'more';
    return 'home';
  }, [location.pathname]);

  /* 
   * 5 Main Hubs as specified by user:
   * 1. Home
   * 2. Explore
   * 3. Intelligence
   * 4. Library
   * 5. More
   */
  const navItems = [
    {
      id: 'home',
      path: '/',
      icon: Home,
      label: 'Home',
      th: 'หน้าแรก'
    },
    {
      id: 'explore',
      path: '/explore',
      icon: Compass,
      label: 'Explore',
      th: 'สำรวจ'
    },
    {
      id: 'chat',
      path: '/chat',
      icon: Sparkles,
      label: 'Intelligence',
      th: 'Intelligence'
    },
    {
      id: 'library',
      path: '/library',
      icon: BookOpen,
      label: 'Library',
      th: 'คลังข้อมูล'
    },
    {
      id: 'more',
      path: '/more',
      icon: Layers,
      label: 'More',
      th: 'เพิ่มเติม'
    }
  ];

  return (
    <div className="app-shell flex overflow-hidden antialiased bg-[#050810]">

      {/* =================================================
          DESKTOP SIDEBAR (72px centered, clean)
      ================================================= */}
      <aside className="hidden md:flex w-[72px] shrink-0 flex-col items-center py-5 gap-3 bg-[#070a14] border-r border-white/[0.06] select-none">
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
          MAIN CONTENT AREA
      ================================================= */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        <div className="app-content flex flex-col">
          <ErrorBoundary>
            <Routes>
              {/* Primary 5 Hubs */}
              <Route path="/" element={<HomeExperience />} />
              <Route path="/home" element={<HomeExperience />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/chat" element={<MainChat />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/more" element={<MorePage />} />

              {/* Workspaces & Direct Navigation preservation */}
              <Route path="/workspace" element={<AIWorkspace />} />
              <Route path="/knowledge" element={<LibraryPage />} />
              <Route path="/memory" element={<MemoryCenter />} />
              <Route path="/model-studio" element={<ModelStudio />} />
              <Route path="/evaluation" element={<EvaluationLab />} />
              <Route path="/agents" element={<AgentCommandCenter />} />
              <Route path="/diagnostics" element={<Diagnostics />} />

              <Route path="*" element={<HomeExperience />} />
            </Routes>
          </ErrorBoundary>
        </div>

        {/* =================================================
            MOBILE BOTTOM NAVIGATION (5 Clean Equal Tabs)
            Exact 5 items, no horizontal scroll, clean touch targets
        ================================================= */}
        <nav
          aria-label="Main navigation"
          className="bottom-tab md:hidden bg-[#070a14]/95 backdrop-blur-xl border-t border-white/[0.08] safe-bottom"
        >
          <div className="flex items-center justify-around h-16 px-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = current === item.id;

              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={`flex-1 flex flex-col items-center justify-center py-1 transition select-none cursor-pointer ${
                    active
                      ? 'text-[#00D9A3]'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  <Icon size={19} className={active ? 'scale-110 transition-transform' : ''} />
                  <span className={`text-[10px] mt-1 tracking-tight ${active ? 'font-bold' : 'font-medium'}`}>
                    {item.th}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>

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
