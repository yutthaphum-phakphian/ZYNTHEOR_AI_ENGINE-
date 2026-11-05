// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  FileText, Network, Code2, ShieldCheck, RefreshCw, Layers, CheckCircle2,
  AlertTriangle, Cpu, Terminal, Sparkles, ChevronRight, Eye, Info
} from 'lucide-react';
import { useTranslation } from '../../lib/i18n';

export interface ContextInspectorProps {
  activeWorkspaceId: string;
  activeProjectName: string;
  retrievedContext: any | null;
  onRefreshContext?: () => void;
}

export function ContextInspector({
  activeWorkspaceId,
  activeProjectName,
  retrievedContext,
  onRefreshContext,
}: ContextInspectorProps) {
  const { lang } = useTranslation();
  const isTh = lang === 'th';

  const [activeTab, setActiveTab] = useState<'files' | 'graph' | 'symbols' | 'metadata'>('files');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const excerpts = retrievedContext?.retrievedExcerpts || [];
  const edges = retrievedContext?.graphEdges || [];
  const symbols = retrievedContext?.relevantSymbols || [];
  const totalBytes = retrievedContext?.totalContextBytes || 0;
  const tokens = retrievedContext?.estimatedTokens || 0;
  const isFresh = retrievedContext?.isFresh ?? true;
  const freshnessTime = retrievedContext?.contextFreshnessTimestamp || new Date().toISOString();

  useEffect(() => {
    if (excerpts.length > 0 && !selectedFile) {
      setSelectedFile(excerpts[0].file);
    }
  }, [excerpts, selectedFile]);

  const activeExcerpt = excerpts.find((e: any) => e.file === selectedFile) || excerpts[0];

  return (
    <div
      className="context-inspector-card"
      style={{
        background: '#0d1828',
        border: '1px solid rgba(148, 163, 184, 0.14)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* Header Banner */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontWeight: 700, color: '#14b8a6', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <Layers size={13} /> WORKSPACE INTELLIGENCE / CONTEXT INSPECTOR
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{activeProjectName || 'Main Workspace'}</span>
            <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#1e293b', color: '#38bdf8' }}>
              ID: {activeWorkspaceId}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.2)' }}>
            <ShieldCheck size={14} /> {isTh ? 'ความปลอดภัยขั้นสูง (ไม่มีการดึง Secrets)' : 'Sanitized (0 Secrets Exposed)'}
          </div>

          {onRefreshContext && (
            <button
              type="button"
              className="secondary-button"
              onClick={onRefreshContext}
              style={{ fontSize: '11px', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={12} /> {isTh ? 'อัปเดตดัชนี' : 'Refresh Index'}
            </button>
          )}
        </div>
      </div>

      {/* Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
        <MetricBox label={isTh ? 'ไฟล์บริบทที่ดึงมา' : 'Retrieved Files'} value={`${excerpts.length} ${isTh ? 'ไฟล์' : 'files'}`} hint="Context Pool" />
        <MetricBox label={isTh ? 'ความสัมพันธ์ใน Graph' : 'Graph Edges'} value={`${edges.length} ${isTh ? 'เส้น' : 'edges'}`} hint="Code Graph" />
        <MetricBox label={isTh ? 'ขนาดบริบทที่ใช้' : 'Context Size'} value={`${(totalBytes / 1024).toFixed(1)} KB`} hint={`~${tokens} Tokens`} />
        <MetricBox label={isTh ? 'ความสดของบริบท' : 'Context Freshness'} value={isFresh ? 'Fresh' : 'Stale'} hint={new Date(freshnessTime).toLocaleTimeString()} isGood={isFresh} />
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
        <TabButton id="files" active={activeTab} onClick={setActiveTab} icon={FileText} label={isTh ? `ไฟล์บริบท (${excerpts.length})` : `Retrieved Files (${excerpts.length})`} />
        <TabButton id="graph" active={activeTab} onClick={setActiveTab} icon={Network} label={isTh ? `Code Graph (${edges.length})` : `Code Graph (${edges.length})`} />
        <TabButton id="symbols" active={activeTab} onClick={setActiveTab} icon={Code2} label={isTh ? `Symbols (${symbols.length})` : `Symbols (${symbols.length})`} />
      </div>

      {/* TAB 1: FILES */}
      {activeTab === 'files' && (
        <div style={{ display: 'grid', gridTemplateColumns: excerpts.length > 0 ? 'minmax(180px, 220px) 1fr' : '1fr', gap: '12px' }}>
          {excerpts.length > 0 ? (
            <>
              {/* File List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '280px' }}>
                {excerpts.map((item: any) => {
                  const isSelected = item.file === selectedFile;
                  return (
                    <button
                      key={item.file}
                      type="button"
                      onClick={() => setSelectedFile(item.file)}
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        background: isSelected ? 'rgba(56, 189, 248, 0.15)' : '#111f32',
                        border: isSelected ? '1px solid #38bdf8' : '1px solid transparent',
                        color: isSelected ? '#38bdf8' : '#cbd5e1',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <span style={{ fontWeight: 600, wordBreak: 'break-all' }}>{item.file}</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8' }}>
                        <span>{item.totalLines} {isTh ? 'บรรทัด' : 'lines'}</span>
                        <span style={{ color: '#14b8a6' }}>Score: {item.relevanceScore}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Code Preview */}
              {activeExcerpt && (
                <div style={{ background: '#080f1b', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
                    <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{activeExcerpt.file}</span>
                    <span>Source: {activeExcerpt.retrievalSource}</span>
                  </div>
                  <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'monospace', color: '#cbd5e1', overflowX: 'auto', maxHeight: '220px', lineHeight: 1.5 }}>
                    <code>{activeExcerpt.content}</code>
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
              {isTh ? 'ยังไม่มีบริบทไฟล์ถูกดึงมาในการสนทนาปัจจุบัน' : 'No file context retrieved for current query.'}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CODE GRAPH */}
      {activeTab === 'graph' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {edges.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
              {edges.map((e: any) => (
                <div key={e.id} style={{ background: '#111f32', border: '1px solid #1e293b', padding: '8px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{e.sourceFile}</span>
                  <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(20, 184, 166, 0.2)', color: '#2dd4bf' }}>
                    {e.relationshipType}
                  </span>
                  <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{e.targetFile}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
              {isTh ? 'ยังไม่มีความสัมพันธ์ใน Code Graph ถูกใช้งานในบริบทนี้' : 'No Code Graph edges retrieved for active context.'}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SYMBOLS */}
      {activeTab === 'symbols' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
          {symbols.length > 0 ? (
            symbols.map((sym: string, i: number) => (
              <span key={`${sym}-${i}`} style={{ fontSize: '11px', fontFamily: 'monospace', padding: '4px 8px', borderRadius: '4px', background: '#111f32', border: '1px solid #1e293b', color: '#2dd4bf' }}>
                ƒ {sym}
              </span>
            ))
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', width: '100%' }}>
              {isTh ? 'ไม่พบสัญลักษณ์หรือฟังก์ชันที่เกี่ยวข้อง' : 'No relevant exported symbols found.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricBox({ label, value, hint, isGood }: { label: string; value: string; hint: string; isGood?: boolean }) {
  return (
    <div style={{ background: '#111f32', border: '1px solid #1e293b', borderRadius: '8px', padding: '8px 10px' }}>
      <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: isGood === false ? '#ef4444' : '#38bdf8', marginTop: '2px' }}>{value}</div>
      <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '1px' }}>{hint}</div>
    </div>
  );
}

function TabButton({ id, active, onClick, icon: Icon, label }: { id: any; active: any; onClick: any; icon: any; label: string }) {
  const isActive = id === active;
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: isActive ? 600 : 400,
        background: isActive ? '#172a40' : 'transparent',
        color: isActive ? '#38bdf8' : '#94a3b8',
        border: isActive ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
        cursor: 'pointer',
      }}
    >
      <Icon size={13} /> {label}
    </button>
  );
}
