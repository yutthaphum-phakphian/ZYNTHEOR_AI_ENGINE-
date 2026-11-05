// @ts-nocheck
import React from 'react';

export type AgentVisualStatus = 'Idle' | 'Working' | 'Blocked' | 'Error' | 'Unknown';

export interface AgentStatusConfig {
  status: AgentVisualStatus;
  color: string;
  dotClass: string;
  badgeClass: string;
  labelEn: string;
  labelTh: string;
  descriptionTh: string;
}

/**
 * Maps raw orchestrator status (IDLE, ASSIGNED, RUNNING, WAITING_FOR_APPROVAL, BLOCKED, PAUSED, COMPLETED, FAILED, CANCELLED, REJECTED)
 * to one of 4 strict visual categories: Idle, Working, Blocked, Error (or Unknown if unclassified).
 */
export function getAgentVisualStatus(rawStatus?: string): AgentStatusConfig {
  if (!rawStatus || rawStatus.trim() === '') {
    return {
      status: 'Idle',
      color: '#94A3B8', // Slate
      dotClass: 'bg-zinc-400/80 ring-1 ring-zinc-500/30',
      badgeClass: 'bg-zinc-900/90 text-zinc-400 border-zinc-800',
      labelEn: 'Idle',
      labelTh: 'พร้อมรับงาน',
      descriptionTh: 'ไม่มี Active Task สแตนด์บายพร้อมรับคำสั่งงานใหม่',
    };
  }

  const s = rawStatus.toUpperCase().trim();

  if (s === 'RUNNING' || s === 'ASSIGNED' || s === 'EXECUTING') {
    return {
      status: 'Working',
      color: '#38BDF8', // Cyan / Sky
      dotClass: 'bg-sky-400 animate-pulse ring-2 ring-sky-400/50 shadow-sm shadow-sky-400/50',
      badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-700/60 shadow-sm shadow-sky-950',
      labelEn: 'Working',
      labelTh: 'กำลังทำงาน',
      descriptionTh: 'เอเจนต์กำลังประมวลผลงานในระบบ Sandbox จริง',
    };
  }

  if (s === 'WAITING_FOR_APPROVAL' || s === 'WAITING_APPROVAL' || s === 'BLOCKED' || s === 'PAUSED') {
    return {
      status: 'Blocked',
      color: '#F59E0B', // Amber
      dotClass: 'bg-amber-400 ring-2 ring-amber-400/50 shadow-sm shadow-amber-400/50',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-700/60 shadow-sm shadow-amber-950',
      labelEn: s === 'PAUSED' ? 'Paused' : 'Blocked',
      labelTh: s === 'PAUSED' ? 'หยุดชั่วคราว' : 'รออนุมัติ',
      descriptionTh: s === 'PAUSED' ? 'ผู้ปฏิบัติงานสั่งหยุดชั่วคราว' : 'ติดเงื่อนไขความปลอดภัย ต้องการการอนุมัติ',
    };
  }

  if (s === 'FAILED' || s === 'ERROR' || s === 'REJECTED' || s === 'CANCELLED') {
    return {
      status: 'Error',
      color: '#EF4444', // Red
      dotClass: 'bg-rose-500 ring-2 ring-rose-500/50 shadow-sm shadow-rose-500/50',
      badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-700/60 shadow-sm shadow-rose-950',
      labelEn: s === 'CANCELLED' ? 'Cancelled' : s === 'REJECTED' ? 'Rejected' : 'Error',
      labelTh: s === 'CANCELLED' ? 'ยกเลิกแล้ว' : s === 'REJECTED' ? 'ปฏิเสธแล้ว' : 'ข้อผิดพลาด',
      descriptionTh: 'การทำงานล้มเหลว หรือถูกยกเลิก/ปฏิเสธ',
    };
  }

  if (s === 'IDLE' || s === 'STANDBY' || s === 'READY' || s === 'COMPLETED') {
    return {
      status: 'Idle',
      color: '#94A3B8', // Slate
      dotClass: 'bg-zinc-400/80 ring-1 ring-zinc-500/30',
      badgeClass: 'bg-zinc-900/90 text-zinc-400 border-zinc-800',
      labelEn: 'Idle',
      labelTh: 'พร้อมรับงาน',
      descriptionTh: 'ไม่มี Active Task สแตนด์บายพร้อมรับคำสั่งงานใหม่',
    };
  }

  // Fail-closed fallback: do NOT assume Working or Idle if state is completely unknown
  return {
    status: 'Unknown',
    color: '#64748B', // Slate-500
    dotClass: 'bg-zinc-500/60 ring-1 ring-zinc-600/40',
    badgeClass: 'bg-zinc-900 text-zinc-500 border-zinc-800',
    labelEn: 'Unknown',
    labelTh: 'ไม่ทราบสถานะ',
    descriptionTh: 'สถานะไม่สามารถจัดกลุ่มได้ กรุณาตรวจสอบ Orchestrator State',
  };
}

export const AgentStatusDot: React.FC<{
  status?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ status, size = 'md', className = '' }) => {
  const cfg = getAgentVisualStatus(status);
  const sizeClass = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5';

  return (
    <span
      className={`rounded-full shrink-0 inline-block transition-colors duration-200 ${sizeClass} ${cfg.dotClass} ${className}`}
      title={`${cfg.labelEn} (${cfg.labelTh}) - ${cfg.descriptionTh}`}
      aria-label={`Status: ${cfg.status}`}
    />
  );
};

export const AgentStatusBadge: React.FC<{
  status?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  showDot?: boolean;
  thai?: boolean;
  className?: string;
}> = ({ status, size = 'sm', showLabel = true, showDot = true, thai = false, className = '' }) => {
  const cfg = getAgentVisualStatus(status);
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  const textSize = size === 'sm' ? 'text-[10px] py-0.5 px-2' : 'text-xs py-1 px-2.5';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-medium tracking-wide ${textSize} ${cfg.badgeClass} ${className}`}
      title={`${cfg.labelEn} (${cfg.labelTh}): ${cfg.descriptionTh}`}
    >
      {showDot && <span className={`rounded-full shrink-0 ${dotSize} ${cfg.dotClass}`} />}
      {showLabel && <span>{thai ? cfg.labelTh : cfg.labelEn}</span>}
    </span>
  );
};

/**
 * Small live-updating indicator for an active running task
 */
export const LiveTaskIndicator: React.FC<{
  status?: string;
  toolInUse?: string;
}> = ({ status, toolInUse }) => {
  const s = (status || '').toUpperCase();
  const isWorking = s === 'RUNNING' || s === 'ASSIGNED';
  const isBlocked = s === 'WAITING_FOR_APPROVAL' || s === 'BLOCKED' || s === 'PAUSED';

  if (isWorking) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-700/60 text-cyan-300 text-[10px] font-mono">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
        <span className="font-semibold">LIVE</span>
        {toolInUse && <span className="text-zinc-400">[{toolInUse}]</span>}
      </span>
    );
  }

  if (isBlocked) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-700/60 text-amber-300 text-[10px] font-mono">
        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
        <span className="font-semibold">{s === 'PAUSED' ? 'PAUSED' : 'WAITING APPROVAL'}</span>
      </span>
    );
  }

  return null;
};
