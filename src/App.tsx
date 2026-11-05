// @ts-nocheck
/**
 * ZYNTHEOR AI ENGINE
 * Product-first Home Experience
 *
 * Product: ZYNTHEOR AI ENGINE
 * Intelligence: ZYNTHEOR INTELLIGENCE
 * Model Family: ZYNTHEOR CORE
 *
 * Principles:
 * - Product first, not developer dashboard
 * - Intelligence is the primary experience
 * - No fabricated model status
 * - No fabricated backend capabilities
 * - Mobile-first navigation
 * - Preserve existing application modules
 */

import { useCallback, useMemo, useState } from 'react';

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
  Search
} from 'lucide-react';

import {
  CAPABILITIES,
  classifyAutoMode,
  type CapabilityId
} from './lib/capabilityEngine';

import {
  getActiveModel,
  validateModelIdentity
} from './lib/modelIdentityContract';

import { MainChat } from './components/MainChat';
import AIWorkspace from './pages/AIWorkspace';
import ModelStudio from './components/model-studio/ModelStudio';
import EvaluationLab from './pages/EvaluationLab';
import AgentCommandCenter from './pages/AgentCommandCenter';
import MemoryCenter from './pages/MemoryCenter';
import Diagnostics from './pages/Diagnostics';

/* =========================================================
   TYPES
========================================================= */

type Page =
  | 'home'
  | 'chat'
  | 'memory'
  | 'knowledge'
  | 'models'
  | 'agents'
  | 'eval'
  | 'diagnostics';

/* =========================================================
   CAPABILITY GROUPS
========================================================= */

const CAPABILITY_GROUPS = [
  {
    group: 'ความรู้และการเรียนรู้',
    groupEn: 'Knowledge & Learning',
    icon: BookOpen,
    color: '#38bdf8',
    ids: [
      'KNOWLEDGE_RESEARCH',
      'EDUCATION'
    ] as CapabilityId[]
  },
  {
    group: 'ภาษาและการสื่อสาร',
    groupEn: 'Language & Communication',
    icon: PenLine,
    color: '#fb7185',
    ids: [
      'WRITING_TRANSLATION',
      'GENERAL_CONVERSATION'
    ] as CapabilityId[]
  },
  {
    group: 'การวิเคราะห์และแก้ปัญหา',
    groupEn: 'Analysis & Reasoning',
    icon: BarChart3,
    color: '#a78bfa',
    ids: [
      'REASONING',
      'DATA_ANALYSIS'
    ] as CapabilityId[]
  },
  {
    group: 'การสร้างสรรค์และเทคโนโลยี',
    groupEn: 'Creative & Technology',
    icon: Wrench,
    color: '#fb923c',
    ids: [
      'CREATIVITY',
      'TECHNICAL_ASSISTANCE',
      'PRODUCTIVITY'
    ] as CapabilityId[]
  }
];

/* =========================================================
   MODEL IDENTITY
   Registry identity is not runtime availability.
========================================================= */

