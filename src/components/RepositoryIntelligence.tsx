import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Code2, Network, FileCode2, Boxes, Copy, Check, Search, Download,
  Layers, ShieldCheck, ChevronRight, ChevronDown, Terminal, Eye, WandSparkles, Filter, RefreshCw
} from 'lucide-react';
import type { CodeAnalysis, SymbolInfo } from '../../lib/code-intelligence';
import type { DependencyGraphResult, RepositoryFileKind, RepositoryScanStatus } from '../services/repositoryIntelligence';
import { useTranslation } from '../../lib/i18n';

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
    averageComplexity: number | null;
    scannedAt: string;
    warnings: string[];
  } | null>(null);
  const [dependencyGraph, setDependencyGraph] = useState<DependencyGraphResult | null>(null);
  const [validatedContext, setValidatedContext] = useState<string | null>(null);

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

  const [selectedFilePath, setSelectedFilePath] = useState<string>('server.ts');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'functions' | 'classes' | 'exports'>('all');
  const [copiedContext, setCopiedContext] = useState(false);
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'symbols' | 'dependencies' | 'json'>('hierarchy');

  // Update selected file path if current selected file not in effectiveFiles
  useEffect(() => {
    if (effectiveFiles.length > 0 && !effectiveFiles.some(f => (f.path || f.name) === selectedFilePath)) {
      setSelectedFilePath(effectiveFiles[0].path || effectiveFiles[0].name);
    }
  }, [effectiveFiles, selectedFilePath]);

  // Analyses are produced by the backend AST scanner; the browser never reparses file contents.
  const analysesMap = useMemo(() => {
    const map: Record<string, CodeAnalysis> = {};
    for (const f of effectiveFiles) {
      const path = f.path || f.name;
      if (f.analysis) map[path] = f.analysis;
    }
    return map;
  }, [effectiveFiles]);

  // Currently selected file
  const selectedFile = useMemo(() => {
    return effectiveFiles.find(f => (f.path || f.name) === selectedFilePath) || effectiveFiles[0];
  }, [effectiveFiles, selectedFilePath]);

  const selectedAnalysis = useMemo(() => {
    if (!selectedFile) return null;
    return analysesMap[selectedFile.path || selectedFile.name] || null;
  }, [selectedFile, analysesMap]);

  // JSON Hierarchy Export for AI Context Reference
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

  // Filtered symbols for selected file
  const filteredSymbols = useMemo(() => {
    if (!selectedAnalysis) return [];
    let list = selectedAnalysis.symbols;

    if (filterType === 'functions') list = list.filter(s => s.type === 'function');
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
              {lang === 'th' ? 'ระบบวิเคราะห์ความเข้าใจโปรเจกต์ (Repository Intelligence)' : 'Repository Intelligence Engine'}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {lang === 'th'
                ? 'ถอดรหัสโครงสร้างโปรเจกต์ Symbol Table, Module Exports และ Dependency Graph เป็น JSON Hierarchy เพื่อ AI Context Reference'
                : 'Resolves project structure, symbols, module exports, and dependency graph into a structured JSON hierarchy for AI reasoning context.'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchRepositoryScan}
            disabled={isScanning}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            title="สแกนซอร์สโค้ดจริงใน Repository"
          >
            <RefreshCw size={14} className={isScanning ? 'spin' : ''} />
            <span>{isScanning ? (lang === 'th' ? 'กำลังสแกน…' : 'Scanning…') : (lang === 'th' ? 'สแกนซอร์สโค้ดใหม่' : 'Rescan Repository')}</span>
          </button>

          <button
            type="button"
            onClick={copyJsonContext}
            disabled={!validatedContext}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              background: '#1e293b',
              border: '1px solid #334155',
              color: copiedContext ? '#4ade80' : '#e2e8f0',
              cursor: validatedContext ? 'pointer' : 'not-allowed',
              opacity: validatedContext ? 1 : 0.5,
              transition: 'all 0.15s'
            }}
          >
            {copiedContext ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedContext ? (lang === 'th' ? 'คัดลอกแล้ว!' : 'Copied!') : (lang === 'th' ? 'คัดลอก JSON Context' : 'Copy JSON Context')}</span>
          </button>

          {onSendToChatContext && (
            <button
              type="button"
              onClick={handleInjectContext}
              disabled={!validatedContext || !selectedAnalysis}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                background: 'linear-gradient(120deg, #14b8a6, #0d9488)',
                border: 0,
                color: '#fff',
                cursor: validatedContext && selectedAnalysis ? 'pointer' : 'not-allowed',
                opacity: validatedContext && selectedAnalysis ? 1 : 0.5,
                boxShadow: '0 4px 14px rgba(20, 184, 166, 0.25)'
              }}
            >
              <WandSparkles size={14} />
              <span>{lang === 'th' ? 'ส่ง Context ให้ AI' : 'Inject AI Context'}</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ border: '1px solid #1e293b', borderRadius: '8px', background: scanStatus === 'FAILED' ? 'rgba(127, 29, 29, 0.18)' : '#0d1522', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '5px' }} role="status" aria-live="polite">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, color: scanStatus === 'FAILED' ? '#fca5a5' : scanStatus === 'PARTIAL' ? '#fbbf24' : scanStatus === 'SCANNING' ? '#38bdf8' : '#4ade80' }}>
          <span>{scanStatus === 'SCANNING' ? (lang === 'th' ? 'กำลังสแกน Workspace…' : 'Scanning workspace…') : scanStatus}</span>
          {scanSummary && <span style={{ fontWeight: 400, color: '#94a3b8' }}>{new Date(scanSummary.scannedAt).toLocaleString()}</span>}
        </div>
        {scanError && <div style={{ color: scanStatus === 'FAILED' ? '#fecaca' : '#fcd34d', fontSize: '10px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{scanError}</div>}
        {!scanError && scanStatus === 'COMPLETED' && effectiveFiles.length === 0 && (
          <div style={{ color: '#94a3b8', fontSize: '10px' }}>
            {lang === 'th' ? 'สแกนสำเร็จ แต่ไม่พบไฟล์ TypeScript, JavaScript หรือไฟล์ Configuration ที่รองรับใน Workspace นี้' : 'Scan completed, but no supported TypeScript, JavaScript, or configuration files were found in this workspace.'}
          </div>
        )}
      </div>

      {/* Top Metrics Cards */}
      {scanSummary && effectiveFiles.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        <div style={{ background: '#0d1522', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {lang === 'th' ? 'จำนวนไฟล์ที่สแกน' : 'Scanned Files'}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
            {scanSummary.scannedFiles} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>files</span>
          </div>
        </div>

        <div style={{ background: '#0d1522', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {lang === 'th' ? 'Modules' : 'Modules'}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
            {scanSummary.totalModules}
          </div>
        </div>

        <div style={{ background: '#0d1522', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {lang === 'th' ? 'Symbols ทั้งหมด' : 'Total Resolved Symbols'}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#2dd4bf', marginTop: '4px' }}>
            {scanSummary.totalSymbols}{' '}
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>symbols</span>
          </div>
        </div>

        <div style={{ background: '#0d1522', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {lang === 'th' ? 'Module Exports' : 'Module Exports'}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#c084fc', marginTop: '4px' }}>
            {scanSummary.totalExports}{' '}
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>exports</span>
          </div>
        </div>

        <div style={{ background: '#0d1522', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {lang === 'th' ? 'เฉลี่ย Complexity' : 'Avg Complexity'}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
            {scanSummary.averageComplexity === null ? 'N/A' : scanSummary.averageComplexity.toFixed(1)}{' '}
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>{scanSummary.averageComplexity === null ? 'unavailable' : 'score'}</span>
          </div>
        </div>
      </div>}

      {/* Main Interactive Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'start' }}>
        {/* Left Column: File Explorer List */}
        <div style={{ background: '#0d1522', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 4px' }}>
            {lang === 'th' ? 'รายการไฟล์ในโปรเจกต์' : 'Project Structure Files'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '520px', overflowY: 'auto' }}>
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
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {lang === 'th' ? 'ลำดับชั้น & Exports' : 'Hierarchy & Exports'}
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
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {lang === 'th' ? 'ตาราง Symbol Table' : 'Symbol Table'}
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
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {lang === 'th' ? 'แผนผัง Dependency' : 'Dependency Graph'}
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
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {lang === 'th' ? 'JSON Context Spec' : 'JSON Context Spec'}
              </button>
            </div>

            <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileCode2 size={14} />
              <span>{selectedFile?.path || selectedFile?.name}</span>
            </div>
          </div>

          {activeTab === 'hierarchy' && effectiveFiles.length > 0 && (
            <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>Module Hierarchy</div>
              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {moduleHierarchyEntries.map(entry => (
                  <div key={entry.path} style={{ paddingLeft: `${entry.depth * 14}px`, color: entry.type === 'dir' ? '#fbbf24' : '#cbd5e1', fontSize: '10px', fontFamily: 'monospace' }}>
                    {entry.type === 'dir' ? <Boxes size={11} style={{ verticalAlign: 'middle', marginRight: '5px' }} /> : <FileCode2 size={11} style={{ verticalAlign: 'middle', marginRight: '5px' }} />}
                    {entry.path.split('/').at(-1)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!selectedAnalysis && activeTab !== 'dependencies' && activeTab !== 'json' && (
            <div style={{ padding: '18px', border: '1px dashed #334155', borderRadius: '8px', color: '#94a3b8', fontSize: '11px', textAlign: 'center' }}>
              {selectedFile
                ? (lang === 'th' ? `ไฟล์ ${selectedFile.path} เป็น ${selectedFile.kind || 'ไฟล์ที่ไม่รองรับ'} จึงไม่มี AST Symbols หรือ Complexity ให้แสดง` : `${selectedFile.path} is ${selectedFile.kind || 'unsupported'} and has no AST symbol or complexity analysis.`)
                : (lang === 'th' ? 'ไม่มีไฟล์ Workspace ที่พร้อมวิเคราะห์' : 'No workspace files are available for analysis.')}
            </div>
          )}

          {/* TAB 1: HIERARCHY & EXPORTS */}
          {activeTab === 'hierarchy' && selectedAnalysis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

                {/* Module Imports Box */}
                <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Network size={14} />
                    <span>Module Imports ({selectedAnalysis.imports.length})</span>
                  </div>
                  {selectedAnalysis.imports.length === 0 ? (
                    <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                      {lang === 'th' ? 'ไม่พบ Import ในไฟล์นี้' : 'No imports detected in this module'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                      {selectedAnalysis.imports.map(imp => (
                        <span key={imp} style={{ fontSize: '10px', color: '#93c5fd', fontFamily: 'monospace' }}>
                          import from '{imp}'
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Module Complexity Overview */}
              <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>Total Lines: </span>
                    <strong style={{ fontSize: '12px', color: '#f8fafc' }}>{selectedAnalysis.lines}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>Functions Count: </span>
                    <strong style={{ fontSize: '12px', color: '#2dd4bf' }}>{selectedAnalysis.functions}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>Cyclomatic Complexity: </span>
                    <strong style={{ fontSize: '12px', color: '#fbbf24' }}>{selectedAnalysis.complexityMetrics?.cyclomatic ?? 'N/A'}</strong>
                  </div>
                  <div style={{ width: '100%', color: '#64748b', fontSize: '9px' }}>{selectedAnalysis.complexityMetrics?.formula}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: selectedAnalysis.parserWarnings.length ? '#fbbf24' : '#4ade80' }}>
                  <ShieldCheck size={14} />
                  <span>{selectedAnalysis.parserWarnings.length ? `${selectedAnalysis.parserWarnings.length} parser warning(s)` : 'AST static analysis'}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SYMBOL TABLE */}
          {activeTab === 'symbols' && selectedAnalysis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Search and Filters */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#090d16', border: '1px solid #1e293b', borderRadius: '6px', padding: '4px 8px' }}>
                  <Search size={13} style={{ color: '#64748b' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={lang === 'th' ? 'ค้นหา symbol...' : 'Search symbol name...'}
                    style={{ background: 'transparent', border: 0, outline: 'none', color: '#fff', fontSize: '11px', width: '160px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['all', 'functions', 'classes', 'exports'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterType(type)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '5px',
                        fontSize: '10px',
                        border: '1px solid #1e293b',
                        background: filterType === type ? '#1e293b' : 'transparent',
                        color: filterType === type ? '#38bdf8' : '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div style={{ border: '1px solid #1e293b', borderRadius: '8px', overflowX: 'auto', background: '#090d16' }}>
                <table style={{ width: '100%', minWidth: '520px', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#0e1726', borderBottom: '1px solid #1e293b', color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '8px 12px' }}>Symbol Name</th>
                      <th style={{ padding: '8px 12px' }}>Type</th>
                      <th style={{ padding: '8px 12px' }}>Line</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSymbols.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                          {lang === 'th' ? 'ไม่พบ Symbol ตามเงื่อนไขที่เลือก' : 'No symbols found matching filter'}
                        </td>
                      </tr>
                    ) : (
                      filteredSymbols.map((sym, idx) => {
                        const isExported = Boolean(sym.exported);
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #141f30' }}>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#f8fafc' }}>
                              {sym.name}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span
                                style={{
                                  fontSize: '9px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: sym.type === 'function' ? 'rgba(45, 212, 191, 0.15)' : sym.type === 'class' ? 'rgba(192, 132, 252, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                                  color: sym.type === 'function' ? '#2dd4bf' : sym.type === 'class' ? '#c084fc' : '#38bdf8'
                                }}
                              >
                                {sym.type}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', color: '#94a3b8', fontFamily: 'monospace' }}>
                              L{sym.line}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              {isExported ? (
                                <span style={{ fontSize: '9px', color: '#c084fc', background: 'rgba(192, 132, 252, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                                  Exported · {sym.visibility || 'public'}
                                </span>
                              ) : (
                                <span style={{ fontSize: '9px', color: '#64748b' }}>Internal</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DEPENDENCY GRAPH */}
          {activeTab === 'dependencies' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                {lang === 'th' ? 'ความสัมพันธ์การนำเข้าระหว่างมอดูลต่าง ๆ ในโปรเจกต์' : 'Module Import & Inter-dependency Mapping Graph'}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {!dependencyGraph || dependencyGraph.nodes.length === 0 ? (
                  <div style={{ padding: '16px', color: '#94a3b8', fontSize: '11px' }}>
                    {lang === 'th' ? 'ไม่มีโมดูลที่วิเคราะห์ได้สำหรับสร้าง dependency graph' : 'No analyzed modules are available for the dependency graph.'}
                  </div>
                ) : dependencyGraph.nodes.map(filePath => {
                  const edges = dependencyGraph.edges.filter(edge => edge.source === filePath);
                  const unresolved = dependencyGraph.unresolvedDependencies.filter(item => item.source === filePath);
                  const external = dependencyGraph.externalDependencies.filter(item => item.source === filePath);
                  return (
                    <div key={filePath} style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileCode2 size={13} />
                        <span>{filePath}</span>
                      </div>
                      <div style={{ marginTop: '6px', paddingLeft: '16px', borderLeft: '2px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {edges.map(edge => (
                          <div key={`${edge.source}-${edge.target}-${edge.evidence}`} style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ChevronRight size={12} style={{ color: '#2dd4bf' }} />
                            <span style={{ fontFamily: 'monospace' }}>{edge.target}</span>
                            <span style={{ color: '#64748b' }}>{edge.relationship}</span>
                          </div>
                        ))}
                        {external.map(item => <div key={`${item.source}-${item.specifier}`} style={{ fontSize: '10px', color: '#94a3b8' }}>External: {item.specifier}</div>)}
                        {unresolved.map(item => <div key={`${item.source}-${item.specifier}`} style={{ fontSize: '10px', color: '#fca5a5' }}>Unresolved: {item.specifier}</div>)}
                        {edges.length + external.length + unresolved.length === 0 && <span style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>No imports detected</span>}
                      </div>
                    </div>
                  );
                })}
                {dependencyGraph?.circularDependencies.map(cycle => (
                  <div key={cycle.join(' -> ')} style={{ borderLeft: '2px solid #f59e0b', padding: '6px 10px', color: '#fbbf24', fontSize: '10px' }}>
                    Circular dependency: {cycle.join(' -> ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: JSON CONTEXT SPEC */}
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
