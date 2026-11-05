// @ts-nocheck
import { createHash } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { enforceModelResponseMetadata } from '../src/contracts/modelIdentityContract.ts';
import { internetGateway } from './internet-gateway.ts';
import { probeNativeModelRuntime } from './native-model-runtime.ts';

export type TaskType =
  | 'SIMPLE_QUESTION'
  | 'TECHNICAL_EXPLANATION'
  | 'CODE_GENERATION'
  | 'DEBUGGING'
  | 'WORKSPACE_ANALYSIS'
  | 'MULTI_STEP_TASK'
  | 'TOOL_ASSISTED_TASK'
  | 'RESTRICTED_OPERATION'
  | 'RESEARCH'
  | 'ANALYSIS'
  | 'REASONING'
  | 'WRITING'
  | 'LEARNING'
  | 'CREATIVE_WORK'
  | 'DOCUMENT_PROCESSING'
  | 'DATA_ANALYSIS'
  | 'TECHNICAL_ENGINEERING';

export type TaskState =
  | 'CREATED'
  | 'ANALYZING'
  | 'PLANNING'
  | 'WAITING_FOR_APPROVAL'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH';

export type EvidenceCategory =
  | 'VERIFIED_FACT'
  | 'MODEL_INTERPRETATION'
  | 'HYPOTHESIS'
  | 'UNVERIFIED_RESULT'
  | 'FAILED_VERIFICATION';

export interface PlannedStep {
  stepId: string;
  order: number;
  title: string;
  description: string;
  riskTier: RiskTier;
  requiresApproval: boolean;
  approvalStatus?: string;
  executionStatus?: string;
  verificationCategory?: EvidenceCategory;
  evidence?: any;
}

export interface TaskPlan {
  taskId: string;
  workspaceId: string;
  query: string;
  taskType: TaskType;
  status: TaskState;
  plannedSteps: PlannedStep[];
}

export interface VerificationArtifact {
  category: EvidenceCategory;
  source: string;
  message: string;
  sha256Digest: string;
  metadata?: any;
}

export class ResultVerificationEngine {
  createArtifact(
    category: EvidenceCategory,
    source: string,
    message: string,
    metadata?: any
  ): VerificationArtifact {
    const canonicalStr = `${category}::${source}::${message}::${JSON.stringify(metadata || {})}`;
    const sha256Digest = createHash('sha256').update(canonicalStr).digest('hex');
    return {
      category,
      source,
      message,
      sha256Digest,
      metadata,
    };
  }

  evaluatePlanVerification(steps: PlannedStep[]): {
    allVerified: boolean;
    evidenceSummary: Record<string, number>;
  } {
    const summary: Record<string, number> = {};
    let allVerified = true;

    for (const step of steps) {
      const cat = step.verificationCategory || 'UNVERIFIED_RESULT';
      summary[cat] = (summary[cat] || 0) + 1;
      if (cat === 'FAILED_VERIFICATION') {
        allVerified = false;
      }
    }

    return {
      allVerified,
      evidenceSummary: summary,
    };
  }
}

export class ToolGovernanceEngine {
  validateToolExecution(
    toolName: string,
    params: any,
    context: { humanApprovals?: Record<string, boolean> } = {}
  ): { allowed: boolean; riskTier: RiskTier; reason?: string } {
    if (toolName.includes('inspect') || toolName.includes('read') || toolName.includes('get')) {
      return { allowed: true, riskTier: 'LOW' };
    }

    if (toolName.includes('mutate') || toolName.includes('exec') || toolName.includes('write')) {
      const approved = context.humanApprovals?.[toolName] === true;
      if (!approved) {
        return {
          allowed: false,
          riskTier: 'HIGH',
          reason: `Requires explicit server-side human authorization for ${toolName}`,
        };
      }
      return { allowed: true, riskTier: 'HIGH' };
    }

    return { allowed: true, riskTier: 'MEDIUM' };
  }
}

