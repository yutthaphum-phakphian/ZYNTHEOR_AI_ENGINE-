import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { BarChart3, Calendar } from 'lucide-react';
import type { AuditEntry } from '../services/auditLedger'; // ใช้ Ledger ตัวจริงที่คุณส่งมา

interface Props {
  records: AuditEntry[]; // Newest First ตามที่เก็บใน App state
  startDate?: string;    // YYYY-MM-DD หรือ ISO
  endDate?: string;
}

const DAY_MS = 24*60*60*1000;

function parseDate(v?: string, endOfDay=false): number|undefined {
  if(!v) return undefined;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(v);
  // FIX: จากของคุณเดิม `new Date("${value}T...")` มี "" ครอบทำให้ Invalid Date
  const d = isDateOnly ? new Date(`${v}T${endOfDay ? '23:59:59.999' : '00:00:00'}`) : new Date(v);
  const t = d.getTime();
  return Number.isFinite(t) ? t : undefined;
}

export function AuditEventDistributionChart({ records, startDate, endDate }: Props) {
  const { chartData, timeUnitLabel, totalEvents, peakBucket, avgPerBucket } = useMemo(() => {
    const start = parseDate(startDate);
    const end = parseDate(endDate, true);

    // ใช้ at โดยตรง ตามที่คุณบอก - ไม่ต้องสร้าง timestamp ใหม่
    const filtered = (records ?? [])
      .map(r => ({ record: r, ts: new Date(r.at).getTime() }))
      .filter(({ts}) => {
        if(!Number.isFinite(ts)) return false;
        if(start!==undefined && ts < start) return false;
        if(end!==undefined && ts > end) return false;
        return true;
      })
      .sort((a,b) => a.ts - b.ts); // กราฟต้องเรียงเก่า -> ใหม่ ถึงแม้เก็บแบบ Newest First

    if(filtered.length===0) return { chartData:[], timeUnitLabel:'Date', totalEvents:0, peakBucket:'None', avgPerBucket:0 };

    const rangeDays = (filtered[filtered.length-1].ts - filtered[0].ts)/DAY_MS;
    const isIntraday = rangeDays <= 2;
    const buckets = new Map<string, {label:string; count:number; ts:number}>();

    for(const {record, ts} of filtered){
      const d = new Date(ts);
      const key = isIntraday 
        ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}`
        : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const label = isIntraday ? d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : d.toLocaleDateString([], {month:'short', day:'2-digit'});
      const b = buckets.get(key) ?? {label, count:0, ts};
      b.count++;
      buckets.set(key,b);
    }

    const sorted = Array.from(buckets.values()).sort((a,b)=>a.ts-b.ts);
    const total = sorted.reduce((s,b)=>s+b.count,0);
    const peak = sorted.reduce((h,b)=>!h||b.count>h.count?b:h, undefined as any);
    return {
      chartData: sorted,
      timeUnitLabel: isIntraday ? 'Hour' : 'Day',
      totalEvents: total,
      peakBucket: peak ? `${peak.label} (${peak.count})` : 'None',
      avgPerBucket: sorted.length ? Number((total/sorted.length).toFixed(1)) : 0
    };
  }, [records, startDate, endDate]);

  // ... JSX เดิมของคุณได้เลย ใช้ chartData
  return (
    <section style={{background:'#0a0f1d', border:'1px solid #1e293b', borderRadius:'12px', padding:'20px'}}>
      <div style={{width:'100%', height:200}}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
            <YAxis stroke="#38bdf8" fontSize={10} allowDecimals={false} />
            <Tooltip />
            <Area type="monotone" dataKey="count" stroke="#38bdf8" fill="rgba(56,189,248,0.15)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
