# ZYNTHEOR AI ENGINE — Project File Map

## Active source of truth

- `src/` — React application, UI components, middleware, routes, hooks, and application services.
- `lib/` — TypeScript/JavaScript intelligence, orchestration, tool gateway, security, runtime, and lifecycle modules.
- `server.ts` — Express application and protected API routes.
- `training/` — dataset, provenance, native CPU model, training/evaluation scripts, and model registries.
- `database/` and `src/db/` — database schemas and database-facing application modules.
- `infra/sovereign/` — Local-Only and sovereign backup/restore policy.
- `scripts/` — operational scripts, preflight checks, manifest verification, and lifecycle/backup CLIs.
- `tests/` — Node and Python regression tests, including native model and sovereign infrastructure tests.
- `docs/specs/` — phase specifications and shared contracts.
- `docs/roadmap/` — CORE X P11–P20 roadmap.
- `docs/architecture/` — architecture maps and design decisions.
- `docs/audit/` — current acceptance status and audit reports.
- `docs/training/` — dataset governance approval requirements.

## CORE X phase map

The detailed mapping is `docs/architecture/ZYNTHEOR_CORE_X_P11_P20_IMPLEMENTATION_MAP.md`.
The latest evidence-derived phase state is `docs/audit/P11_P20_INTEGRATION_STATUS.json` and can be regenerated with:

```bash
node --input-type=module -e "import fs from 'node:fs'; import {inspectCoreX} from './lib/corex-platform-gate.mjs'; fs.writeFileSync('docs/audit/P11_P20_INTEGRATION_STATUS.json', JSON.stringify(inspectCoreX(), null, 2) + '\\n')"
```

## Preserved material

- `archive/legacy-snapshots/` — earlier extracted source snapshots, preserved for comparison and recovery.
- `archive/unclassified-artifacts/` — artifacts whose intended active role was unclear or whose names were malformed; preserved outside active source paths.

## Runtime data intentionally not shipped

`workspace_data/` contains local workspace memory, proposals, evaluations, knowledge, and task records. It is excluded from the source ZIP to avoid distributing private runtime content. The folder is created by application services when required. `.env` files, dependency folders, caches, and local build output are also excluded; `.env.example` is included.
