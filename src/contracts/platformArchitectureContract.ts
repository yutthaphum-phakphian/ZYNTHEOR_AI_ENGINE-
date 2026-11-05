/**
 * ZYNTHEOR PRODUCT & PLATFORM ARCHITECTURE CONTRACT
 * ==================================================
 * Sovereign General Intelligence Platform
 *
 * The 6 Core Pillars:
 * 1. ZYNTHEOR INTELLIGENCE  — Central processing, intent recognition, adaptive reasoning, orchestration
 * 2. ZYNTHEOR CORE          — Proprietary AI model family (NATIVE, ADAPTED, DISTILLED)
 * 3. ZYNTHEOR KNOWLEDGE     — Knowledge retrieval, web research, document intelligence, truth grounding
 * 4. ZYNTHEOR MEMORY        — Context continuity, user preferences, workspace memory, vector database
 * 5. ZYNTHEOR CAPABILITIES  — 10 Canonical domains + Multimodal Input Channels (Voice, Image, Doc)
 * 6. ZYNTHEOR TRUST         — Security, permissions, human approval, sandbox, audit ledger, sovereign seal
 */

export interface PillarDefinition {
  id: 'INTELLIGENCE' | 'CORE' | 'KNOWLEDGE' | 'MEMORY' | 'CAPABILITIES' | 'TRUST';
  name: string;
  nameThai: string;
  role: string;
  subsystems: string[];
  status: 'IMPLEMENTED' | 'OPERATIONAL' | 'IN_DEVELOPMENT' | 'HARDENED';
}

export const ZYNTHEOR_PLATFORM_PILLARS: Record<string, PillarDefinition> = {
  INTELLIGENCE: {
    id: 'INTELLIGENCE',
    name: 'ZYNTHEOR INTELLIGENCE',
    nameThai: 'สมองกลางสำหรับประมวลผลและให้เหตุผล',
    role: 'Central reasoning, intent understanding, adaptive planning, parameter calibration, and execution orchestration.',
    subsystems: [
      'IntelligenceOrchestrationEngine (lib/intelligence-orchestrator.ts)',
      'AdaptiveReasoningEngine (lib/adaptive-reasoning.ts)',
      'TaskPlanningEngine (lib/intelligence-orchestrator.ts)',
      'ResultVerificationEngine (lib/intelligence-orchestrator.ts)',
      'IntentClassifier (src/lib/capabilityEngine.ts)',
    ],
    status: 'OPERATIONAL',
  },
  CORE: {
    id: 'CORE',
    name: 'ZYNTHEOR CORE',
    nameThai: 'ตระกูลโมเดลปัญญาประดิษฐ์ของตัวเอง',
    role: 'First-party model family with verifiable provenance and strict identity classification.',
    subsystems: [
      'NativeModelRuntime (lib/native-model-runtime.ts)',
      'ModelIdentityContract (src/contracts/modelIdentityContract.ts)',
      'ModelSovereigntyPolicy (src/contracts/modelSovereigntyPolicy.ts)',
      'NativeCPUPipeline (training/native_cpu/)',
      'ModelRegistry (training/registry/model_registry.json)',
    ],
    status: 'OPERATIONAL',
  },
  KNOWLEDGE: {
    id: 'KNOWLEDGE',
    name: 'ZYNTHEOR KNOWLEDGE',
    nameThai: 'ระบบความรู้ การค้นคว้า และทำความเข้าใจข้อมูล',
    role: 'Deep research, document understanding, web grounding, source verification, and knowledge indexing.',
    subsystems: [
      'InternetGateway (lib/internet-gateway.ts)',
      'RepositoryIntelligence (src/services/repositoryIntelligence.ts)',
      'CodeGraphService (src/services/codeGraph.ts)',
      'DocumentIntelligenceEngine (src/lib/capabilityEngine.ts)',
    ],
    status: 'OPERATIONAL',
  },
  MEMORY: {
    id: 'MEMORY',
    name: 'ZYNTHEOR MEMORY',
    nameThai: 'ความจำ บริบท และการเรียนรู้จากการใช้งาน',
    role: 'Maintains multi-session context, user preferences, workspace entities, and semantic vector recall.',
    subsystems: [
      'LongTermVectorMemoryService (src/services/vectorMemory.ts)',
      'WorkspaceMemoryService (src/services/workspaceMemory.ts)',
      'TaskMemoryStore (src/services/taskMemory.ts)',
      'TenantScopedStorage (src/services/tenantScopedStorage.ts)',
      'PostgresIdentitySchema (src/db/schema.ts)',
    ],
    status: 'OPERATIONAL',
  },
  CAPABILITIES: {
    id: 'CAPABILITIES',
    name: 'ZYNTHEOR CAPABILITIES',
    nameThai: 'ความสามารถเฉพาะด้านและเครื่องมือปฏิบัติงาน',
    role: '10 canonical intelligence domains accessible via multimodal Omni Composer.',
    subsystems: [
      'CapabilityEngine (src/lib/capabilityEngine.ts)',
      'VoiceIntelligenceInput (src/hooks/useVoiceIntelligenceInput.ts)',
      'MultimodalDocumentInput (src/components/MainChat.tsx)',
      'MultimodalVisionInput (src/components/MainChat.tsx)',
      'CrossFileReasoningEngine (src/services/crossFileReasoning.ts)',
    ],
    status: 'OPERATIONAL',
  },
  TRUST: {
    id: 'TRUST',
    name: 'ZYNTHEOR TRUST',
    nameThai: 'ความปลอดภัย การตรวจสอบ และการควบคุมโดยผู้ใช้',
    role: 'Permission management, human approval gates, execution containment, output verification, and audit ledger.',
    subsystems: [
      'AuditLedgerService (src/services/auditLedger.ts)',
      'SafeExecutorContainment (src/services/safeExecutor.ts)',
      'RepairGovernanceService (src/services/repairGovernanceService.ts)',
      'ProductionGuard (src/services/productionGuard.ts)',
      'OnlinePolicyGuard (src/services/onlinePolicyGuard.ts)',
      'TruthKernel (lib/truth-kernel.ts)',
    ],
    status: 'HARDENED',
  },
};

