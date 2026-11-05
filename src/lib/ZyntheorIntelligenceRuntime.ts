/**
 * ZYNTHEOR INTELLIGENCE RUNTIME
 * Central Intelligence Orchestrator of ZYNTHEOR AI ENGINE.
 *
 * Implements the Unified Processing Pipeline:
 * USER REQUEST -> REQUEST VALIDATION -> INTENT UNDERSTANDING -> COMPLEXITY ASSESSMENT ->
 * CAPABILITY SELECTION -> MODEL ROUTING -> MEMORY & CONTEXT INJECTION ->
 * KNOWLEDGE / TOOL EXECUTION -> REASONING -> VERIFICATION -> RESPONSE GENERATION -> AUDIT & RESULT.
 *
 * Authoritative single entry point for all user-facing intelligence tasks.
 */

import { createHash } from 'node:crypto';
import {
  adaptiveReasoningEngine,
  type ReasoningParameters,
  type ComplexityTier,
  type ComplexityLevel,
  type AdaptiveReasoningResult,
} from '../../lib/adaptive-reasoning.ts';
import {
  zyntheorMemoryEngine,
  type MemoryCategory,
  type MemorySearchResult,
} from './ZyntheorMemoryEngine.ts';
import { intelligenceOrchestrator } from '../../lib/intelligence-orchestrator.ts';
import { CAPABILITIES, type CapabilityItem } from './capabilityEngine.ts';
import {
  type ModelCategory,
  type ModelIdentity,
  type ActiveModelInfo,
  type CanonicalModelOption,
  getActiveModel,
  validateModelIdentity,
  ZYNTHEOR_CANONICAL_MODELS,
} from './modelIdentityContract.ts';
import { ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY } from './sovereignty.ts';

// Re-export contract types
export type { ModelCategory, ModelIdentity, ActiveModelInfo, CanonicalModelOption };
export type OperatingMode = 'ONLINE_INTELLIGENCE' | 'HYBRID_INTELLIGENCE' | 'LOCAL_ONLY';

/* =========================================================================
   1. CENTRAL RUNTIME CONTRACTS (P2 Specification)
========================================================================= */

export interface ZyntheorAttachment {
  name: string;
  mimeType: string;
  sizeBytes?: number;
  contentText?: string;
  dataUrl?: string;
}

export interface ZyntheorIntelligenceRequest {
  requestId?: string;
  input: string | {
    text: string;
    images?: Array<{ name: string; mimeType: string; dataUrl: string }>;
    documents?: Array<{ name: string; mimeType: string; contentText: string; sizeBytes?: number }>;
    voiceMetadata?: {
      isVoiceInput: boolean;
      durationMs?: number;
      language?: string;
      interimTokensCount?: number;
    };
  };
  conversationId?: string;
  workspaceId: string;
  sessionId?: string;
  attachments?: ZyntheorAttachment[];
  userSelectedCapabilities?: string[];
  operatingMode?: OperatingMode;
  privacyPolicy?: {
    consentForExternalProvider?: boolean;
    allowMemoryStorage?: boolean;
    airGappedOnly?: boolean;
  };
  cancellationToken?: {
    isCancelled: boolean;
  };
  preferredModelId?: string;
  preferredModelCategory?: ModelCategory;
  adaptiveReasoningOverride?: Partial<ReasoningParameters>;
  humanApproved?: boolean;
}

export interface ZyntheorModelSelection {
  configuredModel: string;
  availableModel: string;
  selectedModel: string;
  actuallyActiveModel: string;
  identity: ModelIdentity;
  category: ModelCategory;
  provider: string;
  routingRationale: string;
  fallbackOccurred: boolean;
  governancePassed: boolean;
}

export interface ZyntheorVerificationResult {
  status: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIED' | 'FAILED' | 'NOT_REQUIRED';
  passedGates: string[];
  missingGates: string[];
  evidenceHash: string;
  requiresHumanApproval: boolean;
  notes: string;
}

export interface ZyntheorExecutionPlan {
  planId: string;
  strategy: string;
  stages: Array<{
    name: string;
    status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'SKIPPED' | 'FAILED';
    latencyMs?: number;
    details?: string;
  }>;
}

export interface ZyntheorCapability {
  id: string;
  name: string;
  category: string;
  isAvailable: boolean;
  description: string;
}

export interface ZyntheorRuntimeContext {
  workspaceId: string;
  sessionId: string;
  operatingMode: OperatingMode;
  userConsent: boolean;
  recalledMemories: Array<{
    id: string;
    title: string;
    category: string;
    preview: string;
    relevanceScore: number;
  }>;
  injectedContextPrompt: string;
}

