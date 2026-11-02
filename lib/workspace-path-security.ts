import fs from 'node:fs';
import path from 'node:path';

const BLOCKED_SEGMENT = /^(?:\.env(?:\..*)?|.*(?:secret|credential|private[_-]?key|id_rsa).*)$/i;
const BLOCKED_DIRS = new Set(['node_modules', '.git', '.aistudio']);

export class WorkspacePathError extends Error {
  readonly code = 'WORKSPACE_ACCESS_DENIED';
  constructor(message = 'Workspace path denied') { super(message); this.name = 'WorkspacePathError'; }
}

function assertRelativeSafe(input: string): string {
  if (typeof input !== 'string' || !input.trim() || input.includes('\0')) throw new WorkspacePathError('Invalid workspace path');
  if (path.isAbsolute(input) || path.win32.isAbsolute(input)) throw new WorkspacePathError('Absolute paths are not allowed');
  const normalized = input.replace(/\\/g, '/');
  if (normalized === '.' || normalized === './') return '.';
  const parts = normalized.split('/').filter(Boolean);
  if (parts.some(part => part === '.' || part === '..' || BLOCKED_SEGMENT.test(part) || BLOCKED_DIRS.has(part))) {
    throw new WorkspacePathError('Sensitive or out-of-bounds path');
  }
  return parts.join(path.sep);
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

/** Resolve an existing workspace path without following any symlink component. */
export function resolveExistingWorkspacePath(rootInput: string, relativeInput: string, expected: 'file' | 'directory' | 'either' = 'either'): string {
  const root = fs.realpathSync(rootInput);
  const relative = assertRelativeSafe(relativeInput || '.');
  let current = root;
  const parts = relative === '.' ? [] : relative.split(path.sep);
  for (const part of parts) {
    current = path.join(current, part);
    let stat: fs.Stats;
    try { stat = fs.lstatSync(current); } catch { throw new WorkspacePathError('Workspace path does not exist'); }
    if (stat.isSymbolicLink()) throw new WorkspacePathError('Symbolic links are not allowed in workspace access');
    if (!isInside(root, current)) throw new WorkspacePathError();
  }
  const canonical = fs.realpathSync(current);
  if (!isInside(root, canonical)) throw new WorkspacePathError();
  const finalStat = fs.statSync(canonical);
  if (expected === 'file' && !finalStat.isFile()) throw new WorkspacePathError('Requested path is not a file');
  if (expected === 'directory' && !finalStat.isDirectory()) throw new WorkspacePathError('Requested path is not a directory');
  return canonical;
}
