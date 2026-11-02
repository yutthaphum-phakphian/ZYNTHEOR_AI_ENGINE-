# Product Experience Report

## Changes

- Plan-mode requests now use the same Stop control as streaming chat, and the client abort signal reaches the backend provider request.
- The UI displays retrieved workspace source paths and line ranges with the answer.
- An empty success payload is treated as an error instead of being replaced with a success claim.
- Existing response fields used by the chat UI remain unchanged.

## Verification Gap

Typecheck, full tests, and production build pass. The UI behavior is guarded by source-level tests; no browser automation or manual viewport verification was run in this round.