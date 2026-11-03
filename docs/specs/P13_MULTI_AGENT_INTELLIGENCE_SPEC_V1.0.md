# P13 — Multi-Agent Intelligence Specification v1.0

**Status:** PROPOSED — not an implementation certificate  
**Phase:** P13

## 1. Objective

Coordinate specialized agents through a bounded, observable, fault-tolerant task graph without bypassing security controls.

## 2. Existing components to reuse

Reuse `src/server/MultiAgentOrchestrator.ts`, `src/server/AgentOrchestrator.ts`, `src/agents/*`, `src/core/TaskGraph`, `src/services/ExecutionGateway.ts`, `SandboxAdapter`, and `AuditLedger`. Audit direct provider-key access in the current orchestrator and route all model calls through the consent-aware Model Router.

## 3. Scope

- Typed agent roles and capability declarations.
- DAG planning, dependency scheduling, task leases, retries, and idempotency.
- Shared context with tenant/workspace scope and evidence references.
- Agent-to-agent messages with schema validation and provenance.
- Consensus or review policies for high-impact conclusions.
- Cancellation, timeout, retry budgets, dead-letter handling, and emergency stop.

## 4. Mandatory architecture and security contracts

- Agents cannot create permissions or approve their own actions.
- All mutating tools use ExecutionGateway and human approval.
- Agent model calls use the centralized provider router; no direct API-key bypass.
- Task leases prevent duplicate concurrent execution.
- Agent output is untrusted until independently verified.

## 5. Required verification

- Duplicate task/retry idempotency.
- Agent failure and recovery.
- Cross-tenant context isolation.
- Direct provider bypass detection.
- Approval bypass and emergency-stop tests.
- DAG cycle/deadlock and timeout tests.

## 6. Exit criteria

- Multi-agent workflow completes under bounded resource budgets.
- Every action has actor, plan, approval, and audit provenance.
- No unapproved agent can mutate files, run shell, or access network.

## 7. Release rule

The phase must remain `BLOCKED` or `NOT_VERIFIED` until its mandatory evidence is independently produced and checked. A source file, test name, static report, or manually entered status string is not sufficient evidence of runtime completion.
