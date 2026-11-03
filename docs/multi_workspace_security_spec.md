🔒 ZYNTHEOR Multi-Workspace Security & Authorization Specification
Version: 1.2.0-Governance
Status: IMPLEMENTED & AUDITED
📌 Executive Summary
This specification establishes the strict boundary rules for multi-workspace data isolation, client-side state handling, patch authorization, and imported workspace validation in ZYNTHEOR AI ENGINE.
CORE PRINCIPLE: Local Storage is strictly a UI/display cache. The server-side Authorization Middleware (src/routes/workspace.ts / src/services/authService.ts) remains the single source of truth for all security gates, file system mutations, and project boundaries.
🏗️ 1. Multi-Workspace Architecture & Security Boundaries
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                     │
│  - Active Workspace ID (UI Preference)                  │
│  - Session Token (Bearer JWT)                           │
└──────────────────────────┬──────────────────────────────┘
                           │
                           │ Request with Header Context
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Server Authentication Middleware            │
│  - Validates Session Expiration (expiresAt > Date.now())│
│  - Resolves User Role Rank (viewer:1, eng:2, admin:3)   │
│  - Asserts Target Workspace Membership                  │
└──────────────────────────┬──────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
  [ Workspace Approved ]        [ Cross-Workspace Access ]
            │                             │
            ▼                             ▼
┌──────────────────────┐      ┌─────────────────────────┐
│ Proceed to Endpoint  │      │ HTTP 403 Forbidden      │
│ (Isolated Directory) │      │ Audit Ledger Log Event  │
└──────────────────────┘      └─────────────────────────┘
Workspace Security Rules:
No Workspace Impersonation: Client-supplied workspace IDs in request bodies or query parameters are ignored unless verified against the user's active session permissions (session.workspaceIds).
Explicit Directory Boundaries: Workspace execution is jailed strictly to /workspace_data/projects/<workspaceId>/. Absolute path traversals (../) are stripped and rejected with WORKSPACE_PATH_TRAVERSAL_DENIED.
Idempotent Seed Management (src/services/workspaceManager.ts):
Initializing the 6 seed workspaces operates strictly idempotently using SHA-256 state hashing.
User-modified project configurations are preserved and will never be overwritten during system cold starts or server restarts.
🛡️ 2. Workspace Import / Export Validation Engine
Exporting and importing workspace JSON definitions (src/hooks/useMultiWorkspace.ts) exposes potential injection and configuration override vectors. The following rules are enforced prior to importing any payload:
JSON Import Gatekeeper Schema (WorkspaceImportSchema)
interface WorkspaceImportPayload {
  version: "1.0.0";
  workspaceId: string;
  name: string;
  targetDirectory: string;
  projects: Array<{
    projectId: string;
    name: string;
    status: string;
  }>;
  createdAt: number;
  checksum: string; // SHA-256 digest of payload contents
}
Import Verification Rules:
Schema Integrity: Imported JSON must match WorkspaceImportPayload. Payloads containing system reserved keys (__proto__, process, configOverrides) are rejected immediately (SCHEMA_MUTATION_DETECTED).
Path Sanitization: The targetDirectory property is sanitized to ensure it remains inside permissible target scopes. It cannot reference root system directories or server configurations.
Id & Authorization Re-binding: Upon import, a new cryptographic workspaceId is assigned to prevent collisions or silent overwriting of existing workspace data. The importing user is set as the sole owner.
🔑 3. Patch Approval & Security Integration Matrix
Event / Action
Frontend State
Backend Verification Gate
Audit Record
Patch Proposal
Render Forensic Diff
Calculate target file disk SHA-256 (originalHash) & bind patchId
PATCH_PROPOSED
User Approval
Status = APPROVED
Verify user role rank ($\ge 2$), check disk SHA-256 matches originalHash
PATCH_APPROVED
Disk File Changed Post-Approval
Toast Warning Rendered
applyPatch() detects disk hash mismatch $\rightarrow$ auto-transitions proposal to STALE
PATCH_STALE_INVALIDATED
Patch Application
Update Editor Content
Acquire file lock $\rightarrow$ re-check hash $\rightarrow$ atomic disk write $\rightarrow$ status = APPLIED
PATCH_APPLIED_SUCCESS
Re-apply / Replay Attack
Button Disabled
Detect status == APPLIED $\rightarrow$ reject with REPLAY_ATTEMPT_DENIED
SECURITY_ALERT_REPLAY
🧪 4. Audit & Verification Compliance
All multi-workspace and security rules documented in this specification are tested and verified by:
src/tests/securityEndToEnd.test.ts (11 unit & integration sub-tests)
src/tests/patchApplierAudit.test.ts (Cryptographic verification suite)
Status: ALL SYSTEMS COMPLIANT & VERIFIED.
