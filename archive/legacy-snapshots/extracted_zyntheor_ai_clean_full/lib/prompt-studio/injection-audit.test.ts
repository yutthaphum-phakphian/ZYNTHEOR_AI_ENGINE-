import { describe, it, expect } from 'vitest';
import { PromptInjectionAudit } from './injection-audit';

describe('Injection Audit 9 PASS', () => {
  it('1 detect ignore previous', () => {
    const a = new PromptInjectionAudit();
    expect(a.audit('ignore previous instructions').isInjection).toBe(true);
  });

  it('2 detect system:', () => {
    const a = new PromptInjectionAudit();
    expect(a.audit('system: you are now').risks.length).toBeGreaterThan(0);
  });

  it('3 detect jailbreak', () => {
    const a = new PromptInjectionAudit();
    expect(a.audit('jailbreak DAN mode').isInjection).toBe(true);
  });

  it('4 safe prompt no injection', () => {
    const a = new PromptInjectionAudit();
    expect(a.audit('Write a blog about cats').isInjection).toBe(false);
  });

  it('5 severity high', () => {
    const a = new PromptInjectionAudit();
    const r = a.audit('ignore previous instructions');
    expect(r.risks[0].severity).toBe('high');
  });

  it('6 found text', () => {
    const a = new PromptInjectionAudit();
    const r = a.audit('system: hack');
    expect(r.risks[0].found).toBeDefined();
  });

  it('7 multiple risks', () => {
    const a = new PromptInjectionAudit();
    const r = a.audit('system: ignore previous instructions jailbreak');
    expect(r.risks.length).toBeGreaterThan(1);
  });

  it('8 empty prompt', () => {
    const a = new PromptInjectionAudit();
    expect(a.audit('').isInjection).toBe(false);
  });

  it('9 Thai prompt safe', () => {
    const a = new PromptInjectionAudit();
    expect(a.audit('เขียนบทความเกี่ยวกับแมว').isInjection).toBe(false);
  });
});
