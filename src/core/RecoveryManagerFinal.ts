import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export interface RecoveryCheckpoint {
  jobId: string;
  taskState: string;
  taskGraph: any;
  approvedPlanDigest: string;
  executionId: string;
  appliedChangeIds: string[];
  verificationResults: any[];
  auditRef: string;
  timestamp: string;
  sha256: string;
}

export class RecoveryManagerFinal {
  static dir = path.resolve(process.cwd(), 'memory/checkpoints');

  static async save(cp: Omit<RecoveryCheckpoint, 'timestamp' | 'sha256'>): Promise<RecoveryCheckpoint> {
    await fs.mkdir(this.dir, { recursive: true });
    const payload = { ...cp, timestamp: new Date().toISOString() };
    const sha256 = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const full: RecoveryCheckpoint = { ...payload, sha256 };

    // File fallback + WAL
    await fs.writeFile(path.join(this.dir, `${cp.jobId}.json`), JSON.stringify(full, null, 2));
    await fs.appendFile(
      path.join(this.dir, 'wal.log'),
      `${full.timestamp} ${cp.jobId} ${cp.taskState} ${sha256}\n`
    );

    return full;
  }

  static async recover(jobId: string) {
    try {
      const raw = await fs.readFile(path.join(this.dir, `${jobId}.json`), 'utf-8');
      const cp = JSON.parse(raw) as RecoveryCheckpoint;
      const { sha256, ...rest } = cp;
      const calc = crypto.createHash('sha256').update(JSON.stringify(rest)).digest('hex');
      if (calc !== sha256) throw new Error('Integrity violation - checkpoint tampered');

      // Detect incomplete changes: files that were marked as applied but are missing
      const incomplete: string[] = [];
      for (const changeId of cp.appliedChangeIds) {
        try {
          await fs.stat(changeId);
        } catch {
          incomplete.push(changeId);
        }
      }

      if (incomplete.length > 0) {
        return {
          action: 'REQUIRE_APPROVAL',
          reason: `Incomplete changes: ${incomplete.join(', ')}`,
          checkpoint: cp,
        };
      }

      return { action: 'RESUME_SAFE', resumeFrom: cp.taskState, checkpoint: cp };
    } catch (e: any) {
      return { action: 'NO_CHECKPOINT', error: e.message };
    }
  }

  static async isApplied(jobId: string, changeId: string): Promise<boolean> {
    const r = await this.recover(jobId);
    return (r as any).checkpoint?.appliedChangeIds?.includes(changeId) ?? false;
  }
}
