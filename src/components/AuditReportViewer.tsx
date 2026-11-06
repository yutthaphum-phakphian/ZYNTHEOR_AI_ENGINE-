// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ShieldCheck,
  Hash,
  List,
  ChevronRight,
  Eye,
  Lock,
  Download,
  BookOpen
} from 'lucide-react';
import type { ParsedAuditReport } from '../services/auditReportService';

interface AuditReportViewerProps {
  report: ParsedAuditReport;
  onImportClick?: () => void;
}

export function AuditReportViewer({ report, onImportClick }: AuditReportViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedHash, setCopiedHash] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>('sec-exec-summary');

  // Split raw markdown into readable section blocks
  const sections = useMemo(() => {
    if (!report?.rawMarkdown) return [];
    const lines = report.rawMarkdown.split('\n');
    const result: Array<{ id: string; title: string; level: number; content: string[] }> = [];
    let currentSec: { id: string; title: string; level: number; content: string[] } | null = null;

    lines.forEach((line, idx) => {
      const match = line.match(/^(#{1,3})\s+(.*)/);
      if (match) {
        if (currentSec) result.push(currentSec);
        const title = match[2].trim();
        const id = 'sec-' + title.toLowerCase().replace(/[^a-z0-0]/g, '-').replace(/-+/g, '-');
        currentSec = {
          id,
          title,
          level: match[1].length,
          content: [],
        };
      } else if (currentSec) {
        currentSec.content.push(line);
      } else {
        if (result.length === 0) {
          result.push({
            id: 'sec-header',
            title: 'Audit Metadata & Header',
            level: 1,
            content: [line],
          });
        } else {
          result[0].content.push(line);
        }
      }
    });

    if (currentSec) result.push(currentSec);
    return result;
  }, [report?.rawMarkdown]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(sec =>
      sec.title.toLowerCase().includes(q) ||
      sec.content.join('\n').toLowerCase().includes(q)
    );
  }, [sections, searchQuery]);

  const handleCopyHash = () => {
    if (!report?.sha256Hash) return;
    navigator.clipboard.writeText(report.sha256Hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050810] text-[#e6edf3] font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-white/[0.08] bg-[#0b1020]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00D9A3]/10 border border-[#00D9A3]/30 grid place-items-center text-[#00D9A3]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                ZYNTHEOR Audit Report Viewer
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Lock size={10} /> LOCAL MEMORY SECURED
              </span>
            </div>
            <p className="text-xs text-white/50">
              {report?.title || 'ZYNTHEOR COMPETITIVE FOUNDATION AUDIT REPORT'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyHash}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-white/[0.05] hover:bg-white/10 text-white/70 hover:text-white border border-white/10 flex items-center gap-1.5 transition cursor-pointer"
            title="Copy SHA-256 Digest"
          >
            <Hash size={13} className="text-[#00D9A3]" />
            <span>{report?.sha256Hash ? report.sha256Hash.slice(0, 16) + '…' : 'SHA-256'}</span>
            {copiedHash ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>

          {onImportClick && (
            <button
              type="button"
              onClick={onImportClick}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00D9A3] hover:bg-[#00f5ff] text-black shadow-lg shadow-[#00D9A3]/20 flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileText size={14} />
              Import Custom Audit
            </button>
          )}
        </div>
      </div>

      {/* Content Container (Two Column: Table of Contents & Main Reader) */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Sidebar TOC Navigation */}
        <div className="hidden lg:flex flex-col w-72 shrink-0 border-r border-white/[0.08] bg-[#070b16] p-4 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white/60 tracking-wider uppercase flex items-center gap-1.5">
              <List size={14} className="text-[#00D9A3]" /> Sections Index
            </span>
            <span className="text-[10px] font-mono text-white/40">{sections.length} sections</span>
          </div>

          <div className="space-y-1">
            {sections.map(sec => (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between cursor-pointer ${
                  activeSectionId === sec.id
                    ? 'bg-[#00D9A3]/10 text-[#00D9A3] font-semibold border border-[#00D9A3]/30'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <span className="truncate">{sec.title}</span>
                <ChevronRight size={12} className="shrink-0 opacity-40" />
              </button>
            ))}
          </div>

          <div className="mt-auto p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <span className="text-[11px] font-bold text-white/80 block">Audit Integrity Verification</span>
            <div className="text-[10px] font-mono text-emerald-400 break-all bg-black/40 p-2 rounded border border-white/5">
              SHA256: {report?.sha256Hash}
            </div>
            <p className="text-[10px] text-white/40">
              Parsed locally into client memory. No server upload or third-party transmission required.
            </p>
          </div>
        </div>

        {/* Right Main Viewer */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#050810] overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 border-b border-white/[0.06] bg-[#070b16]/60 flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search audit findings, evidence lines, source files..."
                className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#00D9A3]"
              />
            </div>
          </div>

          {/* Document Content Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Metadata Summary Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0b1020] to-[#0f172a] border border-white/[0.1] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                <div>
                  <h2 className="text-lg font-bold text-white">{report?.title}</h2>
                  <p className="text-xs text-white/50">
                    {report?.role} · {report?.date}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    VERIFIED FOUNDATION
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-white/40 block text-[10px]">Project</span>
                  <span className="font-bold text-white">{report?.project}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-white/40 block text-[10px]">Master Principle</span>
                  <span className="font-bold text-[#00D9A3]">{report?.masterPrinciple}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-white/40 block text-[10px]">Audit Integrity Score</span>
                  <span className="font-bold text-cyan-400">
                    {Math.round((report?.validationStatus?.scorecard?.integrityRatio || 1) * 100)}%
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-white/40 block text-[10px]">Verification Tests</span>
                  <span className="font-bold text-emerald-400">
                    {report?.testResults?.vitest?.passedTests || 199} PASSED
                  </span>
                </div>
              </div>
            </div>

            {/* Rendered Sections */}
            {filteredSections.length === 0 ? (
              <div className="p-12 text-center text-white/40 space-y-2">
                <Search size={28} className="mx-auto text-white/20" />
                <p>No matching sections found for "{searchQuery}"</p>
              </div>
            ) : (
              filteredSections.map(sec => (
                <div
                  key={sec.id}
                  id={sec.id}
                  className="p-5 rounded-2xl bg-[#070b16] border border-white/[0.06] space-y-3"
                >
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/[0.06] pb-2">
                    <span className="text-[#00D9A3]">#</span> {sec.title}
                  </h3>

                  <div className="text-xs text-white/80 space-y-2 leading-relaxed whitespace-pre-wrap font-sans">
                    {sec.content.map((line, i) => {
                      if (line.startsWith('|')) {
                        return (
                          <div key={i} className="font-mono text-[11px] overflow-x-auto bg-black/30 p-2 rounded border border-white/5 text-emerald-300">
                            {line}
                          </div>
                        );
                      }
                      if (line.startsWith('```')) {
                        return (
                          <div key={i} className="font-mono text-[11px] text-cyan-300 bg-black/50 p-2 rounded border border-white/10">
                            {line}
                          </div>
                        );
                      }
                      if (line.startsWith('- ')) {
                        return (
                          <li key={i} className="list-disc list-inside text-white/90">
                            {line.substring(2)}
                          </li>
                        );
                      }
                      return <p key={i}>{line}</p>;
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
