import { sha256Sync } from '../services/auditLedger';

export interface Checkpoint {
  jobId: string;
  taskState: string;
  taskGraph: any;
  approvedPlanDigest: string;
  executionId: string;
  appliedChangeIds: string[]; // prevents duplicate writes
  verificationResults: any[];
  auditRef: string;
  timestamp: string;
  sha256: string;
}

const isNode = typeof window === 'undefined' && typeof process !== 'undefined' && Boolean(process.versions?.node);

let nodeFs: any = null;
let nodePath: any = null;

function getNodeModules() {
  if (isNode && !nodeFs) {
    try {
      if (typeof process !== 'undefined' && typeof (process as any).getBuiltinModule === 'function') {
        nodeFs = (process as any).getBuiltinModule('node:fs/promises');
        nodePath = (process as any).getBuiltinModule('node:path');
      }
    } catch {}
  }
  return { fs: nodeFs, path: nodePath };
}

const memoryCheckpoints = new Map<string, Checkpoint>();

export class CheckpointManager {
  static dir = 'memory/checkpoints';

  static async save(
    jobId: string,
    data: Omit<Checkpoint, 'timestamp' | 'sha256'>
  ): Promise<Checkpoint> {
    const payload = { ...data, timestamp: new Date().toISOString() };
    const sha256 = sha256Sync(JSON.stringify(payload));
    const checkpoint: Checkpoint = { ...payload, sha256 };

    // 1. Store in memory for instant lookups
    memoryCheckpoints.set(jobId, checkpoint);

    // 2. Browser persistence
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`zyntheor.cp.${jobId}`, JSON.stringify(checkpoint));
      } catch {}
    }

    // 3. Node.js disk persistence and WAL logging
    const { fs: nFs, path: nPath } = getNodeModules();
    if (nFs && nPath) {
      try {
        const targetDir = nPath.resolve(process.cwd(), this.dir);
        await nFs.mkdir(targetDir, { recursive: true });
        const file = nPath.join(targetDir, `${jobId}.json`);
        await nFs.writeFile(file, JSON.stringify(checkpoint, null, 2), 'utf-8');

        await nFs.appendFile(
          nPath.join(targetDir, 'wal.log'),
          `${new Date().toISOString()} ${jobId} ${data.taskState} ${sha256}\n`
        );
      } catch (err) {
        console.warn('Checkpoint disk write warning:', err);
      }
    }

    return checkpoint;
  }

  static async load(jobId: string): Promise<Checkpoint | null> {
    // 1. Check in-memory store
    if (memoryCheckpoints.has(jobId)) {
      const cp = memoryCheckpoints.get(jobId)!;
      const { sha256, ...rest } = cp;
      const calc = sha256Sync(JSON.stringify(rest));
      if (calc !== sha256) {
        throw new Error('Checkpoint integrity violation');
      }
      return cp;
    }

    // 2. Check localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(`zyntheor.cp.${jobId}`);
        if (raw) {
          const cp = JSON.parse(raw) as Checkpoint;
          const { sha256, ...rest } = cp;
          const calc = sha256Sync(JSON.stringify(rest));
          if (calc !== sha256) throw new Error('Checkpoint integrity violation');
          memoryCheckpoints.set(jobId, cp);
          return cp;
        }
      } catch (e: any) {
        if (e.message === 'Checkpoint integrity violation') throw e;
      }
    }

    // 3. Check disk in Node.js
    const { fs: nFs, path: nPath } = getNodeModules();
    if (nFs && nPath) {
      try {
        const targetDir = nPath.resolve(process.cwd(), this.dir);
        const file = nPath.join(targetDir, `${jobId}.json`);
        const raw = await nFs.readFile(file, 'utf-8');
        const cp = JSON.parse(raw) as Checkpoint;

        const { sha256, ...rest } = cp;
        const calc = sha256Sync(JSON.stringify(rest));
        if (calc !== sha256) {
          throw new Error('Checkpoint integrity violation');
        }
        memoryCheckpoints.set(jobId, cp);
        return cp;
      } catch (err: any) {
        if (err.message === 'Checkpoint integrity violation') throw err;
        return null;
      }
    }

    return null;
  }

  static async isChangeApplied(jobId: string, changeId: string): Promise<boolean> {
    const cp = await this.load(jobId);
    return cp?.appliedChangeIds ? cp.appliedChangeIds.includes(changeId) : false;
  }
}