/**
 * ZYNTHEOR PRODUCT CONSTITUTION
 * 10 Non-Negotiable Core Rules
 */
export const ZYNTHEOR_PRODUCT_CONSTITUTION = [
  {
    number: 1,
    title: 'Not a Chatbot',
    titleThai: 'ไม่จำกัดตัวเองอยู่แค่การสนทนา',
    rule: 'ZYNTHEOR is a general-purpose sovereign intelligence workspace supporting research, reasoning, document intelligence, and multi-step execution.',
  },
  {
    number: 2,
    title: 'First-Party Intelligence',
    titleThai: 'พัฒนา Intelligence และ CORE เป็นของตัวเอง',
    rule: 'Own the reasoning engine, model architecture, memory layers, and execution pipelines.',
  },
  {
    number: 3,
    title: 'Universal Capabilities',
    titleThai: 'รองรับงานทั่วไป ไม่จำกัดเฉพาะงานเขียนโค้ด',
    rule: 'Support 10 canonical domains without devolving into a coding-only or dashboard-only tool.',
  },
  {
    number: 4,
    title: 'Unified Intelligence',
    titleThai: 'ทุกความสามารถใช้ Intelligence Runtime ร่วมกัน',
    rule: 'All input modalities (voice, document, image, text) route through the shared central Intelligence Core.',
  },
  {
    number: 5,
    title: 'No Fake Intelligence',
    titleThai: 'ไม่ใช้ Mock หรือกฎตายตัวมาแอบอ้างว่าเป็น AI Model',
    rule: 'Never disguise deterministic logic as a neural language model. Always state exact model classification.',
  },
  {
    number: 6,
    title: 'Model Transparency',
    titleThai: 'เปิดเผยว่าใช้โมเดลใดและมีสถานะอะไร',
    rule: 'Strictly distinguish CORE_NATIVE, CORE_ADAPTED, CORE_DISTILLED, and EXTERNAL_MODEL_PROVIDER. External models are never labeled as CORE.',
  },
  {
    number: 7,
    title: 'User Sovereignty',
    titleThai: 'ผู้ใช้ควบคุมข้อมูล ความจำ และการเชื่อมต่อได้',
    rule: 'The user has absolute control over local-only mode, network egress, memory retention, and data deletion.',
  },
  {
    number: 8,
    title: 'Security First',
    titleThai: 'ทุกการดำเนินการสำคัญต้องมีการควบคุมสิทธิ์',
    rule: 'High-risk operations and Tier 4 critical reasoning require human approval gates and fail-closed state machines.',
  },
  {
    number: 9,
    title: 'Evidence-Based Verification',
    titleThai: 'ผลการทดสอบต้องสะท้อนสิ่งที่ทดสอบจริง',
    rule: 'Maintain cryptographic evidence digests and test artifacts. Differentiate Implemented, Tested, Verified, and Production Ready.',
  },
  {
    number: 10,
    title: 'Continuous Intelligence Development',
    titleThai: 'พัฒนาความสามารถของระบบอย่างต่อเนื่อง',
    rule: 'Systematically advance from rule-based and adapted cognition toward verified sovereign native neural models.',
  },
];

