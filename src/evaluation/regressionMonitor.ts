// P14 Regression Monitoring - REAL evaluation comparison, no mock
import type { UnifiedEvaluation, EvaluationCategory } from './unifiedEngine';

export interface RegressionAlert {
  alertId: string;
  evaluationId: string;
  categoryId: string;
  categoryName: string;
  previousScore: number;
  currentScore: number;
  delta: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: string;
  evidence: string[];
}

export interface EvaluationHistoryEntry {
  evaluation: UnifiedEvaluation;
  timestamp: string;
  gitCommit?: string;
  buildTimeMs?: number;
}

export function detectRegression(
  previous: UnifiedEvaluation,
  current: UnifiedEvaluation
): RegressionAlert[] {
  const alerts: RegressionAlert[] = [];
  const genId = () => `regression-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

  const prevMap = new Map(previous.categories.map(c => [c.id, c]));
  
  for (const currCat of current.categories) {
    const prevCat = prevMap.get(currCat.id);
    if (!prevCat) continue;

    const delta = currCat.score - prevCat.score;
    if (delta < 0) {
      const severity = delta <= -20 ? 'CRITICAL' : delta <= -5 ? 'WARNING' : 'INFO';
      alerts.push({
        alertId: genId(),
        evaluationId: current.evaluationId,
        categoryId: currCat.id,
        categoryName: currCat.name,
        previousScore: prevCat.score,
        currentScore: currCat.score,
        delta,
        severity,
        timestamp: current.timestamp,
        evidence: [
          `Previous: ${prevCat.score} (${prevCat.gate})`,
          `Current: ${currCat.score} (${currCat.gate})`,
          `Failed tests: ${currCat.tests.filter(t => !t.passed).map(t => t.name).join(', ') || 'none'}`,
          `Previous failed: ${prevCat.tests.filter(t => !t.passed).map(t => t.name).join(', ') || 'none'}`
        ]
      });
    }
  }

  // Overall score regression
  const overallDelta = current.overallScore - previous.overallScore;
  if (overallDelta < 0) {
    alerts.unshift({
      alertId: genId(),
      evaluationId: current.evaluationId,
      categoryId: 'OVERALL',
      categoryName: 'Overall Score',
      previousScore: previous.overallScore,
      currentScore: current.overallScore,
      delta: overallDelta,
      severity: overallDelta <= -10 ? 'CRITICAL' : overallDelta <= -3 ? 'WARNING' : 'INFO',
      timestamp: current.timestamp,
      evidence: [
        `Overall previous: ${previous.overallScore}`,
        `Overall current: ${current.overallScore}`,
        `Gates previous: ${JSON.stringify(previous.gates)}`,
        `Gates current: ${JSON.stringify(current.gates)}`
      ]
    });
  }

  return alerts.sort((a, b) => {
    const sev = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    return sev[a.severity] - sev[b.severity] || a.delta - b.delta;
  });
}

export function compareEvaluations(prev: UnifiedEvaluation, curr: UnifiedEvaluation) {
  return {
    previousId: prev.evaluationId,
    currentId: curr.evaluationId,
    previousScore: prev.overallScore,
    currentScore: curr.overallScore,
    delta: curr.overallScore - prev.overallScore,
    alerts: detectRegression(prev, curr),
    timestamp: curr.timestamp,
    categories: curr.categories.map(c => {
      const prevCat = prev.categories.find(pc => pc.id === c.id);
      return {
        id: c.id,
        name: c.name,
        previousScore: prevCat?.score ?? 0,
        currentScore: c.score,
        delta: c.score - (prevCat?.score ?? 0),
        previousGate: prevCat?.gate,
        currentGate: c.gate
      };
    })
  };
}

// History management - REAL storage with in-memory fallback for Node/tests
const HISTORY_KEY = 'zyntheor-eval-history';
let memoryHistory: EvaluationHistoryEntry[] = [];

export function loadHistory(): EvaluationHistoryEntry[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    }
  } catch {}
  return [...memoryHistory];
}

export function saveToHistory(entry: EvaluationHistoryEntry): EvaluationHistoryEntry[] {
  const history = loadHistory();

  // Deduplication check: Do not append if identical to the latest entry
  if (history.length > 0) {
    const latest = history[0];
    const isSameId = latest.evaluation.evaluationId === entry.evaluation.evaluationId;
    const isSameScore = latest.evaluation.overallScore === entry.evaluation.overallScore;
    const isRecent = Math.abs(new Date(entry.timestamp).getTime() - new Date(latest.timestamp).getTime()) < 30_000;

    if (isSameId || (isSameScore && isRecent && latest.evaluation.benchmarkId === entry.evaluation.benchmarkId)) {
      // Update in place rather than duplicate
      history[0] = entry;
      memoryHistory = [...history];
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        }
      } catch {}
      return history;
    }
  }

  history.unshift(entry);
  // Keep last 50 evaluations
  const trimmed = history.slice(0, 50);
  memoryHistory = [...trimmed];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    }
  } catch {}
  return trimmed;
}

export function clearHistory() {
  memoryHistory = [];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(HISTORY_KEY);
    }
  } catch {}
}

