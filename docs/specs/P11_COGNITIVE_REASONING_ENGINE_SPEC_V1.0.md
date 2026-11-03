# P11 — Cognitive Reasoning Engine Specification v1.0

**Status:** PROPOSED — not an implementation certificate  
**Phase:** P11

## 1. Objective

Deliver structured, inspectable reasoning that turns a request into a plan, evidence-backed conclusions, and a verified response.

## 2. Existing components to reuse

Reuse `lib/intelligence-orchestrator.ts`, `lib/intelligence-core.ts`, `src/services/crossFileReasoning.ts`, `src/services/projectContextEngine.ts`, and the existing result-verification services. Do not create a parallel orchestrator.

## 3. Scope

- Intent decomposition and explicit goal/constraint extraction.
- Planning with preconditions, dependencies, expected outputs, and risk tiers.
- Evidence retrieval with file/line provenance and confidence labels.
- Independent critique pass that searches for contradictions and missing evidence.
- Bounded reflection/replanning when verification fails.
- Response synthesis that separates verified facts, interpretations, hypotheses, and proposed actions.

## 4. Mandatory architecture and security contracts

- Reasoning state is serializable and versioned.
- Every factual claim references evidence IDs or is labeled unverified.
- Planning and execution are separate; reasoning cannot grant itself permissions.
- Maximum iteration, token, time, and tool-call budgets are enforced.
- Prompt-injection content from workspace files is treated as untrusted data.

## 5. Required verification

- Plan determinism for fixed inputs and context.
- Contradictory evidence and missing-context cases.
- Prompt-injection and tool-permission boundary cases.
- Budget exhaustion and cancellation.
- Claim-to-evidence traceability.

## 6. Exit criteria

- P11 benchmark suite passes with frozen fixtures.
- Every claim can be traced to evidence or marked as hypothesis.
- No tool execution occurs during plan-only mode.
- No permission escalation or false PASS path.

## 7. Release rule

The phase must remain `BLOCKED` or `NOT_VERIFIED` until its mandatory evidence is independently produced and checked. A source file, test name, static report, or manually entered status string is not sufficient evidence of runtime completion.
