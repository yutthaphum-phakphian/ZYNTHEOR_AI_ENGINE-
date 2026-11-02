import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  ChatSessionTokenRollingChart,
  getRecommendedContextLimit,
  RECOMMENDED_CONTEXT_LIMITS,
  type RollingMetricPoint,
} from '../components/ChatSessionTokenRollingChart';

describe('ChatSessionTokenRollingChart Unit & Integration Tests', () => {
  describe('1. Model Recommended Context Window Limit Resolution', () => {
    it('resolves correct context limits for common model families', () => {
      expect(getRecommendedContextLimit('gemini-3.8-flash')).toBe(1_000_000);
      expect(getRecommendedContextLimit('gemini-1.5-pro')).toBe(2_000_000);
      expect(getRecommendedContextLimit('qwen2.5-coder:7b')).toBe(32_768);
      expect(getRecommendedContextLimit('llama3.1')).toBe(128_000);
      expect(getRecommendedContextLimit('gpt-4o')).toBe(128_000);
      expect(getRecommendedContextLimit('claude-3-5-sonnet')).toBe(200_000);
      expect(getRecommendedContextLimit('zyntheor-core-1.1')).toBe(8_192);
      expect(getRecommendedContextLimit('buffalo-0.14.0')).toBe(8_192);
    });

    it('falls back gracefully to standard limit for unknown models', () => {
      expect(getRecommendedContextLimit('unknown-custom-model')).toBe(8_192);
      expect(getRecommendedContextLimit('')).toBe(8_192);
      expect(getRecommendedContextLimit(undefined)).toBe(8_192);
    });

    it('handles case-insensitive and partial model name matching', () => {
      expect(getRecommendedContextLimit('GEMINI-3.8-FLASH')).toBe(1_000_000);
      expect(getRecommendedContextLimit('ollama/qwen2.5-coder:7b')).toBe(32_768);
      expect(getRecommendedContextLimit('meta-llama/llama3.1-70b')).toBe(128_000);
    });
  });

  describe('2. 80% Threshold Warning & Red Bar Highlight', () => {
    // For qwen2.5-coder:7b, limit = 32,768. 80% threshold = 26,214 tokens.
    const sampleNormalData: RollingMetricPoint[] = [
      {
        point: 1,
        id: 'req-1',
        timeLabel: '10:00:00',
        latencyMs: 150,
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500, // well under 80% of 32,768
        status: 'success',
        model: 'qwen2.5-coder:7b',
      },
    ];

    const sampleExceededData: RollingMetricPoint[] = [
      {
        point: 1,
        id: 'req-1',
        timeLabel: '10:00:00',
        latencyMs: 850,
        promptTokens: 25000,
        completionTokens: 5000,
        totalTokens: 30000, // exceeds 80% of 32,768 (26,214)
        status: 'success',
        model: 'qwen2.5-coder:7b',
      },
    ];

    it('does not trigger threshold warning when token usage is under 80%', () => {
      const html = renderToString(
        <ChatSessionTokenRollingChart
          activeModel="qwen2.5-coder:7b"
          data={sampleNormalData}
          refreshIntervalMs={999999}
        />
      );

      // Warning alert should not appear
      expect(html).not.toContain('role="alert"');
      expect(html).not.toContain('threshold-warning');
      expect(html).toContain('RECORDED REQUESTS');
    });

    it('triggers threshold warning and renders warning banner when usage exceeds 80% of context limit', () => {
      let thresholdCallbackInvoked = false;
      const html = renderToString(
        <ChatSessionTokenRollingChart
          activeModel="qwen2.5-coder:7b"
          data={sampleExceededData}
          refreshIntervalMs={999999}
          onThresholdExceeded={(pt, limit, threshold) => {
            thresholdCallbackInvoked = true;
            expect(pt.totalTokens).toBe(30000);
            expect(limit).toBe(32768);
            expect(threshold).toBe(26214);
          }}
        />
      );

      // Warning alert must be rendered
      expect(html).toContain('role="alert"');
      expect(html).toContain('threshold-warning');
      expect(html).toContain('THRESHOLD WARNING (&gt;80%)');
      expect(html).toContain('30,000');
      expect(html).toContain('tokens');
    });

    it('highlights exceeded token bar in red (#ef4444) when exceeding 80% limit', () => {
      const html = renderToString(
        <ChatSessionTokenRollingChart
          activeModel="qwen2.5-coder:7b"
          data={sampleExceededData}
          refreshIntervalMs={999999}
        />
      );

      // The red highlight fill/background must be present in the exceeded bar and status badges
      expect(html).toContain('background:#ef4444');
      expect(html).toContain('data-testid="token-bar-exceeded"');
      expect(html).toContain('OVER 80%');
    });

    it('respects custom contextWindowLimit and warningThresholdRatio props', () => {
      // Custom limit: 10,000. 80% threshold = 8,000.
      const customData: RollingMetricPoint[] = [
        {
          point: 1,
          id: 'req-custom',
          timeLabel: '10:00:00',
          latencyMs: 200,
          promptTokens: 7000,
          completionTokens: 1500,
          totalTokens: 8500, // exceeds 8,000
          status: 'success',
          model: 'custom-model',
        },
      ];

      const html = renderToString(
        <ChatSessionTokenRollingChart
          activeModel="custom-model"
          contextWindowLimit={10000}
          warningThresholdRatio={0.8}
          data={customData}
          refreshIntervalMs={999999}
        />
      );

      expect(html).toContain('role="alert"');
      expect(html).toContain('threshold-warning');
      expect(html).toContain('8,000');
      expect(html).toContain('data-testid="token-bar-exceeded"');
    });
  });

  describe('3. Toggle Control to Hide/Show Individual Prompt vs Completion Tokens', () => {
    const testData: RollingMetricPoint[] = [
      {
        point: 1,
        id: 'req-test',
        timeLabel: '12:00:00',
        latencyMs: 120,
        promptTokens: 400,
        completionTokens: 200,
        totalTokens: 600,
        status: 'success',
        model: 'qwen2.5-coder:7b',
      },
    ];

    it('renders the toggle switch button with accessible attributes', () => {
      const html = renderToString(
        <ChatSessionTokenRollingChart
          activeModel="qwen2.5-coder:7b"
          data={testData}
          refreshIntervalMs={999999}
        />
      );

      expect(html).toContain('data-testid="toggle-token-breakdown"');
      expect(html).toContain('role="switch"');
      expect(html).toContain('aria-label="Toggle prompt and completion token breakdown"');
    });

    it('shows individual prompt and completion tokens when initialShowIndividualTokens is true', () => {
      const html = renderToString(
        <ChatSessionTokenRollingChart
          activeModel="qwen2.5-coder:7b"
          data={testData}
          initialShowIndividualTokens={true}
          refreshIntervalMs={999999}
        />
      );

      expect(html).toContain('aria-checked="true"');
      expect(html).toContain('Prompt vs Completion: Shown');
      expect(html).toContain('BREAKDOWN');
      expect(html).toContain('data-testid="token-bar-prompt"');
      expect(html).toContain('data-testid="token-bar-completion"');
      expect(html).toContain('400 in');
      expect(html).toContain('200 out');
    });

    it('simplifies chart view to total tokens only when initialShowIndividualTokens is false', () => {
      const html = renderToString(
        <ChatSessionTokenRollingChart
          activeModel="qwen2.5-coder:7b"
          data={testData}
          initialShowIndividualTokens={false}
          refreshIntervalMs={999999}
        />
      );

      expect(html).toContain('aria-checked="false"');
      expect(html).toContain('Simplified (Total Only)');
      expect(html).toContain('COMBINED');
      // When simplified, promptTokens and completionTokens breakdown is hidden, rendering total tokens bar
      expect(html).toContain('data-testid="token-bar-total"');
      expect(html).not.toContain('data-testid="token-bar-prompt"');
      expect(html).not.toContain('data-testid="token-bar-completion"');
    });
  });
});
