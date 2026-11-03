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

export function detectRegression(previous: UnifiedEvaluation, current: UnifiedEvaluation): RegressionAlert[] {
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
        ]
      });
    }
  }
  return alerts;
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
  };
}

const HISTORY_KEY = 'zyntheor-eval-history';
export function loadHistory(): EvaluationHistoryEntry[] {
  try { if (typeof localStorage === 'undefined') return []; const raw = localStorage.getItem(HISTORY_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
export function saveToHistory(entry: EvaluationHistoryEntry) {
  const history = loadHistory(); history.unshift(entry); const trimmed = history.slice(0,50);
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed)); } catch {}
  return trimmed;
}
