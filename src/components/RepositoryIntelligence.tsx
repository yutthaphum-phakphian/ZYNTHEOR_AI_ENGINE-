// @ts-nocheck
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Code2, Network, FileCode2, Boxes, Copy, Check, Search, Download,
  Layers, ShieldCheck, ChevronRight, ChevronDown, Terminal, Eye, WandSparkles, Filter, RefreshCw,
  AlertTriangle, GitCompare, ShieldAlert, Cpu, CheckCircle2, Lock, ArrowRight, Play, X
} from 'lucide-react';
import type { CodeAnalysis, SymbolInfo } from '../../lib/code-intelligence.ts';
import type { DependencyGraphResult, RepositoryFileKind, RepositoryScanStatus, EntryPoint } from '../services/repositoryIntelligence.ts';
import type { ImpactAnalysisReport } from '../services/changeImpactEngine.ts';
import { useTranslation } from '../../lib/i18n.ts';

export interface RepositoryFile {
  id: string;
  name: string;
  path: string;
  content?: string;
  size: number;
  kind?: RepositoryFileKind;
  language?: string;
  analysis?: CodeAnalysis | null;
  analysisTruncated?: boolean;
}

export interface RepositoryIntelligenceProps {
  files?: RepositoryFile[];
  authHeaders?: () => Record<string, string>;
  onSelectFile?: (filePath: string) => void;
  onSendToChatContext?: (jsonContext: string) => void;
  setToast?: (msg: string) => void;
}

export interface ProjectHierarchyNode {
  name: string;
  type: 'dir' | 'file';
  path: string;
  children?: ProjectHierarchyNode[];
  analysis?: CodeAnalysis;
}

