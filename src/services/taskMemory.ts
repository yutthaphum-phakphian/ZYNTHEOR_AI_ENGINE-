/**
 * ZYNTHEOR Persistent Task Memory Service
 * Provides workspace-isolated and user-isolated durable storage for continuous AI agent tasks.
 * Stores task context, reasoning findings, evidence digests, and dry-run simulations.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export type TaskStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'BLOCKED';

export interface TaskMemoryRecord {
  id: string;
  workspaceId: string;
  userId?: string;
  taskId: string;
  parentTaskId?: string;
  goal: string;
  category: string;
  stagesCompleted: string[];
  findings: string[];
  evidenceDigests: string[];
  dryRunSimulations: Array<{
    tool: string;
    timestamp: string;
    digest: string;
    simulatedOutcome: string;
  }>;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'workspace_data');
const TASKS_DIR = path.join(DATA_DIR, 'tasks');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TASKS_DIR)) {
    fs.mkdirSync(TASKS_DIR, { recursive: true });
  }
}

function sanitizeWorkspaceId(workspaceId: string): string {
  const raw = String(workspaceId || 'default').trim() || 'default';
  // Preserve legacy paths for already-safe identifiers; add a digest to transformed IDs
  // so distinct tenant/workspace names cannot collapse to the same on-disk key.
  if (/^[a-zA-Z0-9_-]{1,64}$/.test(raw)) return raw;
  const readable = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'workspace';
  const digest = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
  return `${readable}_${digest}`;
}

function getWorkspaceTasksFile(workspaceId: string): string {
  ensureDirectories();
  const safeId = sanitizeWorkspaceId(workspaceId);
  return path.join(TASKS_DIR, `workspace_${safeId}.tasks.json`);
}

function getLegacyWorkspaceTasksFile(workspaceId: string): string | undefined {
  const raw = String(workspaceId || 'default').trim() || 'default';
  if (/^[a-zA-Z0-9_-]{1,64}$/.test(raw)) return undefined;
  const legacyId = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'default';
  return path.join(TASKS_DIR, `workspace_${legacyId}.tasks.json`);
}

function readTasksForWorkspace(workspaceId: string): TaskMemoryRecord[] {
  const filePath = getWorkspaceTasksFile(workspaceId);
  let sourcePath = filePath;
  if (!fs.existsSync(sourcePath)) {
    const legacyPath = getLegacyWorkspaceTasksFile(workspaceId);
    if (legacyPath && fs.existsSync(legacyPath)) {
      sourcePath = legacyPath;
    } else {
      return [];
    }
  }
  try {
    const raw = fs.readFileSync(sourcePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('TASK_MEMORY_SCHEMA_INVALID');
    if (sourcePath !== filePath && parsed.some((record: TaskMemoryRecord) => record.workspaceId !== workspaceId)) {
      throw new Error('TASK_MEMORY_LEGACY_PATH_COLLISION_FAIL_CLOSED');
    }
    return parsed;
  } catch (err) {
    // Fail closed: corrupted memory must not appear as a legitimate empty workspace.
    throw new Error(`TASK_MEMORY_READ_FAILED:${workspaceId}:${err instanceof Error ? err.message : String(err)}`);
  }
}

function writeTasksForWorkspace(workspaceId: string, tasks: TaskMemoryRecord[]): void {
  ensureDirectories();
  const filePath = getWorkspaceTasksFile(workspaceId);
  const tmpPath = path.join(TASKS_DIR, `workspace_${sanitizeWorkspaceId(workspaceId)}.tmp.${process.pid}.${crypto.randomBytes(6).toString('hex')}.json`);
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(tmpPath, 'wx', 0o600);
    fs.writeFileSync(descriptor, JSON.stringify(tasks, null, 2), 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    if (descriptor !== undefined) { try { fs.closeSync(descriptor); } catch { /* cleanup */ } }
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { /* preserve original write error */ }
    throw error;
  }
}

/**
 * Retrieve task memory records for a specific workspace.
 * Strict isolation: Requests for workspace A never see records from workspace B.
 */
export function getTaskMemories(
  workspaceId: string,
  requestingUser?: { id: string; role?: string }
): TaskMemoryRecord[] {
  const allTasks = readTasksForWorkspace(workspaceId);
  
  if (requestingUser?.role === 'admin' || requestingUser?.role === 'sovereign') return allTasks;
  // Anonymous reads must not reveal user-owned records. Workspace isolation
  // alone is insufficient because a workspace may contain multiple users.
  if (!requestingUser?.id) return allTasks.filter(t => !t.userId);
  // Authenticated non-admin users can see only their own records and anonymous legacy records.
  return allTasks.filter(t => !t.userId || t.userId === requestingUser.id);
}

/**
 * Retrieve a specific task record by taskId within a workspace.
 */