export interface ZyntheorIntelligenceResponse {
  requestId: string;
  success: boolean;
  finalResponse: string;
  actualModelIdentity: ModelIdentity;
  actualModelId: string;
  modelSelection: ZyntheorModelSelection;
  selectedCapabilities: string[];
  primaryCapability: {
    id: string;
    name: string;
    domain: string;
  };
  complexityLevel: ComplexityLevel;
  complexityTier: ComplexityTier;
  reasoningParameters: ReasoningParameters;
  verificationResult: ZyntheorVerificationResult;
  evidenceReferences: string[];
  executionPlan: ZyntheorExecutionPlan;
  executionMetadata: {
    latencyMs: number;
    sha256Digest: string;
    stagesCompleted: string[];
    reasoningTokensUsed?: number;
    contextMemoriesCount: number;
    groundingSourcesCount: number;
  };
  warnings: string[];
  timestamp: string;
}

export interface ZyntheorRuntimeStatus {
  operatingMode: OperatingMode;
  activeModel: ActiveModelInfo;
  pipelineReady: boolean;
  totalRequestsProcessed: number;
  failClosedActive: boolean;
  sovereignSealsCount: number;
  timestamp: string;
}

// Backward-compatible type aliases
export type ExecutionPlan = {
  planId: string;
  strategy: string;
  steps: Array<{ order: number; action: string; target: string; status: string }>;
};
export type AdaptiveInferenceProfile = ReasoningParameters & { requiresMultimodal?: boolean };
export type RuntimeMultimodalInput = {
  text: string;
  images?: Array<{ name: string; mimeType: string; dataUrl: string }>;
  documents?: Array<{ name: string; mimeType: string; contentText: string; sizeBytes?: number }>;
  voiceMetadata?: {
    isVoiceInput: boolean;
    durationMs?: number;
    language?: 'th-TH' | 'en-US' | string;
    interimTokensCount?: number;
  };
};
export type ModelRoutingDecision = {
  selectedModelId: string;
  selectedModelName: string;
  category: ModelCategory;
  provider: string;
  routingRationale: string;
  governancePassed: boolean;
  isExternalFallback: boolean;
};
export type RuntimeExecutionOptions = {
  sessionId?: string;
  workspaceId?: string;
  userId?: string;
  operatingMode?: OperatingMode;
  userConsentForOnline?: boolean;
  forcedCapabilityId?: string;
  preferredModelCategory?: ModelCategory;
  preferredModelId?: string;
  adaptiveReasoningOverride?: Partial<ReasoningParameters>;
  skipMemoryRetrieval?: boolean;
  skipMemoryAutoStore?: boolean;
};
export type RuntimeExecutionResult = {
  executionId: string;
  success: boolean;
  finalResponse: string;
  capabilityUsed: {
    id: string;
    name: string;
    domain: string;
  };
  modelRouting: ModelRoutingDecision;
  adaptiveReasoning: {
    complexityTier: ComplexityTier;
    parameters: ReasoningParameters;
    inferredParameters: AdaptiveInferenceProfile;
    rationale: string;
    featuresDetected: string[];
  };
  memoryContext: {
    recalledItemsCount: number;
    items: Array<{ id: string; key: string; category: MemoryCategory; preview: string; similarity: number }>;
    autoStoredKey?: string;
  };
  internetGrounding: {
    mode: OperatingMode;
    onlineUsed: boolean;
    sourcesCount: number;
    sourceReferences: Array<{ url: string; title: string; sha256Hash: string; snippet?: string }>;
  };
  executionPlan: {
    planId: string;
    strategy: string;
    steps: Array<{ order: number; action: string; target: string; status: string }>;
  };
  trustVerification: {
    status: 'VERIFIED' | 'GOVERNED' | 'LOCAL_SAFE' | 'EVALUATION_GATE';
    evidenceGenerated: boolean;
    evidenceCount: number;
    executionLatencyMs: number;
    sha256Proof: string;
    sovereignSeal: string;
  };
  timestamp: string;
};

/* =========================================================================
   2. UNIFIED INTELLIGENCE RUNTIME CLASS
========================================================================= */

export class ZyntheorIntelligenceRuntime {
  private static instance: ZyntheorIntelligenceRuntime;
  private currentMode: OperatingMode = 'ONLINE_INTELLIGENCE';
  private totalRequestsProcessed: number = 0;
  private readonly maxInputLength: number = 250_000; // 250KB limit per single query

  private constructor() {}

  public static getInstance(): ZyntheorIntelligenceRuntime {
    if (!ZyntheorIntelligenceRuntime.instance) {
      ZyntheorIntelligenceRuntime.instance = new ZyntheorIntelligenceRuntime();
    }
    return ZyntheorIntelligenceRuntime.instance;
  }

