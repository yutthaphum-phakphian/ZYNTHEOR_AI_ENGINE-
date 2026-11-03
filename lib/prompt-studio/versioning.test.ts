import { describe, it, expect } from 'vitest';
import { PromptVersioning } from './versioning.js';
describe('PromptVersioning SHA-256',()=>{
  it('creates chain with prevHash',()=>{
    const v=new PromptVersioning();
    const a=v.addVersion('p1','c1');
    const b=v.addVersion('p2','c2');
    expect(b.prevHash).toBe(a.hash);
    expect(v.getHistory().length).toBe(2);
  });
  it('verifyChain valid',()=>{
    const v=new PromptVersioning();
    v.addVersion('p1','c1');
    v.addVersion('p2','c2');
    expect(v.verifyChain().valid).toBe(true);
  });
  it('detects tamper',()=>{
    const v=new PromptVersioning();
    v.addVersion('p1','c1');
    v.addVersion('p2','c2');
    (v.getHistory() as any)[0].prompt='HACKED';
    expect(v.verifyChain().valid).toBe(false);
    expect(v.verifyChain().tamperedIndex).toBeDefined();
  });
  it('rollback',()=>{
    const v=new PromptVersioning();
    const a=v.addVersion('p1','c1');
    v.addVersion('p2','c2');
    expect(v.rollback(a.id)?.prompt).toBe('p1');
  });
});