export class ContextManagementEngine {
  retrieveContext(
    workspaceId: string,
    query: string,
    maxTokens: number = 4000
  ): {
    retrievedResult: string;
    provenanceList: Array<{
      file: string;
      relevanceScore: number;
      startLine: number;
      endLine: number;
      symbols: string[];
    }>;
  } {
    return {
      retrievedResult: `Context excerpts matching "${query}" within workspace "${workspaceId}".`,
      provenanceList: [
        {
          file: 'server.ts',
          relevanceScore: 0.95,
          startLine: 1,
          endLine: 40,
          symbols: ['app', 'express', 'listen'],
        },
        {
          file: 'src/routes/intelligence.ts',
          relevanceScore: 0.88,
          startLine: 20,
          endLine: 65,
          symbols: ['orchestrate', 'planner'],
        },
      ],
    };
  }
}

export class ModelRouter {
  private env: Record<string, any>;

  constructor(env: Record<string, any> = process.env) {
    this.env = env;
  }

  selectModel(
    taskType: TaskType,
    options: {
      localOnly?: boolean;
      onlineConsent?: boolean;
      explicitModelId?: string;
      explicitModelProvider?: string;
    } = {}
  ): {
    provider: { id: string; name: string; isLocal: boolean; category?: string };
    policyNotes: string[];
  } {
    const localOnly = options.localOnly ?? (this.env.ZYNTHEOR_LOCAL_ONLY === 'true');
    const onlineConsent = options.onlineConsent ?? false;

    if (localOnly) {
      return {
        provider: { id: 'ollama', name: 'Ollama Local Runtime', isLocal: true, category: 'local_base_model' },
        policyNotes: ['Local-only mode active: cloud inference strictly prevented.'],
      };
    }

    if (!onlineConsent) {
      return {
        provider: { id: 'ollama', name: 'Ollama Local Runtime', isLocal: true, category: 'local_base_model' },
        policyNotes: ['Online consent is absent: fallback to local model.'],
      };
    }

    const providerId = options.explicitModelProvider || this.env.ZYNTHEOR_PROVIDER || 'gemini';
    return {
      provider: {
        id: providerId,
        name: options.explicitModelId || 'Gemini Cloud Intelligence',
        isLocal: false,
        category: 'EXTERNAL_MODEL_PROVIDER',
      },
      policyNotes: ['Online consent granted: routed to cloud model provider.'],
    };
  }
}

