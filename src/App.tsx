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

import React, { useCallback, useMemo, useState, useEffect } from 'react';
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
  Sliders
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
import { ErrorBoundary } from './components/ErrorBoundary';

/* =========================================================
   CANONICAL CAPABILITIES
   ZYNTHEOR Universal Intelligence Capabilities
========================================================= */

const CANONICAL_CAPABILITIES = [
  {
    id: 'research',
    symbol: '◈',
    title: 'Research',
    sub: 'Research AI',
    titleThai: 'การค้นคว้าและสืบค้น',
    color: '#38bdf8',
    prompt: 'ช่วยค้นคว้าและสังเคราะห์ข้อมูลเชิงลึกเกี่ยวกับ: ',
    grounding: true
  },
  {
    id: 'reasoning',
    symbol: '◇',
    title: 'Reasoning',
    sub: 'Deep Analysis',
    titleThai: 'วิเคราะห์เชิงเหตุผล',
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
    sub: 'Knowledge AI',
    titleThai: 'องค์ความรู้และการเรียนรู้',
    color: '#34d399',
    prompt: 'ช่วยอธิบายและสรุปแนวคิดองค์ความรู้นี้: ',
    grounding: false
  },
  {
    id: 'technical',
    symbol: '◈',
    title: 'Technical',
    sub: 'Engineering',
    titleThai: 'งานเทคนิคและโค้ด',
    color: '#00D9A3',
    prompt: 'ช่วยตรวจสอบ แนะนำ หรือเขียนโค้ดและสถาปัตยกรรมสำหรับ: ',
    grounding: false
  },
  {
    id: 'learning',
    symbol: '◇',
    title: 'Learning',
    sub: 'Learning AI',
    titleThai: 'การศึกษาและพัฒนาตนเอง',
    color: '#60a5fa',
    prompt: 'ช่วยสอนและจัดทำโครงร่างการเรียนรู้สำหรับ: ',
    grounding: false
  }
];

