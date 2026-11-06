/**
 * ZYNTHEOR NATIVE INTELLIGENCE — Phase 4 Agent Registry
 * ZERO FAKE — REAL COMPLETENESS ONLY
 * 
 * Manages registered Agents, declared Capability Contracts, Permission Levels,
 * and Health Status across the ZYNTHEOR ecosystem.
 */

export type PermissionLevel = 'READ' | 'PROPOSE' | 'WRITE' | 'EXECUTE';

export interface AgentCapabilityDeclaration {
  capabilityId: string;
  name: string;
  description: string;
  permissionRequired: PermissionLevel;
  requiresHumanApproval: boolean;
  timeoutMs: number;
}

export interface AgentDefinition {
  agentId: string;
  name: string;
  version: string;
  role: string;
  capabilities: AgentCapabilityDeclaration[];
  permissionLevel: PermissionLevel;
  status: 'READY' | 'BUSY' | 'MAINTENANCE' | 'OFFLINE';
  lastHealthCheckAt: string;
}

export class AgentRegistry {
  private agents: Map<string, AgentDefinition> = new Map();

  constructor() {
    this.registerDefaultAgents();
  }

  private registerDefaultAgents() {
    // 1. Research & Knowledge Agent
    this.registerAgent({
      agentId: 'agent-research-sovereign',
      name: 'ZYNTHEOR Sovereign Research Agent',
      version: '1.4.0',
      role: 'KNOWLEDGE_RESEARCHER',
      permissionLevel: 'READ',
      status: 'READY',
      lastHealthCheckAt: new Date().toISOString(),
      capabilities: [
        { capabilityId: 'cap-hybrid-search', name: 'Hybrid Knowledge Retrieval', description: 'Executes Vector + BM25 search over ingested documents', permissionRequired: 'READ', requiresHumanApproval: false, timeoutMs: 5000 },
        { capabilityId: 'cap-document-extract', name: 'Document Intelligence Extraction', description: 'Extracts structural sections and pages from PDFs/MD', permissionRequired: 'READ', requiresHumanApproval: false, timeoutMs: 5000 }
      ]
    });

    // 2. Analytical Reasoning & Math Agent
    this.registerAgent({
      agentId: 'agent-reasoning-engine',
      name: 'ZYNTHEOR Analytical Reasoning Agent',
      version: '1.4.0',
      role: 'ANALYTICAL_REASONER',
      permissionLevel: 'PROPOSE',
      status: 'READY',
      lastHealthCheckAt: new Date().toISOString(),
      capabilities: [
        { capabilityId: 'cap-multi-step-reasoning', name: 'Multi-Step Fact Verification', description: 'Evaluates facts and derives conclusions', permissionRequired: 'READ', requiresHumanApproval: false, timeoutMs: 8000 },
        { capabilityId: 'cap-decision-synthesis', name: 'Decision Summary Generation', description: 'Produces observable Decision and Evidence Summaries', permissionRequired: 'PROPOSE', requiresHumanApproval: false, timeoutMs: 5000 }
      ]
    });

    // 3. Technical & Engineering Agent
    this.registerAgent({
      agentId: 'agent-technical-engineer',
      name: 'ZYNTHEOR Systems & Code Engineer Agent',
      version: '1.4.0',
      role: 'TECHNICAL_ENGINEER',
      permissionLevel: 'WRITE',
      status: 'READY',
      lastHealthCheckAt: new Date().toISOString(),
      capabilities: [
        { capabilityId: 'cap-code-synthesis', name: 'TypeScript Architecture Synthesis', description: 'Generates type-safe TypeScript module logic', permissionRequired: 'PROPOSE', requiresHumanApproval: false, timeoutMs: 10000 },
        { capabilityId: 'cap-system-patch', name: 'Governed Patch Execution', description: 'Applies system patches with approval gates', permissionRequired: 'WRITE', requiresHumanApproval: true, timeoutMs: 15000 }
      ]
    });

    // 4. Task Planning & Coordinator Agent
    this.registerAgent({
      agentId: 'agent-task-coordinator',
      name: 'ZYNTHEOR Task Planning Coordinator',
      version: '1.4.0',
      role: 'ORCHESTRATOR',
      permissionLevel: 'EXECUTE',
      status: 'READY',
      lastHealthCheckAt: new Date().toISOString(),
      capabilities: [
        { capabilityId: 'cap-goal-decomposition', name: 'Goal Decomposition', description: 'Breaks complex goals into sub-task dependency graphs', permissionRequired: 'READ', requiresHumanApproval: false, timeoutMs: 5000 },
        { capabilityId: 'cap-multi-agent-delegation', name: 'Multi-Agent Delegation', description: 'Delegates sub-tasks to matching specialized agents', permissionRequired: 'EXECUTE', requiresHumanApproval: true, timeoutMs: 20000 }
      ]
    });
  }

  public registerAgent(agent: AgentDefinition): void {
    if (!agent.agentId || !agent.capabilities) {
      throw new Error('[AgentRegistry Error] Invalid Agent definition.');
    }
    this.agents.set(agent.agentId, agent);
  }

  public getAgent(agentId: string): AgentDefinition | null {
    return this.agents.get(agentId) || null;
  }

  public listAgents(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  public findAgentsByCapability(capabilityId: string): AgentDefinition[] {
    return Array.from(this.agents.values()).filter(a =>
      a.status === 'READY' && a.capabilities.some(c => c.capabilityId === capabilityId)
    );
  }
}

export const agentRegistry = new AgentRegistry();
