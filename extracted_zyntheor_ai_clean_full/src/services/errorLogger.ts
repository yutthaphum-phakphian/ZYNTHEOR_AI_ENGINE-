import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { SystemError, NewSystemError } from '../../database/schema.ts';

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'workspace_data');
const ERRORS_FILE = path.join(DATA_DIR, 'system_errors.json');
const ERRORS_BACKUP_FILE = path.join(DATA_DIR, 'system_errors.backup.json');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export interface SystemErrorItem {
  id: string;
  level: 'error' | 'warn' | 'critical' | 'info';
  category: 'api' | 'auth' | 'workspace' | 'model' | 'database' | 'build' | 'app';
  message: string;
  stack?: string;
  endpoint?: string;
  resolved: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export function getSystemErrors(filter?: {
  level?: string;
  category?: string;
  search?: string;
  limit?: number;
}): { errors: SystemErrorItem[]; total: number; unresolvedCount: number } {
  ensureDirectories();
  let errors: SystemErrorItem[] = [];

  if (fs.existsSync(ERRORS_FILE)) {
    try {
      const raw = fs.readFileSync(ERRORS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        errors = parsed;
      }
    } catch (err) {
      console.error('[ErrorLogger] Failed to read errors file, attempting backup:', err);
      if (fs.existsSync(ERRORS_BACKUP_FILE)) {
        try {
          const rawBackup = fs.readFileSync(ERRORS_BACKUP_FILE, 'utf8');
          const backupParsed = JSON.parse(rawBackup);
          if (Array.isArray(backupParsed)) errors = backupParsed;
        } catch {}
      }
    }
  }

  const unresolvedCount = errors.filter(e => !e.resolved).length;

  let filtered = [...errors];

  if (filter?.level && filter.level !== 'all') {
    filtered = filtered.filter(e => e.level.toLowerCase() === filter.level?.toLowerCase());
  }

  if (filter?.category && filter.category !== 'all') {
    filtered = filtered.filter(e => e.category.toLowerCase() === filter.category?.toLowerCase());
  }

  if (filter?.search) {
    const q = filter.search.toLowerCase();
    filtered = filtered.filter(
      e =>
        e.message.toLowerCase().includes(q) ||
        (e.endpoint && e.endpoint.toLowerCase().includes(q)) ||
        (e.stack && e.stack.toLowerCase().includes(q))
    );
  }

  const limit = typeof filter?.limit === 'number' && filter.limit > 0 ? filter.limit : 100;
  const sliced = filtered.slice(0, limit);

  return {
    errors: sliced,
    total: filtered.length,
    unresolvedCount,
  };
}

function saveErrorsAtomically(errors: SystemErrorItem[]) {
  ensureDirectories();
  if (fs.existsSync(ERRORS_FILE)) {
    try {
      fs.copyFileSync(ERRORS_FILE, ERRORS_BACKUP_FILE);
    } catch {}
  }
  const tmp = path.join(DATA_DIR, `system_errors.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.json`);
  fs.writeFileSync(tmp, JSON.stringify(errors, null, 2), 'utf8');
  fs.renameSync(tmp, ERRORS_FILE);
}

export function logSystemError(data: {
  level?: 'error' | 'warn' | 'critical' | 'info';
  category?: 'api' | 'auth' | 'workspace' | 'model' | 'database' | 'build' | 'app';
  message: string;
  stack?: string;
  endpoint?: string;
  metadata?: Record<string, unknown>;
}): SystemErrorItem {
  const { errors } = getSystemErrors({ limit: 1000 });
  const newError: SystemErrorItem = {
    id: `err-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    level: data.level || 'error',
    category: data.category || 'app',
    message: String(data.message || 'Unknown error').trim(),
    stack: data.stack,
    endpoint: data.endpoint,
    resolved: false,
    metadata: data.metadata || {},
    createdAt: new Date().toISOString(),
  };

  // Keep last 500 errors to bound disk space
  const updated = [newError, ...errors].slice(0, 500);
  saveErrorsAtomically(updated);
  return newError;
}

export function resolveSystemError(id: string): { ok: boolean; resolvedId?: string } {
  const { errors } = getSystemErrors({ limit: 1000 });
  const index = errors.findIndex(e => e.id === id);
  if (index === -1) return { ok: false };
  errors[index].resolved = true;
  saveErrorsAtomically(errors);
  return { ok: true, resolvedId: id };
}

export function clearSystemErrors(): { ok: boolean; clearedCount: number } {
  const { errors } = getSystemErrors({ limit: 1000 });
  const count = errors.length;
  saveErrorsAtomically([]);
  return { ok: true, clearedCount: count };
}
