# Core Product Development Audit

## Scope

Dataset expansion, fine-tuning, GPU training, native-model optimization, and production promotion remain deferred. Existing dataset, registry, training pipeline, and native runtime were preserved.

## Verified Findings

- The main UI routes Plan requests to `POST /api/intelligence/run`, standard chat to `/api/chat/stream`, and analysis requests to `/api/intelligence/analyze`.
- `IntelligenceCore.processRequest()` now calls the configured provider, includes bounded retrieved excerpts in the prompt, returns the provider's response, marks model claims `UNVERIFIED`, and does not fabricate a diff.
- Simple requests get a one-step inference plan. Workspace/code requests can include inspection and inference steps without a generic mutation approval step.
- Client disconnects on `/api/intelligence/run` abort the provider signal. Plan mode shares the UI Stop control; timeouts return HTTP 504 and are audited.
- Retrieved file paths and excerpt line ranges are returned to the UI. The line range now matches the bounded excerpt sent to the model.
- `ToolGateway` has allowlisted tools, argument validation, traversal/sensitive-file guards, and human approval for consequential mutation. The main intelligence route does not itself execute tools or produce/apply code diffs.
- Server provider routes and `IntelligenceCore` enforce local-only/explicit-consent policy. Cache lookup occurs after policy validation; requests with workspace context or tool intent bypass inference caching.
- Workspace context still scans `process.cwd()` regardless of `activeProjectId`; project IDs label cache/context but do not select separate workspace roots. Cross-project root isolation is therefore not verified.
- The P9 training and native-model foundation remains untouched. Tests and runtime status do not prove trained weights or native-model inference.

## Verification

- Full suite: `node --test --test-reporter=spec tests/*.test.mjs` passed 312/312, 0 failed.
- Focused workflow suite: cancellation, source-guardrail, and runtime integration checks passed 22/22; the excerpt-range integration suite passed 6/6 after the line-range fix.
- `npm run build` passed, including TypeScript compilation and Vite production build. Vite emitted a non-fatal warning that the main bundle exceeds 600 kB.
- Cancellation integration used a local HTTP provider stub. This proves request propagation, not model quality or native inference. No browser-driven E2E run was performed.

## Remaining Risks

- Project-level workspace root isolation needs a defined, server-authorized root mapping before it can be claimed.
- `/api/intelligence/run` is inference and context retrieval, not code execution or an end-to-end diff proposal workflow.
- There is no independent verification of model-generated reasoning; only transport, policy, source provenance, and response contract are tested.
