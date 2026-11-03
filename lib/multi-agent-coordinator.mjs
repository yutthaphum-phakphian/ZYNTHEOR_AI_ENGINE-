/**
 * Bounded multi-agent DAG coordinator for ZYNTHEOR CORE X P13.
 * It schedules registered local workers only; it does not create providers or
 * bypass the app's existing Tool Gateway / approval / sandbox boundaries.
 */
import crypto from 'node:crypto';

const MAX_TASKS = 50;
const MAX_PARALLEL = 4;
const TERMINAL = new Set(['COMPLETED', 'FAILED', 'BLOCKED', 'CANCELLED']);
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
const digest = value => crypto.createHash('sha256').update(stable(value)).digest('hex');

function approvalIsValid(approval, task) {
  return Boolean(approval && task.proposedBy && approval.actorType === 'human' &&
    ['owner', 'admin'].includes(approval.role) && approval.actorId &&
    approval.approvalId && approval.taskId === task.id &&
    approval.actorId !== task.proposedBy);
}

export function validateAgentDag(tasks) {
  if (!Array.isArray(tasks) || tasks.length < 1 || tasks.length > MAX_TASKS) throw new Error('TASK_COUNT_OUT_OF_RANGE');
  const byId = new Map();
  const idempotency = new Map();
  for (const task of tasks) {
    if (!task || typeof task.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(task.id)) throw new Error('TASK_ID_INVALID');
    if (byId.has(task.id)) throw new Error(`DUPLICATE_TASK_ID:${task.id}`);
    if (typeof task.workerId !== 'string' || !task.workerId.trim()) throw new Error(`WORKER_ID_REQUIRED:${task.id}`);
    if (typeof task.idempotencyKey !== 'string' || task.idempotencyKey.length < 8 || task.idempotencyKey.length > 160) throw new Error(`IDEMPOTENCY_KEY_INVALID:${task.id}`);
    const inputDigest = digest({ workerId: task.workerId, input: task.input ?? null, mutates: task.mutates === true });
    if (idempotency.has(task.idempotencyKey)) throw new Error('DUPLICATE_IDEMPOTENCY_KEY_IN_PLAN');
    idempotency.set(task.idempotencyKey, inputDigest);
    byId.set(task.id, { ...task, dependsOn: Array.isArray(task.dependsOn) ? task.dependsOn : [] });
  }
  for (const task of byId.values()) for (const dep of task.dependsOn) {
    if (!byId.has(dep)) throw new Error(`DEPENDENCY_NOT_FOUND:${task.id}:${dep}`);
    if (dep === task.id) throw new Error(`SELF_DEPENDENCY:${task.id}`);
  }
  const visiting = new Set(), visited = new Set();
  const visit = id => {
    if (visiting.has(id)) throw new Error('AGENT_DAG_CYCLE_DETECTED');
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of byId.get(id).dependsOn) visit(dep);
    visiting.delete(id); visited.add(id);
  };
  for (const id of byId.keys()) visit(id);
  return { byId, taskCount: byId.size };
}

export class MultiAgentCoordinator {
  constructor({ workers = {}, maxParallel = 2, maxTasks = MAX_TASKS, idempotencyStore = new Map() } = {}) {
    if (!Number.isInteger(maxParallel) || maxParallel < 1 || maxParallel > MAX_PARALLEL) throw new Error('MAX_PARALLEL_OUT_OF_RANGE');
    if (!Number.isInteger(maxTasks) || maxTasks < 1 || maxTasks > MAX_TASKS) throw new Error('MAX_TASKS_OUT_OF_RANGE');
    this.workers = new Map(Object.entries(workers));
    this.maxParallel = maxParallel;
    this.maxTasks = maxTasks;
    this.idempotencyStore = idempotencyStore;
  }