/* =========================================================
   HOME EXPERIENCE — UNIVERSAL WORKSPACE
   ZYNTHEOR Universal Intelligence Platform
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

  // Strict Model Identity contract validation
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
      {/* Subtle ambient lighting */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[80%] h-[50%] bg-gradient-to-b from-[#2563EB]/10 via-[#00D9A3]/5 to-transparent blur-[140px]" />
      </div>

      <div className="relative max-w-[1020px] mx-auto w-full px-4 sm:px-6 md:px-8 py-6 md:py-8 space-y-6 md:space-y-8">
        
        {/* =================================================
            1. TOP HEADER & BRAND
            ◈ ZYNTHEOR · Universal Intelligence Platform
        ================================================= */}
        <header className="flex items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#00D9A3] to-[#2563EB] grid place-items-center shadow-[0_0_20px_rgba(0,217,163,0.2)] text-black font-black text-lg select-none">
              ◈
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-lg text-white">
                  ◈ ZYNTHEOR
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#00D9A3]/10 text-[#00D9A3] border border-[#00D9A3]/20">
                  AI ENGINE
                </span>
              </div>
              <div className="text-[11px] text-white/40 tracking-wide font-medium">
                Universal Intelligence Platform
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('zyntheor:open-control-center'))}
              title="Open ZYNTHEOR Control Center (Cmd+,)"
              className="px-3.5 py-1.5 rounded-[14px] bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-[#00D9A3]/40 text-[11px] font-semibold text-white/80 hover:text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Sliders size={13} className="text-[#00D9A3]" />
              <span>Control Center</span>
              <kbd className="hidden sm:inline-block ml-1 px-1 py-0.2 rounded bg-white/10 text-[9px] font-mono text-white/50">⌘,</kbd>
            </button>
          </div>
        </header>

        {/* Maintenance Mode Read-Only Banner */}
        {isMaintenanceMode && (
          <div className="p-4 rounded-[16px] bg-red-500/10 border border-red-500/30 flex items-center gap-3.5 text-xs text-red-200">
            <Lock size={18} className="text-red-400 shrink-0" />
            <div>
              <span className="font-bold text-red-300">READ-ONLY MAINTENANCE MODE ACTIVE:</span> ระบบตรวจพบการเบี่ยงเบนของ SSoT Drift เกินเกณฑ์แคนอนิคัล (Δ0.00%) คำสั่งสร้างหรือแก้ไขข้อมูลถูกระงับชั่วคราว
            </div>
          </div>
        )}

        {/* Strict Model Identity Contract Alert if Invalid or Unauthorized Fallback Detected */}
        {!contractValidation.valid && (
          <div className="p-4 rounded-[16px] bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5 text-xs text-amber-200">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300">
                MODEL IDENTITY CONTRACT VIOLATION: UNAUTHORIZED DEFAULT FALLBACK BLOCKED
              </div>
              <div className="text-amber-200/80 mt-1">
                {contractValidation.reason}
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            2. HERO & OMNI-COMPOSER
            "Intelligence Without Boundaries"
            "Your universal AI workspace"
        ================================================= */}
        <section className="space-y-6 pt-2 md:pt-4 text-center">
          <div className="space-y-2 max-w-xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
              Intelligence Without Boundaries
            </h1>
            <p className="text-sm md:text-base text-white/50">
              Your universal AI workspace
            </p>
          </div>

          {/* Omni Composer Box (Standard 18px radius) */}
          <div className="max-w-2xl mx-auto text-left rounded-[18px] border border-white/10 bg-[#0b1020]/95 backdrop-blur-xl p-4 shadow-2xl transition focus-within:border-[#00D9A3]/50 focus-within:shadow-[0_0_30px_rgba(0,217,163,0.12)]">
            <div className="p-1 sm:p-1.5">
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
                    : "What would you like to do?"
                }
                rows={3}
                aria-label="What would you like to do?"
                className="w-full resize-none bg-transparent outline-none text-sm text-white placeholder:text-white/30 leading-relaxed font-sans"
              />

              {/* Quick Action Suggestion Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-2.5 pb-1">
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
                    className="px-2.5 py-1 rounded-[10px] bg-white/[0.04] hover:bg-white/[0.09] text-[11px] font-medium text-white/60 hover:text-white border border-white/5 transition cursor-pointer"
                  >
                    {act.label}
                  </button>
                ))}
                <NavLink
                  to="/explore"
                  className="px-2.5 py-1 rounded-[10px] bg-white/[0.02] hover:bg-white/[0.06] text-[11px] font-medium text-[#00D9A3] hover:underline transition cursor-pointer"
                >
                  + More Capabilities
                </NavLink>
              </div>

              {/* Bottom Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06] mt-2">
                <div className="flex items-center gap-2">
                  {/* Attachment button */}
                  <button
                    type="button"
                    title="แนบไฟล์หรือเอกสาร"
                    onClick={() => navigate('/library')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-[14px] bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition cursor-pointer text-xs"
                  >
                    <span className="font-bold text-sm leading-none">＋</span>
                    <span className="text-[11px] font-medium hidden sm:inline">Attach</span>
                  </button>

                  {/* Online Search Toggle */}
                  <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white/70 cursor-pointer select-none transition">
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
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] bg-white/[0.03] border border-white/5 text-[11px] font-mono text-white/60 hover:text-white transition cursor-pointer"
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
                  className="h-9 px-5 rounded-[14px] bg-[#00D9A3] text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer shadow-lg shadow-[#00D9A3]/10"
                >
                  <span>ส่งคำสั่ง</span>
                  <Send size={12} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            3. ZYNTHEOR CORE HEALTH WIDGET
            Truthful Runtime Status & Enclave Verification
        ================================================= */}
        <section className="space-y-2">
          <ZyntheorCoreHealthWidget
            onMaintenanceModeChange={setIsMaintenanceMode}
          />
        </section>

        {/* =================================================
            4. CAPABILITIES
            ◈ Research, ◇ Reasoning, ◈ Creation,
            ◇ Knowledge, ◈ Technical, ◇ Learning
        ================================================= */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-widest text-white/50 uppercase">
              CAPABILITIES
            </h2>
            <NavLink
              to="/explore"
              className="text-xs font-bold text-[#00D9A3] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Explore All Capabilities</span>
              <ChevronRight size={13} />
            </NavLink>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {CANONICAL_CAPABILITIES.map(item => (
              <button
                key={item.id}
                onClick={() => handleStart(item.prompt, item.grounding)}
                className="text-left rounded-[16px] border border-white/[0.07] bg-[#0b1020]/90 p-4 space-y-2.5 hover:border-white/20 hover:bg-[#111a2d] transition group cursor-pointer shadow-md"
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

        {/* =================================================
            5. YOUR WORKSPACE
            Recent Work · Knowledge · Projects
        ================================================= */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-widest text-white/50 uppercase">
              YOUR WORKSPACE
            </h2>
            <NavLink
              to="/library"
              className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Open Library</span>
              <ChevronRight size={13} />
            </NavLink>
          </div>

          <div className="grid sm:grid-cols-3 gap-3.5">
            {/* 1. Recent Work */}
            <div className="rounded-[16px] border border-white/[0.08] bg-[#0b1020]/90 p-4 space-y-3 flex flex-col justify-between shadow-md">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <Clock size={14} />
                    Recent Work
                  </span>
                  <span className="text-[10px] text-white/30">ประวัติงาน</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { title: 'วิเคราะห์โครงสร้าง Sovereign AI Engine', time: 'วันนี้' },
                    { title: 'สรุปมาตรฐานความมั่นคง Enclave', time: 'เมื่อวานนี้' },
                    { title: 'ตรวจสอบโค้ด React Hook & Navigation', time: '3 วันก่อน' }
                  ].map((s, idx) => (
                    <div
                      key={idx}
                      onClick={() => navigate('/chat')}
                      className="p-2 rounded-[12px] bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between text-xs cursor-pointer transition"
                    >
                      <span className="truncate pr-1 text-white/80 text-[11px]">{s.title}</span>
                      <span className="text-[9px] text-white/30 shrink-0">{s.time}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => navigate('/chat')}
                className="w-full py-2 rounded-[14px] bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Resume in Intelligence</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {/* 2. Knowledge & Memory */}
            <div className="rounded-[16px] border border-white/[0.08] bg-[#0b1020]/90 p-4 space-y-3 flex flex-col justify-between shadow-md">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-1.5 text-purple-400">
                    <BookOpen size={14} />
                    Knowledge
                  </span>
                  <span className="text-[10px] text-white/30">คลังความรู้</span>
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  รวบรวมเอกสาร สาระสำคัญ และ Semantic Memory เพื่อนำบริบทมาใช้ในการประมวลผลอย่างต่อเนื่อง
                </p>
                <div className="p-2.5 rounded-[12px] bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Brain size={14} className="text-[#00D9A3]" />
                    <span className="text-[11px] text-white font-medium">Memory Active</span>
                  </div>
                  <NavLink
                    to="/memory"
                    className="text-[11px] text-[#00D9A3] hover:underline font-bold"
                  >
                    Manage
                  </NavLink>
                </div>
              </div>
              <button
                onClick={() => navigate('/library')}
                className="w-full py-2 rounded-[14px] bg-purple-500/10 hover:bg-purple-500/20 text-xs font-bold text-purple-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Browse Documents</span>
                <ChevronRight size={12} />
              </button>
            </div>

            {/* 3. Projects */}
            <div className="rounded-[16px] border border-white/[0.08] bg-[#0b1020]/90 p-4 space-y-3 flex flex-col justify-between shadow-md">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-1.5 text-[#00D9A3]">
                    <Layers size={14} />
                    Projects
                  </span>
                  <span className="text-[10px] text-white/30">พื้นที่โครงการ</span>
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  จัดการโปรเจกต์ โค้ด และเวิร์กสเปซที่เชื่อมโยงกับ Repository Intelligence และ Code Graph
                </p>
                <div className="p-2.5 rounded-[12px] bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00D9A3]" />
                    <span className="text-[11px] text-white font-medium">Repository Synced</span>
                  </div>
                  <NavLink
                    to="/workspace"
                    className="text-[11px] text-[#00D9A3] hover:underline font-bold"
                  >
                    Open
                  </NavLink>
                </div>
              </div>
              <button
                onClick={() => navigate('/workspace')}
                className="w-full py-2 rounded-[14px] bg-[#00D9A3]/10 hover:bg-[#00D9A3]/20 text-xs font-bold text-[#00D9A3] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Enter Workspace</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </section>

        {/* =================================================
            6. SOVEREIGN PLATFORM FOOTER
        ================================================= */}
        <footer className="pt-4 pb-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <div className="flex items-center gap-2.5">
            <span className="font-black text-white tracking-wider">◈ ZYNTHEOR</span>
            <span>·</span>
            <span className="text-[#00D9A3] font-medium">ZYNTHEOR CORE</span>
            <span>·</span>
            <span>Universal Intelligence Platform</span>
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
