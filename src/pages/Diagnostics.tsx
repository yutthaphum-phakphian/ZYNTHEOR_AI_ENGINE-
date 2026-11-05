// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { LocalStorageAuditTool } from '../components/LocalStorageAuditTool';
import { AuditChainVisualizer } from '../components/AuditChainVisualizer';
import { IntelligentDebugging } from '../components/IntelligentDebugging';
import { AuditEventDistributionChart } from '../components/AuditEventDistributionChart';
import { auditLedgerService } from '../services/auditLedger';
import { crossLayerRootCauseEngine } from '../lib/crossLayerRootCause';


import { ForensicVerificationPanel } from '../components/ForensicVerificationPanel';

export default function Diagnostics() {
  const [activeTab, setActiveTab] = useState<'forensic' | 'storage' | 'audit' | 'debugging' | 'crosslayer'>('forensic');
  const [crossLayerData, setCrossLayerData] = useState<any>(null);
  const [auditRecords, setAuditRecords] = useState<any[]>([]);

  const loadCrossLayer = () => {
    try {
      const data = crossLayerRootCauseEngine.getFullAnalysis();
      setCrossLayerData(data);
    } catch { setCrossLayerData(null); }
  };

  const loadAuditLedger = () => {
    try {
      const events = auditLedgerService.getEvents();
      const mapped = (events as any[]).map((e: any) => ({
        id: e.eventId || e.id,
        at: e.at || e.timestamp,
        action: e.eventType || e.action || 'GENERAL',
        detail: e.payload ? JSON.stringify(e.payload).slice(0,100) : e.detail || '',
        prevHash: e.previousHash || e.prevHash,
        hash: e.currentHash || e.hash,
        timestamp: e.timestamp || e.at,
      }));
      setAuditRecords(mapped);
    } catch {
      fetch('/api/audit/ledger').then(r=>r.json()).then(data=>{
        const ev = data.events || [];
        const mapped = ev.map((e:any)=>({
          id: e.eventId || e.id,
          at: e.at || e.timestamp,
          action: e.eventType || e.action,
          detail: '',
          prevHash: e.previousHash || e.prevHash,
          hash: e.currentHash || e.hash,
          timestamp: e.timestamp || e.at
        }));
        setAuditRecords(mapped);
      }).catch(()=> setAuditRecords([]));
    }
  };

  useEffect(()=>{ if(activeTab === 'audit'){ loadAuditLedger(); } },[activeTab]);

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#00D9A3]">Diagnostics & Forensic Truth Dossier</h1>
        <p className="text-sm text-gray-400 mt-1">ZYNTHEOR AI ENGINE — COURT_READY SSoT Δ0.00% Forensic Verification, Audit Ledger Integrity, Storage Schemas & Cross-Layer Intelligence</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setActiveTab('forensic')} className={`px-4 py-2 rounded font-bold text-sm ${activeTab === 'forensic' ? 'bg-[#00D9A3] text-black shadow-lg shadow-[#00D9A3]/20' : 'bg-[#111a2d] text-gray-400 border border-[#00D9A3]/20'}`}>🏛️ Court-Ready Forensic Dossier</button>
        <button onClick={() => setActiveTab('storage')} className={`px-4 py-2 rounded font-bold text-sm ${activeTab === 'storage' ? 'bg-[#00D9A3] text-black' : 'bg-[#111a2d] text-gray-400 border border-[#00D9A3]/20'}`}>LocalStorage Audit (14 schemas)</button>
        <button onClick={() => { setActiveTab('audit'); loadAuditLedger(); }} className={`px-4 py-2 rounded font-bold text-sm ${activeTab === 'audit' ? 'bg-[#00D9A3] text-black' : 'bg-[#111a2d] text-gray-400 border border-[#00D9A3]/20'}`}>Audit Ledger Integrity + Distribution</button>
        <button onClick={() => setActiveTab('debugging')} className={`px-4 py-2 rounded font-bold text-sm ${activeTab === 'debugging' ? 'bg-[#00D9A3] text-black' : 'bg-[#111a2d] text-gray-400 border border-[#00D9A3]/20'}`}>Intelligent Debugging</button>
        <button onClick={() => { setActiveTab('crosslayer'); loadCrossLayer(); }} className={`px-4 py-2 rounded font-bold text-sm ${activeTab === 'crosslayer' ? 'bg-[#00D9A3] text-black' : 'bg-[#111a2d] text-gray-400 border border-[#00D9A3]/20'}`}>Cross-Layer Root Cause</button>
      </div>

      {activeTab === 'forensic' && <ForensicVerificationPanel />}

      {activeTab === 'storage' && <LocalStorageAuditTool />}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <AuditEventDistributionChart records={auditRecords as any} />
          <AuditChainVisualizer />
        </div>
      )}
      {activeTab === 'debugging' && <IntelligentDebugging />}
      {activeTab === 'crosslayer' && (
        <div className="p-6 bg-[#080d1a] rounded border border-[#00D9A3]/20">
          <h2 className="font-bold text-[#00D9A3]">🔬 Cross-Layer Root Cause Intelligence</h2>
          {!crossLayerData ? (
            <div className="mt-4 p-4 rounded bg-[#111a2d] border border-[#00D9A3]/10 text-sm text-gray-400">กำลังโหลด...</div>
          ) : (
            <div className="mt-4 grid grid-cols-4 gap-3">
              <div className="p-3 rounded bg-[#111a2d] border border-[#00D9A3]/20"><div className="text-xs text-gray-500">Layers</div><div className="text-lg font-bold">{crossLayerData.layers?.length ?? 0}</div></div>
              <div className="p-3 rounded bg-[#111a2d] border border-[#00D9A3]/20"><div className="text-xs text-gray-500">Dependencies</div><div className="text-lg font-bold">{crossLayerData.dependencies?.length ?? 0}</div></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
