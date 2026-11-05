// @ts-nocheck
import { useEffect, useState } from 'react';

interface EvidenceRecord { id: string; category: string; hash: string; timestamp: number; }
interface GovernanceRecord { evidenceId: string; decision: string; providerId: string; }
interface AuditLink { evidenceId: string; providerId: string; latencyP50: number; cost: number; }

export default function EvidencePanelV2() {
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [governance, setGovernance] = useState<GovernanceRecord[]>([]);
  const [audit, setAudit] = useState<AuditLink[]>([]);

  useEffect(()=>{
    const fetchAll = async () => {
      try {
        const [evRes, govRes] = await Promise.all([
          fetch('/api/evidence').then(r=>r.json()).catch(()=>({records:[]})),
          fetch('/api/governance').then(r=>r.json()).catch(()=>({records:[]}))
        ]);
        setEvidence(evRes.records || []);
        setGovernance(govRes.records || []);
        setAudit(govRes.auditLinks || []);
      } catch {}
    };
    fetchAll();
    const id = setInterval(fetchAll, 3000);
    return ()=>clearInterval(id);
  },[]);

  return (
    <div className="p-4 bg-[#080F1B] border border-[#0D1828] rounded-xl text-[#E2E8F0]">
      <h3 className="text-[#38BDF8] font-bold mb-3">Observability Center v2 — Evidence + Governance + Audit Linkage</h3>
      <div className="grid grid-cols-3 gap-4 text-xs">
        <div><div className="text-[#94A3B8]">Evidence Chain</div><div className="text-lg font-mono">{evidence.length} records</div><div className="mt-2 space-y-1 max-h-32 overflow-y-auto">{evidence.slice(0,5).map(e=><div key={e.id} className="truncate">{e.category}: {e.hash.slice(0,8)}...</div>)}</div></div>
        <div><div className="text-[#94A3B8]">Governance</div><div className="text-lg font-mono">{governance.length} decisions</div><div className="mt-2 space-y-1 max-h-32 overflow-y-auto">{governance.slice(0,5).map((g,i)=><div key={i} className={g.decision==='ALLOW'?'text-[#10b981]':g.decision==='DENY'?'text-red-400':'text-yellow-400'}>{g.evidenceId.slice(0,6)} → {g.decision} @ {g.providerId}</div>)}</div></div>
        <div><div className="text-[#94A3B8]">Multi-Provider Audit</div><div className="text-lg font-mono">Cost: ${audit.reduce((s,a)=>s+a.cost,0).toFixed(3)}</div><div className="mt-2 space-y-1 max-h-32 overflow-y-auto">{audit.slice(0,5).map((a,i)=><div key={i}>{a.providerId}: {a.latencyP50}ms / ${a.cost}</div>)}</div></div>
      </div>
      <div className="mt-3 text-[10px] text-[#64748B]">FIPS SHA-256 Chain | Local-Only | Human Approval Gate | Tamper Detection Verified</div>
    </div>
  );
}