export function RepositoryIntelligence({
  onSelectFile,
  onSendToChatContext,
  setToast,
  authHeaders,
}: RepositoryIntelligenceProps) {
  const { lang } = useTranslation();
  const [serverScannedFiles, setServerScannedFiles] = useState<RepositoryFile[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<RepositoryScanStatus | 'SCANNING'>('SCANNING');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSummary, setScanSummary] = useState<{
    scannedFiles: number;
    totalModules: number;
    totalSymbols: number;
    totalExports: number;
    totalImports: number;
    totalReactComponents?: number;
    totalApiRoutes?: number;
    averageComplexity: number | null;
    scannedAt: string;
    warnings: string[];
  } | null>(null);
  const [dependencyGraph, setDependencyGraph] = useState<DependencyGraphResult | null>(null);
  const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([]);
  const [validatedContext, setValidatedContext] = useState<string | null>(null);

  const [selectedFilePath, setSelectedFilePath] = useState<string>('server.ts');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'functions' | 'classes' | 'exports'>('all');
  const [copiedContext, setCopiedContext] = useState(false);
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'symbols' | 'dependencies' | 'impact' | 'gate' | 'json'>('hierarchy');

  // Impact Analysis State
  const [impactReport, setImpactReport] = useState<ImpactAnalysisReport | null>(null);
  const [isAnalyzingImpact, setIsAnalyzingImpact] = useState(false);
  const [customDiff, setCustomDiff] = useState('');

  // Engineering Change Gate State
  const [changeGateProposal, setChangeGateProposal] = useState<any | null>(null);
  const [isProposingChange, setIsProposingChange] = useState(false);
  const [isApprovingChange, setIsApprovingChange] = useState(false);

  const fetchRepositoryScan = useCallback(async () => {
    setIsScanning(true);
    setScanStatus('SCANNING');
    setScanError(null);
    try {
      const res = await fetch('/api/intelligence/scan', { headers: authHeaders?.() });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (!Array.isArray(data.files) || !data.summary || !['COMPLETED', 'PARTIAL'].includes(data.status)) {
        throw new Error('The scan response did not match the repository scan contract.');
      }
      setServerScannedFiles(data.files);
      setScanSummary(data.summary);
      setDependencyGraph(data.dependencyGraph || null);
      setEntryPoints(data.entryPoints || []);
      setScanStatus(data.status);
      setScanError(data.status === 'PARTIAL' ? (data.summary.warnings || []).join('\n') || 'Some repository files were not fully analyzed.' : null);
      const contextIsValidated = data.contextValidation?.valid === true &&
        data.contextValidation?.schemaVersion === '1.0' && typeof data.contextJson === 'string';
      setValidatedContext(contextIsValidated ? data.contextJson : null);
      if (!contextIsValidated) setScanError('Repository context failed schema validation and is unavailable.');
      if (setToast) setToast(lang === 'th' ? `สแกนเสร็จแล้ว: ${data.summary.scannedFiles} ไฟล์ (${data.status})` : `Scan finished: ${data.summary.scannedFiles} files (${data.status})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Repository scan failed.';
      setServerScannedFiles([]);
      setScanSummary(null);
      setDependencyGraph(null);
      setEntryPoints([]);
      setValidatedContext(null);
      setScanStatus('FAILED');
      setScanError(message);
    } finally {
      setIsScanning(false);
    }
  }, [authHeaders, lang, setToast]);

  useEffect(() => {
    fetchRepositoryScan();
  }, [fetchRepositoryScan]);

  const effectiveFiles = useMemo(() => {
    return serverScannedFiles;
  }, [serverScannedFiles]);

  useEffect(() => {
    if (effectiveFiles.length > 0 && !effectiveFiles.some(f => (f.path || f.name) === selectedFilePath)) {
      setSelectedFilePath(effectiveFiles[0].path || effectiveFiles[0].name);
    }
  }, [effectiveFiles, selectedFilePath]);

  const analysesMap = useMemo(() => {
    const map: Record<string, CodeAnalysis> = {};
    for (const f of effectiveFiles) {
      const path = f.path || f.name;
      if (f.analysis) map[path] = f.analysis;
    }
    return map;
  }, [effectiveFiles]);

  const selectedFile = useMemo(() => {
    return effectiveFiles.find(f => (f.path || f.name) === selectedFilePath) || effectiveFiles[0];
  }, [effectiveFiles, selectedFilePath]);

  const selectedAnalysis = useMemo(() => {
    if (!selectedFile) return null;
    return analysesMap[selectedFile.path || selectedFile.name] || null;
  }, [selectedFile, analysesMap]);

  const jsonHierarchyContext = validatedContext || '';
  const moduleHierarchyEntries = useMemo(() => {
    const entries = new Map<string, { path: string; type: 'dir' | 'file'; depth: number }>();
    for (const file of effectiveFiles) {
      const segments = file.path.split('/');
      for (let index = 1; index < segments.length; index += 1) {
        const directory = segments.slice(0, index).join('/');
        entries.set(directory, { path: directory, type: 'dir', depth: index - 1 });
      }
      entries.set(file.path, { path: file.path, type: 'file', depth: segments.length - 1 });
    }
    return [...entries.values()].sort((left, right) => left.path.localeCompare(right.path));
  }, [effectiveFiles]);

  const filteredSymbols = useMemo(() => {
    if (!selectedAnalysis) return [];
    let list = selectedAnalysis.symbols;

    if (filterType === 'functions') list = list.filter(s => s.type === 'function' || s.type === 'method');
    if (filterType === 'classes') list = list.filter(s => s.type === 'class');
    if (filterType === 'exports') list = list.filter(s => s.exported);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q));
    }
    return list;
  }, [selectedAnalysis, filterType, searchQuery]);

  async function copyJsonContext() {
    if (!validatedContext) return;
    try {
      await navigator.clipboard.writeText(validatedContext);
      setCopiedContext(true);
      if (setToast) setToast(lang === 'th' ? 'คัดลอก JSON Context ที่ผ่านการตรวจสอบแล้ว' : 'Copied validated repository context');
      setTimeout(() => setCopiedContext(false), 2000);
    } catch {
      if (setToast) setToast(lang === 'th' ? 'ไม่สามารถคัดลอก Context ได้' : 'Could not copy repository context');
    }
  }

  async function handleInjectContext() {
    if (!onSendToChatContext || !validatedContext || !selectedFile || !selectedAnalysis) return;
    try {
      const fullContext = JSON.parse(validatedContext) as { scanIdentifier?: string };
      if (!fullContext.scanIdentifier) throw new Error('Scan identifier is missing from the validated context.');
      const response = await fetch('/api/intelligence/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders?.() },
        body: JSON.stringify({ scanIdentifier: fullContext.scanIdentifier, filePath: selectedFile.path }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok || data.contextValidation?.valid !== true || data.contextValidation?.schemaVersion !== '1.0' || typeof data.contextJson !== 'string') {
        throw new Error(data.message || data.error || 'Focused repository context failed validation.');
      }
      onSendToChatContext(data.contextJson);
      if (setToast) setToast(lang === 'th' ? 'ส่ง Context ของโมดูลที่เลือกและ dependencies ไปยังแชทแล้ว' : 'Injected validated context for the selected module and direct dependencies');
    } catch (error) {
      if (setToast) setToast(error instanceof Error ? error.message : (lang === 'th' ? 'ไม่สามารถส่ง Context ไปยังแชทได้' : 'Could not load focused repository context'));
    }
  }

  // Run Impact Analysis on target file or diff
  const runImpactAnalysis = async () => {
    if (!selectedFilePath) return;
    setIsAnalyzingImpact(true);
    try {
      const res = await fetch('/api/intelligence/change-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders?.() },
        body: JSON.stringify({
          targetFile: selectedFilePath,
          diff: customDiff.trim() || undefined,
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Impact analysis failed');
      setImpactReport(data.report);
      setActiveTab('impact');
      if (setToast) setToast(lang === 'th' ? `วิเคราะห์ผลกระทบของ ${selectedFilePath} สำเร็จ` : `Impact analysis complete for ${selectedFilePath}`);
    } catch (err) {
      if (setToast) setToast(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzingImpact(false);
    }
  };

  // Create Change Proposal via Gate
  const proposeChangeGate = async () => {
    if (!selectedFilePath) return;
    setIsProposingChange(true);
    try {
      const res = await fetch('/api/editing/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders?.() },
        body: JSON.stringify({
          file: selectedFilePath,
          diff: customDiff.trim() || `// Verified change proposal for ${selectedFilePath}\n`,
          reason: 'Change proposed via Repository Intelligence Change Gate',
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || data.error || 'Proposal failed');
      setChangeGateProposal(data);
      setActiveTab('gate');
      if (setToast) setToast(lang === 'th' ? 'สร้างข้อเสนอสำเร็จ — รอการอนุมัติ (Human Approval Gate)' : 'Proposal created — Awaiting Human Approval');
    } catch (err) {
      if (setToast) setToast(err instanceof Error ? err.message : 'Proposal failed');
    } finally {
      setIsProposingChange(false);
    }
  };

  // Human Approval Action
  const approveChangeGate = async (patchId: string) => {
    setIsApprovingChange(true);
    try {
      const res = await fetch('/api/editing/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders?.() },
        body: JSON.stringify({
          patchId,
          approverId: 'human-lead-engineer',
          reason: 'Approved by authorized human operator',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || data.error || 'Approval failed');
      setChangeGateProposal((prev: any) => ({ ...prev, status: 'APPROVED', approval: data.approval }));
      if (setToast) setToast(lang === 'th' ? 'อนุมัติการเปลี่ยนแปลงสำเร็จ (Human Approval Granted)' : 'Change Gate Approved by Human Operator');
    } catch (err) {
      if (setToast) setToast(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setIsApprovingChange(false);
    }
  };

  // Execute Approved Patch through Existing Gateway
  const executeChangeGate = async (patchId: string) => {
    setIsApprovingChange(true);
    try {
      const res = await fetch('/api/editing/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders?.() },
        body: JSON.stringify({
          patchId,
          approverId: 'human-lead-engineer',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || data.error || 'Execution failed');
      setChangeGateProposal((prev: any) => ({ ...prev, status: 'APPLIED', executionResult: data.result }));
      if (setToast) setToast(lang === 'th' ? 'นำการเปลี่ยนแปลงไปใช้จริงสำเร็จ (Patch Applied & Audited)' : 'Patch applied to filesystem & recorded in audit ledger');
    } catch (err) {
      if (setToast) setToast(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setIsApprovingChange(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#f1f5f9' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.12), rgba(56, 189, 248, 0.08))',
          border: '1px solid rgba(20, 184, 166, 0.25)',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(140deg, #14b8a6, #0d9488)',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              boxShadow: '0 0 20px rgba(20, 184, 166, 0.3)'
            }}
          >
            <Network size={22} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.02em' }}>
              {lang === 'th' ? 'ระบบวิเคราะห์ความเข้าใจโปรเจกต์ (Repository Intelligence & Impact Analysis)' : 'Repository Intelligence & Impact Analysis Engine'}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {lang === 'th'
                ? 'ถอดรหัสโครงสร้างโปรเจกต์ AST, Symbol Table, Dependency Graph, Call Graph และวิเคราะห์ผลกระทบการเปลี่ยนแปลง (Evidence-Based Gate)'
                : 'Resolves AST symbols, dependencies, entry points, and change impact boundaries for governed software engineering.'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={runImpactAnalysis}
            disabled={isAnalyzingImpact || !selectedFilePath}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600,
              border: 0,
              cursor: isAnalyzingImpact ? 'not-allowed' : 'pointer',
              opacity: isAnalyzingImpact ? 0.7 : 1,
            }}
          >
            <GitCompare size={14} />
            <span>{isAnalyzingImpact ? (lang === 'th' ? 'กำลังวิเคราะห์ผลกระทบ…' : 'Analyzing…') : (lang === 'th' ? 'วิเคราะห์ผลกระทบ' : 'Run Impact Analysis')}</span>
          </button>

          <button
            type="button"
            onClick={fetchRepositoryScan}
            disabled={isScanning}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: '11px',
              fontWeight: 600,
              border: '1px solid #334155',
              cursor: isScanning ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={13} className={isScanning ? 'animate-spin' : ''} />
            <span>{isScanning ? (lang === 'th' ? 'กำลังสแกน…' : 'Scanning…') : (lang === 'th' ? 'สแกน Repository' : 'Rescan Repo')}</span>
          </button>

          {onSendToChatContext && (
            <button
              type="button"
              onClick={handleInjectContext}
              disabled={!validatedContext || !selectedFile || !selectedAnalysis}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
                border: 0,
                cursor: (!validatedContext || !selectedFile || !selectedAnalysis) ? 'not-allowed' : 'pointer',
                opacity: (!validatedContext || !selectedFile || !selectedAnalysis) ? 0.6 : 1
              }}
            >
              <WandSparkles size={13} />
              <span>{lang === 'th' ? 'ส่งบริบทไปยังแชท' : 'Send to Chat'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      {scanSummary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <div style={{ background: '#0d1522', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>{lang === 'th' ? 'ไฟล์ที่สแกนจริง' : 'Scanned Files'}</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8', marginTop: '4px' }}>{scanSummary.scannedFiles}</div>
            <span style={{ fontSize: '10px', color: '#64748b' }}>{scanSummary.totalModules} modules</span>
          </div>

          <div style={{ background: '#0d1522', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>{lang === 'th' ? 'สัญลักษณ์ใน AST' : 'AST Symbols'}</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#2dd4bf', marginTop: '4px' }}>{scanSummary.totalSymbols}</div>
            <span style={{ fontSize: '10px', color: '#64748b' }}>{scanSummary.totalExports} exports</span>
          </div>

          <div style={{ background: '#0d1522', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>{lang === 'th' ? 'จุดเริ่มต้น (Entry Points)' : 'Entry Points'}</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#a855f7', marginTop: '4px' }}>{entryPoints.length}</div>
            <span style={{ fontSize: '10px', color: '#64748b' }}>Server & Client</span>
          </div>

          <div style={{ background: '#0d1522', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>{lang === 'th' ? 'ความซับซ้อนเฉลี่ย' : 'Avg Complexity'}</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fbbf24', marginTop: '4px' }}>
              {scanSummary.averageComplexity === null ? 'N/A' : scanSummary.averageComplexity}
            </div>
            <span style={{ fontSize: '10px', color: '#64748b' }}>Cyclomatic</span>
          </div>

          <div style={{ background: '#0d1522', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>{lang === 'th' ? 'สถานะการตรวจสอบ' : 'Audit Status'}</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: scanStatus === 'COMPLETED' ? '#10b981' : '#f59e0b', marginTop: '4px' }}>
              {scanStatus}
            </div>
            <span style={{ fontSize: '10px', color: '#64748b' }}>Evidence Sealed</span>
          </div>
        </div>
      )}

      {/* Main Interactive Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'start' }}>
        {/* Left Column: File Explorer List */}
        <div style={{ background: '#0d1522', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {lang === 'th' ? 'รายการไฟล์ในโปรเจกต์' : 'Project Files'}
            </span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>{effectiveFiles.length} files</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '560px', overflowY: 'auto' }}>
            {effectiveFiles.map(f => {
              const path = f.path || f.name;
              const isSelected = path === selectedFilePath;
              const analysis = analysesMap[path];

              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => {
                    setSelectedFilePath(path);
                    if (onSelectFile) onSelectFile(path);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid #14b8a6' : '1px solid transparent',
                    background: isSelected ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                    color: isSelected ? '#f8fafc' : '#cbd5e1',
                    textAlign: 'left',
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.12s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <FileCode2 size={15} style={{ color: isSelected ? '#2dd4bf' : '#64748b', flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isSelected ? 700 : 400 }}>
                      {f.path}
                    </span>
                  </div>
                  {analysis ? (
                    <span style={{ fontSize: '9px', background: '#1e293b', color: '#94a3b8', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                      {analysis.symbols.length} sym
                    </span>
                  ) : <span style={{ fontSize: '9px', color: '#64748b' }}>{f.kind || 'unparsed'}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed View Tabs */}
        <div style={{ background: '#0d1522', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
          {/* Sub Navigation Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: '#090d16', padding: '4px', borderRadius: '8px', border: '1px solid #1e293b', maxWidth: '100%' }}>
              <button
                type="button"
                onClick={() => setActiveTab('hierarchy')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 0,
                  background: activeTab === 'hierarchy' ? '#14b8a6' : 'transparent',
                  color: activeTab === 'hierarchy' ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {lang === 'th' ? 'โครงสร้าง & Exports' : 'Hierarchy & Exports'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('symbols')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 0,
                  background: activeTab === 'symbols' ? '#14b8a6' : 'transparent',
                  color: activeTab === 'symbols' ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {lang === 'th' ? 'ดัชนีสัญลักษณ์ (Symbols)' : 'Symbols'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dependencies')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 0,
                  background: activeTab === 'dependencies' ? '#14b8a6' : 'transparent',
                  color: activeTab === 'dependencies' ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {lang === 'th' ? 'Dependencies & Call Graph' : 'Dependencies'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('impact')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 0,
                  background: activeTab === 'impact' ? '#0ea5e9' : 'transparent',
                  color: activeTab === 'impact' ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {lang === 'th' ? 'วิเคราะห์ผลกระทบ (Impact)' : 'Impact Analysis'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('gate')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 0,
                  background: activeTab === 'gate' ? '#8b5cf6' : 'transparent',
                  color: activeTab === 'gate' ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {lang === 'th' ? 'Change Gate & Approval' : 'Change Gate'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('json')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 0,
                  background: activeTab === 'json' ? '#14b8a6' : 'transparent',
                  color: activeTab === 'json' ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                JSON Context
              </button>
            </div>

            <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileCode2 size={14} />
              <span>{selectedFile?.path || selectedFile?.name}</span>
            </div>
          </div>

          {/* TAB 1: HIERARCHY & EXPORTS */}
          {activeTab === 'hierarchy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Directory Tree */}
              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>
                  {lang === 'th' ? 'ลำดับชั้นโมดูล (Module Hierarchy)' : 'Module Hierarchy'}
                </div>
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {moduleHierarchyEntries.map(entry => (
                    <div key={entry.path} style={{ paddingLeft: `${entry.depth * 14}px`, color: entry.type === 'dir' ? '#fbbf24' : '#cbd5e1', fontSize: '10px', fontFamily: 'monospace' }}>
                      {entry.type === 'dir' ? <Boxes size={11} style={{ verticalAlign: 'middle', marginRight: '5px' }} /> : <FileCode2 size={11} style={{ verticalAlign: 'middle', marginRight: '5px' }} />}
                      {entry.path.split('/').at(-1)}
                    </div>
                  ))}
                </div>
              </div>

              {selectedAnalysis && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {/* Module Exports Box */}
                  <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#c084fc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={14} />
                      <span>Module Exports ({selectedAnalysis.exports.length})</span>
                    </div>
                    {selectedAnalysis.exports.length === 0 ? (
                      <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                        {lang === 'th' ? 'ไม่มีการ export สัญลักษณ์ในไฟล์นี้' : 'No explicit exports found in this module'}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {selectedAnalysis.exports.map(exp => (
                          <span key={exp} style={{ fontSize: '10px', background: 'rgba(192, 132, 252, 0.15)', border: '1px solid rgba(192, 132, 252, 0.3)', color: '#e9d5ff', padding: '3px 8px', borderRadius: '5px', fontWeight: 600 }}>
                            export {exp}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Complexity Box */}
                  <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', marginBottom: '8px' }}>
                      {lang === 'th' ? 'ดัชนีความซับซ้อน (Complexity Metrics)' : 'Complexity Metrics'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                      <div>Cyclomatic: <b style={{ color: '#fbbf24' }}>{selectedAnalysis.complexity}</b></div>
                      <div>Branches: <b>{selectedAnalysis.complexityMetrics.branches}</b></div>
                      <div>Functions: <b>{selectedAnalysis.functions}</b></div>
                      <div>Max Nesting: <b>{selectedAnalysis.complexityMetrics.maxNestingDepth}</b></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SYMBOL TABLE */}
          {activeTab === 'symbols' && selectedAnalysis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#64748b' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={lang === 'th' ? 'ค้นหา Symbol ในไฟล์นี้…' : 'Filter symbols in file…'}
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 32px',
                      background: '#090d16',
                      border: '1px solid #1e293b',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '11px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['all', 'functions', 'classes', 'exports'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterType(type)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        border: 0,
                        background: filterType === type ? '#334155' : '#090d16',
                        color: filterType === type ? '#f8fafc' : '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #1e293b', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#090d16', borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                      <th style={{ padding: '8px 12px' }}>Name</th>
                      <th style={{ padding: '8px 12px' }}>Type</th>
                      <th style={{ padding: '8px 12px' }}>Lines</th>
                      <th style={{ padding: '8px 12px' }}>Scope</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSymbols.map(sym => (
                      <tr key={`${sym.name}-${sym.line}`} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#f8fafc', fontWeight: 600 }}>{sym.name}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#1e293b', color: '#38bdf8' }}>{sym.type}</span>
                        </td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>L{sym.line}:{sym.character || 1} → L{sym.endLine || sym.line}:{sym.endCharacter || 1}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ fontSize: '9px', color: sym.exported ? '#c084fc' : '#64748b' }}>{sym.exported ? 'Exported' : 'Internal'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DEPENDENCIES & CALL GRAPH & ENTRY POINTS */}
          {activeTab === 'dependencies' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Entry Points Section */}
              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#a855f7', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={14} />
                  <span>{lang === 'th' ? `จุดเริ่มต้นของระบบ (Detected Entry Points: ${entryPoints.length})` : `Application Entry Points (${entryPoints.length})`}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {entryPoints.map(ep => (
                    <div key={ep.path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: '#0d1522', borderRadius: '6px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', color: '#f8fafc', fontWeight: 600 }}>{ep.path}</span>
                        <span style={{ fontSize: '9px', background: 'rgba(168, 85, 247, 0.15)', color: '#d8b4fe', padding: '2px 6px', borderRadius: '4px' }}>{ep.type}</span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{ep.reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Call Graph for Selected File */}
              {selectedAnalysis?.callGraph && selectedAnalysis.callGraph.length > 0 && (
                <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                    {lang === 'th' ? `Call Graph สกัดจาก AST ของ ${selectedFile?.path} (${selectedAnalysis.callGraph.length} การเรียก)` : `AST Call Graph for ${selectedFile?.path} (${selectedAnalysis.callGraph.length} calls)`}
                  </div>
                  <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedAnalysis.callGraph.map((call, idx) => (
                      <div key={idx} style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px', background: '#0d1522', borderRadius: '4px' }}>
                        <span style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{call.caller}()</span>
                        <ArrowRight size={11} style={{ color: '#2dd4bf' }} />
                        <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{call.callee}()</span>
                        <span style={{ marginLeft: 'auto', color: '#64748b' }}>L{call.line} [{call.resolvedKind}]</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dependency Map */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>
                  {lang === 'th' ? 'การพึ่งพาข้ามโมดูล (Cross-Module Dependency Graph)' : 'Cross-Module Dependency Graph'}
                </div>
                {dependencyGraph?.nodes.map(filePath => {
                  const edges = dependencyGraph.edges.filter(edge => edge.source === filePath);
                  const isCur = filePath === selectedFilePath;
                  return (
                    <div key={filePath} style={{ background: '#090d16', border: isCur ? '1px solid #14b8a6' : '1px solid #1e293b', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: isCur ? '#2dd4bf' : '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileCode2 size={13} />
                        <span>{filePath}</span>
                      </div>
                      <div style={{ marginTop: '6px', paddingLeft: '14px', borderLeft: '2px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {edges.map(edge => (
                          <div key={`${edge.source}-${edge.target}-${edge.evidence}`} style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ChevronRight size={12} style={{ color: '#2dd4bf' }} />
                            <span style={{ fontFamily: 'monospace' }}>{edge.target}</span>
                            <span style={{ color: '#64748b' }}>({edge.relationship})</span>
                          </div>
                        ))}
                        {edges.length === 0 && <span style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>No internal imports</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: IMPACT ANALYSIS & RISK REPORT */}
          {activeTab === 'impact' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Diff Input / Options */}
              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>
                    {lang === 'th' ? `วิเคราะห์ผลกระทบสำหรับ: ${selectedFilePath}` : `Impact Analysis Target: ${selectedFilePath}`}
                  </span>
                  <button
                    type="button"
                    onClick={runImpactAnalysis}
                    disabled={isAnalyzingImpact}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      background: '#0ea5e9',
                      border: 0,
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: isAnalyzingImpact ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isAnalyzingImpact ? 'Analyzing…' : (lang === 'th' ? 'คำนวณผลกระทบ' : 'Recalculate')}
                  </button>
                </div>
                <textarea
                  value={customDiff}
                  onChange={e => setCustomDiff(e.target.value)}
                  placeholder={lang === 'th' ? 'วาง Git Diff เพื่อจำลองผลกระทบเฉพาะส่วนที่แก้ไข (หรือเว้นว่างเพื่อวิเคราะห์ทั้งโมดูล)' : 'Optional: paste git diff snippet to focus impact on altered lines only...'}
                  rows={3}
                  style={{
                    width: '100%',
                    background: '#0d1522',
                    border: '1px solid #1e293b',
                    borderRadius: '6px',
                    padding: '8px',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    color: '#f8fafc',
                    resize: 'vertical'
                  }}
                />
              </div>

              {impactReport && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Risk Badge Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '11px',
                          background:
                            impactReport.riskLevel === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' :
                            impactReport.riskLevel === 'HIGH' ? 'rgba(249, 115, 22, 0.2)' :
                            impactReport.riskLevel === 'MEDIUM' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                          color:
                            impactReport.riskLevel === 'CRITICAL' ? '#fca5a5' :
                            impactReport.riskLevel === 'HIGH' ? '#fdba74' :
                            impactReport.riskLevel === 'MEDIUM' ? '#fde047' : '#86efac',
                          border: '1px solid currentColor'
                        }}
                      >
                        RISK: {impactReport.riskLevel}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Change Type: <b style={{ color: '#f8fafc' }}>{impactReport.changeType}</b>
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Blast Radius: <b style={{ color: '#38bdf8' }}>{impactReport.affectedFiles.length} files</b>
                    </span>
                  </div>

                  {/* 4 Categorical Partition Boxes */}
                  {/* 1. VERIFIED FACTS */}
                  <div style={{ background: '#090d16', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={13} />
                      <span>{lang === 'th' ? 'ข้อเท็จจริงที่ยืนยันแล้ว (VERIFIED FACTS)' : 'VERIFIED FACTS'}</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {impactReport.verifiedFacts.map((fact, idx) => (
                        <li key={idx}>{fact}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 2. ANALYSIS */}
                  <div style={{ background: '#090d16', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Network size={13} />
                      <span>{lang === 'th' ? 'ผลการวิเคราะห์โครงสร้าง (ANALYSIS)' : 'ANALYSIS'}</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {impactReport.analysis.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 3. HYPOTHESES */}
                  <div style={{ background: '#090d16', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={13} />
                      <span>{lang === 'th' ? 'สมมติฐานและความเสี่ยง (HYPOTHESES)' : 'HYPOTHESES'}</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {impactReport.hypotheses.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 4. UNKNOWNS */}
                  <div style={{ background: '#090d16', border: '1px solid rgba(148, 163, 184, 0.3)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldAlert size={13} />
                      <span>{lang === 'th' ? 'สิ่งที่ยังไม่ทราบ (UNKNOWN)' : 'UNKNOWN'}</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {impactReport.unknowns.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Regression Test Recommendations */}
                  <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#a855f7', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={13} />
                      <span>{lang === 'th' ? `รายการทดสอบถดถอยที่แนะนำ (${impactReport.recommendedRegressionTests.length})` : `Recommended Regression Tests (${impactReport.recommendedRegressionTests.length})`}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {impactReport.recommendedRegressionTests.map(rec => (
                        <div key={rec.testFile} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: '#0d1522', borderRadius: '6px', fontSize: '11px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'monospace', color: '#f8fafc', fontWeight: 600 }}>{rec.testFile}</span>
                            <span
                              style={{
                                fontSize: '9px',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: rec.priority === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                                color: rec.priority === 'HIGH' ? '#fca5a5' : '#7dd3fc',
                              }}
                            >
                              {rec.priority}
                            </span>
                          </div>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>{rec.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ENGINEERING CHANGE GATE & APPROVAL */}
          {activeTab === 'gate' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={16} style={{ color: '#8b5cf6' }} />
                  <span>{lang === 'th' ? 'ประตูควบคุมการเปลี่ยนแปลง (Engineering Change Gate Workflow)' : 'Engineering Change Gate Workflow'}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {lang === 'th'
                    ? 'สถาปัตยกรรมความปลอดภัย 9 ขั้นตอน: Repository Analysis → Proposal → Impact Analysis → Risk Assessment → Human Approval → Execution Gateway → Sandbox Execution → Verification → Audit Ledger'
                    : 'Governed 9-step change workflow enforcing human verification before any filesystem modification.'}
                </div>

                {!changeGateProposal ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                      {lang === 'th' ? `สร้างข้อเสนอการเปลี่ยนแปลงสำหรับไฟล์: ` : 'Create change proposal for file: '}
                      <b style={{ color: '#38bdf8' }}>{selectedFilePath}</b>
                    </div>
                    <button
                      type="button"
                      onClick={proposeChangeGate}
                      disabled={isProposingChange || !selectedFilePath}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        border: 0,
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: isProposingChange ? 'not-allowed' : 'pointer',
                        alignSelf: 'flex-start',
                      }}
                    >
                      {isProposingChange ? 'Proposing…' : (lang === 'th' ? 'ยื่นข้อเสนอการเปลี่ยนแปลง (Submit Proposal)' : 'Submit Change Proposal')}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0d1522', padding: '8px 12px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>Proposal ID: <b style={{ color: '#f8fafc' }}>{changeGateProposal.patchId}</b></span>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          background: changeGateProposal.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: changeGateProposal.status === 'APPROVED' ? '#86efac' : '#fde047',
                        }}
                      >
                        STATUS: {changeGateProposal.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                      Target: <b style={{ color: '#38bdf8' }}>{changeGateProposal.proposal?.targetFile || selectedFilePath}</b>
                    </div>

                    {/* Action Buttons based on status */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      {changeGateProposal.status !== 'APPROVED' && changeGateProposal.status !== 'APPLIED' && (
                        <button
                          type="button"
                          onClick={() => approveChangeGate(changeGateProposal.patchId)}
                          disabled={isApprovingChange}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            background: '#10b981',
                            border: 0,
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: isApprovingChange ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {lang === 'th' ? 'อนุมัติการเปลี่ยนแปลง (Grant Human Approval)' : 'Grant Human Approval'}
                        </button>
                      )}

                      {changeGateProposal.status === 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => executeChangeGate(changeGateProposal.patchId)}
                          disabled={isApprovingChange}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                            border: 0,
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: isApprovingChange ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {lang === 'th' ? 'ประยุกต์ใช้แพตช์ผ่าน Execution Gateway' : 'Apply Patch via Execution Gateway'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setChangeGateProposal(null)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: '#1e293b',
                          border: 0,
                          color: '#94a3b8',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        {lang === 'th' ? 'ปิด / ล้างสถานะ' : 'Reset Gate'}
                      </button>
                    </div>

                    {changeGateProposal.auditHash && (
                      <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace', marginTop: '4px' }}>
                        Audit Evidence Digest: {changeGateProposal.auditHash}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: JSON CONTEXT SPEC */}
          {activeTab === 'json' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {lang === 'th' ? 'โครงสร้างข้อมูล JSON Hierarchy ที่ใช้เป็น Context สำหรับ AI Reasoning Model' : 'Structured JSON Hierarchy referenced by AI for deep context reasoning'}
                </span>
                <button
                  type="button"
                  onClick={copyJsonContext}
                  disabled={!validatedContext}
                  style={{ background: '#1e293b', border: 0, color: '#38bdf8', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', cursor: validatedContext ? 'pointer' : 'not-allowed', opacity: validatedContext ? 1 : 0.5 }}
                >
                  {copiedContext ? 'Copied!' : 'Copy Validated JSON'}
                </button>
              </div>

              <pre
                style={{
                  background: '#090d16',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: '#2dd4bf',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}
              >
                {validatedContext ? jsonHierarchyContext : (scanError || (lang === 'th' ? 'JSON Context ยังไม่ผ่านการตรวจสอบหรือไม่มีผลสแกน' : 'Validated JSON context is unavailable.'))}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RepositoryIntelligence;
