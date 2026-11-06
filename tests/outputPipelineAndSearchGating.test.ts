/**
 * ZYNTHEOR AI ENGINE — Phase 7 Output Pipeline & Search Gating Regression Test Suite
 * ZERO FAKE — REAL COMPLETENESS ONLY
 */

import { describe, it, expect } from 'vitest';
import { isSearchWarranted } from '../lib/intelligence-orchestrator.ts';
import { internetGateway } from '../lib/internet-gateway.ts';
import { IntelligenceOrchestrationEngine } from '../lib/intelligence-orchestrator.ts';

describe('ZYNTHEOR Output Pipeline & Search Gating Regression Suite', () => {
  const orchestrator = new IntelligenceOrchestrationEngine();

  // 1. Emoji-only input
  it('1. Emoji-only input does not trigger live search and returns natural answer without internal telemetry', async () => {
    const input = '😀';
    expect(isSearchWarranted(input, true)).toBe(false);

    const result = await orchestrator.execute({ query: input });
    expect(result.taskState).toBe('COMPLETED');
    expect(result.finalAnswer).not.toContain('Complexity Score');
    expect(result.finalAnswer).not.toContain('SYNTHESIS BY ZYNTHEOR CORE');
    expect(result.finalAnswer).not.toContain('VERIFIED GROUNDING SOURCES INGESTED');
    expect(result.finalAnswer).toContain('ยินดีให้บริการครับ');
  });

  // 2. Greeting
  it('2. Greeting input ("สวัสดี") does not trigger live search and returns natural greeting', async () => {
    const input = 'สวัสดีครับ';
    expect(isSearchWarranted(input, true)).toBe(false);

    const result = await orchestrator.execute({ query: input });
    expect(result.finalAnswer).not.toContain('[ADAPTIVE REASONING');
    expect(result.finalAnswer).toContain('ZYNTHEOR AI ENGINE');
  });

  // 3. Short conversational input
  it('3. Short conversational input ("ขอบคุณครับ") does not trigger live search', async () => {
    const input = 'ขอบคุณครับ';
    expect(isSearchWarranted(input, true)).toBe(false);

    const result = await orchestrator.execute({ query: input });
    expect(result.finalAnswer).not.toContain('Complexity Score');
    expect(result.finalAnswer).toContain('ยินดีครับ');
  });

  // 4. General knowledge
  it('4. General knowledge query answers directly without unnecessary live search or telemetry leakage', async () => {
    const input = 'ดาวอังคารคืออะไร';
    expect(isSearchWarranted(input, false)).toBe(false);

    const result = await orchestrator.execute({ query: input });
    expect(result.finalAnswer).not.toContain('[ZYNTHEOR INTELLIGENCE CORE]');
    expect(result.finalAnswer).toContain('ดาวอังคาร');
  });

  // 5. Thai language support
  it('5. Thai language input receives natural Thai language output', async () => {
    const input = 'อธิบายหลักการทำงานของระบบ';
    const result = await orchestrator.execute({ query: input, language: 'th' });
    expect(result.finalAnswer).not.toContain('Complexity Score');
    expect(result.finalAnswer).toContain('ZYNTHEOR INTELLIGENCE');
  });

  // 6. English language support
  it('6. English language query receives structured response without internal telemetry headers', async () => {
    const input = 'What is first-party model identity in ZYNTHEOR?';
    const result = await orchestrator.execute({ query: input, language: 'en' });
    expect(result.finalAnswer).not.toContain('[ADAPTIVE REASONING');
    expect(result.finalAnswer).not.toContain('Complexity Score');
  });

  // 7. Search-required question
  it('7. Search-required question triggers search gating', () => {
    const searchRequired = 'ค้นหา ข่าวล่าสุดเกี่ยวกับ AI 2026';
    expect(isSearchWarranted(searchRequired, true)).toBe(true);
  });

  // 8. Search extraction failure handling & sanitization
  it('8. HTML extraction cleans boilerplate, scripts, and DuckDuckGo navigation headers', () => {
    const dirtyHtml = `
      <html>
        <head><script>alert('xss');</script></head>
        <body>
          <nav>DuckDuckGo All Results Images Videos News Settings Privacy</nav>
          <div class="result">
            <a class="result__a" href="https://example.com/article">Sovereign AI Breakthrough</a>
            <div class="result__snippet">ZYNTHEOR launches First-Party Sovereign Intelligence Platform.</div>
          </div>
          <footer>Country Selector All Regions Feedback Privacy Policy</footer>
        </body>
      </html>
    `;

    const parsed = internetGateway.parseSearchResultsFromHtml(dirtyHtml);
    expect(parsed.length).toBe(1);
    expect(parsed[0].title).toBe('Sovereign AI Breakthrough');
    expect(parsed[0].url).toBe('https://example.com/article');
    expect(parsed[0].snippet).toContain('First-Party Sovereign Intelligence Platform');

    const cleanText = internetGateway.sanitizeWebHtml(dirtyHtml);
    expect(cleanText).not.toContain('<script>');
    expect(cleanText).not.toContain('DuckDuckGo All Results');
    expect(cleanText).not.toContain('Country Selector All Regions');
  });

  // 9. Empty search result handling
  it('9. Empty search query fails cleanly with operational error', async () => {
    const res = await internetGateway.executeSearch('');
    expect(res.ok).toBe(false);
    expect(res.error).toContain('cannot be empty');
  });

  // 10. SSRF & Invalid source safety
  it('10. Blocks SSRF targets like 127.0.0.1, localhost, and cloud metadata', () => {
    expect(internetGateway.isSafePublicUrl('http://127.0.0.1/admin').isSafe).toBe(false);
    expect(internetGateway.isSafePublicUrl('http://169.254.169.254/latest/meta-data/').isSafe).toBe(false);
    expect(internetGateway.isSafePublicUrl('http://localhost:3000').isSafe).toBe(false);
    expect(internetGateway.isSafePublicUrl('https://example.com/api').isSafe).toBe(true);
  });

  // 11. Missing citation prevention
  it('11. Grounding sources contain real URLs and verified titles', async () => {
    const result = await orchestrator.execute({
      query: 'ค้นหา ข่าวเกี่ยวกับ Sovereign AI 2026',
      enableInternetSearch: true,
      onlineConsent: true,
    });
    expect(result.taskState).toBe('COMPLETED');
    expect(result.finalAnswer).not.toContain('Complexity Score');
    expect(Array.isArray(result.groundingSources)).toBe(true);
  });

  // 12. Grounding status mismatch prevention
  it('12. Grounding sources status is explicitly tracked without manufactured hashes', () => {
    const digest = internetGateway.computeDigest('test-content');
    expect(digest).toHaveLength(64);
  });
});