function ModelIdentitySection() {
  const [modelState] = useState(() => {
    try {
      const model = getActiveModel();

      if (!model) {
        return {
          model: null,
          validation: null,
          state: 'UNAVAILABLE'
        };
      }

      const validation = validateModelIdentity(model);

      return {
        model,
        validation,
        state:
          validation?.valid === true
            ? 'IDENTITY_VALID'
            : 'IDENTITY_INVALID'
      };
    } catch {
      return {
        model: null,
        validation: null,
        state: 'UNAVAILABLE'
      };
    }
  });

  const stateStyles = {
    IDENTITY_VALID:
      'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',

    IDENTITY_INVALID:
      'bg-red-500/10 border-red-500/20 text-red-300',

    UNAVAILABLE:
      'bg-white/[0.05] border-white/10 text-white/40'
  };

  const stateLabels = {
    IDENTITY_VALID: 'IDENTITY VALID',
    IDENTITY_INVALID: 'IDENTITY INVALID',
    UNAVAILABLE: 'UNAVAILABLE'
  };

  const model = modelState.model;
  const state = modelState.state;

  const errors = Array.isArray(modelState.validation?.errors)
    ? modelState.validation.errors
    : [];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/[0.08] grid place-items-center">
          <Cpu size={18} />
        </div>

        <div>
          <h2 className="font-bold text-lg">
            ZYNTHEOR CORE
          </h2>

          <p className="text-xs text-white/40">
            Model Identity & Provenance
          </p>
        </div>

        <span
          className={`ml-auto px-3 py-1 rounded-full border text-[10px] font-bold ${stateStyles[state]}`}
        >
          {stateLabels[state]}
        </span>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#0b1020] p-5">
        {!model ? (
          <div className="flex gap-3 items-start">
            <ShieldCheck
              className="text-white/30 shrink-0"
              size={20}
            />

            <div>
              <div className="font-bold text-sm">
                Model information unavailable
              </div>

              <p className="text-xs text-white/40 mt-1 leading-5">
                ไม่สามารถอ่านข้อมูล Active Model ได้ในขณะนี้
                ระบบจะไม่เลือกโมเดลสำรองมาแสดงเป็นโมเดลที่กำลังทำงาน
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00D9A3] to-[#00b386] grid place-items-center shrink-0">
                <Cpu size={21} className="text-black" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base break-words">
                  {model.displayName || 'Unnamed Model'}
                </h3>

                <p className="text-xs text-white/40 font-mono mt-1 break-all">
                  {model.modelId || 'Unknown model ID'}
                </p>

                <div className="flex flex-wrap gap-2 mt-3">
                  {model.status && (
                    <span className="text-[10px] px-2 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/60">
                      Registry: {model.status}
                    </span>
                  )}

                  {model.baseModel && (
                    <span className="text-[10px] px-2 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/60">
                      Base: {model.baseModel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="text-xs font-bold text-red-300 mb-2">
                  Identity validation issues
                </div>

                {errors.map((error, index) => (
                  <div
                    key={index}
                    className="text-[11px] text-red-200/70 leading-5 break-words"
                  >
                    • {String(error)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-white/30">
            Identity validation does not prove active inference.
          </div>

          <NavLink
            to="/model-studio"
            className="text-xs text-[#00D9A3] hover:text-white transition flex items-center gap-1 shrink-0"
          >
            Model Studio
            <ChevronRight size={13} />
          </NavLink>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   HOME EXPERIENCE
========================================================= */

function HomeExperience() {
  const navigate = useNavigate();

  const [input, setInput] = useState('');
  const [grounding, setGrounding] = useState(false);

  const handleStart = useCallback(
    (text?: string) => {
      const query = (text ?? input).trim();

      if (!query) return;

      const params = new URLSearchParams();

      params.set('q', query);
      params.set('grounding', grounding ? '1' : '0');

      navigate(`/chat?${params.toString()}`);
    },
    [input, grounding, navigate]
  );

  const currentCapability = useMemo(
    () => classifyAutoMode(input || 'สวัสดีครับ'),
    [input]
  );

  const currentCapabilityMeta = useMemo(
    () => CAPABILITIES.find(
      capability => capability.id === currentCapability
    ),
    [currentCapability]
  );

  return (
    <main className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[#050810] text-white">
      {/* Background */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[25%] left-1/2 -translate-x-1/2 w-[90%] h-[60%] bg-gradient-to-b from-[#00D9A3]/10 via-[#8b5cf6]/5 to-transparent blur-[110px]" />

        <div className="absolute top-[45%] -right-[20%] w-[60%] h-[40%] bg-gradient-to-l from-[#fb7185]/5 to-transparent blur-[100px]" />
      </div>

      <div className="relative max-w-[1120px] mx-auto w-full px-4 sm:px-6 md:px-8 py-7 md:py-12 space-y-14 md:space-y-20">

        {/* =================================================
            1. PRODUCT HERO
        ================================================= */}

        <section className="space-y-7">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-[10px] tracking-[0.15em] font-bold text-white/50">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D9A3]" />
            ZYNTHEOR AI ENGINE
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12">
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00D9A3] to-[#00b386] grid place-items-center shadow-[0_0_30px_rgba(0,217,163,0.25)]">
                  <span className="font-black text-black text-2xl">
                    Z
                  </span>
                </div>

                <div>
                  <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
                    ZYNTHEOR
                  </h1>

                  <p className="text-xs md:text-sm tracking-[0.2em] font-bold text-[#00D9A3] mt-2">
                    AI ENGINE
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl md:text-4xl font-bold leading-tight tracking-tight">
                  Intelligence for
                  <br />

                  <span className="bg-gradient-to-r from-[#00D9A3] to-[#a78bfa] bg-clip-text text-transparent">
                    Everything You Create.
                  </span>
                </h2>

                <p className="text-sm md:text-base leading-7 text-white/50 max-w-[580px]">
                  แพลตฟอร์ม AI อเนกประสงค์ที่ออกแบบให้มี Intelligence,
                  Knowledge และ Model Ecosystem เป็นของตัวเอง
                  รองรับภาษาไทย ภาษาอังกฤษ ความรู้ การวิเคราะห์
                  การค้นคว้า และการสร้างสรรค์
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  'General Intelligence',
                  'Thai-first',
                  'Knowledge-aware',
                  'CORE Model Family'
                ].map(item => (
                  <span
                    key={item}
                    className="px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] text-white/60"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  onClick={() => navigate('/chat')}
                  className="h-11 px-6 rounded-full bg-white text-black font-bold text-sm flex items-center gap-2 hover:bg-[#00D9A3] transition"
                >
                  <Sparkles size={16} />
                  Open Intelligence
                </button>

                <button
                  onClick={() =>
                    document
                      .getElementById('capabilities')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="h-11 px-6 rounded-full bg-white/[0.05] border border-white/10 text-white font-bold text-sm hover:bg-white/[0.1] transition"
                >
                  Explore Capabilities
                </button>
              </div>
            </div>

            {/* Product Architecture */}

            <div className="w-full lg:w-[300px] rounded-3xl border border-white/[0.08] bg-[#0b1020]/80 backdrop-blur-xl p-5 space-y-4">
              <div className="text-[10px] tracking-[0.18em] font-bold text-white/30">
                PRODUCT ARCHITECTURE
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-bold text-[#00D9A3]">
                    ZYNTHEOR AI ENGINE
                  </div>

                  <div className="text-xs text-white/40 mt-1">
                    The AI Platform
                  </div>
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div>
                  <div className="text-sm font-bold text-[#a78bfa]">
                    ZYNTHEOR INTELLIGENCE
                  </div>

                  <div className="text-xs text-white/40 mt-1">
                    Intelligence & Reasoning Layer
                  </div>
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div>
                  <div className="text-sm font-bold text-white">
                    ZYNTHEOR CORE
                  </div>

                  <div className="text-xs text-white/40 mt-1">
                    First-party Model Family
                  </div>
                </div>

                <div className="h-px bg-white/[0.06]" />

                <div>
                  <div className="text-sm font-bold text-white/80">
                    KNOWLEDGE & MEMORY
                  </div>

                  <div className="text-xs text-white/40 mt-1">
                    Context, Information & Continuity
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            2. INTELLIGENCE WORKSPACE
        ================================================= */}

        <section
          id="intelligence-workspace"
          className="space-y-4 scroll-mt-6"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00D9A3] text-black grid place-items-center">
              <MessageSquare size={17} />
            </div>

            <div>
              <h2 className="font-bold text-lg">
                Intelligence Workspace
              </h2>

              <p className="text-xs text-white/40">
                พื้นที่เริ่มต้นสำหรับทุกคำถามและทุกความคิด
              </p>
            </div>

            {currentCapabilityMeta && (
              <span className="ml-auto hidden sm:flex items-center gap-1.5 text-[10px] text-[#00D9A3] bg-[#00D9A3]/10 border border-[#00D9A3]/20 rounded-full px-3 py-1">
                <Zap size={12} />
                {currentCapabilityMeta.nameThai}
              </span>
            )}
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-[#0b1020]/80 p-2 shadow-2xl">
            <div className="rounded-[20px] bg-[#0f1629] border border-white/[0.05] p-4 md:p-5">
              <textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleStart();
                  }
                }}
                placeholder="ถามอะไรก็ได้... ค้นคว้า เรียนรู้ วิเคราะห์ เขียน สร้างสรรค์ หรือแก้ปัญหา"
                rows={3}
                aria-label="Intelligence prompt"
                className="w-full resize-none bg-transparent outline-none text-sm leading-7 placeholder:text-white/25"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-white/[0.06]">
                <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={grounding}
                    onChange={event => setGrounding(event.target.checked)}
                    className="accent-[#00D9A3]"
                  />

                  <Globe
                    size={14}
                    className={
                      grounding
                        ? 'text-[#00D9A3]'
                        : 'text-white/30'
                    }
                  />

                  Internet Intelligence
                </label>

                <button
                  onClick={() => handleStart()}
                  disabled={!input.trim()}
                  className="h-10 px-5 rounded-full bg-[#00D9A3] text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <Send size={15} />
                  Start Intelligence
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              'อธิบายแนวคิดทางวิทยาศาสตร์ให้เข้าใจง่าย',
              'ช่วยวิเคราะห์ปัญหาและเสนอแนวทางแก้ไข',
              'ช่วยวางแผนสร้างผลิตภัณฑ์ AI',
              'ช่วยเรียนรู้เทคโนโลยีใหม่'
            ].map(example => (
              <button
                key={example}
                onClick={() => handleStart(example)}
                className="text-[11px] text-white/50 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-2 hover:text-white hover:border-[#00D9A3]/30 transition"
              >
                {example}
              </button>
            ))}
          </div>
        </section>

        {/* =================================================
            3. CAPABILITIES
        ================================================= */}

        <section id="capabilities" className="space-y-6 scroll-mt-6">
          <div>
            <h2 className="font-bold text-xl">
              Intelligence Capabilities
            </h2>

            <p className="text-xs text-white/40 mt-1">
              ความสามารถอเนกประสงค์ที่เข้าถึงผ่าน Intelligence เดียว
            </p>
          </div>

          <div className="space-y-7">
            {CAPABILITY_GROUPS.map(group => {
              const GroupIcon = group.icon;

              return (
                <div key={group.group} className="space-y-3">
                  <div
                    className="flex flex-wrap items-center gap-2 text-xs font-bold"
                    style={{ color: group.color }}
                  >
                    <GroupIcon size={15} />

                    {group.group}

                    <span className="text-white/20 font-normal">
                      / {group.groupEn}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.ids.map(id => {
                      const capability = CAPABILITIES.find(
                        item => item.id === id
                      );

                      if (!capability) return null;

                      const example =
                        capability.examples?.[0] ||
                        capability.nameThai ||
                        'ช่วยฉันเริ่มต้นงานนี้';

                      return (
                        <button
                          key={capability.id}
                          onClick={() => handleStart(example)}
                          className="text-left rounded-2xl border border-white/[0.07] bg-[#0b1020]/70 p-4 hover:bg-[#111a2d] hover:border-white/20 transition group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="w-9 h-9 rounded-xl grid place-items-center border text-base"
                              style={{
                                background: `${group.color}15`,
                                borderColor: `${group.color}30`
                              }}
                            >
                              {capability.icon}
                            </span>

                            <span className="text-[9px] text-white/25 font-mono">
                              {capability.id}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold mt-4">
                            {capability.nameThai}
                          </h3>

                          <p className="text-[11px] text-white/40 mt-1 leading-5 line-clamp-2">
                            {capability.description}
                          </p>

                          <div className="mt-4 text-[11px] text-[#00D9A3] flex items-center gap-1">
                            เริ่มใช้งาน
                            <ChevronRight size={13} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =================================================
            4. KNOWLEDGE & MEMORY
        ================================================= */}

        <section className="space-y-5">
          <div>
            <h2 className="font-bold text-xl">
              Knowledge & Memory
            </h2>

            <p className="text-xs text-white/40 mt-1">
              ระบบข้อมูล ความรู้ และความต่อเนื่องของ Intelligence
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">

            {/* Memory */}

            <button
              onClick={() => navigate('/memory')}
              className="text-left rounded-2xl border border-white/[0.08] bg-[#0b1020] p-5 hover:border-[#00D9A3]/30 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#00D9A3]/10 grid place-items-center">
                <Brain size={19} className="text-[#00D9A3]" />
              </div>

              <h3 className="font-bold text-sm mt-4">
                Memory
              </h3>

              <p className="text-xs text-white/40 mt-2 leading-5">
                เข้าถึงระบบความจำและบริบทที่ระบบจัดเก็บไว้
              </p>

              <div className="text-[11px] text-[#00D9A3] mt-4 flex items-center gap-1">
                Open Memory
                <ChevronRight size={13} />
              </div>
            </button>

            {/* Files */}

            <button
              onClick={() => navigate('/chat')}
              className="text-left rounded-2xl border border-white/[0.08] bg-[#0b1020] p-5 hover:border-[#38bdf8]/30 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#38bdf8]/10 grid place-items-center">
                <Files size={19} className="text-[#38bdf8]" />
              </div>

              <h3 className="font-bold text-sm mt-4">
                Files & Documents
              </h3>

              <p className="text-xs text-white/40 mt-2 leading-5">
                เริ่มงานกับเอกสารผ่าน Intelligence Workspace
                โดยขึ้นอยู่กับความสามารถจัดการไฟล์ที่เชื่อมต่ออยู่
              </p>

              <div className="text-[11px] text-[#38bdf8] mt-4 flex items-center gap-1">
                Open Intelligence
                <ChevronRight size={13} />
              </div>
            </button>

            {/* Knowledge */}

            <button
              onClick={() => navigate('/knowledge')}
              className="text-left rounded-2xl border border-white/[0.08] bg-[#0b1020] p-5 hover:border-[#a78bfa]/30 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#a78bfa]/10 grid place-items-center">
                <BookOpen size={19} className="text-[#a78bfa]" />
              </div>

              <h3 className="font-bold text-sm mt-4">
                Knowledge
              </h3>

              <p className="text-xs text-white/40 mt-2 leading-5">
                เริ่มต้นค้นคว้าและวิเคราะห์ความรู้ผ่าน Intelligence
              </p>

              <div className="text-[11px] text-[#a78bfa] mt-4 flex items-center gap-1">
                Explore Knowledge
                <ChevronRight size={13} />
              </div>
            </button>
          </div>
        </section>

        {/* =================================================
            5. INTERNET INTELLIGENCE
        ================================================= */}

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#38bdf8]/15 grid place-items-center">
              <Compass size={18} className="text-[#38bdf8]" />
            </div>

            <div>
              <h2 className="font-bold text-lg">
                Internet Intelligence
              </h2>

              <p className="text-xs text-white/40">
                ค้นคว้าข้อมูลภายนอกเมื่อจำเป็น
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0b1020] p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              <div className="flex-1">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Globe size={17} className="text-[#38bdf8]" />
                  Online Research
                </div>

                <p className="text-xs text-white/40 mt-3 leading-6 max-w-[600px]">
                  ใช้การค้นคว้าข้อมูลออนไลน์เพื่อเพิ่มบริบทให้ Intelligence
                  สำหรับคำถามที่ต้องการข้อมูลล่าสุด
                  โดยต้องมีแหล่งข้อมูลที่ตรวจสอบได้
                  และต้องมี Backend รองรับการค้นคว้าจริง
                </p>

                <div className="flex flex-wrap gap-2 mt-4">
                  {[
                    'Current Information',
                    'Source References',
                    'Research Context'
                  ].map(item => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] text-white/50"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setGrounding(true);

                  document
                    .getElementById('intelligence-workspace')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="h-11 px-5 rounded-full bg-[#38bdf8]/10 border border-[#38bdf8]/20 text-[#38bdf8] text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#38bdf8]/20 transition"
              >
                <Search size={15} />

                Enable Online Research
              </button>
            </div>
          </div>
        </section>

        {/* =================================================
            6. MODEL IDENTITY
        ================================================= */}

        <ModelIdentitySection />

        {/* =================================================
            7. PRODUCT FOOTER
        ================================================= */}

        <footer className="pt-6 pb-6 border-t border-white/[0.06]">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <div className="text-sm font-black tracking-wider">
                ZYNTHEOR
              </div>

              <div className="text-[10px] text-white/30 mt-1">
                AI ENGINE · INTELLIGENCE · CORE
              </div>
            </div>

            <div className="text-[10px] text-white/25">
              Model identity information is shown separately from runtime status.
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

/* =========================================================
   APP NAVIGATION
========================================================= */

function AppShell() {
  const location = useLocation();

  const current = useMemo(() => {
    const path = location.pathname;

    if (path === '/' || path === '/home') return 'home';

    if (
      path.startsWith('/chat') ||
      path.startsWith('/workspace')
    ) {
      return 'chat';
    }

    if (path.startsWith('/memory')) return 'memory';

    if (path.startsWith('/knowledge')) return 'knowledge';

    if (path.startsWith('/model')) return 'models';

    if (path.startsWith('/agent')) return 'agents';

    if (path.startsWith('/eval')) return 'eval';

    if (path.startsWith('/diagnostics')) return 'diagnostics';

    return 'home';
  }, [location.pathname]);

  /*
   * All primary destinations are included.
   * Mobile navigation uses horizontal scrolling instead of hiding items.
   */

  const nav = [
    {
      id: 'home',
      path: '/',
      icon: Home,
      label: 'Home',
      th: 'หน้าแรก'
    },
    {
      id: 'chat',
      path: '/chat',
      icon: Sparkles,
      label: 'Intelligence',
      th: 'Intelligence'
    },
    {
      id: 'knowledge',
      path: '/knowledge',
      icon: BookOpen,
      label: 'Knowledge',
      th: 'ความรู้'
    },
    {
      id: 'memory',
      path: '/memory',
      icon: Brain,
      label: 'Memory',
      th: 'ความจำ'
    },
    {
      id: 'models',
      path: '/model-studio',
      icon: Cpu,
      label: 'CORE',
      th: 'CORE'
    },
    {
      id: 'agents',
      path: '/agents',
      icon: Network,
      label: 'Agents',
      th: 'Agents'
    },
    {
      id: 'eval',
      path: '/evaluation',
      icon: BarChart3,
      label: 'Evaluation',
      th: 'Evaluation'
    },
    {
      id: 'diagnostics',
      path: '/diagnostics',
      icon: ShieldCheck,
      label: 'Diagnostics',
      th: 'ระบบ'
    }
  ];

  return (
    <div className="app-shell flex overflow-hidden antialiased">

      {/* =================================================
          DESKTOP SIDEBAR
      ================================================= */}

      <aside className="hidden md:flex w-[68px] shrink-0 flex-col items-center py-4 gap-3 bg-[#070a14] border-r border-white/[0.06]">
        <NavLink
          to="/"
          title="ZYNTHEOR Home"
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D9A3] to-[#00b386] grid place-items-center font-black text-black text-lg shadow-[0_0_20px_rgba(0,217,163,0.25)]"
        >
          Z
        </NavLink>

        <div className="w-7 h-px bg-white/10 my-1" />

        {nav.map(item => {
          const Icon = item.icon;
          const active = current === item.id;

          return (
            <NavLink
              key={item.id}
              to={item.path}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={`relative w-10 h-10 rounded-xl grid place-items-center transition ${
                active
                  ? 'bg-white text-black'
                  : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <Icon size={18} />

              {active && (
                <span className="absolute -left-1 w-1 h-5 rounded-full bg-[#00D9A3]" />
              )}
            </NavLink>
          );
        })}
      </aside>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        <div className="app-content flex flex-col">
          <Routes>
            <Route path="/" element={<HomeExperience />} />

            <Route path="/home" element={<HomeExperience />} />

            <Route path="/chat" element={<MainChat />} />

            <Route path="/workspace" element={<AIWorkspace />} />

            {/*
              Knowledge currently reuses MainChat.
              This is a navigation entry, not a separate Knowledge Base.
            */}

            <Route path="/knowledge" element={<MainChat />} />

            <Route path="/model-studio" element={<ModelStudio />} />

            <Route path="/evaluation" element={<EvaluationLab />} />

            <Route path="/agents" element={<AgentCommandCenter />} />

            <Route path="/memory" element={<MemoryCenter />} />

            <Route path="/diagnostics" element={<Diagnostics />} />

            <Route path="*" element={<HomeExperience />} />
          </Routes>
        </div>

        {/* =================================================
            MOBILE NAVIGATION
            All destinations remain accessible.
        ================================================= */}

        <nav
          aria-label="Main navigation"
          className="bottom-tab mobile-navigation md:hidden"
        >
          <div className="flex items-stretch min-w-max h-full px-1">
            {nav.map(item => {
              const Icon = item.icon;
              const active = current === item.id;

              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={`mobile-navigation-item transition ${
                    active
                      ? 'text-[#00D9A3]'
                      : 'text-white/40'
                  }`}
                >
                  <Icon size={18} />

                  <span className="text-[9px] font-bold whitespace-nowrap">
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
