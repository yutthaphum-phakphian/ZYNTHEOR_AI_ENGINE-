// @ts-nocheck
import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Lock,
  RefreshCw,
  CheckCircle2,
  X,
  Cpu,
  Flame,
  Activity,
  Zap,
  RotateCcw
} from 'lucide-react';
import { ZYNTHEOR_CANONICAL_STATE, CANONICAL_INVARIANTS } from '../lib/forensicVerification';

interface SystemIntegrityModalProps {
  isOpen: boolean;
  onClose: () => void;
  ssotDrift: string;
  isDriftViolated: boolean;
  cryoTempMk: number;
  qopsThroughput: number;
  activeEnclaves: number;
  onRestoreParity: () => Promise<void> | void;
  onSimulateDrift: () => Promise<void> | void;
}

export function SystemIntegrityModal({
  isOpen,
  onClose,
  ssotDrift,
  isDriftViolated,
  cryoTempMk,
  qopsThroughput,
  activeEnclaves,
  onRestoreParity,
  onSimulateDrift
}: SystemIntegrityModalProps) {
  const [restoring, setRestoring] = useState(false);
  const [simulating, setSimulating] = useState(false);

  if (!isOpen) return null;

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await onRestoreParity();
    } finally {
      setRestoring(false);
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      await onSimulateDrift();
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#070b16] text-white shadow-2xl p-6 sm:p-8 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        {!isDriftViolated && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition"
          >
            <X size={18} />
          </button>
        )}

        {/* Header Section */}
        {isDriftViolated ? (
          <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 grid place-items-center shrink-0">
                <AlertTriangle className="text-red-400" size={22} />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-widest text-red-400 uppercase">
                  System Integrity Check Violation
                </span>
                <h3 className="text-lg font-bold text-white">
                  ตรวจพบ Canonical SSoT Drift Violation ({ssotDrift})
                </h3>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-red-500/20 text-xs text-red-200 leading-relaxed flex items-start gap-2.5">
              <Lock size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong>READ-ONLY / MAINTENANCE MODE ACTIVE:</strong> ระบบเปิดใช้งานการป้องกันแบบ Fail-Closed
                ระงับสิทธิ์การแก้ไขข้อมูล (Mutation Authority Revoked)
                เพื่อปกป้องความสมบูรณ์ของ Merkle Root #849202
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 grid place-items-center shrink-0">
                <ShieldCheck className="text-emerald-400" size={22} />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
                  System Integrity Check · Nominal
                </span>
                <h3 className="text-lg font-bold text-white">
                  Canonical SSoT Parity สมบูรณ์ (Δ0.00%)
                </h3>
              </div>
            </div>
            <p className="text-xs text-white/50 leading-relaxed pl-13">
              ทุก Invariants ผ่านการตรวจสอบตรงตามสเปก Merkle Root #849202 และสภาวะฮาร์ดแวร์เอ็นเคลฟทำงานปกติ
            </p>
          </div>
        )}

        {/* Live Enclave Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <div className="text-[10px] text-white/40 flex items-center gap-1">
              <Flame size={12} className="text-cyan-400" /> Cryo Temp
            </div>
            <div className="text-sm font-mono font-bold text-cyan-300">
              {cryoTempMk} mK
            </div>
            <div className="text-[9px] text-white/30">Subzero Bus Parity</div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <div className="text-[10px] text-white/40 flex items-center gap-1">
              <Activity size={12} className="text-[#00D9A3]" /> QOPS Throughput
            </div>
            <div className="text-sm font-mono font-bold text-[#00D9A3]">
              {qopsThroughput.toLocaleString()}
            </div>
            <div className="text-[9px] text-white/30">Quantum Ops / sec</div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <div className="text-[10px] text-white/40 flex items-center gap-1">
              <Cpu size={12} className="text-amber-400" /> Active Enclaves
            </div>
            <div className="text-sm font-mono font-bold text-amber-300">
              {activeEnclaves} / 10
            </div>
            <div className="text-[9px] text-white/30">FIPS 140-3 Level 4</div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <div className="text-[10px] text-white/40 flex items-center gap-1">
              <ShieldCheck size={12} className={isDriftViolated ? 'text-red-400' : 'text-emerald-400'} /> SSoT Drift
            </div>
            <div className={`text-sm font-mono font-bold ${isDriftViolated ? 'text-red-400' : 'text-emerald-300'}`}>
              {ssotDrift}
            </div>
            <div className="text-[9px] text-white/30">
              {isDriftViolated ? 'VIOLATED' : 'Δ0.00% Canonical'}
            </div>
          </div>
        </div>

        {/* Canonical Invariants Checklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-white/70">
            <span>Canonical Invariants Attestation</span>
            <span className="font-mono text-[10px] text-white/40">
              Genesis Block #{ZYNTHEOR_CANONICAL_STATE.genesis_block}
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1 rounded-xl bg-black/30 p-3 border border-white/5 text-xs font-mono">
            {CANONICAL_INVARIANTS.map((inv, idx) => {
              const isCompromised = isDriftViolated && (inv.id === 'INV-01' || inv.id === 'INV-09');
              return (
                <div
                  key={inv.id}
                  className={`flex items-center justify-between p-2 rounded-lg border transition ${
                    isCompromised
                      ? 'bg-red-500/10 border-red-500/30 text-red-200'
                      : 'bg-white/[0.02] border-white/5 text-white/80'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {isCompromised ? (
                      <AlertTriangle size={13} className="text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    )}
                    <span className="text-[11px] font-bold text-white/50 shrink-0">{inv.id}</span>
                    <span className="text-[11px] truncate">{inv.name}</span>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                      isCompromised
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-emerald-500/10 text-emerald-300'
                    }`}
                  >
                    {isCompromised ? 'DRIFT_DETECTED' : 'ENFORCED'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="text-[11px] text-white/40">
            {isDriftViolated
              ? 'ระบบจำกัดการเข้าถึงแบบ Read-Only จนกว่าจะกู้คืน SSoT Parity'
              : 'สถานะระบบทำงานปกติ 100%'}
          </div>

          <div className="flex items-center gap-3">
            {isDriftViolated ? (
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="h-10 px-5 rounded-full bg-emerald-500 text-black font-bold text-xs flex items-center gap-2 hover:bg-emerald-400 transition disabled:opacity-50"
              >
                <RotateCcw size={14} className={restoring ? 'animate-spin' : ''} />
                {restoring ? 'กำลังกู้คืน...' : 'Restore Canonical SSoT Parity (Phoenix Auto-Heal)'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleSimulate}
                  disabled={simulating}
                  className="h-9 px-4 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-red-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <AlertTriangle size={13} className="text-red-400" />
                  ทดสอบ Simulate SSoT Drift
                </button>
                <button
                  onClick={onClose}
                  className="h-9 px-5 rounded-full bg-white text-black font-bold text-xs hover:bg-[#00D9A3] transition"
                >
                  ตกลง
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
