import { describe,it,expect } from 'vitest'; import { MultiProviderAuditRegistry } from './multi-provider-audit';
describe('Multi-Provider Audit 9 PASS',()=>{
  it('1 link',()=>{ const r=new MultiProviderAuditRegistry(); const l=r.linkEvidence('ev1','ollama',200,0,95); expect(l.auditHash.length).toBe(64); });
  it('2 get by evidence',()=>{ const r=new MultiProviderAuditRegistry(); r.linkEvidence('ev1','ollama',200,0,95); r.linkEvidence('ev1','gemini',800,0.5,90); expect(r.getByEvidence('ev1').length).toBe(2); });
  it('3 get by provider',()=>{ const r=new MultiProviderAuditRegistry(); r.linkEvidence('ev1','ollama',200,0,95); r.linkEvidence('ev2','ollama',210,0,95); expect(r.getByProvider('ollama').length).toBe(2); });
  it('4 p50',()=>{ const r=new MultiProviderAuditRegistry(); [200,210,220,230,240].forEach(v=>r.linkEvidence(`ev${v}`,'ollama',v,0,95)); expect(r.getP50('ollama')).toBeGreaterThan(0); });
  it('5 p95',()=>{ const r=new MultiProviderAuditRegistry(); for(let i=0;i<20;i++) r.linkEvidence(`ev${i}`,'ollama',200+i*10,0,95); expect(r.getP95('ollama')).toBeGreaterThan(r.getP50('ollama')); });
  it('6 cost',()=>{ const r=new MultiProviderAuditRegistry(); r.linkEvidence('ev1','openai',1200,2,85); r.linkEvidence('ev2','openai',1100,1.5,85); expect(r.getTotalCost()).toBe(3.5); });
  it('7 verify',()=>{ const r=new MultiProviderAuditRegistry(); const l=r.linkEvidence('ev1','ollama',200,0,95); expect(r.verifyLink(l)).toBe(true); });
  it('8 tamper fail',()=>{ const r=new MultiProviderAuditRegistry(); const l=r.linkEvidence('ev1','ollama',200,0,95); (l as any).latencyP50=9999; expect(r.verifyLink(l)).toBe(false); });
  it('9 export',()=>{ const r=new MultiProviderAuditRegistry(); r.linkEvidence('ev1','ollama',200,0,95); expect(JSON.parse(r.export()).length).toBe(1); });
});
