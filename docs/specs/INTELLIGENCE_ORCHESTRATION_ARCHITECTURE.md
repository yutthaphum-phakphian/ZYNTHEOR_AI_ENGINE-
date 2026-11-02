# Intelligence Orchestration Architecture
**ZYNTHEOR AI ENGINE — Phase P8 Core Intelligence Advancement**

## 1. Architectural Overview

The **ZYNTHEOR Intelligence Orchestration Engine** provides a centralized, deterministic 12-step execution framework. It coordinates task classification, context retrieval, model routing, task planning, tool governance, result verification, and evidence synthesis.

```
+-------------------------------------------------------------------------------+
|                        ZYNTHEOR ORCHESTRATION ENGINE                          |
+-------------------------------------------------------------------------------+
  |  1. Receive Request & Initialize Workflow
  v
  |  2. Classify Task Type (SIMPLE_QUESTION vs MULTI_STEP / RESTRICTED)
  v
  |  3. Identify Intent & Objective
  v
  |  4. Determine Required Context & Token Budget
  v
  |  5. Retrieve Workspace Context + Code Graph Provenance
  v
  |  6. Select Model (Evaluates Capabilities, Local-Only, Consent)
  v
  |  7. Generate Structured Task Plan (9 Task States)
  v
  |  8. Request Required Tools
  v
  |  9. Validate Tool Permissions & Risk Tiers (LOW / MEDIUM / HIGH)
  v
  | 10. Execute Approved Operations (or Dry-Run Simulation)
  v
  | 11. Verify Results & Compute SHA-256 Evidence Hashes
  v
  | 12. Synthesize Evidence-Based Final Response
+-------------------------------------------------------------------------------+
```

---

## 2. 12-Step Execution Pipeline Detail

1. **`RECEIVE_REQUEST`**: Normalizes input parameters, sets execution timeout, attaches cancellation `AbortSignal`.
2. **`CLASSIFY_TASK`**: Analyzes prompt syntax and semantics to assign one of 8 task categories:
   - `SIMPLE_QUESTION`: Bypasses multi-step tool execution overhead for direct Q&A.
   - `TECHNICAL_EXPLANATION`: Architectural or code overview.
   - `CODE_GENERATION`: Generating new source files or components.
   - `DEBUGGING`: Analyzing stack traces or bug symptoms.
   - `WORKSPACE_ANALYSIS`: Reading file structures and dependencies.
   - `MULTI_STEP_TASK`: Complex multi-stage engineering request.
   - `TOOL_ASSISTED_TASK`: Explicit request for tool utilization.
   - `RESTRICTED_OPERATION`: High-risk system state modifications.
3. **`IDENTIFY_INTENT`**: Formulates target goal, language (Thai/English), and expected output format.
4. **`DETERMINE_REQUIRED_CONTEXT`**: Computes required workspace context budget and token limits.
5. **`RETRIEVE_WORKSPACE_INFO`**: Invokes `ContextManagementEngine` to retrieve relevance-scored file excerpts and code graph dependencies with line-level provenance.
6. **`SELECT_MODEL`**: Invokes `ModelRouter` evaluating local/remote policy (`ZYNTHEOR_LOCAL_ONLY`), context window size, latency, and user consent (`onlineConsent`).
7. **`GENERATE_TASK_PLAN`**: Constructs structured `TaskPlan` with 9 task states (`CREATED`, `ANALYZING`, `PLANNING`, `WAITING_FOR_APPROVAL`, `EXECUTING`, `VERIFYING`, `COMPLETED`, `FAILED`, `CANCELLED`).
8. **`REQUEST_TOOLS`**: Maps required tools from `ToolGovernanceEngine`.
9. **`VALIDATE_TOOL_PERMISSIONS`**: Checks tool risk tier (`LOW`, `MEDIUM`, `HIGH`). High-risk operations require explicit human authorization token; model self-approval is strictly forbidden.
10. **`EXECUTE_APPROVED_OPERATIONS`**: Executes authorized tool calls or simulates execution via Dry-Run mode with Audit Ledger logging.
11. **`VERIFY_RESULTS`**: Runs `ResultVerificationEngine` categorizing evidence under 5-tier taxonomy (`VERIFIED_FACT`, `MODEL_INTERPRETATION`, `HYPOTHESIS`, `UNVERIFIED_RESULT`, `FAILED_VERIFICATION`).
12. **`PRODUCE_FINAL_RESPONSE`**: Generates evidence-based response containing cryptographic SHA-256 evidence digests and explicit context provenance.

---

## 3. Integration & API Endpoints

- **Server Route**: `/api/intelligence/orchestrate`
- **Plan Preview Route**: `/api/intelligence/plan`
- **Class Reference**: `IntelligenceOrchestrationEngine` in `lib/intelligence-orchestrator.ts`
