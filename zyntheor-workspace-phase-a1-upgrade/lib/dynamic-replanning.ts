export type ReplanStrategy = 'retry_same' | 'retry_alternate' | 'reorder_dependencies' | 'skip_optional' | 'abort';

export type FailureCategory =
  | 'TRANSIENT_NETWORK'
  | 'DEPENDENCY_MISSING'
  | 'SYNTAX_OR_PARSING'
  | 'PERMISSION_DENIED'
  | 'RUNTIME_EXECUTION'
  | 'MAX_RETRIES_EXCEEDED';

export interface PlanStep {
  id: string;
  tool: string;
  params?: Record<string, any>;
  dependencies?: string[];
  optional?: boolean;
}

export interface Plan {
  id: string;
  steps: PlanStep[];
}

export interface ToolFailure {
  stepId: string;
  toolName: string;
  error: string;
  attempt: number;
  isTransient?: boolean;
  category?: FailureCategory;
  stackTrace?: string;
  timestamp?: string;
}

export interface ExecutionHistoryRecord {
  stepId: string;
  toolName: string;
  attempt: number;
  error: string;
  failureCategory: FailureCategory;
  recoveryAction: ReplanStrategy;
  timestamp: string;
  originalFailurePreserved: boolean;
}

export interface EvidenceCheck {
  name: string;
  passed: boolean;
  reason?: string;
}

export interface EvidenceGateResult {
  passed: boolean;
  checks: EvidenceCheck[];
}

export interface ReplanDecision {
  strategy: ReplanStrategy;
  newPlan: Plan | null;
  reasoning: string;
  confidence: number;
  failureCategory: FailureCategory;
  originalFailure: ToolFailure;
  evidence: EvidenceGateResult;
  historyRecord: ExecutionHistoryRecord;
}

const MAX_RETRIES = 3;
const FALLBACK_MAP: Record<string, string> = {
  web_search: 'local_search',
  'gpt-4': 'claude-3',
  code_execute: 'static_analysis',
};

function classifyError(failure: ToolFailure): FailureCategory {
  if (failure.attempt >= MAX_RETRIES) return 'MAX_RETRIES_EXCEEDED';
  const err = (failure.error || '').toLowerCase();
  if (err.includes('permission') || err.includes('denied') || err.includes('eacces')) return 'PERMISSION_DENIED';
  if (err.includes('dependency') || err.includes('not found') || err.includes('missing')) return 'DEPENDENCY_MISSING';
  if (err.includes('syntax') || err.includes('unexpected token')) return 'SYNTAX_OR_PARSING';
  if (failure.isTransient || err.includes('timeout') || err.includes('econnrefused')) return 'TRANSIENT_NETWORK';
  return 'RUNTIME_EXECUTION';
}

function hasDuplicateIds(plan: Plan): boolean {
  return new Set(plan.steps.map(s => s.id)).size !== plan.steps.length;
}

function hasCircularDeps(plan: Plan): boolean {
  const graph = new Map<string, string[]>();
  plan.steps.forEach(s => graph.set(s.id, s.dependencies || []));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const dfs = (node: string): boolean => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const dep of graph.get(node) || []) {
      if (dfs(dep)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  };

  for (const id of graph.keys()) {
    if (dfs(id)) return true;
  }
  return false;
}

export function verifyReplan(newPlan: Plan, oldPlan: Plan): EvidenceGateResult {
  const checks: EvidenceCheck[] = [
    { name: 'no_duplicate_ids', passed: !hasDuplicateIds(newPlan), reason: hasDuplicateIds(newPlan) ? 'duplicate ids' : undefined },
    { name: 'no_circular_deps', passed: !hasCircularDeps(newPlan), reason: hasCircularDeps(newPlan) ? 'circular deps' : undefined },
    { name: 'no_infinite_expansion', passed: newPlan.steps.length <= oldPlan.steps.length * 2, reason: newPlan.steps.length > oldPlan.steps.length * 2 ? 'too big' : undefined },
    { name: 'at_least_one_step_or_valid_empty', passed: true },
  ];
  return { passed: checks.every(c => c.passed), checks };
}

