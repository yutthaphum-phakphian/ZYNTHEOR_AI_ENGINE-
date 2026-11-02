export interface Provider {
  id: string;
  health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latencyP50: number;
  costPer1kTokens: number;
  successRate: number;
  supportedModes: string[];
}

export interface RoutingTask {
  id: string;
  mode: string;
  complexity: number;
  priority: 'low' | 'medium' | 'high';
  tokenEstimate: number;
}

export interface EvidenceCheck {
  name: string;
  passed: boolean;
  reason?: string;
}

export interface EvidenceGateResult {
  passed: boolean;
  checks: EvidenceCheck[];
}

export interface RoutingDecision {
  providerId: string;
  reason: string;
  confidence: number;
  fallback: string[];
  costEstimate: number;
  latencyEstimate: number;
  evidence: EvidenceGateResult;
}

export type RoutingStrategy = 'cheapest' | 'fastest' | 'reliable' | 'balanced';

export class AdaptiveRouter {
  private healthScore(h: Provider['health']): number {
    switch(h) {
      case 'healthy': return 100;
      case 'degraded': return 50;
      case 'unknown': return 20;
      case 'unhealthy': return 0;
    }
  }

  route(task: RoutingTask, providers: Provider[], strategy: RoutingStrategy = 'balanced'): RoutingDecision {
    const compatible = providers.filter(p => task.mode === 'AUTO' || p.supportedModes.includes(task.mode));
    const healthy = compatible.filter(p => p.health === 'healthy' || p.health === 'degraded');
    const candidates = healthy.length > 0 ? healthy : compatible;

    if (candidates.length === 0) {
      return {
        providerId: 'none',
        reason: `no provider supports mode ${task.mode}`,
        confidence: 0,
        fallback: [],
        costEstimate: 0,
        latencyEstimate: 0,
        evidence: { passed: false, checks: [{ name: 'has_provider', passed: false }] }
      };
    }

    const scored = candidates.map(p => {
      let score = 0;
      if (strategy === 'cheapest') score = 100 - p.costPer1kTokens * 10;
      else if (strategy === 'fastest') score = 100 - p.latencyP50 / 10;
      else if (strategy === 'reliable') score = p.successRate;
      else score = this.healthScore(p.health) * 0.4 + p.successRate * 0.3 + (100 - p.latencyP50/10) * 0.15 + (100 - p.costPer1kTokens*10) * 0.15;
      
      // priority boost
      if (task.priority === 'high') score += p.successRate * 0.2;
      if (task.complexity > 7) score += p.successRate * 0.3 - p.costPer1kTokens;
      
      return { provider: p, score };
    }).sort((a,b) => b.score - a.score);

    const best = scored[0];
    const fallback = scored.slice(1, 3).map(s => s.provider.id);
    
    const costEstimate = (task.tokenEstimate / 1000) * best.provider.costPer1kTokens;
    
    const evidence: EvidenceGateResult = {
      passed: true,
      checks: [
        { name: 'has_provider', passed: true },
        { name: 'provider_healthy', passed: best.provider.health !== 'unhealthy' },
        { name: 'mode_supported', passed: true },
        { name: 'has_fallback', passed: fallback.length > 0 || candidates.length === 1 },
      ]
    };

    return {
      providerId: best.provider.id,
      reason: `${strategy} strategy: ${best.provider.id} score ${best.score.toFixed(1)}`,
      confidence: Math.min(1, best.score / 100),
      fallback,
      costEstimate,
      latencyEstimate: best.provider.latencyP50,
      evidence
    };
  }

  adaptOnFailure(task: RoutingTask, failedProviderId: string, providers: Provider[]): RoutingDecision {
    const remaining = providers.filter(p => p.id !== failedProviderId);
    return this.route(task, remaining, 'reliable');
  }
}

export function createAdaptiveRouter(): AdaptiveRouter {
  return new AdaptiveRouter();
}
