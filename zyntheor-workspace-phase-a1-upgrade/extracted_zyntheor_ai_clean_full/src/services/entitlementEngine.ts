export type SubscriptionPlanId = 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE';

export interface PlanDefinition {
  id: SubscriptionPlanId;
  name: string;
  monthlyAiRequests: number;
  maxTokensPerRequest: number;
  maxWorkspaces: number;
  maxProjectsPerWorkspace: number;
  maxMembers: number;
  allowedModels: string[];
  toolsCodeAnalysisEnabled: boolean;
  toolsSandboxEnabled: boolean;
  storageMb: number;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, PlanDefinition> = {
  FREE: {
    id: 'FREE',
    name: 'ZYNTHEOR Starter (Free)',
    monthlyAiRequests: 500,
    maxTokensPerRequest: 4096,
    maxWorkspaces: 3,
    maxProjectsPerWorkspace: 5,
    maxMembers: 1,
    allowedModels: ['qwen2.5-coder:7b', 'zyntheor-core-0.10.0-foundation'],
    toolsCodeAnalysisEnabled: true,
    toolsSandboxEnabled: false,
    storageMb: 100,
  },
  PRO: {
    id: 'PRO',
    name: 'ZYNTHEOR Pro Engineer',
    monthlyAiRequests: 10000,
    maxTokensPerRequest: 16384,
    maxWorkspaces: 20,
    maxProjectsPerWorkspace: 50,
    maxMembers: 5,
    allowedModels: ['*'],
    toolsCodeAnalysisEnabled: true,
    toolsSandboxEnabled: true,
    storageMb: 5000,
  },
  TEAM: {
    id: 'TEAM',
    name: 'ZYNTHEOR Team Sovereign',
    monthlyAiRequests: 50000,
    maxTokensPerRequest: 32768,
    maxWorkspaces: 100,
    maxProjectsPerWorkspace: 200,
    maxMembers: 25,
    allowedModels: ['*'],
    toolsCodeAnalysisEnabled: true,
    toolsSandboxEnabled: true,
    storageMb: 50000,
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'ZYNTHEOR Enterprise Custom',
    monthlyAiRequests: 1000000,
    maxTokensPerRequest: 65536,
    maxWorkspaces: 1000,
    maxProjectsPerWorkspace: 1000,
    maxMembers: 500,
    allowedModels: ['*'],
    toolsCodeAnalysisEnabled: true,
    toolsSandboxEnabled: true,
    storageMb: 1000000,
  },
};

export class EntitlementEngine {
  /**
   * Returns plan definition by ID
   */
  public getPlan(planId: string): PlanDefinition {
    const key = (planId || 'FREE').toUpperCase() as SubscriptionPlanId;
    return SUBSCRIPTION_PLANS[key] || SUBSCRIPTION_PLANS.FREE;
  }

  /**
   * Evaluates if a tenant is entitled to perform an operation based on plan key.
   */
  public checkEntitlement(
    planId: string,
    key: 'ai.requests' | 'ai.tokens' | 'workspace.count' | 'project.count' | 'model.access' | 'tools.sandbox' | 'collaboration.members',
    currentUsage: number,
    modelRequested?: string
  ): { entitled: boolean; limit: number; current: number; reason?: string } {
    const plan = this.getPlan(planId);

    if (key === 'ai.requests') {
      const entitled = currentUsage < plan.monthlyAiRequests;
      return {
        entitled,
        limit: plan.monthlyAiRequests,
        current: currentUsage,
        reason: entitled ? undefined : `Monthly AI request limit reached (${currentUsage}/${plan.monthlyAiRequests}). Upgrade plan for higher quotas.`,
      };
    }

    if (key === 'workspace.count') {
      const entitled = currentUsage < plan.maxWorkspaces;
      return {
        entitled,
        limit: plan.maxWorkspaces,
        current: currentUsage,
        reason: entitled ? undefined : `Workspace count limit reached (${currentUsage}/${plan.maxWorkspaces}).`,
      };
    }

    if (key === 'project.count') {
      const entitled = currentUsage < plan.maxProjectsPerWorkspace;
      return {
        entitled,
        limit: plan.maxProjectsPerWorkspace,
        current: currentUsage,
        reason: entitled ? undefined : `Project count per workspace limit reached (${currentUsage}/${plan.maxProjectsPerWorkspace}).`,
      };
    }

    if (key === 'tools.sandbox') {
      const entitled = plan.toolsSandboxEnabled;
      return {
        entitled,
        limit: plan.toolsSandboxEnabled ? 1 : 0,
        current: currentUsage,
        reason: entitled ? undefined : 'Execution sandbox requires PRO plan or higher.',
      };
    }

    if (key === 'model.access' && modelRequested) {
      const allowed = plan.allowedModels.includes('*') || plan.allowedModels.includes(modelRequested);
      return {
        entitled: allowed,
        limit: plan.allowedModels.length,
        current: 1,
        reason: allowed ? undefined : `Model '${modelRequested}' is restricted under ${plan.name}. Upgrade to PRO for full model routing.`,
      };
    }

    return { entitled: true, limit: 999999, current: currentUsage };
  }
}

export const entitlementEngine = new EntitlementEngine();