/**
 * 6 GLOBAL COMPETITION ARENAS
 */
export const GLOBAL_COMPETITION_ARENAS = [
  {
    domain: 'Intelligence',
    domainThai: 'ความฉลาดและการแก้ปัญหาซับซ้อน',
    requirement: 'Understand, plan, and solve deep, complex real-world problems with high accuracy.',
  },
  {
    domain: 'Knowledge',
    domainThai: 'การค้นคว้าและสืบค้นความรู้สดทั่วโลก',
    requirement: 'Online-first live research, source validation, and verifiable provenance hashing.',
  },
  {
    domain: 'Reasoning',
    domainThai: 'การคิดวิเคราะห์อย่างมีเหตุผลตามโจทย์',
    requirement: 'Multi-tiered adaptive reasoning with calibrated temperature and chain-of-thought depth.',
  },
  {
    domain: 'Multimodal',
    domainThai: 'การเข้าใจข้อมูลรอบด้าน (เสียง ข้อความ ภาพ เอกสาร)',
    requirement: 'Seamless unified processing of speech, vision, documents, and code through one core.',
  },
  {
    domain: 'Agentic Capabilities',
    domainThai: 'ความสามารถของเอเจนต์ในการดำเนินงานจนสำเร็จ',
    requirement: 'Governed multi-step execution with fail-closed containment and human approval gates.',
  },
  {
    domain: 'Model Ownership',
    domainThai: 'การเป็นเจ้าของตระกูลโมเดลและการพัฒนาต่อเนื่อง',
    requirement: 'First-party model lineage (CORE_NATIVE, CORE_ADAPTED) with complete transparency.',
  },
];

/**
 * 5 DIFFERENTIATING STRENGTHS
 */
export const DIFFERENTIATING_STRENGTHS = [
  {
    name: 'Unified Intelligence',
    description: 'All capabilities operate through one central cognitive runtime, not fragmented silos.',
  },
  {
    name: 'Online-First',
    description: 'Leverages global internet intelligence, live grounding, and cloud scaling by default.',
  },
  {
    name: 'Sovereign Architecture',
    description: 'First-party ownership and control over data, memory, routing, and execution gates.',
  },
  {
    name: 'Continuous Evolution',
    description: 'Modular extensibility allowing upgrades without breaking pre-existing architectures.',
  },
  {
    name: 'Evidence-Based Intelligence',
    description: 'Digital cryptographic proof for factuality, provenance, and honest limitation disclosure.',
  },
];

/**
 * THE 3-QUESTION DECISION FILTER
 * Every phase, feature, or PR must pass these 3 questions:
 */
export const DECISION_FILTER_QUESTIONS = [
  'เพิ่มความฉลาดหรือความสามารถจริงหรือไม่? (Does it tangibly advance real intelligence or capabilities?)',
  'ทำให้ผลิตภัณฑ์แข่งขันได้มากขึ้นหรือไม่? (Does it measurably strengthen our global competitive edge?)',
  'สร้างความได้เปรียบระยะยาวให้ ZYNTHEOR หรือไม่? (Does it build enduring, sovereign advantage for ZYNTHEOR?)',
];

