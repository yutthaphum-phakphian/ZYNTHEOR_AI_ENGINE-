# Intelligence Error Recovery Specification
**ZYNTHEOR AI ENGINE — Phase P8 Core Intelligence Advancement**

## 1. Overview

The **Intelligence Error Recovery Pipeline** defines deterministic error classification, fallback paths, and safe retry mechanisms for all operational failures in the AI reasoning loop.

---

## 2. Error Categories & Handling Strategies

| Error Category | Trigger Cause | Recovery Action | State Transition |
| :--- | :--- | :--- | :--- |
| `MODEL_TIMEOUT` | Provider API timeout (>30s) | Retry with exponential backoff or local model fallback. | `EXECUTING` → `RETRYING` |
| `PROVIDER_UNAVAILABLE` | External LLM API returned 5xx / HTML error | Fall back to local Ollama runtime (`qwen2.5-coder:7b`). | `EXECUTING` → `FALLBACK` |
| `CONTEXT_OVERFLOW` | Workspace context exceeded model window | Truncate files to budget limit with `[TRUNCATED_FOR_CONTEXT_BUDGET]`. | `ANALYZING` → `TRUNCATED` |
| `TOOL_EXECUTION_FAILURE` | Tool thrown error or non-zero exit code | Record `FAILED_VERIFICATION` evidence artifact; log error. | `EXECUTING` → `FAILED` |
| `PERMISSION_DENIED` | High-risk tool invoked without human approval | Transition task to `WAITING_FOR_APPROVAL`; issue prompt token. | `EXECUTING` → `WAITING_FOR_APPROVAL` |
| `TASK_CANCELLED` | Client sent `AbortSignal` | Immediately stop child processes; record cancellation. | `ANY` → `CANCELLED` |

---

## 3. Duplicate Side-Effect Prevention

During retry or resumption:
- Read-only tools (`LOW` risk) can be re-executed safely.
- Mutational tools (`HIGH` risk) check previous evidence digests (`sha256Digest`) to prevent duplicate writes or double command execution.
