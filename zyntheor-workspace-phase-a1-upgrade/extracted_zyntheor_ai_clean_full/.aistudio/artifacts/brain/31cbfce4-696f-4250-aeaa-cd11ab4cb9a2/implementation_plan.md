# ZYNTHEOR AI ENGINE 0.3 — Implementation Plan & Baseline Audit

## Title & Summary
**ZYNTHEOR AI ENGINE 0.3: Cross-Layer Root Cause Intelligence & Trust/Safety Systems**  
This plan establishes the Phase 0 Read-Only Baseline findings for ZYNTHEOR 0.3, documents the completed **LocalStorage Audit Tool**, and proposes the architectural blueprint for the **Audit Ledger Hash Chain Visual Health & Repair Dashboard**, the **Intelligent Debugging Test-to-Dependency Mapping Interface**, and the **Cross-Layer Root Cause Tracing Engine**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Per the ZYNTHEOR 0.3 Mission directives, this turn delivers the **READ-ONLY BASELINE AUDIT** and **IMPLEMENTATION PLAN**. Source code modifications for Phase 2 and Phase 3 features will begin upon user approval.

- **Confirmed Choice 1**: **LocalStorage Diagnostic Tool**  
  *Status*: **COMPLETED & INTEGRATED** in `src/components/LocalStorageAuditTool.tsx` and mounted under the **Diagnostics** tab ("Storage Schema Audit"). Verified with 0 TypeScript/lint errors.
- **Proposed Feature 2**: **Visual Health Dashboard & Re-Sign Repair in Audit Ledger**  
  *Status*: Ready for implementation in `src/components/AuditChainVisualizer.tsx` and `src/services/auditLedger.ts`. Adds real-time hash chain health indicators, broken block highlight, and a single-click "Re-sign Event History" repair mechanism.
- **Proposed Feature 3**: **Test-to-Dependency Mapping in Intelligent Debugging**  
  *Status*: Ready for implementation in `src/components/IntelligentDebugging.tsx`. Connects baseline test suite status to workspace file dependencies indexed by `repositoryIntelligence.ts`.

---

## 1. Phase 0 — Read-Only Baseline Findings

### System Health & Repository Baseline
- **Node Test Runner**: 384 tests passed, 1 skipped (385 total).
- **Vitest Suite**: 32 test files passed, 252 tests passed (0 failures).
- **TypeScript Compiler (`tsc --noEmit`)**: Clean with 0 errors.
- **Local Storage Audit Tool**: 14 known schemas verified (`zyntheor.rebuild.chat.v1`, `zyntheor.app_settings.v1`, etc.), supporting syntax validation, structure validation, and single-click reset/purge/export.

### Verified Architecture & Core Subsystems
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER (Vite + React)                  │
│  App.tsx ──► LocalStorageAuditTool | AuditChainVisualizer | Debugging   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP API Calls / WS
┌────────────────────────────────────▼────────────────────────────────────┐
│                           BACKEND SERVER (server.ts)                    │
│  Middleware (token, rbac, rate limit) ──► Routes (/api/diagnostics, etc.)│
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Internal Services
┌────────────────────────────────────▼────────────────────────────────────┐
│                           SERVICES & STORAGE                            │
│  auditLedger.ts | authorizationService.ts | tenantScopedStorage.ts       │
│  repositoryIntelligence.ts | safeExecutor.ts | projectAwareDebugger.ts   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Proposed Feature Specifications

### Feature A: Visual Health Dashboard & Re-Sign Repair in 'Audit Ledger'
- **Location**: `src/components/AuditChainVisualizer.tsx` & `src/services/auditLedger.ts`
- **Capabilities**:
  1. **Visual Hash Chain Health Monitor**: Displays SHA-256 root hash, chain length, verification status (`INTACT` / `TAMPERED`), and broken block pointer if tampering occurs.
  2. **Re-Sign Audit History Button**: Provides an interactive repair action that recalculates canonical SHA-256 signatures sequentially from GENESIS for all stored local events, restoring cryptographic integrity.
  3. **Forensic Block Inspection**: Allows clicking any event block to inspect `prevHash`, `nanoAt` nanosecond timestamp, and payload digest.

### Feature B: Automated Test Failure & Dependency Mapping in 'Intelligent Debugging'
- **Location**: `src/components/IntelligentDebugging.tsx`
- **Capabilities**:
  1. **Baseline Test Status Summary**: Visual dashboard showing test execution stats (Passed, Failed, Skipped) extracted from the latest test runner session.
  2. **Source File Dependency Matrix**: Maps each test file (e.g. `src/tests/multiTenantSecurityPatches.test.ts`) to its target source file dependencies (e.g. `src/services/tenantScopedStorage.ts`, `authorizationService.ts`).
  3. **Root Cause Evidence Linkage**: Correlates test status with `repositoryIntelligence.ts` symbol graphs to identify if failures stem from missing exports, contract mismatches, or missing modules.

---

## 3. ZYNTHEOR 0.3 Cross-Layer Root Cause Architecture

### Phase 1: Cross-Layer Dependency Graph
Constructs verifiable links across 8 layers:
`Frontend Component -> Frontend Service -> API Client -> Backend Route -> Middleware -> Auth Service -> Storage Service -> External Adapter`.

### Phase 2: Request Flow Tracing
Tracks end-to-end telemetry from user UI click to backend route handler, explicitly distinguishing instrumented real execution traces from missing instrumentation.

### Phase 3: Contract Mismatch Detection
Audits static TypeScript contracts against runtime Express endpoints and payload types to surface exact line numbers where request/response shapes deviate.

### Phase 4: Root Cause Correlation
Ranks diagnostic findings into strict evidence tiers:
- `VERIFIED_FINDING`: Direct AST / test execution proof.
- `CONFIRMED_CAUSE`: Line-level match confirmed in workspace source.
- `HYPOTHESIS`: Statistical inference awaiting execution evidence.
- `SAMPLE_ONLY`: Demonstration sample data (does NOT generate production patches).

---

## 4. Proposed Minimal Patch Plan

1. **`src/services/auditLedger.ts`**:
   - Add `repairAndResignAuditLedger(records: AuditEntry[]): AuditEntry[]` to recompute sequential SHA-256 hashes chronologically from GENESIS.
2. **`src/components/AuditChainVisualizer.tsx`**:
   - Add Visual Health Dashboard header with status badge, root hash preview, and "Repair & Re-sign Hash Chain" button with toast feedback.
3. **`src/components/IntelligentDebugging.tsx`**:
   - Add "Test Baseline & Source Dependency Matrix" view displaying test status mapped against repository symbol imports.

---

## 5. Security & Isolation Compliance

- **Local-Only Mode**: Preserved; no external API calls without explicit user consent.
- **Cryptographic Hash Chain**: SHA-256 canonical string hashing maintained.
- **Tenant Isolation & HMAC**: Secrets loaded strictly from environment with no hardcoded fallback secrets in production mode.
- **Zero Automated Mutations**: All patch previews remain read-only proposals requiring explicit approval.

---

## 6. Verification Plan

1. Run `npm run typecheck` (`tsc --noEmit`).
2. Run `compile_applet` to confirm zero build errors.
3. Execute `npx vitest run` and `npm test` to verify zero regression across test suites.
