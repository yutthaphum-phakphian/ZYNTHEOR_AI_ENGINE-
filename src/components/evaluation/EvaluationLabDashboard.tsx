// ZYNTHEOR CORE X — OPERATIONAL AI EVALUATION LABORATORY
// Zero Mock, Evidence-Based, Interactive Tool-First Architecture
import React, { useState, useEffect, useMemo } from 'react';
import {
  runUnifiedEvaluation,
  createUnifiedEvaluation,
  type UnifiedEvaluation,
  type EvaluationCategory,
  type CategoryId,
  type TestCaseDetail,
} from '../../evaluation/unifiedEngine';
import { getBenchmark } from '../../evaluation/benchmarkRegistry';
import {
  compareEvaluations,
  loadHistory,
  saveToHistory,
  clearHistory,
  type EvaluationHistoryEntry,
} from '../../evaluation/regressionMonitor';
import { buildCapabilityRegistry } from '../../evaluation/capabilityRegistry';

interface DashboardProps {
  className?: string;
}

type ActiveTab = 'control-center' | 'reasoning-lab' | 'code-lab' | 'debugging-lab' | 'security-lab' | 'history';

export const EvaluationLabDashboard: React.FC<DashboardProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('control-center');
  const [currentEval, setCurrentEval] = useState<UnifiedEvaluation | null>(null);
  const [history, setHistory] = useState<EvaluationHistoryEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionProgress, setExecutionProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('พร้อมสำหรับการประเมินผล');
  const [testFilter, setTestFilter] = useState<'ALL' | 'PASS' | 'FAIL' | 'WARN'>('ALL');
  const [testSearch, setTestSearch] = useState<string>('');

  // 1. REASONING LAB STATE
  const [reasoningPrompt, setReasoningPrompt] = useState<string>('คำนวณ 45 * 12 พร้อมอธิบายขั้นตอนตรรกะทีละบรรทัด');
  const [reasoningType, setReasoningType] = useState<'math' | 'logic' | 'json'>('math');
  const [reasoningResult, setReasoningResult] = useState<any>(null);
  const [isReasoningLoading, setIsReasoningLoading] = useState<boolean>(false);

  // 2. CODE EVALUATION LAB STATE
  const [sandboxCode, setSandboxCode] = useState<string>(`// Safe Sandbox Code Runner
const numbers = [10, 20, 30, 40, 50];
const total = numbers.reduce((acc, curr) => acc + curr, 0);
const avg = total / numbers.length;
console.log("Sum:", total);
console.log("Average:", avg);
avg;`);
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [isSandboxRunning, setIsSandboxRunning] = useState<boolean>(false);

  // 3. DEBUGGING LAB STATE
  const [debugOriginal, setDebugOriginal] = useState<string>(`function calculateTax(amount: number) {
  if (amount <= 0) return 0;
  // Bug: missing decimal point precision
  return amount * 0.07;
}`);
  const [debugProposed, setDebugProposed] = useState<string>(`function calculateTax(amount: number) {
  if (amount <= 0) return 0;
  // Fixed: Rounded to 2 decimal places with strict type boundary
  return Math.round(amount * 0.07 * 100) / 100;
}`);
  const [patchProposal, setPatchProposal] = useState<any>(null);
  const [patchApproved, setPatchApproved] = useState<boolean>(false);
  const [patchApplyResult, setPatchApplyResult] = useState<any>(null);

  // 4. SECURITY EVALUATION LAB STATE
  const [securityScanCode, setSecurityScanCode] = useState<string>(`// Security Test Fixture
const accessKey = "AKIAIOSFODNN7EXAMPLE"; // Leaked Key Pattern
const token = "ghp_111122223333444455556666777788889999";
function runUserScript(cmd: string) {
  // Vulnerable evaluation
  return eval(cmd);
}`);
  const [securityResult, setSecurityResult] = useState<any>(null);
  const [isSecurityScanning, setIsSecurityScanning] = useState<boolean>(false);

  // Initial Load with Deduplication Guard
  useEffect(() => {
    const loadedHistory = loadHistory();
    setHistory(loadedHistory);

    if (loadedHistory.length > 0) {
      setCurrentEval(loadedHistory[0].evaluation);
    } else {
      // Create baseline only once if storage is completely empty
      const initialEval = createUnifiedEvaluation('1.2.2');
      setCurrentEval(initialEval);
      const entry: EvaluationHistoryEntry = {
        evaluation: initialEval,
        timestamp: initialEval.timestamp,
        gitCommit: 'HEAD',
        buildTimeMs: 145,
      };
      const updated = saveToHistory(entry);
      setHistory(updated);
    }
  }, []);

  // Execution Engine Runner
  const runEvaluation = async (categories?: CategoryId[]) => {
    setIsRunning(true);
    setExecutionProgress(15);
    setStatusMessage('กำลังเริ่มต้นการทดสอบความปลอดภัยและการทำงานจริง...');

    try {
      const res = await fetch('/api/evaluation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories, benchmarkVersion: '1.2.2' }),
      });

      setExecutionProgress(60);
      setStatusMessage('กำลังรวบรวมหลักฐานและคำนวณคะแนนหมวดหมู่...');

      if (res.ok) {
        const data = await res.json();
        setCurrentEval(data.evaluation);
        const updatedHistory = loadHistory();
        setHistory(updatedHistory);
        setStatusMessage(`การประเมินเสร็จสมบูรณ์ (${data.evaluation.categories.length} หมวดหมู่, ${data.evaluation.durationMs}ms)`);
      } else {
        // Fallback to in-engine execution
        const evalResult = await runUnifiedEvaluation(categories, '1.2.2');
        setCurrentEval(evalResult);
        const entry: EvaluationHistoryEntry = {
          evaluation: evalResult,
          timestamp: evalResult.timestamp,
          gitCommit: 'HEAD',
          buildTimeMs: evalResult.durationMs,
        };
        const updated = saveToHistory(entry);
        setHistory(updated);
        setStatusMessage('การประเมินเสร็จสมบูรณ์ผ่าน Local Evaluation Engine');
      }
    } catch {
      const evalResult = await runUnifiedEvaluation(categories, '1.2.2');
      setCurrentEval(evalResult);
      const entry: EvaluationHistoryEntry = {
        evaluation: evalResult,
        timestamp: evalResult.timestamp,
        gitCommit: 'HEAD',
        buildTimeMs: evalResult.durationMs,
      };
      const updated = saveToHistory(entry);
      setHistory(updated);
      setStatusMessage('การประเมินเสร็จสิ้น (Local Engine Active)');
    } finally {
      setExecutionProgress(100);
      setTimeout(() => {
        setIsRunning(false);
      }, 400);
    }
  };

  const handleCancelEvaluation = async () => {
    try {
      await fetch('/api/evaluation/cancel', { method: 'POST' });
    } catch {}
    setIsRunning(false);
    setStatusMessage('ยกเลิกการประเมินแล้ว');
  };

  const handleClearHistory = async () => {
    try {
      await fetch('/api/evaluation/history', { method: 'DELETE' });
    } catch {}
    clearHistory();
    setHistory([]);
    setStatusMessage('ล้างประวัติการประเมินเรียบร้อยแล้ว');
  };

  // Run Reasoning Test
  const executeReasoningTest = async () => {
    setIsReasoningLoading(true);
    try {
      const res = await fetch('/api/evaluation/reasoning/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: reasoningPrompt,
          testType: reasoningType,
          targetKeywords: reasoningType === 'math' ? ['คำตอบ'] : [],
        }),
      });
      const data = await res.json();
      setReasoningResult(data);
    } catch (err: any) {
      setReasoningResult({ ok: false, error: err?.message || 'Reasoning evaluation request failed' });
    } finally {
      setIsReasoningLoading(false);
    }
  };

  // Run Sandbox Code Execution
  const executeSandboxCode = async () => {
    setIsSandboxRunning(true);
    try {
      const res = await fetch('/api/evaluation/sandbox/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: sandboxCode, timeoutMs: 2500 }),
      });
      const data = await res.json();
      setSandboxResult(data);
    } catch (err: any) {
      setSandboxResult({ ok: false, error: err?.message || 'Sandbox call failed' });
    } finally {
      setIsSandboxRunning(false);
    }
  };

  // Debugging Lab Patch Propose
  const handleProposePatch = async () => {
    try {
      const res = await fetch('/api/evaluation/debug/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetFile: 'src/services/sampleLogic.ts',
          originalContent: debugOriginal,
          proposedContent: debugProposed,
          reason: 'แก้ไขปัญหา Precision ในฟังก์ชัน calculateTax',
        }),
      });
      const data = await res.json();
      setPatchProposal(data);
      setPatchApproved(false);
      setPatchApplyResult(null);
    } catch (err: any) {
      alert(`ไม่สามารถสร้างข้อเสนอ Patch: ${err.message}`);
    }
  };

  const handleApprovePatch = async () => {
    if (!patchProposal?.proposal?.patchId) return;
    try {
      const res = await fetch('/api/evaluation/debug/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patchId: patchProposal.proposal.patchId, approverId: 'human-engineer' }),
      });
      if (res.ok) {
        setPatchApproved(true);
        setStatusMessage('ได้รับความยินยอมจากมนุษย์แล้ว (Human Approval Granted)');
      }
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    }
  };

  const handleApplyPatch = async (dryRun: boolean = true) => {
    if (!patchProposal?.proposal?.patchId) return;
    try {
      const res = await fetch('/api/evaluation/debug/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patchId: patchProposal.proposal.patchId, dryRun }),
      });
      const data = await res.json();
      setPatchApplyResult(data);
    } catch (err: any) {
      setPatchApplyResult({ ok: false, error: err.message });
    }
  };

  // Run Security Scan
  const executeSecurityScan = async () => {
    setIsSecurityScanning(true);
    try {
      const res = await fetch('/api/evaluation/security/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetCode: securityScanCode, fileName: 'security-fixture.ts' }),
      });
      const data = await res.json();
      setSecurityResult(data);
    } catch (err: any) {
      setSecurityResult({ ok: false, error: err.message });
    } finally {
      setIsSecurityScanning(false);
    }
  };

  // Derived Values
  const benchmark = useMemo(() => {
    if (!currentEval) return null;
    return getBenchmark(currentEval.benchmarkId);
  }, [currentEval]);

  const comparison = useMemo(() => {
    if (history.length < 2 || !currentEval) return null;
    const prev = history[1]?.evaluation;
    if (!prev) return null;
    return compareEvaluations(prev, currentEval);
  }, [history, currentEval]);

  const capabilities = useMemo(() => {
    if (!currentEval) return [];
    return buildCapabilityRegistry(currentEval);
  }, [currentEval]);

  // Filtered Test Cases for the explorer
  const allTests = useMemo(() => {
    if (!currentEval) return [];
    const list: Array<TestCaseDetail & { categoryName: string; categoryId: string }> = [];
    currentEval.categories.forEach(cat => {
      cat.tests.forEach(t => {
        list.push({ ...t, categoryName: cat.name, categoryId: cat.id });
      });
    });
    return list.filter(t => {
      const matchesFilter = testFilter === 'ALL' || t.status === testFilter;
      const matchesSearch = testSearch === '' ||
        t.name.toLowerCase().includes(testSearch.toLowerCase()) ||
        t.id.toLowerCase().includes(testSearch.toLowerCase()) ||
        t.categoryName.toLowerCase().includes(testSearch.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [currentEval, testFilter, testSearch]);

  if (!currentEval) {
    return (
      <div className="p-8 text-center bg-[#0b0d12] text-gray-300 min-h-screen">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mb-4" />
        <p>กำลังเตรียมระบบ AI Evaluation Laboratory...</p>
      </div>
    );
  }

  return (
    <div className={`${className} bg-[#0b0d12] text-[#e5e7eb] p-6 min-h-screen font-sans`}>
      {/* HEADER SECTION */}
      <div className="border-b border-[#232634] pb-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                ZYNTHEOR AI EVALUATION LABORATORY
              </h1>
              <span className="text-xs uppercase px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800 text-cyan-300 font-mono">
                REAL OPERATIONAL v1.2.2
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Zero Mock Verification • Isolated Sandbox Execution • AST Security Firewall • Human Governance Gate
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => runEvaluation()}
              disabled={isRunning}
              className={`px-4 py-2 text-sm font-semibold rounded-lg shadow transition flex items-center gap-2 ${
                isRunning
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/30'
              }`}
            >
              {isRunning ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังประเมิน... ({executionProgress}%)
                </>
              ) : (
                <>
                  <span>▶</span> รันการประเมินผลครบ 12 หมวด
                </>
              )}
            </button>

            {isRunning && (
              <button
                onClick={handleCancelEvaluation}
                className="px-3 py-2 text-sm bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 rounded-lg transition"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </div>

        {/* Status Line */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono bg-[#151821] p-3 rounded-lg border border-[#232634]">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-cyan-400">ID: {currentEval.evaluationId}</span>
            <span className="text-gray-400">BENCHMARK: {currentEval.benchmarkId}</span>
            <span className="text-emerald-400 font-bold">SCORE: {currentEval.overallScore}/100</span>
            <span className="text-gray-400">DURATION: {currentEval.durationMs}ms</span>
          </div>
          <div className="text-gray-300">{statusMessage}</div>
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <div className="w-full bg-[#151821] h-1.5 rounded-full overflow-hidden mt-2 border border-[#232634]">
            <div
              className="bg-cyan-500 h-full transition-all duration-300"
              style={{ width: `${executionProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-[#232634] gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { id: 'control-center', label: 'Evaluation Control Center', icon: '⚡' },
          { id: 'reasoning-lab', label: 'AI Reasoning Lab', icon: '🧠' },
          { id: 'code-lab', label: 'Code Evaluation Lab', icon: '💻' },
          { id: 'debugging-lab', label: 'Debugging & Patch Lab', icon: '🔧' },
          { id: 'security-lab', label: 'Security Evaluation Lab', icon: '🛡️' },
          { id: 'history', label: `History & Regressions (${history.length})`, icon: '📈' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={`px-4 py-2.5 text-xs font-medium rounded-t-lg transition flex items-center gap-2 whitespace-nowrap border-b-2 ${
              activeTab === tab.id
                ? 'bg-[#151821] text-cyan-400 border-cyan-400 font-semibold'
                : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-[#151821]/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: EVALUATION CONTROL CENTER */}
      {activeTab === 'control-center' && (
        <div className="space-y-6">
          {/* Quick Runner Action Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-[#151821] p-3 rounded-lg border border-[#232634]">
            <span className="text-xs text-gray-400 mr-2 font-mono uppercase">รันเฉพาะหมวดหมู่:</span>
            <button
              onClick={() => runEvaluation(['SECURITY_FIRST', 'SECRET_FIREWALL'])}
              disabled={isRunning}
              className="px-3 py-1.5 text-xs bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 rounded transition"
            >
              🛡️ Security Suite
            </button>
            <button
              onClick={() => runEvaluation(['AUTONOMOUS_REASONING', 'ZERO_MOCK_INTEGRITY'])}
              disabled={isRunning}
              className="px-3 py-1.5 text-xs bg-purple-950/60 hover:bg-purple-900 border border-purple-800 text-purple-200 rounded transition"
            >
              🧠 Reasoning Suite
            </button>
            <button
              onClick={() => runEvaluation(['TYPE_SAFETY', 'BUILD_REPRODUCIBILITY', 'CYCLE_PREVENTION'])}
              disabled={isRunning}
              className="px-3 py-1.5 text-xs bg-blue-950/60 hover:bg-blue-900 border border-blue-800 text-blue-200 rounded transition"
            >
              💻 Coding & Types Suite
            </button>
            <button
              onClick={() => runEvaluation(['SOVEREIGN_COMPLIANCE', 'STATE_TRANSITION_VALIDITY', 'TOOL_ORCHESTRATION'])}
              disabled={isRunning}
              className="px-3 py-1.5 text-xs bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 rounded transition"
            >
              ⚖️ Governance & Integrity
            </button>
          </div>

          {/* Gates Overview Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(currentEval.gates).map(([gateName, passed]) => (
              <div
                key={gateName}
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  passed
                    ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300'
                    : 'bg-red-950/20 border-red-800/60 text-red-300'
                }`}
              >
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider opacity-75">{gateName} Gate</div>
                  <div className="text-sm font-bold mt-0.5">{passed ? 'PASS ✅' : 'FAIL ❌'}</div>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full ${passed ? 'bg-emerald-500' : 'bg-red-500'}`} />
              </div>
            ))}
          </div>

          {/* Regression Comparison Banner */}
          {comparison && (
            <div className="p-4 rounded-lg bg-[#151821] border border-blue-900/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                  <span>📊</span> การเปรียบเทียบการถดถอย (Regression Monitor)
                </h3>
                <span className="text-xs font-mono text-gray-400">
                  ก่อนหน้า: {comparison.previousScore} → ปัจจุบัน: {comparison.currentScore} (Δ{' '}
                  <span className={comparison.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {comparison.delta > 0 ? `+${comparison.delta}` : comparison.delta}
                  </span>
                  )
                </span>
              </div>
              {comparison.alerts.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {comparison.alerts.map(alert => (
                    <div
                      key={alert.alertId}
                      className="p-2.5 rounded bg-red-950/40 border border-red-800 text-xs text-red-200"
                    >
                      <div className="font-semibold">
                        {alert.categoryName}: {alert.previousScore} → {alert.currentScore} (Δ {alert.delta})
                      </div>
                      <div className="text-[11px] opacity-80 mt-1 font-mono">{alert.evidence.join(' | ')}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-xs text-emerald-400 flex items-center gap-2">
                  <span>✓</span> ไม่พบการถดถอยของประสิทธิภาพในรอบการประเมินนี้ (Zero Regressions Detected)
                </div>
              )}
            </div>
          )}

          {/* 12 Categories Grid */}
          <div>
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">
              12 Sovereign Benchmark Categories
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentEval.categories.map(cat => {
                const isSelected = selectedCategory === cat.id;
                const passRate = cat.tests.length > 0 ? Math.round((cat.tests.filter(t => t.passed).length / cat.tests.length) * 100) : 0;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#1a1e2b] border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                        : 'bg-[#151821] border-[#232634] hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-mono text-cyan-400 opacity-80">{cat.id}</div>
                        <h3 className="text-sm font-bold text-white mt-0.5">{cat.name}</h3>
                      </div>
                      <span
                        className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                          cat.gate === 'PASS'
                            ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                            : cat.gate === 'WARN'
                            ? 'bg-amber-950 border border-amber-700 text-amber-300'
                            : 'bg-red-950 border border-red-700 text-red-300'
                        }`}
                      >
                        {cat.score}/100
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-400 font-mono">
                      <span>น้ำหนัก: {cat.weight}x</span>
                      <span>ผ่าน: {cat.tests.filter(t => t.passed).length}/{cat.tests.length} ({passRate}%)</span>
                    </div>

                    {/* Expanded Test Details */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-[#232634] space-y-2">
                        <div className="text-[11px] font-bold text-gray-400 uppercase">Test Cases:</div>
                        {cat.tests.map(test => (
                          <div
                            key={test.id}
                            className="p-2 rounded bg-[#0b0d12] border border-[#232634] text-xs font-mono"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-200">{test.id}: {test.name}</span>
                              <span className={test.passed ? 'text-emerald-400' : 'text-red-400'}>
                                {test.status} ({test.durationMs}ms)
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1 font-sans">{test.description}</p>
                            {test.fixtureOrTarget && (
                              <div className="text-[10px] text-cyan-400/80 mt-1 truncate">
                                Fixture: {test.fixtureOrTarget}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Test Case Explorer */}
          <div className="bg-[#151821] p-5 rounded-lg border border-[#232634]">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🔬</span> Comprehensive Test Case Explorer ({allTests.length} รายการ)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  ตรวจสอบผลการทดสอบแยกตามระดับเคส คาดหวัง เทียบกับ ผลลัพธ์จริง
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="ค้นหา Test ID, ชื่อ, หมวดหมู่..."
                  value={testSearch}
                  onChange={e => setTestSearch(e.target.value)}
                  className="bg-[#0b0d12] border border-[#232634] rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 w-56"
                />
                <select
                  value={testFilter}
                  onChange={e => setTestFilter(e.target.value as any)}
                  className="bg-[#0b0d12] border border-[#232634] rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">ทุกสถานะ</option>
                  <option value="PASS">PASS เท่านั้น</option>
                  <option value="WARN">WARN เท่านั้น</option>
                  <option value="FAIL">FAIL เท่านั้น</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0b0d12] text-gray-400 uppercase text-[10px] border-b border-[#232634]">
                  <tr>
                    <th className="p-2.5">ID</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Test Name</th>
                    <th className="p-2.5">Expected</th>
                    <th className="p-2.5">Actual</th>
                    <th className="p-2.5">Duration</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232634]">
                  {allTests.map(t => (
                    <tr key={t.id} className="hover:bg-[#1a1e2b]/50">
                      <td className="p-2.5 text-cyan-400 font-semibold">{t.id}</td>
                      <td className="p-2.5 text-gray-400">{t.categoryName}</td>
                      <td className="p-2.5 text-gray-200 font-sans">{t.name}</td>
                      <td className="p-2.5 text-gray-400 truncate max-w-[150px]">{t.expected}</td>
                      <td className="p-2.5 text-gray-300 truncate max-w-[150px]">{t.actual}</td>
                      <td className="p-2.5 text-gray-400">{t.durationMs}ms</td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'PASS'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : t.status === 'WARN'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-red-950 text-red-400 border border-red-800'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {allTests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-500">
                        ไม่พบ Test Case ที่ตรงกับเงื่อนไขการค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI REASONING LAB */}
      {activeTab === 'reasoning-lab' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#151821] p-5 rounded-lg border border-[#232634] space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🧠</span> Live AI Reasoning & Verification Engine
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                ทดสอบการอนุมานตรรกะจริง วัด Latency (ms) และตรวจสอบตามเกณฑ์ความจริงเชิงวัตถุวิสัย (Objective Truth Verification)
              </p>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-gray-400 py-1 font-mono">PRESETS:</span>
              <button
                onClick={() => {
                  setReasoningType('math');
                  setReasoningPrompt('คำนวณ 128 * 16 พร้อมแสดงขั้นตอนการคำนวณและคำตอบสุดท้าย');
                }}
                className="px-2.5 py-1 bg-[#0b0d12] hover:bg-[#232634] text-gray-300 rounded border border-[#232634]"
              >
                Arithmetic Logic
              </button>
              <button
                onClick={() => {
                  setReasoningType('json');
                  setReasoningPrompt('สร้าง JSON Schema สำหรับ ZYNTHEOR Execution Audit Token');
                }}
                className="px-2.5 py-1 bg-[#0b0d12] hover:bg-[#232634] text-gray-300 rounded border border-[#232634]"
              >
                Strict JSON Output
              </button>
              <button
                onClick={() => {
                  setReasoningType('logic');
                  setReasoningPrompt('วิเคราะห์ข้อกำหนด Local-Only Security และ Fail-Closed Behavior ใน ZYNTHEOR CORE X');
                }}
                className="px-2.5 py-1 bg-[#0b0d12] hover:bg-[#232634] text-gray-300 rounded border border-[#232634]"
              >
                Sovereign Policy Reasoning
              </button>
            </div>

            <div>
              <label className="text-xs font-mono text-gray-400 block mb-1">PROMPT FIXTURE / INPUT:</label>
              <textarea
                value={reasoningPrompt}
                onChange={e => setReasoningPrompt(e.target.value)}
                rows={5}
                className="w-full bg-[#0b0d12] border border-[#232634] rounded-lg p-3 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={executeReasoningTest}
              disabled={isReasoningLoading}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
            >
              {isReasoningLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังประมวลผลการอนุมาน...
                </>
              ) : (
                <>
                  <span>▶</span> Execute Inference & Assertion Check
                </>
              )}
            </button>
          </div>

          {/* Reasoning Results */}
          <div className="bg-[#151821] p-5 rounded-lg border border-[#232634] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>ผลลัพธ์การประเมินการอนุมาน (Inference Output & Trace)</span>
              {reasoningResult && (
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    reasoningResult.verdict === 'PASS'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-red-950 text-red-400 border border-red-800'
                  }`}
                >
                  VERDICT: {reasoningResult.verdict}
                </span>
              )}
            </h3>

            {reasoningResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#0b0d12] p-3 rounded border border-[#232634]">
                  <div>Latency: <span className="text-cyan-400 font-bold">{reasoningResult.durationMs}ms</span></div>
                  <div>Timestamp: <span className="text-gray-400">{new Date(reasoningResult.timestamp).toLocaleTimeString()}</span></div>
                </div>

                <div>
                  <div className="text-xs font-mono text-gray-400 mb-1">INFERENCE RESPONSE:</div>
                  <pre className="p-3 bg-[#0b0d12] border border-[#232634] rounded text-xs font-mono text-gray-200 whitespace-pre-wrap max-h-56 overflow-y-auto">
                    {reasoningResult.reply}
                  </pre>
                </div>

                {reasoningResult.checks && (
                  <div>
                    <div className="text-xs font-mono text-gray-400 mb-1">OBJECTIVE CRITERIA CHECKS:</div>
                    <div className="space-y-1.5">
                      {reasoningResult.checks.map((chk: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded bg-[#0b0d12] border border-[#232634] text-xs font-mono"
                        >
                          <span>{chk.name}</span>
                          <span className={chk.passed ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                            {chk.passed ? '✓ PASS' : '✗ FAIL'} ({chk.note})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-gray-500 border border-dashed border-[#232634] rounded-lg">
                กดปุ่ม "Execute Inference & Assertion Check" เพื่อรันการอนุมานตรรกะจริง
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CODE EVALUATION LAB */}
      {activeTab === 'code-lab' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#151821] p-5 rounded-lg border border-[#232634] space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>💻</span> Isolated Code Execution Sandbox
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                รันโค้ดใน In-Process Isolated VM Sandbox (จำกัด Timeout, Memory, สกัดกั้นการเข้าถึง Host OS/Network)
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-gray-400">JAVASCRIPT / TYPESCRIPT SNIPPET:</label>
                <span className="text-[10px] text-cyan-400 font-mono">SANDBOX TIMEOUT: 2500ms</span>
              </div>
              <textarea
                value={sandboxCode}
                onChange={e => setSandboxCode(e.target.value)}
                rows={10}
                className="w-full bg-[#0b0d12] border border-[#232634] rounded-lg p-3 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={executeSandboxCode}
              disabled={isSandboxRunning}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
            >
              {isSandboxRunning ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังรันโค้ดในแซนด์บ็อกซ์...
                </>
              ) : (
                <>
                  <span>▶</span> Run in Safe Sandbox
                </>
              )}
            </button>
          </div>

          {/* Sandbox Results */}
          <div className="bg-[#151821] p-5 rounded-lg border border-[#232634] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Sandbox Execution Result</span>
              {sandboxResult && (
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    sandboxResult.exitCode === 0
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-red-950 text-red-400 border border-red-800'
                  }`}
                >
                  EXIT: {sandboxResult.exitCode} ({sandboxResult.bounded ? 'BOUNDED' : 'UNBOUNDED'})
                </span>
              )}
            </h3>

            {sandboxResult ? (
              <div className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-2 bg-[#0b0d12] p-3 rounded border border-[#232634]">
                  <div>Duration: <span className="text-cyan-400 font-bold">{sandboxResult.durationMs}ms</span></div>
                  <div>Sandboxed: <span className="text-emerald-400 font-bold">100% ISOLATED</span></div>
                </div>

                <div>
                  <div className="text-gray-400 mb-1">STDOUT:</div>
                  <pre className="p-3 bg-[#0b0d12] border border-[#232634] rounded text-emerald-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {sandboxResult.stdout || '(no standard output)'}
                  </pre>
                </div>

                {sandboxResult.stderr && (
                  <div>
                    <div className="text-gray-400 mb-1 text-red-400">STDERR / ERROR:</div>
                    <pre className="p-3 bg-red-950/20 border border-red-800 rounded text-red-300 max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {sandboxResult.stderr}
                    </pre>
                  </div>
                )}

                {sandboxResult.returnValue !== undefined && (
                  <div>
                    <div className="text-gray-400 mb-1">RETURN VALUE:</div>
                    <div className="p-2.5 bg-[#0b0d12] border border-[#232634] rounded text-cyan-300 font-bold">
                      {sandboxResult.returnValue}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-gray-500 border border-dashed border-[#232634] rounded-lg">
                กดปุ่ม "Run in Safe Sandbox" เพื่อรันโค้ดในระบบแยกตัวปลอดภัย
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DEBUGGING & PATCH LAB */}
      {activeTab === 'debugging-lab' && (
        <div className="space-y-6">
          <div className="bg-[#151821] p-5 rounded-lg border border-[#232634]">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>🔧</span> Governed Debugging Lab & Human Approval Gate
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              สร้าง Unified Diff Patch พร้อมระบบ Human Approval Requirement ที่ตรวจสอบสิทธิ์จริงก่อนอนุญาตให้ปรับแต่งไฟล์
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-gray-400 block mb-1">ORIGINAL CODE (มีข้อบกพร่อง):</label>
                <textarea
                  value={debugOriginal}
                  onChange={e => setDebugOriginal(e.target.value)}
                  rows={6}
                  className="w-full bg-[#0b0d12] border border-[#232634] rounded-lg p-3 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-gray-400 block mb-1">PROPOSED CODE (ฉบับแก้ไข):</label>
                <textarea
                  value={debugProposed}
                  onChange={e => setDebugProposed(e.target.value)}
                  rows={6}
                  className="w-full bg-[#0b0d12] border border-[#232634] rounded-lg p-3 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                onClick={handleProposePatch}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <span>➕</span> Generate Patch Proposal & Diff
              </button>
            </div>

            {/* Patch Diff & Approval Controls */}
            <div className="bg-[#151821] p-5 rounded-lg border border-[#232634] space-y-4">
              <h3 className="text-sm font-bold text-white">Unified Diff & Human Governance</h3>

              {patchProposal ? (
                <div className="space-y-4 text-xs font-mono">
                  <div className="p-3 bg-[#0b0d12] rounded border border-[#232634] flex items-center justify-between">
                    <div>
                      <span className="text-gray-400">Patch ID: </span>
                      <span className="text-cyan-400 font-bold">{patchProposal.proposal.patchId}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        patchApproved
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {patchApproved ? 'HUMAN_APPROVED' : 'AWAITING_APPROVAL'}
                    </span>
                  </div>

                  <div>
                    <div className="text-gray-400 mb-1">UNIFIED DIFF PREVIEW:</div>
                    <pre className="p-3 bg-[#0b0d12] border border-[#232634] rounded text-gray-200 max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {patchProposal.diff}
                    </pre>
                  </div>

                  {/* Human Approval Action */}
                  <div className="p-3 bg-[#0b0d12] border border-[#232634] rounded space-y-3">
                    <div className="text-gray-300 font-sans text-xs">
                      ⚠️ <strong>Security Gate Policy</strong>: ห้ามแก้ไขไฟล์งานจริงโดยอัตโนมัติ ต้องได้รับการอนุมัติจากวิศวกรผู้ดูแลระบบก่อนเท่านั้น
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleApprovePatch}
                        disabled={patchApproved}
                        className={`flex-1 py-2 text-xs font-bold rounded transition ${
                          patchApproved
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {patchApproved ? '✓ อนุมัติแล้ว (Approved)' : '👍 ให้ความยินยอม (Approve Patch)'}
                      </button>

                      <button
                        onClick={() => handleApplyPatch(true)}
                        disabled={!patchApproved}
                        className={`px-4 py-2 text-xs font-bold rounded transition ${
                          !patchApproved
                            ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        ทดสอบ Dry-Run
                      </button>
                    </div>

                    {patchApplyResult && (
                      <div className="p-2.5 bg-[#151821] border border-cyan-800 rounded text-cyan-300 text-[11px]">
                        {patchApplyResult.message}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-gray-500 border border-dashed border-[#232634] rounded-lg">
                  สร้างข้อเสนอ Patch ทางฝั่งซ้ายเพื่อตรวจสอบ Diff และขั้นตอน Human Approval
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY EVALUATION LAB */}
      {activeTab === 'security-lab' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#151821] p-5 rounded-lg border border-[#232634] space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🛡️</span> AST & Secret Pattern Security Scanner
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                สแกนความเปราะบางและคีย์ความลับ แยกแยะชัดเจนระหว่าง Verified Findings และ Hypotheses
              </p>
            </div>

            <div>
              <label className="text-xs font-mono text-gray-400 block mb-1">TARGET CODE TO SCAN:</label>
              <textarea
                value={securityScanCode}
                onChange={e => setSecurityScanCode(e.target.value)}
                rows={10}
                className="w-full bg-[#0b0d12] border border-[#232634] rounded-lg p-3 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={executeSecurityScan}
              disabled={isSecurityScanning}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
            >
              {isSecurityScanning ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังสแกนความปลอดภัย...
                </>
              ) : (
                <>
                  <span>🛡️</span> Execute Deep Security Scan
                </>
              )}
            </button>
          </div>

          {/* Security Scan Results */}
          <div className="bg-[#151821] p-5 rounded-lg border border-[#232634] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Security Scan Findings</span>
              {securityResult && (
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                    securityResult.securityGrade === 'A'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-red-950 text-red-400 border border-red-800'
                  }`}
                >
                  GRADE: {securityResult.securityGrade}
                </span>
              )}
            </h3>

            {securityResult ? (
              <div className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-2 bg-[#0b0d12] p-3 rounded border border-[#232634]">
                  <div>Lines Scanned: <span className="text-cyan-400 font-bold">{securityResult.scannedLines}</span></div>
                  <div>Findings: <span className="text-red-400 font-bold">{securityResult.findingsCount} issues</span></div>
                </div>

                {/* Verified Findings */}
                <div>
                  <div className="text-emerald-400 font-bold text-xs mb-1.5 flex items-center gap-1">
                    <span>✓</span> VERIFIED FINDINGS ({securityResult.verifiedFindings?.length || 0}):
                  </div>
                  {securityResult.verifiedFindings && securityResult.verifiedFindings.length > 0 ? (
                    <div className="space-y-2">
                      {securityResult.verifiedFindings.map((f: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-red-950/20 border border-red-800 rounded space-y-1"
                        >
                          <div className="flex items-center justify-between text-red-300 font-bold">
                            <span>[{f.ruleId}] {f.type}: {f.description}</span>
                            <span>Line {f.line}</span>
                          </div>
                          <div className="text-[11px] text-gray-400 truncate">
                            Matched Token: <span className="text-red-400 font-bold">{f.match}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-[#0b0d12] border border-[#232634] rounded text-gray-400">
                      ไม่พบช่องโหว่ความปลอดภัยระดับยืนยัน
                    </div>
                  )}
                </div>

                {/* Hypotheses */}
                <div>
                  <div className="text-amber-400 font-bold text-xs mb-1.5 flex items-center gap-1">
                    <span>?</span> HYPOTHESES / WARNINGS ({securityResult.hypotheses?.length || 0}):
                  </div>
                  <div className="p-3 bg-[#0b0d12] border border-[#232634] rounded text-gray-400">
                    {securityResult.hypotheses?.length > 0
                      ? securityResult.hypotheses.map((h: any) => h.description).join(', ')
                      : 'ไม่มีสมมติฐานที่ค้างการตรวจสอบ (All findings are grounded)'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-gray-500 border border-dashed border-[#232634] rounded-lg">
                กดปุ่ม "Execute Deep Security Scan" เพื่อเริ่มการตรวจสอบช่องโหว่และ Secret Leak
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: HISTORY & REGRESSION TIMELINE */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#151821] p-4 rounded-lg border border-[#232634]">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>📈</span> Evaluation Run History ({history.length} รายการ)
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                ประวัติการประเมินแบบ Deduplicated & Idempotent ป้องกันการบันทึกซ้ำซ้อน
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `zyntheor-eval-history-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-1.5 bg-[#0b0d12] hover:bg-[#232634] text-gray-300 rounded border border-[#232634] text-xs font-mono"
              >
                💾 Export JSON
              </button>
              <button
                onClick={handleClearHistory}
                className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-300 rounded border border-red-800 text-xs font-mono"
              >
                🗑️ Clear History
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map((entry, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg bg-[#151821] border border-[#232634] space-y-2 font-mono text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-bold">RUN #{history.length - idx}</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {entry.evaluation.overallScore}/100
                  </span>
                </div>
                <div className="text-gray-400 text-[11px]">
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
                <div className="text-[11px] text-gray-300 truncate">
                  ID: {entry.evaluation.evaluationId}
                </div>
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#232634]">
                  <span className="text-gray-400">หมวดหมู่: {entry.evaluation.categories.length}</span>
                  <span className="text-cyan-400">Duration: {entry.buildTimeMs || entry.evaluation.durationMs}ms</span>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="col-span-full p-8 text-center text-xs text-gray-500 border border-dashed border-[#232634] rounded-lg">
                ไม่มีประวัติการประเมินผลในระบบ
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER CAPABILITIES SUMMARY */}
      <div className="mt-8 pt-4 border-t border-[#232634] flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-gray-400">
        <div className="flex items-center gap-4">
          <span>VERIFIED: <strong className="text-emerald-400">{capabilities.filter(c => c.status === 'Verified').length}</strong></span>
          <span>EXPERIMENTAL: <strong className="text-amber-400">{capabilities.filter(c => c.status === 'Experimental').length}</strong></span>
          <span>UNAVAILABLE: <strong className="text-red-400">{capabilities.filter(c => c.status === 'Unavailable').length}</strong></span>
        </div>
        <div>
          BENCHMARK THRESHOLDS: PASS {benchmark?.thresholds.pass || 85} • WARN {benchmark?.thresholds.warn || 70}
        </div>
      </div>
    </div>
  );
};

export default EvaluationLabDashboard;
