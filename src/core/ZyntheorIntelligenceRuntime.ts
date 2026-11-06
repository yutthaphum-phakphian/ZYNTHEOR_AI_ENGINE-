/**
 * ZYNTHEOR AI ENGINE — ZyntheorIntelligenceRuntime
 * Unified Execution Interface — Online-First Sovereign Intelligence
 */

import { getActiveModel } from '../contracts/modelIdentityContract';
import { contextAssemblyEngine } from '../services/contextAssembly.ts';

export type CapabilityId = 'general' | 'knowledge' | 'reasoning' | 'multimodal' | 'agentic' | 'coding' | 'thai';
export type ModelOwnership = 'CORE_NATIVE' | 'CORE_ADAPTED' | 'CORE_DISTILLED' | 'EXTERNAL_PROVIDER';
export type ComplexityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface IntelligenceRequest {
  id: string;
  capability: CapabilityId;
  input: string;
  context?: {
    userId?: string;
    sessionId?: string;
    projectId?: string;
    grounding?: boolean;
    files?: string[];
    history?: any[];
    knowledgeContextPrompt?: string;
    knowledgeCitations?: any[];
    isContextTruncated?: boolean;
  };
  options?: { requireEvidence?: boolean; requireThai?: boolean; };
}

export interface RoutingDecision {
  selectedModelId: string;
  ownership: ModelOwnership;
  provider: string;
  reason: string;
  complexity: ComplexityLevel;
  reasoningBudget: { maxTokens: number; planningDepth: number; verificationBudget: number; };
  timestamp: string;
}

export interface CapabilityEngine {
  id: CapabilityId;
  canHandle(request: IntelligenceRequest): boolean;
  execute(request: IntelligenceRequest, runtime: any): Promise<any>;
}

export class ZyntheorIntelligenceRuntime {
  private engines: Map<CapabilityId, CapabilityEngine> = new Map();
  private routingLog: RoutingDecision[] = [];

  constructor(private memoryEngine?: any, private reasoningModule?: any) {}

  registerEngine(engine: CapabilityEngine) {
    if (this.engines.has(engine.id)) throw new Error(`Engine ${engine.id} already registered`);
    this.engines.set(engine.id, engine);
  }

  private resolveActiveModel(): { model: any; status: 'VERIFIED' | 'UNVERIFIED' | 'UNAVAILABLE' | 'INVALID'; error?: string } {
    try {
      const active = getActiveModel();
      if (!active || !active.runtimeId || !active.checkpointHash) {
        return { model: active, status: 'UNVERIFIED', error: 'มีข้อมูลแต่ยืนยัน Runtime ไม่ได้' };
      }
      const isValidHash = /^[a-f0-9]{64}$/i.test(active.checkpointHash);
      if (!isValidHash) return { model: active, status: 'INVALID', error: 'checkpointHash ไม่ผ่าน' };
      return { model: active, status: 'VERIFIED' };
    } catch (e: any) {
      return { model: null, status: 'UNAVAILABLE', error: e?.message || 'อ่าน Runtime ไม่ได้' };
    }
  }

  private assessComplexity(input: string): ComplexityLevel {
    const hasMultiStep = /จากนั้น|then|step \d|ขั้นตอน/.test(input);
    const hasMath = /[=∫∑∏√]|solve|คำนวณ|พิสูจน์/.test(input);
    const hasCode = /```|function|class|import|export/.test(input);
    const words = input.split(/\s+/).length;
    if (words > 500 || (hasMultiStep && hasMath && hasCode)) return 'critical';
    if (hasMultiStep || hasMath || words > 200) return 'high';
    if (words > 50 || hasCode) return 'medium';
    return 'low';
  }

  private routeModel(capability: CapabilityId, complexity: ComplexityLevel): RoutingDecision {
    const activeResult = this.resolveActiveModel();
    if (activeResult.status !== 'VERIFIED') {
      throw new Error(`Model Identity ${activeResult.status}: ${activeResult.error} — ห้าม fallback ไป models[0]`);
    }
    const model = activeResult.model;
    let reason = '';
    if (capability === 'knowledge') reason = `Knowledge requires Live Web Search + Source Verification — grounding=true`;
    else if (capability === 'reasoning' || capability === 'coding') reason = `${capability} requires CORE_NATIVE with high Planning Depth`;
    else reason = `${capability} routed to ${model.type} based on complexity ${complexity}`;

    const budgetMap = {
      low: { maxTokens: 1024, planningDepth: 1, verificationBudget: 0 },
      medium: { maxTokens: 2048, planningDepth: 3, verificationBudget: 1 },
      high: { maxTokens: 4096, planningDepth: 5, verificationBudget: 2 },
      critical: { maxTokens: 8192, planningDepth: 8, verificationBudget: 3 },
    };

    const decision: RoutingDecision = {
      selectedModelId: model.id,
      ownership: model.type as ModelOwnership,
      provider: model.provider || 'ZYNTHEOR_NATIVE',
      reason,
      complexity,
      reasoningBudget: budgetMap[complexity],
      timestamp: new Date().toISOString(),
    };
    this.routingLog.push(decision);
    return decision;
  }

  async execute(request: IntelligenceRequest): Promise<any> {
    const start = Date.now();
    const complexity = this.assessComplexity(request.input);
    const routing = this.routeModel(request.capability, complexity);
    let enrichedContext = request.context || {};
    
    // Knowledge Retrieval is invoked ONLY when task justifies it
    if (request.capability === 'knowledge' || request.context?.grounding) {
      const assembled = await contextAssemblyEngine.assembleContext({
        workspaceId: request.context?.projectId || 'default',
        query: request.input,
        maxCharacterBudget: 2500
      });
      enrichedContext = {
        ...enrichedContext,
        knowledgeContextPrompt: assembled.formattedPromptBlock,
        knowledgeCitations: assembled.sourceCitations,
        isContextTruncated: assembled.isTruncated
      };
    } else if (this.memoryEngine && request.context?.userId) {
      const memory = await this.memoryEngine.retrieve({ userId: request.context.userId, query: request.input, projectId: request.context.projectId, topK: 5 });
      enrichedContext = { ...enrichedContext, history: [...(request.context?.history || []), ...memory] };
    }

    const engine = this.engines.get(request.capability);
    if (!engine) throw new Error(`No engine for ${request.capability}`);
    if (this.reasoningModule) this.reasoningModule.allocateBudget(complexity, routing.reasoningBudget);
    const enrichedRequest = { ...request, context: enrichedContext };
    const result = await engine.execute(enrichedRequest, this);
    return { ...result, requestId: request.id, routing, metrics: { ...result?.metrics, latencyMs: Date.now() - start } };
  }

  getRoutingLog() {
    return [...this.routingLog];
  }
}