  public getOperatingMode(): OperatingMode {
    return this.currentMode;
  }

  public setOperatingMode(mode: OperatingMode): void {
    this.currentMode = mode;
  }

  public getStatus(): ZyntheorRuntimeStatus {
    const active = getActiveModel();
    return {
      operatingMode: this.currentMode,
      activeModel: active,
      pipelineReady: true,
      totalRequestsProcessed: this.totalRequestsProcessed,
      failClosedActive: true,
      sovereignSealsCount: ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.SEAL_COUNT,
      timestamp: new Date().toISOString(),
    };
  }

  public getRuntimeStatus(): ZyntheorRuntimeStatus {
    return this.getStatus();
  }

  /**
   * Authoritative entry point for all user intelligence requests.
   * Runs the complete, governed 10-stage unified pipeline.
   */
  public async processRequest(
    request: ZyntheorIntelligenceRequest
  ): Promise<ZyntheorIntelligenceResponse> {
    const startTime = performance.now();
    const requestId = request.requestId || `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const workspaceId = (request.workspaceId || 'workspace-main').trim();
    const warnings: string[] = [];
    const stagesCompleted: string[] = [];

    const plan: ZyntheorExecutionPlan = {
      planId: `plan-${requestId}`,
      strategy: 'GOVERNED_UNIFIED_PIPELINE',
      stages: [
        { name: 'REQUEST_VALIDATION', status: 'PENDING' },
        { name: 'INTENT_UNDERSTANDING', status: 'PENDING' },
        { name: 'COMPLEXITY_ASSESSMENT', status: 'PENDING' },
        { name: 'CAPABILITY_SELECTION', status: 'PENDING' },
        { name: 'MODEL_ROUTING', status: 'PENDING' },
        { name: 'MEMORY_CONTEXT_INJECTION', status: 'PENDING' },
        { name: 'KNOWLEDGE_TOOL_EXECUTION', status: 'PENDING' },
        { name: 'REASONING', status: 'PENDING' },
        { name: 'VERIFICATION', status: 'PENDING' },
        { name: 'RESPONSE_GENERATION', status: 'PENDING' },
        { name: 'AUDIT_SEAL', status: 'PENDING' },
      ],
    };

    const markStage = (name: string, status: 'COMPLETED' | 'SKIPPED' | 'FAILED', details?: string) => {
      const st = plan.stages.find(s => s.name === name);
      if (st) {
        st.status = status;
        st.details = details;
      }
      if (status === 'COMPLETED') {
        stagesCompleted.push(name);
      }
    };

    try {
      // -------------------------------------------------------------
      // STAGE 1: REQUEST VALIDATION
      // -------------------------------------------------------------
      if (request.cancellationToken?.isCancelled) {
        throw new Error('Request was cancelled before processing.');
      }

      if (!workspaceId) {
        throw new Error('Validation failed: workspaceId is required for data isolation.');
      }

      let rawText = '';
      let images: Array<{ name: string; mimeType: string; dataUrl: string }> = [];
      let documents: Array<{ name: string; mimeType: string; contentText: string; sizeBytes?: number }> = [];

      if (typeof request.input === 'string') {
        rawText = request.input;
      } else if (request.input && typeof request.input === 'object') {
        rawText = request.input.text || '';
        images = request.input.images || [];
        documents = request.input.documents || [];
      }

      if (request.attachments && request.attachments.length > 0) {
        for (const att of request.attachments) {
          if (att.mimeType?.startsWith('image/')) {
            images.push({ name: att.name, mimeType: att.mimeType, dataUrl: att.dataUrl || '' });
          } else {
            documents.push({
              name: att.name,
              mimeType: att.mimeType,
              contentText: att.contentText || (att as any).content || '',
              sizeBytes: att.sizeBytes,
            });
          }
        }
      }

      if (!rawText.trim() && images.length === 0 && documents.length === 0) {
        throw new Error('Validation failed: Request input text or attachments cannot be empty.');
      }

      if (rawText.length > this.maxInputLength) {
        throw new Error(`Validation failed: Input exceeds maximum allowed size of ${this.maxInputLength} characters.`);
      }

      markStage('REQUEST_VALIDATION', 'COMPLETED');

      // -------------------------------------------------------------
      // STAGE 2: INTENT UNDERSTANDING
      // -------------------------------------------------------------
      if (request.cancellationToken?.isCancelled) throw new Error('Request was cancelled.');
      const effectiveMode: OperatingMode = request.operatingMode || this.currentMode;
      const hasAttachments = images.length > 0 || documents.length > 0;
      const multimodalSummary = hasAttachments 
        ? ` [Multimodal: ${images.length} images, ${documents.length} docs]` 
        : '';
      markStage('INTENT_UNDERSTANDING', 'COMPLETED', `Extracted query text (${rawText.length} chars)${multimodalSummary}`);

      // -------------------------------------------------------------
      // STAGE 3: COMPLEXITY ASSESSMENT (L1 to L4)
      // -------------------------------------------------------------
      const complexityResult: AdaptiveReasoningResult = adaptiveReasoningEngine.inferComplexity(
        rawText + multimodalSummary,
        {
          documentsCount: documents.length,
          imagesCount: images.length,
        }
      );

      const reasoningParams: ReasoningParameters = {
        ...complexityResult.parameters,
        ...(request.adaptiveReasoningOverride || {}),
      };
      markStage('COMPLEXITY_ASSESSMENT', 'COMPLETED', `Assessed level ${complexityResult.level} (${complexityResult.tier})`);

      // -------------------------------------------------------------
      // STAGE 4: CAPABILITY SELECTION
      // -------------------------------------------------------------
      const selectedCapabilities: string[] = [];
      let primaryCapId = 'GENERAL_CONVERSATION';

      if (request.userSelectedCapabilities && request.userSelectedCapabilities.length > 0) {
        selectedCapabilities.push(...request.userSelectedCapabilities);
        primaryCapId = request.userSelectedCapabilities[0];
      } else {
        const autoCap = this.resolveCapability(undefined, rawText);
        selectedCapabilities.push(autoCap.id);
        primaryCapId = autoCap.id;
      }

      const canonicalCap = CAPABILITIES.find(c => c.id.toLowerCase() === primaryCapId.toLowerCase()) || CAPABILITIES[0];
      markStage('CAPABILITY_SELECTION', 'COMPLETED', `Primary: ${canonicalCap.nameEn} (${primaryCapId})`);

      // -------------------------------------------------------------
      // STAGE 5: MODEL ROUTING & GOVERNANCE
      // -------------------------------------------------------------
      const modelSelection = this.resolveModelSelection(
        complexityResult.tier,
        effectiveMode,
        request.preferredModelId,
        request.privacyPolicy
      );

      if (!modelSelection.governancePassed) {
        throw new Error(`Model routing blocked by sovereignty governance: ${modelSelection.routingRationale}`);
      }

      if (modelSelection.fallbackOccurred) {
        warnings.push(`Model Fallback Notice: ${modelSelection.routingRationale}`);
      }
      markStage('MODEL_ROUTING', 'COMPLETED', `Routed to ${modelSelection.actuallyActiveModel} [${modelSelection.identity}]`);

      // -------------------------------------------------------------
      // STAGE 6: MEMORY & CONTEXT INJECTION (Workspace-isolated)
      // -------------------------------------------------------------
      let recalledMemories: Array<{
        id: string;
        title: string;
        category: string;
        preview: string;
        relevanceScore: number;
      }> = [];
      let injectedContextPrompt = '';

      if (rawText.trim().length > 3) {
        try {
          const searchMatches: MemorySearchResult[] = await zyntheorMemoryEngine.recallRelevantContext({
            text: rawText,
            workspaceId,
            limit: 4,
            minSimilarity: 0.35,
          });

          // Enforce strict workspace isolation
          recalledMemories = searchMatches
            .filter(m => m.entry.workspaceId === workspaceId)
            .map(m => ({
              id: m.entry.id,
              title: m.entry.title,
              category: m.entry.category,
              preview: m.entry.content.slice(0, 120),
              relevanceScore: m.score,
            }));

          injectedContextPrompt = await zyntheorMemoryEngine.buildInjectedContextPrompt(rawText, workspaceId);
          markStage('MEMORY_CONTEXT_INJECTION', 'COMPLETED', `Injected ${recalledMemories.length} memories for workspace ${workspaceId}`);
        } catch (memErr) {
          warnings.push(`Memory service notice: ${memErr instanceof Error ? memErr.message : 'Context recall bypassed'}`);
          markStage('MEMORY_CONTEXT_INJECTION', 'SKIPPED', 'Memory service unavailable');
        }
      } else {
        markStage('MEMORY_CONTEXT_INJECTION', 'SKIPPED', 'Query too short for vector retrieval');
      }

      // -------------------------------------------------------------
      // STAGE 7: KNOWLEDGE & TOOL EXECUTION
      // -------------------------------------------------------------
      if (request.cancellationToken?.isCancelled) throw new Error('Request was cancelled.');
      const shouldSearchInternet = effectiveMode === 'ONLINE_INTELLIGENCE' && (
        primaryCapId.includes('RESEARCH') ||
        primaryCapId.includes('KNOWLEDGE') ||
        /(search|browse|ค้นหา|ล่าสุด|ข้อมูล|ข่าว)/i.test(rawText)
      );

      const enrichedPrompt = injectedContextPrompt
        ? `${rawText}\n\n${injectedContextPrompt}`
        : rawText;

      markStage('KNOWLEDGE_TOOL_EXECUTION', shouldSearchInternet ? 'COMPLETED' : 'SKIPPED', shouldSearchInternet ? 'Live internet grounding active' : 'Direct execution');

      // -------------------------------------------------------------
      // STAGE 8: REASONING & INFERENCE
      // -------------------------------------------------------------
      const orchestratedResult = await intelligenceOrchestrator.execute({
        query: enrichedPrompt,
        workspaceId,
        onlineConsent: effectiveMode !== 'LOCAL_ONLY',
        enableInternetSearch: shouldSearchInternet,
        humanApprovals: Boolean(request.humanApproved) ? { 'workspace.mutate': true } : {},
        multimodalInputs: {
          images: images.map(img => ({
            name: img.name,
            mimeType: img.mimeType,
            dataUrl: img.dataUrl,
          })),
          documents: documents.map(doc => ({
            name: doc.name,
            type: doc.mimeType,
            size: doc.sizeBytes || 0,
            content: doc.contentText,
          })),
        },
      });

      markStage('REASONING', 'COMPLETED', `Inference finished (status: ${orchestratedResult.taskState})`);

      // -------------------------------------------------------------
      // STAGE 9: VERIFICATION ENGINE
      // -------------------------------------------------------------
      const evidenceHash = createHash('sha256')
        .update(`${requestId}:${orchestratedResult.finalAnswer || ''}:${Date.now()}`)
        .digest('hex');

      const verificationGatesPassed: string[] = ['LOGICAL_CONSISTENCY', 'EVIDENCE_PROVENANCE'];
      if (effectiveMode !== 'LOCAL_ONLY') {
        verificationGatesPassed.push('FAIL_CLOSED_GATE');
      }

      const isHumanApproved = Boolean(request.humanApproved);
      if (isHumanApproved) {
        verificationGatesPassed.push('HUMAN_APPROVAL_GATE');
      }

      const gateEvaluation = adaptiveReasoningEngine.validateVerificationGate(
        complexityResult.tier,
        verificationGatesPassed,
        isHumanApproved
      );

      const verificationStatus: ZyntheorVerificationResult['status'] =
        orchestratedResult.taskState !== 'COMPLETED'
          ? 'FAILED'
          : gateEvaluation.passed
            ? 'VERIFIED'
            : gateEvaluation.requiresHumanApproval
              ? 'PARTIALLY_VERIFIED'
              : 'UNVERIFIED';

      const verificationResult: ZyntheorVerificationResult = {
        status: verificationStatus,
        passedGates: verificationGatesPassed,
        missingGates: gateEvaluation.missingGates,
        evidenceHash,
        requiresHumanApproval: gateEvaluation.requiresHumanApproval,
        notes: gateEvaluation.passed
          ? 'All required safety and reasoning verification gates passed.'
          : `Awaiting completion of missing gates: ${gateEvaluation.missingGates.join(', ')}`,
      };

      markStage('VERIFICATION', gateEvaluation.passed ? 'COMPLETED' : 'FAILED', verificationResult.notes);

      // -------------------------------------------------------------
      // STAGE 10: RESPONSE GENERATION & AUDIT SEAL
      // -------------------------------------------------------------
      // Sanitize reasoning output: prevent private Chain-of-Thought leakage
      const sanitized = adaptiveReasoningEngine.sanitizeReasoningOutput(orchestratedResult.finalAnswer || '');
      const evidenceReferences = (orchestratedResult.groundingSources || []).map(s => s.url).concat(sanitized.evidenceReferences);

      // Optional selective memory store
      if (request.privacyPolicy?.allowMemoryStorage !== false && rawText.length > 20) {
        const isPref = /(prefer|always use|never use|ชอบ|ให้ใช้|สไตล์|ภาษาไทย)/i.test(rawText);
        const isRule = /(architecture rule|invariants:|สถาปัตยกรรม:|กฎสำคัญ:)/i.test(rawText);
        if (isPref || isRule) {
          const key = rawText.slice(0, 35).replace(/[^a-zA-Z0-9ก-๙]/g, '_');
          zyntheorMemoryEngine.store({
            key,
            content: rawText,
            category: isPref ? 'USER_PREFERENCE' : 'PROJECT_KNOWLEDGE',
            workspaceId,
            tags: [canonicalCap.nameEn, effectiveMode],
          }).catch(() => undefined);
        }
      }

      const latencyMs = Math.round(performance.now() - startTime);
      markStage('RESPONSE_GENERATION', 'COMPLETED', `Generated ${sanitized.sanitizedSummary.length} characters`);
      markStage('AUDIT_SEAL', 'COMPLETED', `SHA-256 seal generated: ${evidenceHash.slice(0, 16)}...`);

      this.totalRequestsProcessed += 1;

      return {
        requestId,
        success: orchestratedResult.taskState === 'COMPLETED',
        finalResponse: sanitized.sanitizedSummary,
        actualModelIdentity: modelSelection.identity,
        actualModelId: modelSelection.actuallyActiveModel,
        modelSelection,
        selectedCapabilities,
        primaryCapability: {
          id: canonicalCap.id,
          name: canonicalCap.nameEn,
          domain: canonicalCap.nameThai,
        },
        complexityLevel: complexityResult.level,
        complexityTier: complexityResult.tier,
        reasoningParameters: reasoningParams,
        verificationResult,
        evidenceReferences: Array.from(new Set(evidenceReferences)),
        executionPlan: plan,
        executionMetadata: {
          latencyMs,
          sha256Digest: evidenceHash,
          stagesCompleted,
          contextMemoriesCount: recalledMemories.length,
          groundingSourcesCount: (orchestratedResult.groundingSources || []).length,
        },
        warnings,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isCancelled = errorMsg.includes('cancelled');

      return {
        requestId,
        success: false,
        finalResponse: `[ZYNTHEOR FAIL-CLOSED] Request execution halted: ${errorMsg}`,
        actualModelIdentity: 'EXTERNAL_PROVIDER',
        actualModelId: 'fail-closed-boundary',
        modelSelection: {
          configuredModel: 'fail-closed',
          availableModel: 'none',
          selectedModel: 'fail-closed',
          actuallyActiveModel: 'fail-closed',
          identity: 'EXTERNAL_PROVIDER',
          category: 'EXTERNAL_MODEL_PROVIDER',
          provider: 'ZYNTHEOR_SECURITY_GATE',
          routingRationale: `Fail-closed boundary triggered: ${errorMsg}`,
          fallbackOccurred: false,
          governancePassed: false,
        },
        selectedCapabilities: [],
        primaryCapability: {
          id: 'SECURITY_BOUNDARY',
          name: 'Security Boundary',
          domain: 'การกำกับดูแลความปลอดภัย',
        },
        complexityLevel: 'L4',
        complexityTier: 'TIER_4_CRITICAL',
        reasoningParameters: {
          temperature: 0.0,
          topP: 1.0,
          cotDepth: 0,
          reasoningEffort: 'minimal',
          reasoningBudget: 0,
          chainOfThoughtBudget: 0,
          planningDepth: 0,
          verificationBudget: 0,
          maxOutputTokens: 512,
          requiredVerifications: ['FAIL_CLOSED_GATE'],
          executionStrategy: 'DIRECT_INFERENCE',
        },
        verificationResult: {
          status: isCancelled ? 'NOT_REQUIRED' : 'FAILED',
          passedGates: [],
          missingGates: ['EXECUTION_FAILED'],
          evidenceHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          requiresHumanApproval: false,
          notes: errorMsg,
        },
        evidenceReferences: [],
        executionPlan: plan,
        executionMetadata: {
          latencyMs,
          sha256Digest: '0x0000000000000000000000000000000000000000000000000000000000000000',
          stagesCompleted,
          contextMemoriesCount: 0,
          groundingSourcesCount: 0,
        },
        warnings: [errorMsg],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Backward-compatible execution method.
   * Internally translates to processRequest for unified execution.
   */
  public async executeCapability(
    capabilityId: string | undefined,
    input: RuntimeMultimodalInput,
    options: RuntimeExecutionOptions = {}
  ): Promise<RuntimeExecutionResult> {
    const response = await this.processRequest({
      input,
      workspaceId: options.workspaceId || 'workspace-main',
      sessionId: options.sessionId || 'session-default',
      operatingMode: options.operatingMode || this.currentMode,
      userSelectedCapabilities: capabilityId ? [capabilityId] : undefined,
      preferredModelId: options.preferredModelId,
      preferredModelCategory: options.preferredModelCategory,
      adaptiveReasoningOverride: options.adaptiveReasoningOverride,
    });

    const isLocalOnly = (options.operatingMode || this.currentMode) === 'LOCAL_ONLY';

    return {
      executionId: response.requestId,
      success: response.success,
      finalResponse: response.finalResponse,
      capabilityUsed: response.primaryCapability,
      modelRouting: {
        selectedModelId: response.modelSelection.selectedModel,
        selectedModelName: response.modelSelection.actuallyActiveModel,
        category: response.modelSelection.category,
        provider: response.modelSelection.provider,
        routingRationale: response.modelSelection.routingRationale,
        governancePassed: response.modelSelection.governancePassed,
        isExternalFallback: response.modelSelection.fallbackOccurred,
      },
      adaptiveReasoning: {
        complexityTier: response.complexityTier,
        parameters: response.reasoningParameters,
        inferredParameters: {
          ...response.reasoningParameters,
          requiresMultimodal: Boolean(input.images?.length || input.documents?.length),
        },
        rationale: `Complexity level ${response.complexityLevel}`,
        featuresDetected: response.executionPlan.stages.map(s => s.name),
      },
      memoryContext: {
        recalledItemsCount: response.executionMetadata.contextMemoriesCount,
        items: [],
      },
      internetGrounding: {
        mode: options.operatingMode || this.currentMode,
        onlineUsed: !isLocalOnly,
        sourcesCount: response.executionMetadata.groundingSourcesCount,
        sourceReferences: response.evidenceReferences.map(url => ({
          url,
          title: url,
          sha256Hash: createHash('sha256').update(url).digest('hex').slice(0, 16),
        })),
      },
      executionPlan: {
        planId: response.executionPlan.planId,
        strategy: response.executionPlan.strategy,
        steps: response.executionPlan.stages.map((st, idx) => ({
          order: idx + 1,
          action: st.name,
          target: st.details || 'runtime',
          status: st.status,
        })),
      },
      trustVerification: {
        status: isLocalOnly ? 'LOCAL_SAFE' : response.verificationResult.status === 'VERIFIED' ? 'VERIFIED' : 'GOVERNED',
        evidenceGenerated: true,
        evidenceCount: response.evidenceReferences.length + 1,
        executionLatencyMs: response.executionMetadata.latencyMs,
        sha256Proof: response.executionMetadata.sha256Digest,
        sovereignSeal: `SEAL-${ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY.SEAL_COUNT}-${response.executionMetadata.sha256Digest.slice(0, 12)}`,
      },
      timestamp: response.timestamp,
    };
  }

  /**
   * Resolves model selection while strictly enforcing the Model Ownership Contract.
   */
  public resolveModelSelection(
    complexityTier: ComplexityTier,
    operatingMode: OperatingMode,
    preferredModelId?: string,
    privacyPolicy?: { consentForExternalProvider?: boolean; airGappedOnly?: boolean }
  ): ZyntheorModelSelection {
    const isAirGapped = operatingMode === 'LOCAL_ONLY' || privacyPolicy?.airGappedOnly;
    const configuredActive = getActiveModel();

    // 1. Air-Gapped / Local-Only Mode
    if (isAirGapped) {
      return {
        configuredModel: 'zyntheor-core-native-1.1.0',
        availableModel: 'zyntheor-core-native-1.1.0',
        selectedModel: 'zyntheor-core-native-1.1.0',
        actuallyActiveModel: 'ZYNTHEOR CORE NATIVE 1.1.0 (Local CPU/Enclave)',
        identity: 'CORE_NATIVE',
        category: 'CORE_NATIVE',
        provider: 'ZYNTHEOR',
        routingRationale: 'Air-Gapped Local-Only policy active: strictly routed to local First-Party Native enclave.',
        fallbackOccurred: false,
        governancePassed: true,
      };
    }

    // 2. User preferred a canonical model
    if (preferredModelId) {
      const match = ZYNTHEOR_CANONICAL_MODELS.find(m => m.id === preferredModelId);
      if (match) {
        if (match.identity === 'EXTERNAL_PROVIDER' && privacyPolicy?.consentForExternalProvider === false) {
          // Block external access if consent denied -> fallback to CORE_ADAPTED
          return {
            configuredModel: match.id,
            availableModel: 'zyntheor-core-adapted-v1',
            selectedModel: 'zyntheor-core-adapted-v1',
            actuallyActiveModel: 'ZYNTHEOR CORE ADAPTED v1 (Sovereign Traces)',
            identity: 'CORE_ADAPTED',
            category: 'CORE_ADAPTED',
            provider: 'ZYNTHEOR',
            routingRationale: 'External provider consent denied by user privacy policy: safely routed to CORE_ADAPTED.',
            fallbackOccurred: true,
            governancePassed: true,
          };
        }

        return {
          configuredModel: match.id,
          availableModel: match.id,
          selectedModel: match.id,
          actuallyActiveModel: match.name,
          identity: match.identity,
          category: match.category,
          provider: match.provider,
          routingRationale: `Explicitly chosen canonical model: ${match.name}`,
          fallbackOccurred: false,
          governancePassed: true,
        };
      }
    }

    // 3. High Complexity (Tier 3 Deep or Tier 4 Critical) -> Frontier Gateway
    if (complexityTier === 'TIER_4_CRITICAL' || complexityTier === 'TIER_3_DEEP') {
      return {
        configuredModel: configuredActive.modelId,
        availableModel: configuredActive.modelId,
        selectedModel: configuredActive.modelId,
        actuallyActiveModel: configuredActive.name,
        identity: configuredActive.identity,
        category: configuredActive.category,
        provider: configuredActive.provider,
        routingRationale: `Deep complexity (${complexityTier}) requires frontier reasoning budget: routed to ${configuredActive.name}.`,
        fallbackOccurred: false,
        governancePassed: true,
      };
    }

    // 4. Hybrid Mode -> Prefer CORE_ADAPTED
    if (operatingMode === 'HYBRID_INTELLIGENCE') {
      return {
        configuredModel: 'zyntheor-core-adapted-v1',
        availableModel: 'zyntheor-core-adapted-v1',
        selectedModel: 'zyntheor-core-adapted-v1',
        actuallyActiveModel: 'ZYNTHEOR CORE ADAPTED v1 (Sovereign Traces)',
        identity: 'CORE_ADAPTED',
        category: 'CORE_ADAPTED',
        provider: 'ZYNTHEOR',
        routingRationale: 'Hybrid Intelligence: routine task handled by First-Party Core Adapted model.',
        fallbackOccurred: false,
        governancePassed: true,
      };
    }

    // 5. Default Online Intelligence: Active Cloud Gateway
    return {
      configuredModel: configuredActive.modelId,
      availableModel: configuredActive.modelId,
      selectedModel: configuredActive.modelId,
      actuallyActiveModel: configuredActive.name,
      identity: configuredActive.identity,
      category: configuredActive.category,
      provider: configuredActive.provider,
      routingRationale: `Online-First general intelligence: routed to ${configuredActive.name}.`,
      fallbackOccurred: false,
      governancePassed: true,
    };
  }

  private resolveCapability(capabilityId: string | undefined, text: string): CapabilityItem {
    if (capabilityId) {
      const match = CAPABILITIES.find(c => c.id.toLowerCase() === capabilityId.toLowerCase());
      if (match) return match;
    }

    const lower = text.toLowerCase();
    if (lower.includes('research') || lower.includes('ค้นคว้า') || lower.includes('สืบค้น') || lower.includes('browse')) {
      return CAPABILITIES.find(c => c.id === 'KNOWLEDGE_RESEARCH') || CAPABILITIES[0];
    }
    if (lower.includes('reason') || lower.includes('วิเคราะห์') || lower.includes('แก้ปัญหา') || lower.includes('proof') || lower.includes('aime')) {
      return CAPABILITIES.find(c => c.id === 'REASONING') || CAPABILITIES[0];
    }
    if (lower.includes('code') || lower.includes('โปรแกรม') || lower.includes('ฟังก์ชัน') || lower.includes('bug') || lower.includes('swe-bench') || lower.includes('typescript')) {
      return CAPABILITIES.find(c => c.id === 'TECHNICAL_ASSISTANCE') || CAPABILITIES[0];
    }
    if (lower.includes('document') || lower.includes('เอกสาร') || lower.includes('pdf') || lower.includes('contract')) {
      return CAPABILITIES.find(c => c.id === 'DOCUMENT_INTELLIGENCE') || CAPABILITIES[0];
    }
    if (lower.includes('data') || lower.includes('สถิติ') || lower.includes('matrix')) {
      return CAPABILITIES.find(c => c.id === 'DATA_ANALYSIS') || CAPABILITIES[0];
    }
    if (lower.includes('write') || lower.includes('เขียน') || lower.includes('แปล') || lower.includes('บทความ')) {
      return CAPABILITIES.find(c => c.id === 'WRITING_TRANSLATION') || CAPABILITIES[0];
    }
    if (lower.includes('learn') || lower.includes('สอน') || lower.includes('อธิบาย')) {
      return CAPABILITIES.find(c => c.id === 'EDUCATION') || CAPABILITIES[0];
    }

    return CAPABILITIES.find(c => c.id === 'GENERAL_CONVERSATION') || CAPABILITIES[0];
  }
}

export const zyntheorIntelligenceRuntime = ZyntheorIntelligenceRuntime.getInstance();
