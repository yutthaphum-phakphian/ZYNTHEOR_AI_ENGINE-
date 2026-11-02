import { createHash } from 'crypto';
export interface ProviderAuditLink {
  evidenceId: string; providerId: string; latencyP50: number; cost: number; successRate: number; timestamp: number; auditHash: string;
}
export class MultiProviderAuditRegistry {
  private links: ProviderAuditLink[] = [];
  private hashLink(l: Omit<ProviderAuditLink,'auditHash'>): string {
    return createHash('sha256').update(`${l.evidenceId}|${l.providerId}|${l.latencyP50}|${l.cost}|${l.timestamp}`).digest('hex');
  }
  linkEvidence(evidenceId: string, providerId: string, latencyP50: number, cost: number, successRate: number): ProviderAuditLink {
    const base = { evidenceId, providerId, latencyP50, cost, successRate, timestamp: Date.now() };
    const auditHash = this.hashLink(base);
    const record: ProviderAuditLink = { ...base, auditHash };
    this.links.push(record);
    return record;
  }
  getByEvidence(evidenceId: string){ return this.links.filter(l=>l.evidenceId===evidenceId); }
  getByProvider(providerId: string){ return this.links.filter(l=>l.providerId===providerId); }
  getP50(providerId: string): number { const arr=this.getByProvider(providerId).map(l=>l.latencyP50).sort((a,b)=>a-b); if(!arr.length) return 0; return arr[Math.floor(arr.length*0.5)]; }
  getP95(providerId: string): number { const arr=this.getByProvider(providerId).map(l=>l.latencyP50).sort((a,b)=>a-b); if(!arr.length) return 0; return arr[Math.floor(arr.length*0.95)]||arr[arr.length-1]; }
  getTotalCost(){ return this.links.reduce((s,l)=>s+l.cost,0); }
  verifyLink(link: ProviderAuditLink): boolean { const { auditHash, ...rest } = link; return this.hashLink(rest)===auditHash; }
  export(){ return JSON.stringify(this.links); }
}
