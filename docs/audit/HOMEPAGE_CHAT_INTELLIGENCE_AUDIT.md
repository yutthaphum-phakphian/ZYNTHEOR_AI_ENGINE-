# Homepage Chat & Intelligence Workspace Audit

## Verified flow

The Homepage composer calls the existing `sendMessage` callback in `src/App.tsx`. Depending on state, the callback uses:

- `/api/chat/stream` for normal Chat, Coding, Research, and Agent modes
- `/api/intelligence/run` for Reasoning mode
- `/api/intelligence/analyze` for AST Analysis mode

The existing flow preserves history, workspace context, attachments, streaming deltas, empty-response rejection, abort handling, audit events, and approval flags.

## UI status behavior

`HomepageEngineeringCenter` now reflects the status passed by `App.tsx` instead of presenting an always-ready surface. The visible status is derived from `chatPhase` and `systemStatus` and distinguishes connection, streaming, processing, completion, approval wait, unavailable model, and failure.

## Safety boundary

Approve/Reject remains a UI decision and audit event. It does not silently execute a file mutation or deployment. No new execution endpoint was added, and no provider was promoted to the product identity.

## Evidence policy

Home no longer fills missing model, repository, agent, or verification values with fabricated defaults. Missing runtime evidence is shown as unavailable or not verified.
