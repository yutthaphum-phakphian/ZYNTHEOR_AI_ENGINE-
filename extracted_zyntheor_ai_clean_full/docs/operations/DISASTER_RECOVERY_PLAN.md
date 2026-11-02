# ZYNTHEOR Disaster Recovery Plan

## 1. Recovery Targets

- **Recovery Point Objective (RPO)**: **< 15 minutes** (Atomic server snapshots created automatically on project/workspace mutation).
- **Recovery Time Objective (RTO)**: **< 5 minutes** (Automated restore via `/api/workspace/restore` endpoint or snapshot backup script).

---

## 2. Backup Strategy

- **Location**: `workspace_data/backups/projects_snapshot_[TIMESTAMP].json`.
- **Atomic File Writes**: `IdentityService`, `BillingService`, and `WorkspaceManager` perform atomic writes using `.tmp.[TIMESTAMP]` temporary files before replacing target JSON datasets.
- **Snapshot Integrity**: JSON validation occurs prior to snapshot application.

---

## 3. Restore Procedure

1. **API Restore**: Invoke `POST /api/workspace/restore` with valid server session token.
2. **FileSystem Recovery**: Locate latest timestamped file in `workspace_data/backups/` and copy to `workspace_data/projects.json`.
3. **Verification**: Invoke `/health/ready` to verify server state.
