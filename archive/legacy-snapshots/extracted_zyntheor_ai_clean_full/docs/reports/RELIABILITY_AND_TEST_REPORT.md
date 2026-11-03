# Reliability and Test Report

## Executed Results

- Full suite: 312 passed, 0 failed, 0 skipped.
- Focused workflow, source-guardrail, and cancellation integration checks: 22 passed, 0 failed.
- Workspace excerpt/line-range integration checks: 6 passed, 0 failed.
- `npm run build`: passed TypeScript and Vite production build.
- Vite reports a non-fatal large-chunk warning for the main bundle (>600 kB).

## Test Boundaries

The cancellation test uses a local HTTP provider stub to verify HTTP disconnect propagation. The suite does not establish native-model quality, browser-level UI behavior, or multi-root project isolation. Full tests can mutate runtime fixtures under `workspace_data/`; those pre-existing dirty files were not cleaned or reverted.