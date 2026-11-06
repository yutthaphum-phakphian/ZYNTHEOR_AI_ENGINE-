// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileText,
  BarChart3,
  Upload,
  Sparkles,
  Lock,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import {
  loadDefaultAuditReport,
  type ParsedAuditReport
} from '../services/auditReportService';
import { FoundationAuditDashboard } from '../components/FoundationAuditDashboard';
import { BenchmarkIntegrityComparator } from '../components/BenchmarkIntegrityComparator';
import { RuntimeEvidenceVerifier } from '../components/RuntimeEvidenceVerifier';

export default function AuditFoundationPage() {
  const [report, setReport] = useState<ParsedAuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'dashboard' | 'comparator' | 'verifier' | 'document'>('dashboard');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const data = await loadDefaultAuditReport();
      setReport(data);
    } catch (err) {
      console.error('Failed to load audit report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  const handleAuditLoaded = (newReport: ParsedAuditReport) => {
    setReport(newReport);
    setActiveView('dashboard');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3 text-white/50">
        <RefreshCw size={24} className="spin text-[#00D9A3]" />
        <p className="text-xs font-mono">Processing ZYNTHEOR_COMPETITIVE_FOUNDATION_AUDIT.md into local memory…</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto min-h-full">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#0b1020] border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00D9A3]/10 border border-[#00D9A3]/30 grid place-items-center text-[#00D9A3]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                ZYNTHEOR Foundation Audit & Diagnostic Verification
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Lock size={10} /> LOCAL MEMORY SECURED
              </span>
            </div>
            <p className="text-xs text-white/50">
              Master Principle: ZERO FAKE — REAL COMPLETENESS ONLY
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-[#070b16] p-1 rounded-xl border border-white/10 flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveView('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeView === 'dashboard'
                  ? 'bg-[#00D9A3] text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <BarChart3 size={14} />
              Foundation Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveView('comparator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeView === 'comparator'
                  ? 'bg-[#00D9A3] text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <BarChart3 size={14} />
              Benchmark Comparator
            </button>
            <button
              type="button"
              onClick={() => setActiveView('verifier')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeView === 'verifier'
                  ? 'bg-[#00D9A3] text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <ShieldCheck size={14} />
              Runtime Evidence Verifier
            </button>
            <button
              type="button"
              onClick={() => setActiveView('document')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeView === 'document'
                  ? 'bg-[#00D9A3] text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <FileText size={14} />
              Document Reader
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/10 text-white border border-white/10 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Upload size={14} className="text-[#00D9A3]" />
            Import Protocol
          </button>
        </div>
      </div>

      {/* Main View rendering */}
      {activeView === 'dashboard' && (
        <div className="space-y-6">
          <FoundationAuditDashboard
            report={report}
            onOpenViewer={() => setActiveView('document')}
            onImportClick={() => setIsImportModalOpen(true)}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BenchmarkIntegrityComparator />
            <RuntimeEvidenceVerifier />
          </div>
        </div>
      )}

      {activeView === 'comparator' && (
        <BenchmarkIntegrityComparator />
      )}

      {activeView === 'verifier' && (
        <RuntimeEvidenceVerifier />
      )}

      {report && activeView === 'document' && (
        <div className="h-[75vh] rounded-2xl overflow-hidden border border-white/[0.08]">
          <AuditReportViewer
            report={report}
            onImportClick={() => setIsImportModalOpen(true)}
          />
        </div>
      )}

      {/* Import Modal */}
      <ImportAuditModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onAuditLoaded={handleAuditLoaded}
      />
    </div>
  );
}
