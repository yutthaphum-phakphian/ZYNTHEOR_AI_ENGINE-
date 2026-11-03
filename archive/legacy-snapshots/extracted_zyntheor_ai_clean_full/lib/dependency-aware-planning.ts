export interface Task {
  id: string;
  dependencies?: string[];
  priority?: number;
  duration?: number;
}

export interface TaskPlan {
  id: string;
  tasks: Task[];
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

export interface PlanningResult {
  valid: boolean;
  sorted: Task[];
  parallelGroups: Task[][];
  criticalPath: string[];
  evidence: EvidenceGateResult;
}

function findMissingDeps(plan: TaskPlan): string[] {
  const ids = new Set(plan.tasks.map(t => t.id));
  const missing: string[] = [];
  for (const t of plan.tasks) {
    for (const dep of t.dependencies || []) {
      if (!ids.has(dep)) missing.push(`${t.id}->${dep}`);
    }
  }
  return missing;
}

function topologicalSort(plan: TaskPlan): Task[] | null {
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();
  const taskMap = new Map<string, Task>();
  
  plan.tasks.forEach(t => {
    inDegree.set(t.id, 0);
    graph.set(t.id, []);
    taskMap.set(t.id, t);
  });
  
  plan.tasks.forEach(t => {
    for (const dep of t.dependencies || []) {
      if (graph.has(dep)) {
        graph.get(dep)!.push(t.id);
        inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1);
      }
    }
  });
  
  const queue: string[] = [];
  inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id); });
  
  const sorted: Task[] = [];
  while (queue.length > 0) {
    queue.sort((a,b) => (taskMap.get(b)?.priority||0) - (taskMap.get(a)?.priority||0));
    const id = queue.shift()!;
    sorted.push(taskMap.get(id)!);
    for (const next of graph.get(id) || []) {
      inDegree.set(next, inDegree.get(next)! - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    }
  }
  
  return sorted.length === plan.tasks.length ? sorted : null;
}

function getParallelGroups(sorted: Task[]): Task[][] {
  const groups: Task[][] = [];
  const done = new Set<string>();
  let remaining = [...sorted];
  
  while (remaining.length > 0) {
    const group = remaining.filter(t => (t.dependencies || []).every(d => done.has(d)));
    if (group.length === 0) break;
    groups.push(group);
    group.forEach(t => done.add(t.id));
    remaining = remaining.filter(t => !done.has(t.id));
  }
  return groups;
}

function getCriticalPath(plan: TaskPlan): string[] {
  const taskMap = new Map(plan.tasks.map(t => [t.id, t]));
  const memo = new Map<string, { path: string[], cost: number }>();
  
  const dfs = (id: string): { path: string[], cost: number } => {
    if (memo.has(id)) return memo.get(id)!;
    const task = taskMap.get(id);
    if (!task || !task.dependencies || task.dependencies.length === 0) {
      const res = { path: [id], cost: task?.duration || 1 };
      memo.set(id, res);
      return res;
    }
    let best = { path: [] as string[], cost: 0 };
    for (const dep of task.dependencies) {
      const r = dfs(dep);
      if (r.cost > best.cost) best = r;
    }
    const res = { path: [...best.path, id], cost: best.cost + (task.duration || 1) };
    memo.set(id, res);
    return res;
  };
  
  let bestPath: string[] = [];
  let bestCost = 0;
  for (const t of plan.tasks) {
    const r = dfs(t.id);
    if (r.cost > bestCost) { bestCost = r.cost; bestPath = r.path; }
  }
  return bestPath;
}

export function verifyPlan(plan: TaskPlan): EvidenceGateResult {
  const missing = findMissingDeps(plan);
  const sorted = topologicalSort(plan);
  const checks: EvidenceCheck[] = [
    { name: 'no_missing_deps', passed: missing.length === 0, reason: missing.length ? `missing: ${missing.join(',')}` : undefined },
    { name: 'no_circular', passed: sorted !== null, reason: sorted === null ? 'circular dependency' : undefined },
    { name: 'no_duplicate_ids', passed: new Set(plan.tasks.map(t=>t.id)).size === plan.tasks.length, reason: 'duplicate ids' },
    { name: 'at_least_one_task', passed: plan.tasks.length > 0 },
  ];
  return { passed: checks.every(c=>c.passed), checks };
}

export function planWithDependencies(plan: TaskPlan): PlanningResult {
  const evidence = verifyPlan(plan);
  if (!evidence.passed) {
    return { valid: false, sorted: [], parallelGroups: [], criticalPath: [], evidence };
  }
  const sorted = topologicalSort(plan)!;
  const parallelGroups = getParallelGroups(sorted);
  const criticalPath = getCriticalPath(plan);
  return { valid: true, sorted, parallelGroups, criticalPath, evidence };
}
