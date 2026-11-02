import { createHash } from 'crypto';
export interface GovernanceLedgerRecord {
  id: string; evidenceHash: string; governanceHash: string; decision: string; timestamp: number; prevHash: string; hash: string;
}
export class GovernanceLedger {
  private chain: GovernanceLedgerRecord[] = [];
  private computeHash(r: Omit<GovernanceLedgerRecord,'hash'>): string {
    return createHash('sha256').update(`${r.id}|${r.evidenceHash}|${r.governanceHash}|${r.decision}|${r.timestamp}|${r.prevHash}`).digest('hex');
  }
  addRecord(evidenceHash: string, governanceHash: string, decision: string): GovernanceLedgerRecord {
    const prevHash = this.chain.length ? this.chain[this.chain.length-1].hash : '0'.repeat(64);
    const base = { id:`govld_${crypto.randomUUID()}`, evidenceHash, governanceHash, decision, timestamp: Date.now(), prevHash };
    const hash = this.computeHash(base);
    const rec: GovernanceLedgerRecord = { ...base, hash };
    this.chain.push(rec);
    return rec;
  }
  getChain(){ return [...this.chain]; }
  verify(): { valid: boolean, tamperedIndex?: number } {
    for(let i=0;i<this.chain.length;i++){ const c=this.chain[i]; const expectedPrev=i===0?'0'.repeat(64):this.chain[i-1].hash; if(c.prevHash!==expectedPrev) return {valid:false,tamperedIndex:i}; const {hash,...rest}=c; if(this.computeHash(rest)!==c.hash) return {valid:false,tamperedIndex:i}; } return {valid:true};
  }
  crossLinkEvidence(evidenceHash: string){ return this.chain.filter(r=>r.evidenceHash===evidenceHash); }
}
