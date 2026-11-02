# ZYNTHEOR INTELLIGENCE CORE — Architecture Specification

**Document Version**: 2.0.0 (Phase P2 Architecture)  
**Edition**: Sovereign Buffalo 0.16.0  

---

## 1. Executive Summary

The ZYNTHEOR Intelligence Core is the central reasoning and coordination engine of the ZYNTHEOR AI Engine. It unifies intent classification, project context retrieval, static code graph analysis, model routing, tool gateway execution, and cryptographic evidence hashing into a 7-stage deterministic workflow.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      7-STAGE INTELLIGENCE WORKFLOW                          │
│                                                                             │
│ 1. UNDERSTAND ──► 2. INSPECT ──► 3. PLAN ──► 4. ROUTE ──► 5. EXECUTE        │
│    (Intent)         (Context)     (Plan)      (Model)      (Tools/Gate)     │
│                                                                  │          │
│                                           7. RESPOND ◄── 6. VERIFY          │
│                                              (Evidence)     (SHA-256)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The 7-Stage Intelligence Workflow

1. **Understand**:
   - Classifies query intent into task categories (`software_dev`, `code_review`, `bug_analysis`, `ai_agent`, `prompt_forge`, `data_research`, `system_architecture`, `general`).
   - Resolves response language (`th` or `en`) independently from UI locale.

2. **Inspect**:
   - Identifies active workspace project ID (`workspaceId`).
   - Queries `projectContextEngine` for relevance-ranked code excerpts and metadata.
   - Retrieves `codeGraph` relationships for target symbols and imported files.

3. **Plan**:
   - Synthesizes a multi-step `ExecutionPlan`.
   - Assigns risk ratings (`LOW`, `MEDIUM`, `HIGH`) and classifies steps into read-only vs consequential operations.

4. **Route**:
   - Evaluates `ZYNTHEOR_LOCAL_ONLY` policy and explicit online consent.
   - Routes request to active model runtime (`Local Ollama (external, user-run)` or server-side cloud proxy).

5. **Execute**:
   - Executes authorized tools through `ToolGateway`.
   - Intercepts consequential operations at the **Human Approval Gate** (models are forbidden from self-approving).
   - Supports dry-run simulation generating confirmation tokens (`CONFIRM_...`).

6. **Verify**:
   - Calculates bit-exact SHA-256 digests for all raw tool outputs and evidence artifacts.
   - Verifies sequential audit hash chain (`verifyAuditHashChain`).

7. **Respond**:
   - Synthesizes a structured response clearly separating **VERIFIED** evidence from **PROPOSED** actions and **UNVERIFIED** assumptions.

---

## 3. Subsystem Interconnects

- **ToolGateway**: Enforces tool allowlist, argument validation schema, timeout abort signals, and human approval gates.
- **LocalInferenceCache**: File-backed and in-memory cache isolated per `workspaceId` to prevent redundant inference requests.
- **VerificationEngine**: Assigns `EvidenceStatus` (`VERIFIED`, `ASSUMPTION`, `PROPOSED`, `UNVERIFIED`) and generates SHA-256 evidence digests.