export function getTaskMemoryById(
  workspaceId: string,
  taskId: string,
  requestingUser?: { id: string; role?: string }
): TaskMemoryRecord | undefined {
  const tasks = getTaskMemories(workspaceId, requestingUser);
  return tasks.find(t => t.id === taskId || t.taskId === taskId);
}

function withWorkspaceWriteLock<T>(workspaceId: string, operation: () => T): T {
  ensureDirectories();
  const safeId = sanitizeWorkspaceId(workspaceId);
  const lockPath = path.join(TASKS_DIR, `workspace_${safeId}.lock`);
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(lockPath, 'wx', 0o600);
    fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
    fs.fsyncSync(descriptor);
  } catch (error) {
    if (descriptor !== undefined) { try { fs.closeSync(descriptor); } catch { /* cleanup */ } }
    try { if (fs.existsSync(lockPath) && descriptor !== undefined) fs.unlinkSync(lockPath); } catch { /* preserve lock evidence */ }
    if ((error as NodeJS.ErrnoException)?.code === 'EEXIST') throw new Error('TASK_MEMORY_WRITE_LOCKED_FAIL_CLOSED');
    throw error;
  }
  try { return operation(); }
  finally {
    if (descriptor !== undefined) { try { fs.closeSync(descriptor); } catch { /* already closed */ } }
    try { fs.unlinkSync(lockPath); } catch { /* retain failure evidence */ }
  }
}

/**
 * Save or update a task memory record with atomic writes and workspace isolation.
 */
export function saveTaskMemory(
  recordInput: Partial<TaskMemoryRecord> & { workspaceId: string; goal: string },
  requestingUser?: { id: string; role?: string }
): TaskMemoryRecord {
  const workspaceId = String(recordInput.workspaceId || 'default').trim();
  return withWorkspaceWriteLock(workspaceId, () => {
  const privileged = requestingUser?.role === 'admin' || requestingUser?.role === 'sovereign';
  if (requestingUser?.id && !privileged && recordInput.userId && recordInput.userId !== requestingUser.id) {
    throw new Error('Access denied: Cannot assign task memory to another user');
  }
  const tasks = readTasksForWorkspace(workspaceId);
  const now = new Date().toISOString();

  const id = recordInput.id || recordInput.taskId || `task-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
  const existingIdx = tasks.findIndex(t => t.id === id || t.taskId === id);

  if (existingIdx >= 0) {
    const existing = tasks[existingIdx];
    const privileged = requestingUser?.role === 'admin' || requestingUser?.role === 'sovereign';
    if (existing.userId && (!requestingUser || (!privileged && existing.userId !== requestingUser.id))) {
      throw new Error('Access denied: Cannot mutate task memory without matching owner identity');
    }
  }

  const record: TaskMemoryRecord = {
    id,
    workspaceId,
    userId: recordInput.userId || requestingUser?.id,
    taskId: recordInput.taskId || id,
    parentTaskId: recordInput.parentTaskId,
    goal: String(recordInput.goal).trim(),
    category: recordInput.category || 'general',
    stagesCompleted: Array.isArray(recordInput.stagesCompleted) ? recordInput.stagesCompleted : [],
    findings: Array.isArray(recordInput.findings) ? recordInput.findings : [],
    evidenceDigests: Array.isArray(recordInput.evidenceDigests) ? recordInput.evidenceDigests : [],
    dryRunSimulations: Array.isArray(recordInput.dryRunSimulations) ? recordInput.dryRunSimulations : [],
    status: recordInput.status || 'ACTIVE',
    createdAt: existingIdx >= 0 ? tasks[existingIdx].createdAt : now,
    updatedAt: now,
    metadata: recordInput.metadata || {},
  };

  if (existingIdx >= 0) {
    tasks[existingIdx] = record;
  } else {
    tasks.unshift(record);
  }

  // Cap at 200 tasks per workspace
  if (tasks.length > 200) {
    tasks.length = 200;
  }

  writeTasksForWorkspace(workspaceId, tasks);
  return record;
  });
}

/**
 * Clear task memory for a workspace.
 */
export function clearTaskMemory(
  workspaceId: string,
  requestingUser?: { id: string; role?: string }
): { cleared: number; workspaceId: string } {
  if (requestingUser && requestingUser.role !== 'admin' && requestingUser.role !== 'sovereign') {
    throw new Error('Access denied: Administrator or sovereign role required to clear workspace task memory');
  }
  return withWorkspaceWriteLock(workspaceId, () => {
    const tasks = readTasksForWorkspace(workspaceId);
    const retained = requestingUser?.role === 'admin' || requestingUser?.role === 'sovereign'
      ? [] : tasks.filter(task => Boolean(task.userId));
    const count = tasks.length - retained.length;
    writeTasksForWorkspace(workspaceId, retained);
    return { cleared: count, workspaceId };
  });
}
