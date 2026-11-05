// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Network,
  BarChart3,
  ShieldCheck,
  Settings,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  Zap,
  Activity,
  Flame,
  Lock,
  HardDrive
} from 'lucide-react';
import { HardwareEnclaveTelemetryWidget } from '../components/HardwareEnclaveTelemetryWidget';

export default function MorePage() {
  const navigate = useNavigate();

  const hubs = [
    {
      id: 'models',
      title: 'ZYNTHEOR CORE Studio',
      titleThai: 'สตูดิโอจัดการโมเดลและน้ำหนัก',
      path: '/model-studio',
      icon: Cpu,
      color: '#00D9A3',
      badge: 'First-Party Model',
      description: 'ตรวจสอบสถานะโมเดล ZYNTHEOR CORE ตรวจสอบ Provenance ข้อมูลการเทรน และสถาปัตยกรรมโมเดล'
    },
    {
      id: 'agents',
      title: 'Agent Command Center',
      titleThai: 'ศูนย์บัญชาการเอเจนต์',
      path: '/agents',
      icon: Network,
      color: '#8b5cf6',
      badge: 'Autonomous',
      description: 'จัดการกระบวนการทำงานอัตโนมัติหลายขั้นตอน (Multi-step Agent) เฝ้าระวังงาน และการประสานงาน'
    },
    {
      id: 'eval',
      title: 'Evaluation Lab',
      titleThai: 'ห้องปฏิบัติการประเมินผล',
      path: '/evaluation',
      icon: BarChart3,
      color: '#f59e0b',
      badge: 'Benchmarks',
      description: 'ทดสอบเกณฑ์มาตรฐาน การประเมินคุณภาพโมเดล การถดถอยของความสามารถ และการวัดผลความแม่นยำ'
    },
    {
      id: 'diagnostics',
      title: 'Diagnostics & Forensic Dossier',
      titleThai: 'การวินิจฉัยและสถิติดิจิทัล',
      path: '/diagnostics',
      icon: ShieldCheck,
      color: '#38bdf8',
      badge: 'COURT_READY',
      description: 'ตรวจสอบความสมบูรณ์ของ Merkle Root #849202, Audit Ledger, หลักฐานดิจิทัล และ Cross-Layer Engine'
    }
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#050810] text-white">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 space-y-10">
        
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-[10px] font-bold text-white/60">
            <Layers size={12} className="text-[#8b5cf6]" />
            ADVANCED WORKSPACES & SYSTEM
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            System & Advanced Hub
          </h1>
          <p className="text-sm text-white/50 max-w-2xl leading-relaxed">
            พื้นที่เฉพาะสำหรับงานวิศวกรรมขั้นสูง การกำกับดูแลโมเดล CORE ระบบเอเจนต์อัตโนมัติ และการตรวจสอบความสมบูรณ์ของระบบ
          </p>
        </div>

        {/* Live Hardware Enclave Telemetry Widget (Cleanly placed in the System Hub) */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-white/40 tracking-wider uppercase">
            Hardware Enclave Telemetry · Live System Clock
          </div>
          <HardwareEnclaveTelemetryWidget />
        </div>

        {/* Main Hub Cards */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-white/40 tracking-wider uppercase">
            Advanced Workspaces
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {hubs.map((hub) => {
              const Icon = hub.icon;
              return (
                <div
                  key={hub.id}
                  onClick={() => navigate(hub.path)}
                  className="rounded-3xl border border-white/10 bg-[#0b1020] p-6 space-y-4 hover:border-white/20 transition cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl grid place-items-center border"
                        style={{
                          backgroundColor: `${hub.color}15`,
                          borderColor: `${hub.color}35`,
                          color: hub.color
                        }}
                      >
                        <Icon size={22} />
                      </div>

                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
                        style={{
                          backgroundColor: `${hub.color}10`,
                          borderColor: `${hub.color}30`,
                          color: hub.color
                        }}
                      >
                        {hub.badge}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-white group-hover:text-[#00D9A3] transition">
                        {hub.titleThai}
                      </h2>
                      <div className="text-xs text-white/40 font-mono mt-0.5">
                        {hub.title}
                      </div>
                    </div>

                    <p className="text-xs text-white/50 leading-relaxed">
                      {hub.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/5 text-xs font-bold flex items-center justify-between" style={{ color: hub.color }}>
                    <span>เข้าสู่หน้า {hub.title.split(' ')[0]}</span>
                    <ChevronRight size={15} className="group-hover:translate-x-1 transition" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Platform Identity & Architecture Card */}
        <div className="p-6 rounded-3xl border border-white/10 bg-[#070b16] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">
                ZYNTHEOR AI ENGINE · Platform Architecture
              </h3>
              <p className="text-xs text-white/40 mt-1">
                Sovereign Architecture: One Intelligence Core · Multiple Applications (Web, Mobile, Desktop)
              </p>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
              SSoT Δ0.00%
            </span>
          </div>

          <div className="grid sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-[10px] text-white/40">Platform</div>
              <div className="font-bold text-[#00D9A3] mt-1">ZYNTHEOR AI ENGINE</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-[10px] text-white/40">Intelligence</div>
              <div className="font-bold text-[#a78bfa] mt-1">ZYNTHEOR INTELLIGENCE</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-[10px] text-white/40">Core Model</div>
              <div className="font-bold text-white mt-1">ZYNTHEOR CORE</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-[10px] text-white/40">Genesis Block</div>
              <div className="font-bold text-cyan-300 mt-1">#849202</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
