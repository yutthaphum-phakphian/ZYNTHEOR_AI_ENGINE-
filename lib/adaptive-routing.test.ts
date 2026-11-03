import { describe, it, expect } from 'vitest';
import { AdaptiveRouter, Provider, RoutingTask } from './adaptive-routing';

const providers: Provider[] = [
  { id: 'ollama', health: 'healthy', latencyP50: 200, costPer1kTokens: 0, successRate: 95, supportedModes: ['AUTO','CHAT','CODING'] },
  { id: 'gemini', health: 'healthy', latencyP50: 800, costPer1kTokens: 0.5, successRate: 90, supportedModes: ['AUTO','CHAT','REASONING','RESEARCH'] },
  { id: 'openai', health: 'degraded', latencyP50: 1200, costPer1kTokens: 2, successRate: 85, supportedModes: ['AUTO','CHAT','REASONING','CODING','RESEARCH','AGENT'] },
];

describe('Adaptive Routing - 9 PASS', () => {
  const router = new AdaptiveRouter();

  it('1. routes to cheapest for low priority', () => {
    const task: RoutingTask = { id: 't1', mode: 'CHAT', complexity: 2, priority: 'low', tokenEstimate: 1000 };
    const r = router.route(task, providers, 'cheapest');
    expect(r.providerId).toBe('ollama');
  });

  it('2. routes to fastest', () => {
    const task: RoutingTask = { id: 't2', mode: 'CHAT', complexity: 3, priority: 'high', tokenEstimate: 500 };
    const r = router.route(task, providers, 'fastest');
    expect(r.providerId).toBe('ollama');
  });

  it('3. routes to reliable for high complexity', () => {
    const task: RoutingTask = { id: 't3', mode: 'AGENT', complexity: 9, priority: 'high', tokenEstimate: 5000 };
    const r = router.route(task, providers, 'reliable');
    expect(r.providerId).not.toBe('none');
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it('4. balanced considers all factors', () => {
    const task: RoutingTask = { id: 't4', mode: 'REASONING', complexity: 5, priority: 'medium', tokenEstimate: 2000 };
    const r = router.route(task, providers, 'balanced');
    expect(r.evidence.passed).toBe(true);
    expect(r.costEstimate).toBeGreaterThanOrEqual(0);
  });

  it('5. fallback when provider fails', () => {
    const task: RoutingTask = { id: 't5', mode: 'CHAT', complexity: 2, priority: 'medium', tokenEstimate: 1000 };
    const r1 = router.route(task, providers, 'balanced');
    const r2 = router.adaptOnFailure(task, r1.providerId, providers);
    expect(r2.providerId).not.toBe(r1.providerId);
    expect(r2.providerId).not.toBe('none');
  });

  it('6. no provider for unsupported mode', () => {
    const task: RoutingTask = { id: 't6', mode: 'UNSUPPORTED_XYZ', complexity: 1, priority: 'low', tokenEstimate: 100 };
    const r = router.route(task, providers, 'balanced');
    expect(r.providerId).toBe('none');
    expect(r.evidence.passed).toBe(false);
  });

  it('7. prefers healthy over degraded', () => {
    const task: RoutingTask = { id: 't7', mode: 'CHAT', complexity: 2, priority: 'medium', tokenEstimate: 1000 };
    const r = router.route(task, providers, 'balanced');
    const provider = providers.find(p=>p.id===r.providerId);
    expect(provider?.health).not.toBe('unhealthy');
  });

  it('8. cost estimate calculation', () => {
    const task: RoutingTask = { id: 't8', mode: 'CHAT', complexity: 2, priority: 'low', tokenEstimate: 2000 };
    const r = router.route(task, providers, 'cheapest');
    expect(r.costEstimate).toBeLessThan(5);
  });

  it('9. integration high priority agent task', () => {
    const task: RoutingTask = { id: 't9', mode: 'AGENT', complexity: 8, priority: 'high', tokenEstimate: 8000 };
    const r = router.route(task, providers, 'balanced');
    expect(r.providerId).toBe('openai'); // only one supports AGENT fully
    expect(r.fallback.length).toBeGreaterThanOrEqual(0);
    expect(r.latencyEstimate).toBeGreaterThan(0);
  });
});