  registerWorker(id, executor) {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || typeof executor !== 'function') throw new Error('WORKER_REGISTRATION_INVALID');
    if (this.workers.has(id)) throw new Error('WORKER_ALREADY_REGISTERED');
    this.workers.set(id, executor);
  }

  async run(tasks, { approvals = {}, signal } = {}) {
    if (tasks.length > this.maxTasks) throw new Error('MAX_TASKS_EXCEEDED');
    const { byId } = validateAgentDag(tasks);
    const state = new Map([...byId.keys()].map(id => [id, { status: 'PENDING' }]));
    const now = () => new Date().toISOString();

    while ([...state.values()].some(item => !TERMINAL.has(item.status))) {
      if (signal?.aborted) {
        for (const [id, item] of state) if (!TERMINAL.has(item.status)) state.set(id, { status: 'CANCELLED', reason: 'ABORT_SIGNAL', finishedAt: now() });
        break;
      }
      let progressed = false;
      for (const [id, item] of state) {
        if (item.status !== 'PENDING') continue;
        const task = byId.get(id);
        const deps = task.dependsOn.map(dep => state.get(dep));
        if (deps.some(dep => ['FAILED', 'BLOCKED', 'CANCELLED'].includes(dep.status))) {
          state.set(id, { status: 'BLOCKED', reason: 'DEPENDENCY_NOT_COMPLETED', finishedAt: now() });
          progressed = true;
        }
      }
      const ready = [...byId.values()].filter(task => state.get(task.id).status === 'PENDING' && task.dependsOn.every(dep => state.get(dep).status === 'COMPLETED'));
      if (ready.length) {
        const selected = ready.slice(0, this.maxParallel);
        const results = await Promise.all(selected.map(async task => {
          const approvalRequired = task.mutates === true || ['HIGH', 'CRITICAL'].includes(task.risk);
          if (approvalRequired && !approvalIsValid(approvals[task.id], task)) {
            return { id: task.id, item: { status: 'BLOCKED', reason: 'HUMAN_APPROVAL_REQUIRED', finishedAt: now() } };
          }
          const worker = this.workers.get(task.workerId);
          if (!worker) return { id: task.id, item: { status: 'FAILED', reason: 'WORKER_NOT_REGISTERED', finishedAt: now() } };
          const requestDigest = digest({ workerId: task.workerId, input: task.input ?? null, mutates: task.mutates === true });
          const cached = this.idempotencyStore.get(task.idempotencyKey);
          if (cached) {
            if (cached.requestDigest !== requestDigest) return { id: task.id, item: { status: 'BLOCKED', reason: 'IDEMPOTENCY_KEY_COLLISION', finishedAt: now() } };
            return { id: task.id, item: { status: 'COMPLETED', result: cached.result, idempotentReplay: true, finishedAt: now() } };
          }
          try {
            const result = await worker(task.input, { taskId: task.id, idempotencyKey: task.idempotencyKey, signal });
            this.idempotencyStore.set(task.idempotencyKey, { requestDigest, result });
            return { id: task.id, item: { status: 'COMPLETED', result, idempotentReplay: false, finishedAt: now() } };
          } catch (error) {
            return { id: task.id, item: { status: 'FAILED', reason: error instanceof Error ? error.message : String(error), finishedAt: now() } };
          }
        }));
        for (const { id, item } of results) state.set(id, item);
        progressed = true;
      }
      if (!progressed) {
        for (const [id, item] of state) if (!TERMINAL.has(item.status)) state.set(id, { status: 'BLOCKED', reason: 'NO_EXECUTABLE_READY_TASK', finishedAt: now() });
      }
    }
    const tasksResult = [...state.entries()].map(([id, item]) => ({ taskId: id, ...item }));
    const status = tasksResult.every(item => item.status === 'COMPLETED') ? 'COMPLETED' :
      tasksResult.some(item => item.status === 'FAILED') ? 'FAILED' :
      tasksResult.some(item => item.status === 'CANCELLED') ? 'CANCELLED' : 'BLOCKED';
    return { phase: 'P13', status, taskCount: tasksResult.length, completed: tasksResult.filter(x => x.status === 'COMPLETED').length,
      blocked: tasksResult.filter(x => x.status === 'BLOCKED').length, failed: tasksResult.filter(x => x.status === 'FAILED').length,
      cancelled: tasksResult.filter(x => x.status === 'CANCELLED').length, tasks: tasksResult,
      approvalBoundary: 'HUMAN_OWNER_OR_ADMIN_ONLY', idempotencyStoreDurability: 'INJECTED_ADAPTER_REQUIRED_FOR_CROSS_RESTART_GUARANTEE' };
  }
}
