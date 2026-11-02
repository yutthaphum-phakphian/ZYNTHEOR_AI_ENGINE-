import { PromptTestCase } from '../../lib/prompt-studio/test-lab';

export function TestLabPanel({ cases, onRun, results }: { cases: PromptTestCase[], onRun: () => void, results: PromptTestCase[] }) {
  return (
    <div className="bg-[#080F1B] border border-[#0D1828] p-4 rounded-xl mt-4">
      <h3 className="text-[#38bdf8] font-bold">Test Lab - Live Model Evidence</h3>
      {cases.map((tc, i) => (
        <div key={tc.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <b style={{ fontSize: '10px', color: '#6e5b6f' }}>Test Case #{i + 1}</b>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {(tc.latencyMs ?? 0) > 0 && (
              <span style={{ fontSize: '9px', color: '#38bdf8', fontFamily: 'monospace' }}>
                {tc.latencyMs ?? 0}ms
              </span>
            )}
            <span className={`test-status ${(tc.evidenceState || 'UNVERIFIED').toLowerCase()}`}>
              {tc.evidenceState}
            </span>
          </div>
        </div>
      ))}
      <button onClick={onRun} className="bg-[#10b981] text-black px-3 py-1 rounded text-xs">Run Against Live Model</button>
      <div className="mt-3 space-y-2">
        {results.map((r) => (
          <div key={r.id} className={`p-2 rounded text-xs ${r.passed ? 'bg-emerald-950/30' : 'bg-red-950/30'}`}>
            {r.passed ? '✅ PASS' : '❌ FAIL'} | {r.latencyMs}ms | {r.evidenceState}
          </div>
        ))}
      </div>
    </div>
  );
}