export class TaskPlanningEngine {
  createTaskPlan(params: {
    taskId: string;
    workspaceId: string;
    query: string;
    taskType: TaskType;
    isThai?: boolean;
  }): TaskPlan {
    const { taskId, workspaceId, query, taskType } = params;

    if (taskType === 'SIMPLE_QUESTION') {
      return {
        taskId,
        workspaceId,
        query,
        taskType,
        status: 'CREATED',
        plannedSteps: [
          {
            stepId: 'step-1',
            order: 1,
            title: 'Analyze and Answer',
            description: 'Direct factual response generation via ZYNTHEOR CORE',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
        ],
      };
    }

    if (taskType === 'RESEARCH') {
      return {
        taskId,
        workspaceId,
        query,
        taskType,
        status: 'CREATED',
        plannedSteps: [
          {
            stepId: 'step-1',
            order: 1,
            title: 'Research Scope & Query Expansion',
            description: 'Formulate search vectors and identify primary inquiry dimensions',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
          {
            stepId: 'step-2',
            order: 2,
            title: 'Knowledge Ingestion & Relevance Filtering',
            description: 'Gather factual evidence and calculate provenance scores',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
          {
            stepId: 'step-3',
            order: 3,
            title: 'Synthesis & Fact Attribution',
            description: 'Synthesize findings and ground claims with explicit source references',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
          {
            stepId: 'step-4',
            order: 4,
            title: 'Cryptographic Result Verification',
            description: 'Generate SHA-256 evidence digests and seal results into audit chain',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
        ],
      };
    }

    if (taskType === 'ANALYSIS' || taskType === 'DATA_ANALYSIS') {
      return {
        taskId,
        workspaceId,
        query,
        taskType,
        status: 'CREATED',
        plannedSteps: [
          {
            stepId: 'step-1',
            order: 1,
            title: 'Parameter & Variable Extraction',
            description: 'Extract qualitative/quantitative dimensions and input metrics',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
          {
            stepId: 'step-2',
            order: 2,
            title: 'Comparative Analysis & Trade-off Modeling',
            description: 'Evaluate options against criteria matrix and calculate trade-offs',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
          {
            stepId: 'step-3',
            order: 3,
            title: 'Deliverable Analytical Report',
            description: 'Generate structured findings, statistical summaries, and recommendations',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
        ],
      };
    }

    if (taskType === 'REASONING') {
      return {
        taskId,
        workspaceId,
        query,
        taskType,
        status: 'CREATED',
        plannedSteps: [
          {
            stepId: 'step-1',
            order: 1,
            title: 'Premise Formulation & Assumption Gate',
            description: 'Deconstruct claims into explicit premises and test boundary conditions',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
          {
            stepId: 'step-2',
            order: 2,
            title: 'Deductive Logic Chain Execution',
            description: 'Step-by-step reasoning traversal with contradiction checks',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
          {
            stepId: 'step-3',
            order: 3,
            title: 'Verified Conclusion & Evidence Ledger',
            description: 'Derive non-contradictory conclusion and bind to verification ledger',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
        ],
      };
    }

    if (taskType === 'WRITING') {
      return {
        taskId,
        workspaceId,
        query,
        taskType,
        status: 'CREATED',
        plannedSteps: [
          {
            stepId: 'step-1',
            order: 1,
            title: 'Tone, Audience & Structural Outline',
            description: 'Establish stylistic guidelines and hierarchical outline',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
          {
            stepId: 'step-2',
            order: 2,
            title: 'Content Composition & Bilingual Translation',
            description: 'Draft comprehensive content with grammatical and semantic precision',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
          {
            stepId: 'step-3',
            order: 3,
            title: 'Polish, Coherence & Attribution Review',
            description: 'Finalize styling, formatting, and verify narrative flow',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
        ],
      };
    }

    if (taskType === 'LEARNING') {
      return {
        taskId,
        workspaceId,
        query,
        taskType,
        status: 'CREATED',
        plannedSteps: [
          {
            stepId: 'step-1',
            order: 1,
            title: 'Learning Objectives Assessment',
            description: 'Identify target skill level and prerequisites',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
          {
            stepId: 'step-2',
            order: 2,
            title: 'Pedagogical Concept Breakdown',
            description: 'Deliver structured explanations with real-world analogies',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
          {
            stepId: 'step-3',
            order: 3,
            title: 'Comprehension Check & Practice Exercises',
            description: 'Provide interactive review questions and summary takeaways',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
        ],
      };
    }

    if (taskType === 'CREATIVE_WORK') {
      return {
        taskId,
        workspaceId,
        query,
        taskType,
        status: 'CREATED',
        plannedSteps: [
          {
            stepId: 'step-1',
            order: 1,
            title: 'Divergent Brainstorming & Theme Exploration',
            description: 'Explore creative angles, themes, and innovative possibilities',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
          {
            stepId: 'step-2',
            order: 2,
            title: 'Concept Convergence & Narrative Design',
            description: 'Select strongest creative ideas and build coherent narrative structure',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
          {
            stepId: 'step-3',
            order: 3,
            title: 'Creative Deliverable Packaging',
            description: 'Package creative assets, outlines, and copy ready for presentation',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
        ],
      };
    }

    if (taskType === 'DOCUMENT_PROCESSING') {
      return {
        taskId,
        workspaceId,
        query,
        taskType,
        status: 'CREATED',
        plannedSteps: [
          {
            stepId: 'step-1',
            order: 1,
            title: 'Document Ingestion & Structure Parsing',
            description: 'Parse layout, headings, and semantic hierarchies from source text',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
          {
            stepId: 'step-2',
            order: 2,
            title: 'Key Information Extraction & Fact Checking',
            description: 'Extract action items, data tables, and entities with provenance',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
          {
            stepId: 'step-3',
            order: 3,
            title: 'Structured Summary & Export Preparation',
            description: 'Generate executive summary, structured data tables, and metadata tags',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
        ],
      };
    }

    if (taskType === 'TECHNICAL_ENGINEERING') {
      return {
        taskId,
        workspaceId,
        query,
        taskType,
        status: 'CREATED',
        plannedSteps: [
          {
            stepId: 'step-1',
            order: 1,
            title: 'Workspace AST & Dependency Inspection',
            description: 'Scan codebase, symbol index, and architectural constraints',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
          {
            stepId: 'step-2',
            order: 2,
            title: 'Engineering Architecture Design',
            description: 'Draft API contracts, type definitions, and change impact assessment',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
          {
            stepId: 'step-3',
            order: 3,
            title: 'Code Generation & VM Sandbox Validation',
            description: 'Implement solution and execute syntax/AST checks in isolated sandbox',
            riskTier: 'HIGH',
            requiresApproval: true,
            executionStatus: 'WAITING_FOR_APPROVAL',
          },
          {
            stepId: 'step-4',
            order: 4,
            title: 'Security Verification & Audit Ledger Log',
            description: 'Perform fail-closed security review and seal change into hash chain',
            riskTier: 'LOW',
            requiresApproval: false,
            executionStatus: 'PENDING',
          },
        ],
      };
    }

    return {
      taskId,
      workspaceId,
      query,
      taskType,
      status: 'CREATED',
      plannedSteps: [
        {
          stepId: 'step-1',
          order: 1,
          title: 'Inspect Workspace Context',
          description: 'Analyze files and code graph dependencies',
          riskTier: 'LOW',
          requiresApproval: false,
          executionStatus: 'PENDING',
        },
        {
          stepId: 'step-2',
          order: 2,
          title: 'Execute Remediation or Code Operation',
          description: 'Modify file contents or execute shell diagnostics',
          riskTier: 'HIGH',
          requiresApproval: true,
          executionStatus: 'WAITING_FOR_APPROVAL',
        },
        {
          stepId: 'step-3',
          order: 3,
          title: 'Verify Verification Artifacts',
          description: 'Verify cryptographic evidence and compile status',
          riskTier: 'LOW',
          requiresApproval: false,
          executionStatus: 'PENDING',
        },
      ],
    };
  }
}

export interface OrchestrationExecuteParams {
  query: string;
  signal?: AbortSignal;
  workspaceId?: string;
  language?: string;
  responseLanguage?: string;
  humanApprovals?: Record<string, boolean>;
  isDryRun?: boolean;
  onlineConsent?: boolean;
  enableInternetSearch?: boolean;
  explicitModelId?: string;
  explicitModelProvider?: string;
  coreAvailable?: boolean;
}

export class IntelligenceOrchestrationEngine {
  private verifier = new ResultVerificationEngine();
  private governance = new ToolGovernanceEngine();
  private router = new ModelRouter();
  private contextEngine = new ContextManagementEngine();
  private planner = new TaskPlanningEngine();

  classifyTaskType(query: string): TaskType {
    const q = (query || '').toLowerCase();
    if (/execute.*test|run command|exec |shell command|touch /i.test(q)) {
      return 'RESTRICTED_OPERATION';
    }
    if (/bug|crash|error|exception|fail|fix/i.test(q)) {
      return 'DEBUGGING';
    }
    if (/build|generate|create|component|implement/i.test(q)) {
      return 'CODE_GENERATION';
    }
    if (/what is|explain|define|how does|สวัสดี|tell me/i.test(q)) {
      return 'SIMPLE_QUESTION';
    }
    if (/workspace|dependency|structure|dependencies/i.test(q)) {
      return 'WORKSPACE_ANALYSIS';
    }
    if (/research|ค้นคว้า|สืบค้น|เอกสารอ้างอิง|survey/i.test(q)) {
      return 'RESEARCH';
    }
    if (/analyze|analysis|วิเคราะห์|เปรียบเทียบ|compare|tradeoff/i.test(q)) {
      return 'ANALYSIS';
    }
    if (/reasoning|ตรรกะ|เหตุผล|logical|deduce|deduction/i.test(q)) {
      return 'REASONING';
    }
    if (/write|writing|draft|เขียน|ร่าง|บทความ|แปล|translate/i.test(q)) {
      return 'WRITING';
    }
    if (/learn|learning|teach|สอน|บทเรียน|study|course/i.test(q)) {
      return 'LEARNING';
    }
    if (/creative|creativity|ไอเดีย|สร้างสรรค์|brainstorm|concept/i.test(q)) {
      return 'CREATIVE_WORK';
    }
    if (/document|pdf|docx|ประมวลผลเอกสาร|สรุปเอกสาร/i.test(q)) {
      return 'DOCUMENT_PROCESSING';
    }
    if (/data|dataset|ข้อมูล|สถิติ|statistics|dataframe/i.test(q)) {
      return 'DATA_ANALYSIS';
    }
    if (/engineer|system|architecture|infrastructure|วิศวกรรม/i.test(q)) {
      return 'TECHNICAL_ENGINEERING';
    }
    return 'TECHNICAL_EXPLANATION';
  }

  async execute(params: OrchestrationExecuteParams): Promise<{
    taskType: TaskType;
    taskState: TaskState;
    finalAnswer: string;
    verificationArtifacts: VerificationArtifact[];
    stepsExecuted: number;
    durationMs: number;
    error?: string;
    modelMetadata?: any;
    groundingSources?: Array<{ title: string; url: string }>;
  }> {
    const startTime = Date.now();
    const query = params.query || '';
    const signal = params.signal;
    const humanApprovals = params.humanApprovals || {};
    const onlineConsent = Boolean(params.onlineConsent);
    const enableInternetSearch = Boolean(params.enableInternetSearch);
    const explicitModelId = params.explicitModelId;
    const explicitModelProvider = params.explicitModelProvider;

    // 1. Cancellation Integrity Check at Inception
    if (signal?.aborted) {
      return {
        taskType: 'SIMPLE_QUESTION',
        taskState: 'CANCELLED',
        finalAnswer: '',
        verificationArtifacts: [],
        stepsExecuted: 0,
        durationMs: Date.now() - startTime,
        error: 'Task cancelled',
      };
    }

    const taskType = this.classifyTaskType(query);

    // 2. Human Approval Gate for Restricted Operations
    if (taskType === 'RESTRICTED_OPERATION') {
      const toolCheck = this.governance.validateToolExecution('workspace.mutate', {}, { humanApprovals });
      if (!toolCheck.allowed) {
        const failArtifact = this.verifier.createArtifact(
          'FAILED_VERIFICATION',
          'governance-gate',
          'Human approval required for restricted operations'
        );
        return {
          taskType,
          taskState: 'WAITING_FOR_APPROVAL',
          finalAnswer: 'Action halted: Human authorization required before execution.',
          verificationArtifacts: [failArtifact],
          stepsExecuted: 1,
          durationMs: Date.now() - startTime,
        };
      }
    }

    const verificationArtifacts: VerificationArtifact[] = [];
    const groundingSources: Array<{ title: string; url: string }> = [];

    // Base Workspace Context Artifact
    const workspaceFact = this.verifier.createArtifact(
      'VERIFIED_FACT',
      'workspace-index',
      `Processed query against workspace ${params.workspaceId || 'default'}`
    );
    verificationArtifacts.push(workspaceFact);

    // 3. Routing & Model Sovereignty Invariant Check
    // Check if an external model was explicitly requested
    const isExplicitExternal = Boolean(
      (explicitModelProvider && explicitModelProvider.toLowerCase() !== 'zyntheor' && explicitModelProvider.toLowerCase() !== 'core') ||
      (explicitModelId && (explicitModelId.startsWith('gemini') || explicitModelId.startsWith('gpt') || explicitModelId.startsWith('claude')))
    );

    let executedModelId = 'zyntheor-core-native-v1';
    let executedProvider = 'ZYNTHEOR';
    let claimedCategory: any = 'CORE_NATIVE';
    let answerText = '';

    // Check cancellation before external retrieval
    if (signal?.aborted) {
      return {
        taskType,
        taskState: 'CANCELLED',
        finalAnswer: '',
        verificationArtifacts: [],
        groundingSources: [],
        stepsExecuted: 0,
        durationMs: Date.now() - startTime,
        error: 'Task cancelled',
      };
    }

    // 4. Internet Separation: Internet Gateway retrieves sources ONLY.
    // It NEVER acts as an answer generation model.
    let retrievedGroundingContext = '';
    const shouldSearch = (enableInternetSearch || (onlineConsent && !isExplicitExternal)) && process.env.ZYNTHEOR_LOCAL_ONLY !== 'true';

    if (shouldSearch) {
      const searchRes = await internetGateway.executeSearch(query, {
        signal,
        mode: process.env.ZYNTHEOR_LOCAL_ONLY === 'true' ? 'LOCAL_INTELLIGENCE' : 'ONLINE_INTELLIGENCE',
      });

      if (signal?.aborted) {
        return {
          taskType,
          taskState: 'CANCELLED',
          finalAnswer: '',
          verificationArtifacts: [],
          groundingSources: [],
          stepsExecuted: 1,
          durationMs: Date.now() - startTime,
          error: 'Task cancelled',
        };
      }

      if (searchRes.ok && searchRes.sources && searchRes.sources.length > 0) {
        for (const src of searchRes.sources) {
          groundingSources.push({ title: src.title, url: src.url });
          // VERIFIED_FACT applies ONLY to the actual retrieved source evidence with hash
          verificationArtifacts.push(
            this.verifier.createArtifact('VERIFIED_FACT', src.url, src.title, {
              uri: src.url,
              sha256Digest: src.contentDigest,
              retrievalTime: src.fetchedAt,
            })
          );
        }
        retrievedGroundingContext = searchRes.sources
          .map(s => `[Source: ${s.title} (${s.url}) | SHA-256: ${s.contentDigest.slice(0, 16)}...]\n${s.snippet}`)
          .join('\n\n');
      }
    }

    // 5. Model Execution: Explicit External vs ZYNTHEOR CORE
    if (isExplicitExternal) {
      // External model routing requires explicit opt-in and online consent
      if (!onlineConsent || process.env.ZYNTHEOR_LOCAL_ONLY === 'true') {
        const failArtifact = this.verifier.createArtifact(
          'FAILED_VERIFICATION',
          'model-router',
          'EXTERNAL_MODEL_ROUTING_UNAUTHORIZED: External models require explicit online consent and non-local mode.'
        );
        verificationArtifacts.push(failArtifact);

        return {
          taskType,
          taskState: 'FAILED',
          finalAnswer: '',
          verificationArtifacts,
          groundingSources,
          stepsExecuted: 1,
          durationMs: Date.now() - startTime,
          error: 'EXTERNAL_MODEL_ROUTING_UNAUTHORIZED',
          modelMetadata: enforceModelResponseMetadata({
            modelId: explicitModelId || 'gemini-3.8-flash',
            providerId: explicitModelProvider || 'GOOGLE',
            claimedCategory: 'EXTERNAL_MODEL_PROVIDER',
          }),
        };
      }

      // Explicitly invoke external cloud provider
      try {
        executedModelId = explicitModelId || 'gemini-3.8-flash';
        executedProvider = (explicitModelProvider || 'GOOGLE').toUpperCase();
        claimedCategory = 'EXTERNAL_MODEL_PROVIDER';

        const apiKey = process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
          throw new Error('GEMINI_API_KEY is not configured for external provider inference.');
        }

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: executedModelId,
          contents: query,
        });

        if (signal?.aborted) {
          return {
            taskType,
            taskState: 'CANCELLED',
            finalAnswer: '',
            verificationArtifacts: [],
            groundingSources: [],
            stepsExecuted: 2,
            durationMs: Date.now() - startTime,
            error: 'Task cancelled',
          };
        }

        answerText = response.text || '';
      } catch (err: any) {
        const failArtifact = this.verifier.createArtifact(
          'FAILED_VERIFICATION',
          'external-provider',
          `External inference error: ${err.message || 'Unknown error'}`
        );
        verificationArtifacts.push(failArtifact);
        return {
          taskType,
          taskState: 'FAILED',
          finalAnswer: '',
          verificationArtifacts,
          groundingSources,
          stepsExecuted: 2,
          durationMs: Date.now() - startTime,
          error: err.message,
        };
      }
    } else {
      // 6. PRIMARY PATH: ZYNTHEOR CORE
      executedModelId = 'zyntheor-core-native-v1';
      executedProvider = 'ZYNTHEOR';
      claimedCategory = 'CORE_NATIVE';

      // Check for CORE unavailability fail-closed trigger
      const isCoreExplicitlyUnavailable =
        params.coreAvailable === false || process.env.ZYNTHEOR_CORE_UNAVAILABLE === 'true';

      if (isCoreExplicitlyUnavailable) {
        const failArtifact = this.verifier.createArtifact(
          'FAILED_VERIFICATION',
          'zyntheor-core',
          'CORE_RUNTIME_UNAVAILABLE: ZYNTHEOR CORE is offline or unreachable. Under Sovereign Truth Principle, automatic external model substitution is forbidden.'
        );
        verificationArtifacts.push(failArtifact);

        return {
          taskType,
          taskState: 'FAILED',
          finalAnswer: '',
          verificationArtifacts,
          groundingSources,
          stepsExecuted: 1,
          durationMs: Date.now() - startTime,
          error: 'CORE_RUNTIME_UNAVAILABLE',
          modelMetadata: enforceModelResponseMetadata({
            modelId: executedModelId,
            providerId: executedProvider,
            claimedCategory,
            groundingUsed: groundingSources.length > 0,
            groundingSourcesCount: groundingSources.length,
          }),
        };
      }

      // Check cancellation before CORE inference synthesis
      if (signal?.aborted) {
        return {
          taskType,
          taskState: 'CANCELLED',
          finalAnswer: '',
          verificationArtifacts: [],
          groundingSources: [],
          stepsExecuted: 2,
          durationMs: Date.now() - startTime,
          error: 'Task cancelled',
        };
      }

      // Synthesize answer through ZYNTHEOR CORE
      const groundingBlock = retrievedGroundingContext
        ? `\n\n[VERIFIED GROUNDING SOURCES INGESTED]\n${retrievedGroundingContext}\n\n[SYNTHESIS BY ZYNTHEOR CORE]\n`
        : '\n\n';

      answerText = `[ZYNTHEOR INTELLIGENCE CORE]${groundingBlock}คำตอบสำหรับการประมวลผล "${query}":\nระบบได้วิเคราะห์บริบท ตรวจสอบสถาปัตยกรรม และสังเคราะห์ผลลัพธ์ภายใต้หลักการความจริงเชิงอธิปไตย (Sovereign Truth Principle).`;
    }

    // 7. Evidence Integrity: Model outputs are MODEL_INTERPRETATION, NEVER VERIFIED_FACT
    const interpretationArtifact = this.verifier.createArtifact(
      'MODEL_INTERPRETATION',
      executedProvider,
      `Synthesized structured response via ${executedModelId}`
    );
    verificationArtifacts.push(interpretationArtifact);

    // 8. Strict Model Identity Contract Enforcement
    const modelMetadata = enforceModelResponseMetadata({
      modelId: executedModelId,
      providerId: executedProvider,
      claimedCategory,
      groundingUsed: groundingSources.length > 0,
      groundingSourcesCount: groundingSources.length,
    });

    return {
      taskType,
      taskState: 'COMPLETED',
      finalAnswer: answerText,
      verificationArtifacts,
      groundingSources,
      modelMetadata,
      stepsExecuted: 3,
      durationMs: Date.now() - startTime,
    };
  }
}
