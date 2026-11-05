// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Flame,
  HardDrive,
  HelpCircle,
  Info,
  Layers,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap
} from 'lucide-react';

export interface HardwareTier {
  name: string;
  targetVram: string;
  minVramGb: number;
  ready: boolean;
  description: string;
}

export interface HardwareInfo {
  platform: string;
  cpu: {
    model: string;
    cores: number;
    arch: string;
  };
  ram: {
    totalGb: number;
    usedGb: number;
    freeGb: number;
    usagePct: number;
  };
  gpu: {
    detected: boolean;
    name: string;
    cudaAvailable: boolean;
    driverVersion: string;
    totalVramGb: number;
    usedVramGb: number;
    freeVramGb: number;
    vramUsagePct: number;
    temperatureC: number;
    gpuUtilizationPct: number;
  };
  readiness: {
    status: 'READY_LORA_BF16' | 'READY_QLORA_4BIT' | 'VRAM_CONSTRAINED' | 'CPU_ONLY_SMOKE_MODE';
    statusLabel: string;
    recommendedMethod: string;
    tiers: HardwareTier[];
    recommendation: string;
  };
}

interface SystemHealthCheck {
  ok?: boolean;
  service?: string;
  uptimeSeconds?: number;
  serverStatus?: string;
  modelStatus?: string;
}

interface HardwareReadinessDashboardProps {
  onHardwareLoaded?: (hw: HardwareInfo) => void;
  autoPoll?: boolean;
  pollIntervalMs?: number;
}