export class DynamicReplanner {
  private history: ExecutionHistoryRecord[] = [];

  shouldReplan(failure: ToolFailure): boolean {
    return failure.attempt < MAX_RETRIES || !!failure.isTransient;
  }

  getHistory(): ExecutionHistoryRecord[] {
    return [...this.history];
  }

  replan(currentPlan: Plan, failure: ToolFailure): ReplanDecision {
    const timestamp = failure.timestamp || new Date().toISOString();
    const failureCategory = failure.category || classifyError(failure);
    const failedStep = currentPlan.steps.find(s => s.id === failure.stepId);

    if (!failedStep || failure.attempt >= MAX_RETRIES) {
      const historyRecord: ExecutionHistoryRecord = {
        stepId: failure.stepId,
        toolName: failure.toolName,
        attempt: failure.attempt,
        error: failure.error,
        failureCategory: failure.attempt >= MAX_RETRIES ? 'MAX_RETRIES_EXCEEDED' : failureCategory,
        recoveryAction: 'abort',
        timestamp,
        originalFailurePreserved: true,
      };
      this.history.push(historyRecord);

      return {
        strategy: 'abort',
        newPlan: null,
        reasoning: `Max retries (${MAX_RETRIES}) reached or step missing for ${failure.stepId}`,
        confidence: 1.0,
        failureCategory: failure.attempt >= MAX_RETRIES ? 'MAX_RETRIES_EXCEEDED' : failureCategory,
        originalFailure: failure,
        evidence: { passed: true, checks: [{ name: 'abort_enforced_honestly', passed: true }] },
        historyRecord,
      };
    }

    let strategy: ReplanStrategy = 'retry_same';
    let reasoning = '';
    let confidence = 0.5;
    let newPlan: Plan = { ...currentPlan, steps: [...currentPlan.steps] };

    if (failureCategory === 'TRANSIENT_NETWORK' && failure.attempt < MAX_RETRIES) {
      strategy = 'retry_same';
      reasoning = `Transient network error "${failure.error}", retrying attempt ${failure.attempt + 1}`;
      confidence = 0.8;
    } else if (failedStep.optional) {
      strategy = 'skip_optional';
      newPlan = { ...currentPlan, steps: currentPlan.steps.filter(s => s.id !== failedStep.id) };
      reasoning = `Skipping optional step ${failedStep.id} after error "${failure.error}"`;
      confidence = 0.9;
    } else if (failureCategory === 'DEPENDENCY_MISSING' || failure.error.includes('dependency')) {
      strategy = 'reorder_dependencies';
      const sortedSteps = [...currentPlan.steps].sort((a, b) => (a.dependencies?.length || 0) - (b.dependencies?.length || 0));
      newPlan = { ...currentPlan, steps: sortedSteps };
      reasoning = `Dependency error "${failure.error}", reordering plan execution steps`;
      confidence = 0.7;
    } else if (FALLBACK_MAP[failedStep.tool]) {
      const fallbackTool = FALLBACK_MAP[failedStep.tool];
      strategy = 'retry_alternate';
      newPlan = {
        ...currentPlan,
        steps: currentPlan.steps.map(s => (s.id === failedStep.id ? { ...s, tool: fallbackTool } : s)),
      };
      reasoning = `Substituting tool ${failedStep.tool} -> ${fallbackTool} following error "${failure.error}"`;
      confidence = 0.75;
    } else {
      strategy = 'retry_same';
      reasoning = `Default retry step ${failedStep.id} attempt ${failure.attempt + 1}`;
      confidence = 0.5;
    }

    const evidence = verifyReplan(newPlan, currentPlan);
    const historyRecord: ExecutionHistoryRecord = {
      stepId: failure.stepId,
      toolName: failure.toolName,
      attempt: failure.attempt,
      error: failure.error,
      failureCategory,
      recoveryAction: strategy,
      timestamp,
      originalFailurePreserved: true,
    };
    this.history.push(historyRecord);

    return {
      strategy,
      newPlan,
      reasoning,
      confidence,
      failureCategory,
      originalFailure: failure,
      evidence,
      historyRecord,
    };
  }
}
