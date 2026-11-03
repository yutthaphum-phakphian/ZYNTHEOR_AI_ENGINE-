# ZYNTHEOR CORE X — Test Report

## Commands executed

| Command | Result |
|---|---|
| `npm install --no-audit --no-fund` | PASS; dependencies installed only in audit workspace |
| `npm run typecheck` | PASS |
| `npm run build` | PASS; Vite bundle generated; large-chunk warnings remain |
| `node --import tsx --test tests/native-model-gateway.test.mjs` | PASS; 2/2 |
| `npm test` | FAIL; 443 pass, 16 fail, 1 skipped / 460 discovered |
| `npm run native:cpu:test` | BLOCKED; `ModuleNotFoundError: torch` |
| `npm run native:cpu:validate` | BLOCKED; `ModuleNotFoundError: torch` |
| `npm run corex:p17:probe` | BLOCKED; runtime dependency unavailable / no checkpoint |
| `npm run corex:p19:preflight` | BLOCKED |
| `npm run corex:p20:status` | BLOCKED |

## Regression failures

The failing tests were preserved as evidence and not weakened. Main groups: persistent task memory fixture isolation; `.gitignore`/dataset manifest legacy expectations; deployment validation warning; workspace evidence identity; tenant fixture organization setup; local provider policy; and orchestration paths depending on unavailable local provider.

## Build note

Vite emitted warnings that Node modules imported by `lib/truth-kernel.ts` were externalized for browser compatibility, and that some chunks exceed 600 kB. Build still completed successfully; these warnings should be addressed before performance hardening.

## Interpretation

A passing typecheck/build is not equivalent to production readiness. The authoritative release state remains BLOCKED because regression, native runtime, database migration and sovereign infrastructure gates are incomplete.
