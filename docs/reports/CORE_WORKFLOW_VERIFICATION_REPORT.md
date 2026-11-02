# Core Workflow Verification Report

## Request Path

The UI routes standard chat to `/api/chat/stream`, Plan mode to `/api/intelligence/run`, and analysis mode to `/api/intelligence/analyze`. The intelligence route now calls the configured provider and returns source metadata separately from model output.

## Scenario Evidence

| Scenario | Verification | Result |
| --- | --- | --- |
| General question | Provider-spy test checks actual call and one-step plan | Pass |
| Workspace question | Integration test checks real repository excerpt in provider prompt and returned source metadata | Pass for current process root |
| Code analysis | Core/gateway tests cover analysis path and source retrieval | Pass at unit/integration level |
| Diff proposal | ToolGateway test checks `PROPOSED` and approval requirement | Pass as isolated tool behavior; not wired end-to-end from chat |
| Provider unavailable | Smoke/core tests check failure without fabricated answer | Pass |
| Local-only | Core/provider and server guardrail tests check external provider is blocked | Pass |
| Consent denied | Provider/server guardrail tests check no external call | Pass |
| Cancellation | Live HTTP integration test checks client abort closes upstream provider request; UI Plan handler forwards AbortSignal | Pass at backend integration and source-guard level |

## Cache and Evidence

Cache tests verify identical context-free requests reuse a prior inference and workspace-key separation. Policy is checked before cache lookup, and requests carrying workspace context bypass the cache. Retrieved citations identify bounded excerpts; model claims remain unverified.

## Not Proven

This is not a full browser-driven end-to-end run. Workspace retrieval is rooted at `process.cwd()` for every project ID, and the Core route does not create/apply a model-generated diff. No live native or fine-tuned inference was tested.