-- P2 Identity & Authentication: extend the P1 relational foundation for secure sessions,
-- preserved legacy membership identifiers, and audited ownership transfer.
ALTER TABLE organization_members ADD COLUMN legacy_id varchar(128);
CREATE UNIQUE INDEX organization_members_legacy_id_unique
  ON organization_members(legacy_id) WHERE legacy_id IS NOT NULL;
CREATE UNIQUE INDEX organization_members_user_org_unique ON organization_members(user_id, org_id);
ALTER TABLE organizations ADD CONSTRAINT organizations_owner_membership_fk
  FOREIGN KEY (owner_id, id) REFERENCES organization_members(user_id, org_id)
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE sessions ADD COLUMN tenant_id varchar(64);
ALTER TABLE sessions ADD COLUMN role varchar(50);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM sessions) THEN
    RAISE EXCEPTION 'P2 migration blocked: existing P1 sessions lack tenant attribution; revoke/reissue them or prepare an explicit reviewed backfill first';
  END IF;
END $$;
ALTER TABLE sessions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN role SET NOT NULL;
ALTER TABLE sessions ADD CONSTRAINT sessions_tenant_membership_fk
  FOREIGN KEY (tenant_id, user_id) REFERENCES organization_members(org_id, user_id) ON DELETE CASCADE;
ALTER TABLE sessions ADD CONSTRAINT sessions_valid_role_check
  CHECK (role IN ('OWNER', 'ADMIN', 'DEVELOPER', 'MEMBER', 'VIEWER'));
CREATE INDEX sessions_tenant_active_idx ON sessions(tenant_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE ownership_transfer_audit (
  id varchar(64) PRIMARY KEY,
  org_id varchar(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_user_id integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  to_user_id integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  initiated_by integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ownership_transfer_distinct_users CHECK (from_user_id <> to_user_id)
);
CREATE INDEX ownership_transfer_org_created_idx ON ownership_transfer_audit(org_id, created_at DESC);

CREATE TABLE identity_imports (
  source_digest char(64) PRIMARY KEY,
  source_counts jsonb NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
