# ZYNTHEOR Backup & Restore Specification

## 1. Automated Snapshot Triggering

Automated backups trigger on:
- Workspace creation / modification
- Project creation / deletion
- Manual operator backup request (`POST /api/workspace/backup`)

## 2. Retention & Pruning Policy
- **Retention Count**: Keeps the latest 50 timestamped snapshots in `workspace_data/backups/`.
- **Filename Pattern**: `projects_snapshot_YYYY-MM-DDTHH-mm-ss-sssZ.json`.

## 3. Restore Verification Protocol
- Validates JSON format and schema before replacing production files.
- Records `WORKSPACE_RESTORED` audit entry in Audit Ledger.