export function HardwareReadinessDashboard({
  onHardwareLoaded,
  autoPoll = true,
  pollIntervalMs = 2500
}: HardwareReadinessDashboardProps) {
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealthCheck | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const SIMULATION_KEY = 'zyntheor.gpu_simulation_mode';
  const [simulationMode, setSimulationMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIMULATION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIMULATION_KEY, String(simulationMode));
    } catch {
      /* storage disabled or full */
    }
  }, [simulationMode]);

  async function fetchHardwareStats(silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [hwRes, healthRes] = await Promise.all([
        fetch('/api/training/hardware').then(r => r.ok ? r.json() : null),
        fetch('/api/health').then(r => r.ok ? r.json() : null),
      ]);

      if (hwRes?.ok && hwRes.hardware) {
        setHardware(hwRes.hardware);
        setLastScanned(new Date().toLocaleTimeString());
        if (onHardwareLoaded) onHardwareLoaded(hwRes.hardware);
      } else {
        if (!silent) throw new Error(hwRes?.message || 'Failed to parse hardware information');
      }

      if (healthRes) {
        setSystemHealth(healthRes);
      }
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to probe hardware stats');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    fetchHardwareStats(false);
    if (autoPoll) {
      const timer = setInterval(() => {
        fetchHardwareStats(true);
      }, pollIntervalMs);
      return () => clearInterval(timer);
    }
  }, [autoPoll, pollIntervalMs]);

  // Derive active hardware profile (overridden if simulationMode is active)
  const activeHardware = React.useMemo<HardwareInfo | null>(() => {
    if (!simulationMode) return hardware;
    return {
      platform: hardware?.platform || 'linux-x86_64',
      cpu: hardware?.cpu || { model: 'Host CPU (12 Cores)', cores: 12, arch: 'x64' },
      ram: hardware?.ram || { totalGb: 32.0, usedGb: 12.4, freeGb: 19.6, usagePct: 38 },
      gpu: {
        detected: true,
        name: 'NVIDIA GeForce RTX 4090 (Simulated)',
        cudaAvailable: true,
        driverVersion: '555.58.02 (Simulated)',
        totalVramGb: 24.0,
        usedVramGb: 8.2,
        freeVramGb: 15.8,
        vramUsagePct: 34,
        temperatureC: 48,
        gpuUtilizationPct: 28,
      },
      readiness: {
        status: 'READY_LORA_BF16',
        statusLabel: 'SIMULATED: READY FOR LORA (24GB VRAM)',
        recommendedMethod: 'LoRA Fine-Tuning (bf16 / r=16)',
        tiers: [
          { name: '4-bit QLoRA (NF4)', targetVram: '12 GB VRAM', minVramGb: 12, ready: true, description: 'Base weights 4-bit NormalFloat quantized; 16-rank adapter weights' },
          { name: '8-bit LoRA (int8)', targetVram: '16 GB VRAM', minVramGb: 16, ready: true, description: 'Base weights int8 quantized; LoRA matrices in 16-bit precision' },
          { name: '16-bit LoRA (bf16)', targetVram: '24 GB VRAM', minVramGb: 24, ready: true, description: 'Native bf16 LoRA training (Buffalo 0.10 Target Spec)' },
          { name: 'Full Fine-Tuning', targetVram: '48 GB VRAM', minVramGb: 48, ready: false, description: 'All 7.61B parameters unfrozen with optimizer states' },
          { name: 'CPU Smoke-Test Mode', targetVram: '0 GB VRAM', minVramGb: 0, ready: true, description: 'Deterministic verification; model checkpoint weights not fabricated' },
        ],
        recommendation: 'Simulation Mode Active: Hardware features simulated with 24GB VRAM (NVIDIA RTX 4090). You can test LoRA fine-tuning and GPU dashboard UI elements without physical GPU hardware attached.',
      },
    };
  }, [simulationMode, hardware]);

  const readinessStatus = activeHardware?.readiness?.status || 'CPU_ONLY_SMOKE_MODE';
  const isGpu = activeHardware?.gpu?.detected && activeHardware.gpu.totalVramGb > 0;

  return (
    <div className="surface-card hardware-readiness-card" style={{ marginBottom: '24px', border: '1px solid #10b981' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #065f46, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 0 15px rgba(16, 185, 129, 0.35)' }}>
            <Server size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <b style={{ fontSize: '15px', color: '#f8fafc' }}>Hardware Readiness & VRAM Profiler</b>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  background: isGpu ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.12)',
                  color: isGpu ? '#34d399' : '#fbbf24',
                  border: isGpu ? '1px solid #059669' : '1px solid #b45309',
                }}
              >
                {hardware?.readiness?.statusLabel || 'Probing Hardware…'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
              Real-time GPU, VRAM, and Host RAM telemetry for LoRA fine-tuning feasibility
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setSimulationMode(!simulationMode)}
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              borderColor: simulationMode ? '#10b981' : '#334155',
              color: simulationMode ? '#34d399' : '#94a3b8',
              background: simulationMode ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Toggle GPU Simulation Mode to test GPU UI features without physical hardware attached"
          >
            <Zap size={13} style={{ color: simulationMode ? '#34d399' : '#94a3b8' }} />
            <span>GPU Simulation: {simulationMode ? 'ON (24GB)' : 'OFF'}</span>
          </button>

          {autoPoll && (
            <span
              style={{
                fontSize: '10px',
                padding: '3px 8px',
                borderRadius: '999px',
                background: '#064e3b',
                color: '#6ee7b7',
                border: '1px solid #059669',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 600,
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
              LIVE MONITORING ({pollIntervalMs / 1000}s)
            </span>
          )}
          {systemHealth && (
            <span
              style={{
                fontSize: '10px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: systemHealth.ok ? '#0f172a' : '#451a1a',
                color: systemHealth.ok ? '#94a3b8' : '#fca5a5',
                border: `1px solid ${systemHealth.ok ? '#334155' : '#7f1d1d'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Activity size={12} style={{ color: '#38bdf8' }} />
              Health: <b>{systemHealth.serverStatus || 'SERVER_READY'}</b>
              {systemHealth.uptimeSeconds ? ` (${Math.floor(systemHealth.uptimeSeconds / 60)}m)` : ''}
            </span>
          )}
          {lastScanned && (
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              Updated {lastScanned}
            </span>
          )}
          <button className="secondary-button" onClick={() => fetchHardwareStats(false)} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            {loading ? 'Scanning…' : 'Re-scan Hardware'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '6px', background: '#451a1a', border: '1px solid #b91c1c', color: '#fca5a5', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Main Hardware Telemetry Gauges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '18px' }}>
        {/* GPU & VRAM Card */}
        <div style={{ padding: '14px', borderRadius: '10px', background: '#090d16', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={16} style={{ color: isGpu ? '#10b981' : '#f59e0b' }} />
              <b style={{ fontSize: '12px', color: '#f1f5f9' }}>Dedicated GPU / VRAM</b>
            </div>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: activeHardware?.gpu?.cudaAvailable ? '#064e3b' : '#1f2937',
                color: activeHardware?.gpu?.cudaAvailable ? '#34d399' : '#9ca3af',
              }}
            >
              {activeHardware?.gpu?.cudaAvailable ? 'CUDA ACCELERATED' : 'CUDA UNAVAILABLE'}
            </span>
          </div>

          <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{activeHardware?.gpu?.name || 'No NVIDIA GPU Detected'}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {activeHardware?.gpu?.driverVersion !== 'N/A' ? `Driver: ${activeHardware?.gpu?.driverVersion}` : ''}
            </span>
          </div>

          {/* VRAM Progress Bar / Gauge */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>VRAM Usage</span>
              <span style={{ color: isGpu ? '#34d399' : '#94a3b8', fontWeight: 700 }}>
                {activeHardware?.gpu?.totalVramGb ? `${activeHardware.gpu.usedVramGb.toFixed(1)} GB / ${activeHardware.gpu.totalVramGb.toFixed(1)} GB` : '0.0 GB Total'}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={activeHardware?.gpu?.vramUsagePct ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`VRAM usage ${activeHardware?.gpu?.vramUsagePct ?? 0}%`}
              style={{ height: '10px', background: '#1e293b', borderRadius: '99px', overflow: 'hidden', border: '1px solid #0f172a' }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${activeHardware?.gpu?.vramUsagePct ?? 0}%`,
                  background: (activeHardware?.gpu?.vramUsagePct ?? 0) > 85
                    ? 'linear-gradient(90deg, #ef4444, #f87171)'
                    : (activeHardware?.gpu?.vramUsagePct ?? 0) > 60
                    ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                    : 'linear-gradient(90deg, #059669, #10b981)',
                  borderRadius: '99px',
                  transition: 'width 0.35s ease',
                  boxShadow: isGpu ? '0 0 8px rgba(16, 185, 129, 0.35)' : 'none',
                }}
              />
            </div>
          </div>

          {/* VRAM Headroom (free capacity) */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>VRAM Headroom</span>
              <span style={{ color: isGpu ? '#34d399' : '#64748b', fontWeight: 700 }}>
                {activeHardware?.gpu?.totalVramGb
                  ? `${(100 - (activeHardware.gpu.vramUsagePct ?? 0)).toFixed(0)}% free (${activeHardware.gpu.freeVramGb.toFixed(1)} GB)`
                  : '0% (no accelerator)'}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={activeHardware?.gpu?.totalVramGb ? 100 - (activeHardware.gpu.vramUsagePct ?? 0) : 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="VRAM headroom"
              style={{ height: '6px', background: '#1e293b', borderRadius: '99px', overflow: 'hidden' }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${activeHardware?.gpu?.totalVramGb ? 100 - (activeHardware.gpu.vramUsagePct ?? 0) : 0}%`,
                  background: '#22d3ee',
                  borderRadius: '99px',
                  transition: 'width 0.35s ease',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
            <span>Free VRAM: <b style={{ color: '#cbd5e1' }}>{activeHardware?.gpu?.freeVramGb?.toFixed(1) ?? '0.0'} GB</b></span>
            <span>Allocated: <b style={{ color: '#cbd5e1' }}>{activeHardware?.gpu?.vramUsagePct ?? 0}%</b></span>
            <span>Temp: <b style={{ color: '#cbd5e1' }}>{activeHardware?.gpu?.temperatureC ? `${activeHardware.gpu.temperatureC}°C` : 'N/A'}</b></span>
          </div>
        </div>

        {/* Host RAM & CPU Card */}
        <div style={{ padding: '14px', borderRadius: '10px', background: '#090d16', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HardDrive size={16} style={{ color: '#38bdf8' }} />
              <b style={{ fontSize: '12px', color: '#f1f5f9' }}>Host System Memory & CPU</b>
            </div>
            <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#1e293b', color: '#94a3b8' }}>
              {hardware?.platform || 'linux-x86_64'}
            </span>
          </div>

          <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{hardware?.cpu?.cores ?? 4} CPU Cores ({hardware?.cpu?.arch || 'x64'})</span>
            <span style={{ fontSize: '11px', color: '#64748b', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hardware?.cpu?.model || 'Host CPU'}
            </span>
          </div>

          {/* System RAM Progress Bar */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>Host RAM Usage</span>
              <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                {hardware?.ram ? `${hardware.ram.usedGb.toFixed(1)} GB / ${hardware.ram.totalGb.toFixed(1)} GB` : '—'}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={hardware?.ram?.usagePct ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`RAM usage ${hardware?.ram?.usagePct ?? 0}%`}
              style={{ height: '10px', background: '#1e293b', borderRadius: '99px', overflow: 'hidden', border: '1px solid #0f172a' }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${hardware?.ram?.usagePct ?? 0}%`,
                  background: (hardware?.ram?.usagePct ?? 0) > 85
                    ? 'linear-gradient(90deg, #ef4444, #f87171)'
                    : (hardware?.ram?.usagePct ?? 0) > 70
                    ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                    : 'linear-gradient(90deg, #0284c7, #38bdf8)',
                  borderRadius: '99px',
                  transition: 'width 0.35s ease',
                }}
              />
            </div>
          </div>

          {/* RAM Headroom */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>RAM Headroom</span>
              <span style={{ color: '#34d399', fontWeight: 700 }}>
                {hardware?.ram
                  ? `${(100 - (hardware.ram.usagePct ?? 0)).toFixed(0)}% free (${hardware.ram.freeGb.toFixed(1)} GB)`
                  : '—'}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={hardware?.ram ? 100 - (hardware.ram.usagePct ?? 0) : 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="RAM headroom"
              style={{ height: '6px', background: '#1e293b', borderRadius: '99px', overflow: 'hidden' }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${hardware?.ram ? 100 - (hardware.ram.usagePct ?? 0) : 0}%`,
                  background: '#a78bfa',
                  borderRadius: '99px',
                  transition: 'width 0.35s ease',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
            <span>Available RAM: <b style={{ color: '#cbd5e1' }}>{hardware?.ram?.freeGb?.toFixed(1) ?? '—'} GB</b></span>
            <span>Allocated: <b style={{ color: '#cbd5e1' }}>{hardware?.ram?.usagePct ?? 0}%</b></span>
            <span>Evaluation Space: <b style={{ color: (hardware?.ram?.freeGb ?? 0) > 1.5 ? '#34d399' : '#fbbf24' }}>
              {(hardware?.ram?.freeGb ?? 0) > 1.5 ? 'Healthy' : 'Constrained'}
            </b></span>
          </div>
        </div>
      </div>

      {/* Fine-Tuning Feasibility Matrix */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <Layers size={15} style={{ color: '#a78bfa' }} />
          <b style={{ fontSize: '13px', color: '#f1f5f9' }}>LoRA Fine-Tuning Feasibility Matrix</b>
          <span style={{ fontSize: '11px', color: '#64748b' }}>(Target: Qwen2.5-Coder-7B)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
          {(hardware?.readiness?.tiers || [
            { name: '4-bit QLoRA (NF4)', targetVram: '12 GB VRAM', minVramGb: 12, ready: false, description: 'Base weights 4-bit NormalFloat quantized; 16-rank adapter weights' },
            { name: '8-bit LoRA (int8)', targetVram: '16 GB VRAM', minVramGb: 16, ready: false, description: 'Base weights int8 quantized; LoRA matrices in 16-bit precision' },
            { name: '16-bit LoRA (bf16)', targetVram: '24 GB VRAM', minVramGb: 24, ready: false, description: 'Native bf16 LoRA training (Buffalo 0.10 Target Spec)' },
            { name: 'Full Fine-Tuning', targetVram: '48 GB VRAM', minVramGb: 48, ready: false, description: 'All 7.61B parameters unfrozen with optimizer states' },
            { name: 'CPU Smoke-Test Mode', targetVram: '0 GB VRAM', minVramGb: 0, ready: true, description: 'Deterministic verification; model checkpoint weights not fabricated' },
          ]).map((tier, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: '#090d16',
                border: tier.ready ? '1px solid #059669' : '1px solid #1e293b',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <b style={{ fontSize: '11px', color: '#f8fafc' }}>{tier.name}</b>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '2px 5px',
                      borderRadius: '4px',
                      background: tier.ready ? '#064e3b' : '#27272a',
                      color: tier.ready ? '#34d399' : '#a1a1aa',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    {tier.ready ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                    {tier.ready ? 'SUPPORTED' : 'UNSUPPORTED'}
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 600, marginBottom: '4px' }}>
                  {tier.targetVram}
                </div>
                <p style={{ margin: 0, fontSize: '9px', color: '#94a3b8', lineHeight: 1.4 }}>
                  {tier.description}
                </p>
              </div>

              <div style={{ fontSize: '9px', color: '#64748b', borderTop: '1px solid #1e293b', paddingTop: '6px' }}>
                {tier.ready
                  ? 'System resources meet or exceed requirement'
                  : `Requires at least ${tier.minVramGb}GB VRAM (Current: ${hardware?.gpu?.totalVramGb ?? 0}GB)`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Honest Diagnostic Verdict & Advice */}
      <div
        style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: isGpu ? 'rgba(6, 78, 59, 0.25)' : 'rgba(30, 41, 59, 0.45)',
          border: isGpu ? '1px solid #047857' : '1px solid #334155',
          fontSize: '11px',
          lineHeight: 1.6,
          color: '#cbd5e1',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: isGpu ? '#34d399' : '#38bdf8', fontWeight: 700 }}>
          <ShieldCheck size={16} />
          <span>Readiness Assessment & Recommendations</span>
        </div>
        <p style={{ margin: '0 0 8px 0' }}>
          {hardware?.readiness?.recommendation ||
            'System is running on CPU. Training harness operates in deterministic smoke-test mode without falsifying checkpoint weights. For full fine-tuning, attach an NVIDIA GPU with 24GB+ VRAM.'}
        </p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '10px', color: '#94a3b8', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
          <span>
            <b>Recommended Architecture:</b> NVIDIA RTX 4090 (24GB) or A10G/A100 (40GB/80GB)
          </span>
          <span>
            <b>Optimization Stack:</b> FlashAttention-2, BitsAndBytes 4-bit, Gradient Checkpointing
          </span>
          <span>
            <b>Zero-Fabrication Guarantee:</b> Checkpoint weights will not be exported until full GPU convergence.
          </span>
        </div>
      </div>
    </div>
  );
}
