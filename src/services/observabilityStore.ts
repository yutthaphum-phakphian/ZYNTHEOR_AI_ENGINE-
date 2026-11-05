// @ts-nocheck
// src/services/observabilityStore.ts
// REAL ONLY - No mock, no Math.random, file-based append-only store
// ใช้จริงสำหรับ /api/intelligence/observability/requests

import fs from 'fs';
import path from 'path';

export type RealRequestRecord = {
  id: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  status: 'success' | 'failed';
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'observability-requests.jsonl');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, '');
}

export function appendRealRequest(record: Omit<RealRequestRecord, 'id' | 'createdAt'> & { id?: string }) {
  ensureFile();
  const full: RealRequestRecord = {
    id: record.id || `req_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, // id only, not metric - ok for id
    model: record.model,
    promptTokens: Number(record.promptTokens || 0),
    completionTokens: Number(record.completionTokens || 0),
    totalTokens: Number(record.totalTokens || (Number(record.promptTokens||0)+Number(record.completionTokens||0))),
    latencyMs: Number(record.latencyMs || 0),
    status: record.status === 'failed' ? 'failed' : 'success',
    createdAt: new Date().toISOString(),
  };
  fs.appendFileSync(FILE_PATH, JSON.stringify(full) + '\n');
}

export function readLastRealRequests(limit = 10): RealRequestRecord[] {
  ensureFile();
  try {
    const content = fs.readFileSync(FILE_PATH, 'utf-8').trim();
    if (!content) return [];
    const lines = content.split('\n').filter(Boolean);
    const records: RealRequestRecord[] = lines.map(l => JSON.parse(l)).filter(Boolean);
    return records.slice(-limit);
  } catch {
    return [];
  }
}
