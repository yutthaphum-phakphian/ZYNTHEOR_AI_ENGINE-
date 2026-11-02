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
  const sanitized = String(workspaceId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return sanitized.slice(0, 64) || 'default';
}

function getWorkspaceTasksFile(workspaceId: string): string {
  ensureDirectories();
  const safeId = sanitizeWorkspaceId(workspaceId);
  return path.join(TASKS_DIR, `workspace_${safeId}.tasks.json`);
}

function readTasksForWorkspace(workspaceId: string): TaskMemoryRecord[] {
  const filePath = getWorkspaceTasksFile(workspaceId);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn(`[TaskMemory] Error reading tasks for workspace ${workspaceId}:`, err);
    return [];
  }
}

function writeTasksForWorkspace(workspaceId: string, tasks: TaskMemoryRecord[]): void {
  ensureDirectories();
  const filePath = getWorkspaceTasksFile(workspaceId);
  const tmpPath = path.join(TASKS_DIR, `workspace_${sanitizeWorkspaceId(workspaceId)}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.json`);
  fs.writeFileSync(tmpPath, JSON.stringify(tasks, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
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
  
  if (!requestingUser || requestingUser.role === 'admin' || requestingUser.role === 'sovereign') {
    return allTasks;
  }

  // Filter tasks to the requesting user to prevent cross-user leakage
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

/**
 * Save or update a task memory record with atomic writes and workspace isolation.
 */
export function saveTaskMemory(
  recordInput: Partial<TaskMemoryRecord> & { workspaceId: string; goal: string },
  requestingUser?: { id: string; role?: string }
): TaskMemoryRecord {
  const workspaceId = String(recordInput.workspaceId || 'default').trim();
  const tasks = readTasksForWorkspace(workspaceId);
  const now = new Date().toISOString();

  const id = recordInput.id || recordInput.taskId || `task-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
  const existingIdx = tasks.findIndex(t => t.id === id || t.taskId === id);

  if (existingIdx >= 0 && requestingUser && requestingUser.role !== 'admin' && requestingUser.role !== 'sovereign') {
    const existing = tasks[existingIdx];
    if (existing.userId && existing.userId !== requestingUser.id) {
      throw new Error('Access denied: Cannot mutate task memory owned by another user');
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

  const tasks = readTasksForWorkspace(workspaceId);
  const count = tasks.length;
  writeTasksForWorkspace(workspaceId, []);
  return { cleared: count, workspaceId };
}
