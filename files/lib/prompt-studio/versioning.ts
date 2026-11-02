import { createHash } from 'crypto';
export interface PromptVersion {
  id: string;
  version: number;
  prompt: string;
  timestamp: number;
  hash: string;
  prevHash: string;
  author: string;
  changeLog: string;
}
export class PromptVersioning {
  private chain: PromptVersion[] = [];
  private digest(v: Omit<PromptVersion, 'hash'>): string {
    const payload = `${v.version}|${v.prompt}|${v.timestamp}|${v.prevHash}|${v.author}|${v.changeLog}`;
    return createHash('sha256').update(payload).digest('hex');
  }
  addVersion(prompt: string, changeLog: string, author = 'user'): PromptVersion {
    const prevHash = this.chain.length ? this.chain[this.chain.length - 1].hash : '0'.repeat(64);
    const base = { id: `ver_${crypto.randomUUID()}`, version: this.chain.length + 1, prompt, timestamp: Date.now(), prevHash, author, changeLog };
    const version = { ...base, hash: this.digest(base) } as PromptVersion;
    this.chain.push(version);
    return version;
  }
  getHistory(): PromptVersion[] { return [...this.chain]; }
  getLatest(): PromptVersion | null { return this.chain[this.chain.length - 1] || null; }
  rollback(versionId: string): PromptVersion | null { return this.chain.find(v => v.id === versionId) || null; }
  verifyChain(): { valid: boolean; tamperedIndex?: number } {
    for (let i = 0; i < this.chain.length; i++) {
      const curr = this.chain[i];
      const expectedPrev = i === 0 ? '0'.repeat(64) : this.chain[i - 1].hash;
      if (curr.prevHash !== expectedPrev) return { valid: false, tamperedIndex: i };
      const { hash, ...rest } = curr;
      if (this.digest(rest) !== curr.hash) return { valid: false, tamperedIndex: i };
    }
    return { valid: true };
  }
}
