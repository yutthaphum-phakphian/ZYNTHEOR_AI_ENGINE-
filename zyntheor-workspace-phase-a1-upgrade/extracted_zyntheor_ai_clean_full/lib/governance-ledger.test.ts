import { describe,it,expect } from 'vitest'; import { GovernanceLedger } from './governance-ledger';
describe('Governance Ledger 9 PASS',()=>{
  it('1 add',()=>{ const l=new GovernanceLedger(); const r=l.addRecord('ev_hash1','gov_hash1','ALLOW'); expect(r.hash.length).toBe(64); });
  it('2 chain prevHash',()=>{ const l=new GovernanceLedger(); const r1=l.addRecord('e1','g1','ALLOW'); const r2=l.addRecord('e2','g2','DENY'); expect(r2.prevHash).toBe(r1.hash); });
  it('3 verify pass',()=>{ const l=new GovernanceLedger(); l.addRecord('e1','g1','ALLOW'); l.addRecord('e2','g2','ALLOW'); expect(l.verify().valid).toBe(true); });
  it('4 tamper detect',()=>{ const l=new GovernanceLedger(); l.addRecord('e1','g1','ALLOW'); const r2=l.addRecord('e2','g2','ALLOW'); (l.getChain()[1] as any).decision='HACKED'; expect(l.verify().valid).toBe(false); });
  it('5 crossLink',()=>{ const l=new GovernanceLedger(); l.addRecord('ev_same','g1','ALLOW'); l.addRecord('ev_same','g2','AUDIT_REQUIRED'); expect(l.crossLinkEvidence('ev_same').length).toBe(2); });
  it('6 id unique',()=>{ const l=new GovernanceLedger(); const a=l.addRecord('e1','g1','ALLOW'); const b=l.addRecord('e1','g1','ALLOW'); expect(a.id).not.toBe(b.id); });
  it('7 getChain',()=>{ const l=new GovernanceLedger(); l.addRecord('e1','g1','ALLOW'); expect(l.getChain().length).toBe(1); });
  it('8 decision types',()=>{ const l=new GovernanceLedger(); ['ALLOW','DENY','NEEDS_APPROVAL','AUDIT_REQUIRED'].forEach(d=>l.addRecord(`e_${d}`,`g_${d}`,d)); expect(l.getChain().length).toBe(4); });
  it('9 genesis prevHash',()=>{ const l=new GovernanceLedger(); const r=l.addRecord('e1','g1','ALLOW'); expect(r.prevHash).toBe('0'.repeat(64)); });
});
