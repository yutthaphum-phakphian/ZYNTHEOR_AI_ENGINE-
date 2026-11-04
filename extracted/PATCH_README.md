# ZYNTHEOR Home & Intelligence Workspace — Clean Incremental Patch

## Scope

This is a clean cumulative patch for the ZYNTHEOR Home Experience and the Chat/Intelligence Workspace. It contains only the two source files changed for this work. It does not contain the full repository, `node_modules`, `dist`, generated bundles, ZIP files, credentials, or unrelated files.

## Files included

- `src/App.tsx`
  - Keeps the existing Chat and Intelligence endpoints unchanged.
  - Shows evidence-based runtime, model, and policy statuses.
  - Removes misleading Core/Provider fallbacks from user-facing Chat messages.
  - Preserves existing routing, approval handling, audit logging, and fail-closed behavior.

- `src/components/HomepageEngineeringCenter.tsx`
  - Makes ZYNTHEOR Intelligence the Home identity.
  - Removes Provider/Route cards and provider names from the Home experience.
  - Removes inaccessible technical tabs from Home navigation while preserving their dedicated pages.
  - Removes fabricated file counts, agent metrics, and verification defaults.
  - Shows actual Chat status: connecting, responding, processing, ready, completed, awaiting approval, unavailable, or failed.
  - Keeps Chat, Coding, Reasoning, Research, Agent, repository context, attachments, and human approval UI connected to the existing callbacks.

## Installation

Run these commands from the root of the existing repository. This patch intentionally overwrites only the two corresponding source files with the reviewed versions:

```bash
unzip -o zyntheor_home_intelligence_patch.zip -d .
npm run typecheck
npm run build
```

Do not copy these files into `src/pages/` or `src/components/model-studio/`. The source of truth remains:

```text
src/App.tsx
src/components/HomepageEngineeringCenter.tsx
```

## Verification performed

- `npm run typecheck` — PASS
- `npm run build` — PASS
- Home provider/route identity scan — PASS
- Home workspace contract scan — PASS

The existing Vite warnings about externalized Node modules and large chunks are build warnings, not failures.
