import { describe, it, expect } from 'vitest';
import { ProviderCompatibilityValidator } from './provider-validator';

describe('Provider Validator 9 PASS', () => {
  it('1 openai valid', () => {
    const v = new ProviderCompatibilityValidator();
    expect(v.validate('openai', { model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] }).valid).toBe(true);
  });

  it('2 openai missing model', () => {
    const v = new ProviderCompatibilityValidator();
    expect(v.validate('openai', { messages: [] }).valid).toBe(false);
  });

  it('3 anthropic valid', () => {
    const v = new ProviderCompatibilityValidator();
    expect(v.validate('anthropic', { model: 'claude-3', messages: [] }).valid).toBe(true);
  });

  it('4 anthropic missing messages', () => {
    const v = new ProviderCompatibilityValidator();
    expect(v.validate('anthropic', { model: 'claude-3' }).valid).toBe(false);
  });

  it('5 gemini valid', () => {
    const v = new ProviderCompatibilityValidator();
    expect(v.validate('gemini', { contents: [] }).valid).toBe(true);
  });

  it('6 invalid json', () => {
    const v = new ProviderCompatibilityValidator();
    const circular: any = {};
    circular.self = circular;
    expect(v.validate('openai', circular).valid).toBe(false);
  });

  it('7 errors array', () => {
    const v = new ProviderCompatibilityValidator();
    const r = v.validate('openai', {});
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('8 openai messages must be array', () => {
    const v = new ProviderCompatibilityValidator();
    expect(v.validate('openai', { model: 'gpt-4', messages: 'not array' as any }).valid).toBe(false);
  });

  it('9 zyntheor provider', () => {
    const v = new ProviderCompatibilityValidator();
    expect(v.validate('zyntheor', { prompt: 'test' }).valid).toBe(true);
  });
});
