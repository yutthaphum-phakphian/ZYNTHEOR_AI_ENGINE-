// @ts-nocheck
import { useState, useCallback, useMemo } from 'react';
import {
  Activity,
  Award,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Download,
  Gauge,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
  Code2,
  Copy,
  Check,
  Columns,
  ListFilter,
  ArrowRightLeft,
  Trophy,
} from 'lucide-react';
import {
  type BenchmarkComparisonReport,
  type TaskEvaluationResult,
  getComparisonModels,
  compareModelsSideBySide,
  type ModelComparisonProfile,
} from '../../lib/model-benchmark';

interface ModelBenchmarkSuiteProps {
  configuredModel?: string;
  providerId?: string;
}

export function ModelBenchmarkSuite({ configuredModel, providerId }: ModelBenchmarkSuiteProps) {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<BenchmarkComparisonReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'sideBySide' | 'standardSuite'>('sideBySide');
  const [copied, setCopied] = useState(false);

  // Model selection for side-by-side comparison
  const [selectedModelAId, setSelectedModelAId] = useState<string>('configured-model');
  const [selectedModelBId, setSelectedModelBId] = useState<string>('baseline-reference');

  const availableModels = useMemo(() => getComparisonModels(report), [report]);

  const sideBySideResult = useMemo(
    () => compareModelsSideBySide(selectedModelAId, selectedModelBId, report),
    [selectedModelAId, selectedModelBId, report]
  );

  const swapModels = useCallback(() => {
    setSelectedModelAId(selectedModelBId);
    setSelectedModelBId(selectedModelAId);
  }, [selectedModelAId, selectedModelBId]);

  const runBenchmark = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/models/benchmark-compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionStorage.getItem('zyntheor.access.v1')
            ? { Authorization: `Bearer ${sessionStorage.getItem('zyntheor.access.v1')}` }
            : {}),
        },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }
      setReport(data.report);
      if (data.report.tasks?.length > 0) {
        setExpandedTaskId(data.report.tasks[0].taskId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute benchmark');
    } finally {
      setRunning(false);
    }
  }, []);

  const copyReport = useCallback(() => {
    const res = sideBySideResult;
    const text = `# ZYNTHEOR Side-by-Side Model Benchmark Comparison Report
Model A: ${res.modelA.name} (${res.modelA.overallScore}%, Grade ${res.modelA.grade}, Latency: ${res.modelA.averageLatencyMs}ms)
Model B: ${res.modelB.name} (${res.modelB.overallScore}%, Grade ${res.modelB.grade}, Latency: ${res.modelB.averageLatencyMs}ms)
Score Difference: ${res.scoreDifference >= 0 ? '+' : ''}${res.scoreDifference}% (Winner: ${res.overallWinner})
Tasks Analyzed: ${res.taskComparisons.length}

Task Results:
${res.taskComparisons.map(t => `- [${t.winner === 'modelA' ? 'Winner: Model A' : t.winner === 'modelB' ? 'Winner: Model B' : 'TIE'}] ${t.title}: Model A=${t.modelAScore}% (${t.modelAStatus}) vs Model B=${t.modelBScore}% (${t.modelBStatus})`).join('\n')}
`;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sideBySideResult]);

  const filteredTasks = report
    ? report.tasks.filter(t => filterCategory === 'all' || t.category === filterCategory)
    : [];

  return (
    <div
      className="surface-card"
      style={{
        marginBottom: '24px',
        border: '1px solid #6366f1',
        background: 'linear-gradient(150deg, #131428 0%, #0c101a 100%)',
        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.12)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid #232742',
          paddingBottom: '14px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '11px',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
              color: '#fff',
              boxShadow: '0 0 16px rgba(20, 184, 166, 0.4)',
            }}
          >
            <Gauge size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <b style={{ fontSize: '15px', color: '#f1f5f9' }}>
                Automated Benchmark & Side-by-Side Comparison
              </b>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '99px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                }}
              >
                DUAL-MODEL EVAL
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              เปรียบเทียบประสิทธิภาพคะแนน Benchmark ระหว่างสองโมเดลแบบคู่ขนาน (Side-by-Side) พร้อมตรวจสอบโค้ดและเกณฑ์มาตรฐาน
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="secondary-button"
            onClick={copyReport}
            style={{ fontSize: '11px', padding: '7px 12px' }}
            title="คัดลอกสรุปผลการเปรียบเทียบ"
          >
            {copied ? <Check size={14} className="copy-check" /> : <Copy size={14} />}
            {copied ? 'คัดลอกแล้ว' : 'คัดลอกรายงาน'}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={runBenchmark}
            disabled={running}
            style={{
              fontSize: '11px',
              padding: '7px 14px',
              background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
              boxShadow: '0 4px 14px rgba(20, 184, 166, 0.35)',
            }}
          >
            {running ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
            {running ? 'กำลังรันการทดสอบ…' : 'รันการเปรียบเทียบสด (Run Benchmark)'}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: '8px',
            background: '#2e1218',
            border: '1px solid #7f1d1d',
            color: '#fca5a5',
            fontSize: '12px',
            marginBottom: '16px',
          }}
        >
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation View Switcher Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #232c42',
          paddingBottom: '10px',
          marginBottom: '16px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('sideBySide')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            border: activeTab === 'sideBySide' ? '1px solid #6366f1' : '1px solid transparent',
            background: activeTab === 'sideBySide' ? '#252347' : 'transparent',
            color: activeTab === 'sideBySide' ? '#c7d2fe' : '#94a3b8',
            cursor: 'pointer',
          }}
        >
          <Columns size={14} /> Side-by-Side Model Comparison (เปรียบเทียบ 2 โมเดล)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('standardSuite')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            border: activeTab === 'standardSuite' ? '1px solid #6366f1' : '1px solid transparent',
            background: activeTab === 'standardSuite' ? '#252347' : 'transparent',
            color: activeTab === 'standardSuite' ? '#c7d2fe' : '#94a3b8',
            cursor: 'pointer',
          }}
        >
          <ListFilter size={14} /> Standard Benchmark Tasks (รายละเอียดข้อสอบมาตรฐาน)
        </button>
      </div>

      {/* TAB 1: SIDE-BY-SIDE COMPARISON VIEW */}
      {activeTab === 'sideBySide' && (
        <div>
          {/* Model Selector Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#0d121c',
              border: '1px solid #232d44',
              marginBottom: '18px',
              flexWrap: 'wrap',
            }}
          >
            {/* Model A Selector */}
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#818cf8',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Model A (เปรียบเทียบฝั่งซ้าย)
              </label>
              <select
                value={selectedModelAId}
                onChange={e => setSelectedModelAId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: '#141a29',
                  border: '1px solid #323d57',
                  color: '#e2e8f0',
                  fontSize: '12px',
                  outline: 'none',
                }}
              >
                {availableModels.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.overallScore}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              className="icon-button"
              onClick={swapModels}
              title="สลับโมเดล A และ B"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#1f2538',
                border: '1px solid #374163',
                color: '#c7d2fe',
                alignSelf: 'flex-end',
                marginBottom: '2px',
              }}
            >
              <ArrowRightLeft size={16} />
            </button>

            {/* Model B Selector */}
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#34d399',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Model B (เปรียบเทียบฝั่งขวา)
              </label>
              <select
                value={selectedModelBId}
                onChange={e => setSelectedModelBId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: '#141a29',
                  border: '1px solid #323d57',
                  color: '#e2e8f0',
                  fontSize: '12px',
                  outline: 'none',
                }}
              >
                {availableModels.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.overallScore}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Side-by-Side Head-to-Head Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(260px, 1fr) auto minmax(260px, 1fr)',
              gap: '14px',
              alignItems: 'stretch',
              marginBottom: '20px',
            }}
          >
            {/* Model A Card */}
            <div
              style={{
                borderRadius: '10px',
                border: '1px solid #4338ca',
                background: 'linear-gradient(145deg, #161834, #0f1224)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: '#312e81',
                      color: '#c7d2fe',
                    }}
                  >
                    MODEL A
                  </span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#818cf8',
                    }}
                  >
                    GRADE {sideBySideResult.modelA.grade}
                  </span>
                </div>
                <b style={{ fontSize: '14px', color: '#f1f5f9', display: 'block', margin: '8px 0 2px' }}>
                  {sideBySideResult.modelA.name}
                </b>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Provider: {sideBySideResult.modelA.provider}
                </span>

                <div style={{ margin: '14px 0 10px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>
                    {sideBySideResult.modelA.overallScore}%
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>overall benchmark</span>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  paddingTop: '10px',
                  borderTop: '1px solid #282f4d',
                  fontSize: '11px',
                }}
              >
                <div>
                  <span style={{ color: '#8898b0' }}>Pass Rate:</span>
                  <div style={{ fontWeight: 600, color: '#e2e8f0' }}>
                    {sideBySideResult.modelA.passRate}% ({sideBySideResult.modelA.passedTasks}/5)
                  </div>
                </div>
                <div>
                  <span style={{ color: '#8898b0' }}>Avg Latency:</span>
                  <div style={{ fontWeight: 600, color: '#fbbf24' }}>
                    {sideBySideResult.modelA.averageLatencyMs}ms
                  </div>
                </div>
              </div>
            </div>

            {/* VS / Comparison Delta Middle Column */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 8px',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#1a1f33',
                  border: '1px solid #353f61',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: '12px',
                  color: '#cbd5e1',
                }}
              >
                VS
              </div>
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background:
                    sideBySideResult.overallWinner === 'modelA'
                      ? '#1e1b4b'
                      : sideBySideResult.overallWinner === 'modelB'
                      ? '#064e3b'
                      : '#1e293b',
                  color:
                    sideBySideResult.overallWinner === 'modelA'
                      ? '#c7d2fe'
                      : sideBySideResult.overallWinner === 'modelB'
                      ? '#6ee7b7'
                      : '#94a3b8',
                  border: `1px solid ${
                    sideBySideResult.overallWinner === 'modelA'
                      ? '#4338ca'
                      : sideBySideResult.overallWinner === 'modelB'
                      ? '#059669'
                      : '#475569'
                  }`,
                }}
              >
                {sideBySideResult.overallWinner === 'modelA' ? (
                  <>
                    <Trophy size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Model A Leads
                  </>
                ) : sideBySideResult.overallWinner === 'modelB' ? (
                  <>
                    <Trophy size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Model B Leads
                  </>
                ) : (
                  'Tied Scores'
                )}
              </div>
              <span
                style={{
                  fontSize: '10px',
                  color: sideBySideResult.scoreDifference >= 0 ? '#818cf8' : '#34d399',
                  fontWeight: 600,
                }}
              >
                Δ {sideBySideResult.scoreDifference >= 0 ? '+' : ''}
                {sideBySideResult.scoreDifference}%
              </span>
            </div>

            {/* Model B Card */}
            <div
              style={{
                borderRadius: '10px',
                border: '1px solid #059669',
                background: 'linear-gradient(145deg, #102421, #0a1716)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: '#064e3b',
                      color: '#a7f3d0',
                    }}
                  >
                    MODEL B
                  </span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#34d399',
                    }}
                  >
                    GRADE {sideBySideResult.modelB.grade}
                  </span>
                </div>
                <b style={{ fontSize: '14px', color: '#f1f5f9', display: 'block', margin: '8px 0 2px' }}>
                  {sideBySideResult.modelB.name}
                </b>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Provider: {sideBySideResult.modelB.provider}
                </span>

                <div style={{ margin: '14px 0 10px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>
                    {sideBySideResult.modelB.overallScore}%
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>overall benchmark</span>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  paddingTop: '10px',
                  borderTop: '1px solid #1a3c36',
                  fontSize: '11px',
                }}
              >
                <div>
                  <span style={{ color: '#8898b0' }}>Pass Rate:</span>
                  <div style={{ fontWeight: 600, color: '#e2e8f0' }}>
                    {sideBySideResult.modelB.passRate}% ({sideBySideResult.modelB.passedTasks}/5)
                  </div>
                </div>
                <div>
                  <span style={{ color: '#8898b0' }}>Avg Latency:</span>
                  <div style={{ fontWeight: 600, color: '#fbbf24' }}>
                    {sideBySideResult.modelB.averageLatencyMs}ms
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown Comparison */}
          <div
            style={{
              padding: '14px',
              borderRadius: '8px',
              background: '#0d1320',
              border: '1px solid #232c44',
              marginBottom: '20px',
            }}
          >
            <b style={{ fontSize: '13px', color: '#e2e8f0', display: 'block', marginBottom: '12px' }}>
              การเปรียบเทียบคะแนนแยกตามหมวดหมู่งาน (Domain Category Breakdown)
            </b>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { key: 'code_generation', label: '1. Code Generation & Algorithms' },
                { key: 'debugging', label: '2. Debugging & Vulnerability Remediation' },
                { key: 'tool_orchestration', label: '3. Tool Orchestration & Safety Guardrails' },
                { key: 'instruction_following', label: '4. Instruction Following & Native Types' },
              ].map(cat => {
                const scoreA = sideBySideResult.modelA.categoryScores[cat.key] || 85;
                const scoreB = sideBySideResult.modelB.categoryScores[cat.key] || 85;
                return (
                  <div key={cat.key} style={{ fontSize: '11px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: '#94a3b8',
                        marginBottom: '4px',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#cbd5e1' }}>{cat.label}</span>
                      <span>
                        <strong style={{ color: '#818cf8' }}>{sideBySideResult.modelA.name.split(' ')[0]}: {scoreA}%</strong>
                        {' vs '}
                        <strong style={{ color: '#34d399' }}>{sideBySideResult.modelB.name.split(' ')[0]}: {scoreB}%</strong>
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        height: '6px',
                      }}
                    >
                      <div
                        style={{
                          background: '#1e2438',
                          borderRadius: '99px',
                          overflow: 'hidden',
                          display: 'flex',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <div
                          style={{
                            width: `${scoreA}%`,
                            background: '#6366f1',
                            borderRadius: '99px',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          background: '#1e2438',
                          borderRadius: '99px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${scoreB}%`,
                            background: '#10b981',
                            borderRadius: '99px',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task-by-Task Side-by-Side Comparison */}
          <b style={{ fontSize: '13px', color: '#e2e8f0', display: 'block', marginBottom: '12px' }}>
            การเปรียบเทียบผลลัพธ์รายข้อสอบ (Side-by-Side Task Results)
          </b>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sideBySideResult.taskComparisons.map(t => {
              const isExpanded = expandedTaskId === t.taskId;
              return (
                <div
                  key={t.taskId}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid #232d44',
                    background: '#0d121c',
                    overflow: 'hidden',
                  }}
                >
                  {/* Task Header */}
                  <div
                    onClick={() => setExpandedTaskId(isExpanded ? null : t.taskId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      background: isExpanded ? '#141a29' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <b style={{ fontSize: '12px', color: '#f1f5f9' }}>{t.title}</b>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: '#1e293b',
                          color: '#94a3b8',
                        }}
                      >
                        {t.category}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ fontSize: '11px' }}>
                        <span style={{ color: '#818cf8', fontWeight: 600 }}>{t.modelAScore}%</span>
                        <span style={{ color: '#64748b' }}> vs </span>
                        <span style={{ color: '#34d399', fontWeight: 600 }}>{t.modelBScore}%</span>
                      </div>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background:
                            t.winner === 'modelA'
                              ? '#312e81'
                              : t.winner === 'modelB'
                              ? '#064e3b'
                              : '#1e293b',
                          color:
                            t.winner === 'modelA'
                              ? '#c7d2fe'
                              : t.winner === 'modelB'
                              ? '#a7f3d0'
                              : '#94a3b8',
                        }}
                      >
                        {t.winner === 'modelA' ? 'A Leads' : t.winner === 'modelB' ? 'B Leads' : 'Tie'}
                      </span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Expanded Side-by-Side Outputs */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '14px',
                        borderTop: '1px solid #1f273b',
                        background: '#090d14',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '12px',
                      }}
                    >
                      {/* Model A Output */}
                      <div
                        style={{
                          borderRadius: '6px',
                          border: '1px solid #312e81',
                          background: '#0c111a',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            padding: '6px 10px',
                            background: '#151733',
                            borderBottom: '1px solid #23274d',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#c7d2fe',
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>{sideBySideResult.modelA.name}</span>
                          <span style={{ color: '#818cf8' }}>Score: {t.modelAScore}% ({t.modelAStatus})</span>
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: '10px',
                            fontSize: '11px',
                            lineHeight: 1.5,
                            color: '#cbd5e1',
                            overflowX: 'auto',
                            maxHeight: '220px',
                            fontFamily: 'ui-monospace,SFMono-Regular,Consolas,monospace',
                          }}
                        >
                          {t.modelAOutput}
                        </pre>
                      </div>

                      {/* Model B Output */}
                      <div
                        style={{
                          borderRadius: '6px',
                          border: '1px solid #064e3b',
                          background: '#0c111a',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            padding: '6px 10px',
                            background: '#0e1f1c',
                            borderBottom: '1px solid #1a3c36',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#a7f3d0',
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>{sideBySideResult.modelB.name}</span>
                          <span style={{ color: '#34d399' }}>Score: {t.modelBScore}% ({t.modelBStatus})</span>
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: '10px',
                            fontSize: '11px',
                            lineHeight: 1.5,
                            color: '#cbd5e1',
                            overflowX: 'auto',
                            maxHeight: '220px',
                            fontFamily: 'ui-monospace,SFMono-Regular,Consolas,monospace',
                          }}
                        >
                          {t.modelBOutput}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED STANDARD SUITE VIEW */}
      {activeTab === 'standardSuite' && (
        <div>
          {/* Running State */}
          {running && (
            <div
              style={{
                padding: '24px 18px',
                textAlign: 'center',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '10px',
                border: '1px solid #3b82f6',
                marginBottom: '16px',
              }}
            >
              <RefreshCw
                size={30}
                className="spin"
                style={{ color: '#6366f1', margin: '0 auto 10px', display: 'block' }}
              />
              <b style={{ fontSize: '13px', color: '#e2e8f0' }}>
                กำลังรันชุดงานการเขียนโปรแกรมมาตรฐานกับโมเดล…
              </b>
            </div>
          )}

          {/* Filter & Task List */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <b style={{ fontSize: '13px', color: '#e2e8f0' }}>
              รายการเปรียบเทียบผลลัพธ์รายข้อ ({filteredTasks.length} งาน)
            </b>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['all', 'code_generation', 'debugging', 'tool_orchestration', 'instruction_following'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`secondary-button ${filterCategory === cat ? 'active' : ''}`}
                  onClick={() => setFilterCategory(cat)}
                  style={{
                    fontSize: '10px',
                    padding: '3px 8px',
                    background: filterCategory === cat ? '#312e81' : undefined,
                    borderColor: filterCategory === cat ? '#6366f1' : undefined,
                    color: filterCategory === cat ? '#e0e7ff' : undefined,
                  }}
                >
                  {cat === 'all'
                    ? 'All'
                    : cat === 'code_generation'
                    ? 'Code Gen'
                    : cat === 'debugging'
                    ? 'Debugging'
                    : cat === 'tool_orchestration'
                    ? 'Tool Safety'
                    : 'Instruction'}
                </button>
              ))}
            </div>
          </div>

          {/* Tasks Accordion */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredTasks.map(task => {
              const isExpanded = expandedTaskId === task.taskId;
              return (
                <div
                  key={task.taskId}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid #232d44',
                    background: '#0d121c',
                    overflow: 'hidden',
                  }}
                >
                  {/* Task Header */}
                  <div
                    onClick={() => setExpandedTaskId(isExpanded ? null : task.taskId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      background: isExpanded ? '#141a29' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background:
                            task.status === 'PASS'
                              ? '#064e3b'
                              : task.status === 'PARTIAL'
                              ? '#78350f'
                              : '#450a0a',
                          color:
                            task.status === 'PASS'
                              ? '#6ee7b7'
                              : task.status === 'PARTIAL'
                              ? '#fde68a'
                              : '#fca5a5',
                          border: `1px solid ${
                            task.status === 'PASS'
                              ? '#059669'
                              : task.status === 'PARTIAL'
                              ? '#d97706'
                              : '#dc2626'
                          }`,
                        }}
                      >
                        {task.status}
                      </span>
                      <b style={{ fontSize: '12px', color: '#f1f5f9' }}>{task.title}</b>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: '#1e293b',
                          color: '#94a3b8',
                        }}
                      >
                        {task.category}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                          {task.matchScore}%
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '6px' }}>
                          match
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{task.latencyMs}ms</span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Task Detailed Comparison Body */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '14px',
                        borderTop: '1px solid #1f273b',
                        background: '#090d14',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      {/* Criteria Checked */}
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                          การตรวจสอบเกณฑ์ความถูกต้องมาตรฐาน (Criteria Checks):
                        </span>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: '6px',
                            marginTop: '6px',
                          }}
                        >
                          {task.criteriaChecked.map((c, i) => (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '11px',
                                color: c.passed ? '#34d399' : '#f87171',
                                background: c.passed ? '#06281e' : '#280d12',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: `1px solid ${c.passed ? '#0d533f' : '#601824'}`,
                              }}
                            >
                              {c.passed ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                              <span>{c.criterion}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Side-by-side comparison */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                          gap: '12px',
                        }}
                      >
                        {/* Configured Model Output */}
                        <div
                          style={{
                            borderRadius: '6px',
                            border: '1px solid #233149',
                            background: '#0c111a',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              padding: '6px 10px',
                              background: '#131b29',
                              borderBottom: '1px solid #202b3c',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#93c5fd',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span>Model Output ({report?.configuredModel || 'Configured'})</span>
                            <span style={{ fontSize: '10px', color: '#64748b' }}>{task.latencyMs}ms</span>
                          </div>
                          <pre
                            style={{
                              margin: 0,
                              padding: '10px',
                              fontSize: '11px',
                              lineHeight: 1.5,
                              color: '#cbd5e1',
                              overflowX: 'auto',
                              maxHeight: '260px',
                              fontFamily: 'ui-monospace,SFMono-Regular,Consolas,monospace',
                            }}
                          >
                            {task.modelOutput}
                          </pre>
                        </div>

                        {/* Baseline Reference Output */}
                        <div
                          style={{
                            borderRadius: '6px',
                            border: '1px solid #233149',
                            background: '#0c111a',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              padding: '6px 10px',
                              background: '#131b29',
                              borderBottom: '1px solid #202b3c',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#6ee7b7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span>Baseline Reference Ground Truth (Dataset)</span>
                            <span style={{ fontSize: '10px', color: '#059669' }}>CANONICAL</span>
                          </div>
                          <pre
                            style={{
                              margin: 0,
                              padding: '10px',
                              fontSize: '11px',
                              lineHeight: 1.5,
                              color: '#cbd5e1',
                              overflowX: 'auto',
                              maxHeight: '260px',
                              fontFamily: 'ui-monospace,SFMono-Regular,Consolas,monospace',
                            }}
                          >
                            {task.referenceOutput}
                          </pre>
                        </div>
                      </div>

                      {/* Comparison Notes */}
                      <div style={{ fontSize: '11px', color: '#8898b0', fontStyle: 'italic' }}>
                        💡 {task.comparisonNotes}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
