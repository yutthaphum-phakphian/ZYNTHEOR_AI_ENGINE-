import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

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

export class CheckpointManager {
  static dir = path.resolve(process.cwd(), 'memory/checkpoints');

  static async save(
    jobId: string,
    data: Omit<Checkpoint, 'timestamp' | 'sha256'>
  ): Promise<Checkpoint> {
    await fs.mkdir(this.dir, { recursive: true });
    const payload = { ...data, timestamp: new Date().toISOString() };
    const sha256 = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const checkpoint: Checkpoint = { ...payload, sha256 };
    const file = path.join(this.dir, `${jobId}.json`);
    await fs.writeFile(file, JSON.stringify(checkpoint, null, 2), 'utf-8');

    // WAL log append
    await fs.appendFile(
      path.join(this.dir, 'wal.log'),
      `${new Date().toISOString()} ${jobId} ${data.taskState} ${sha256}\n`
    );

    return checkpoint;
  }

  static async load(jobId: string): Promise<Checkpoint | null> {
    try {
      const file = path.join(this.dir, `${jobId}.json`);
      const raw = await fs.readFile(file, 'utf-8');
      const cp = JSON.parse(raw) as Checkpoint;

      // Verify integrity
      const { sha256, ...rest } = cp;
      const calc = crypto.createHash('sha256').update(JSON.stringify(rest)).digest('hex');
      if (calc !== sha256) {
        throw new Error('Checkpoint integrity violation');
      }
      return cp;
    } catch {
      return null;
    }
  }

  static async isChangeApplied(jobId: string, changeId: string): Promise<boolean> {
    const cp = await this.load(jobId);
    return cp?.appliedChangeIds ? cp.appliedChangeIds.includes(changeId) : false;
  }
}
