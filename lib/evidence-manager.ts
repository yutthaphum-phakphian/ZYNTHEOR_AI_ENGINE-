import crypto from 'node:crypto';

export interface EvidenceRecord {
  id: string;
  timestamp: number;
  category: 'auto_rationale' | 'tool_verification' | 'code_impact' | 'observability' | 'routing' | 'task_continuity';
  source: string;
  summary: string;
  payload: Record<string, any>;
  prevHash: string;
  hash: string;
  passed: boolean;
  confidence: number;
}

export interface EvidenceChainStatus {
  totalRecords: number;
  isValid: boolean;
  brokenIndex?: number;
  lastHash: string;
}

function calculateHash(id: string, timestamp: number, category: string, source: string, summary: string, payload: Record<string, any>, prevHash: string): string {
  const data = `${id}|${timestamp}|${category}|${source}|${summary}|${JSON.stringify(payload)}|${prevHash}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export class EvidenceManager {
  private chain: EvidenceRecord[] = [];

  record(
    category: EvidenceRecord['category'],
    source: string,
    summary: string,
    payload: Record<string, any>,
    passed: boolean = true,
    confidence: number = 1.0
  ): EvidenceRecord {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const prevHash = this.chain.length > 0 ? this.chain[this.chain.length - 1].hash : '0000000000000000000000000000000000000000000000000000000000000000';
    const hash = calculateHash(id, timestamp, category, source, summary, payload, prevHash);

    const record: EvidenceRecord = {
      id,
      timestamp,
      category,
      source,
      summary,
      payload,
      prevHash,
      hash,
      passed,
      confidence: Math.max(0, Math.min(1, confidence))
    };

    this.chain.push(record);
    return record;
  }

  getChain(): EvidenceRecord[] {
    return [...this.chain];
  }

  verifyChain(): EvidenceChainStatus {
    if (this.chain.length === 0) {
      return { totalRecords: 0, isValid: true, lastHash: '0000000000000000000000000000000000000000000000000000000000000000' };
    }

    let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    for (let i = 0; i < this.chain.length; i++) {
      const rec = this.chain[i];
      if (rec.prevHash !== prevHash) {
        return { totalRecords: this.chain.length, isValid: false, brokenIndex: i, lastHash: rec.hash };
      }
      const expectedHash = calculateHash(rec.id, rec.timestamp, rec.category, rec.source, rec.summary, rec.payload, rec.prevHash);
      if (rec.hash !== expectedHash) {
        return { totalRecords: this.chain.length, isValid: false, brokenIndex: i, lastHash: rec.hash };
      }
      prevHash = rec.hash;
    }

    return { totalRecords: this.chain.length, isValid: true, lastHash: this.chain[this.chain.length - 1].hash };
  }

  getByCategory(category: EvidenceRecord['category']): EvidenceRecord[] {
    return this.chain.filter(r => r.category === category);
  }

  clear(): void {
    this.chain = [];
  }
}

export function createEvidenceManager(): EvidenceManager {
  return new EvidenceManager();
}
