-- Rollback P2-only additions. This removes ownership audit records and P2 session metadata.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM identity_imports)
     OR EXISTS (SELECT 1 FROM ownership_transfer_audit)
     OR EXISTS (SELECT 1 FROM sessions WHERE tenant_id IS NOT NULL)
     OR EXISTS (SELECT 1 FROM organization_members WHERE legacy_id IS NOT NULL) THEN
    RAISE EXCEPTION 'P2 rollback blocked: identity/session data is present; use a reviewed data-preserving rollback plan';
  END IF;
END $$;
DROP TABLE IF EXISTS identity_imports;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_owner_membership_fk;
DROP INDEX IF EXISTS organization_members_user_org_unique;
DROP INDEX IF EXISTS ownership_transfer_org_created_idx;
DROP TABLE IF EXISTS ownership_transfer_audit;
DROP INDEX IF EXISTS sessions_tenant_active_idx;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_valid_role_check;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_tenant_membership_fk;
ALTER TABLE sessions DROP COLUMN IF EXISTS role;
ALTER TABLE sessions DROP COLUMN IF EXISTS tenant_id;
DROP INDEX IF EXISTS organization_members_legacy_id_unique;
ALTER TABLE organization_members DROP COLUMN IF EXISTS legacy_id;
