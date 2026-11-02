-- ==============================================================================
-- ZYNTHEOR LEVEL 4 (P13.1) — ENTERPRISE DATABASE HARDENING MIGRATION
-- Row-Level Security (RLS), Least-Privilege Roles, and Tamper-Proof Audit Triggers
-- ==============================================================================

-- 1. Create Least-Privilege Application Roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'zyntheor_app_role') THEN
    CREATE ROLE zyntheor_app_role WITH LOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'zyntheor_audit_writer') THEN
    CREATE ROLE zyntheor_audit_writer WITH LOGIN NOINHERIT;
  END IF;
END $$;

-- 2. Enable Row-Level Security (RLS) on Multi-Tenant Tables
ALTER TABLE IF EXISTS workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workspaces FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agent_memory FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS execution_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS execution_jobs FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_events FORCE ROW LEVEL SECURITY;

-- 3. RLS Policy: Workspaces (Tenant Isolation by app.current_org_id)
DROP POLICY IF EXISTS tenant_isolation_workspaces ON workspaces;
CREATE POLICY tenant_isolation_workspaces ON workspaces
  FOR ALL
  TO zyntheor_app_role
  USING (org_id = NULLIF(current_setting('app.current_org_id', true), ''))
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), ''));

-- 4. RLS Policy: Agent Memory (Tenant Isolation by workspace ownership or tenant context)
DROP POLICY IF EXISTS tenant_isolation_agent_memory ON agent_memory;
CREATE POLICY tenant_isolation_agent_memory ON agent_memory
  FOR ALL
  TO zyntheor_app_role
  USING (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE org_id = NULLIF(current_setting('app.current_org_id', true), '')
    )
    OR workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE org_id = NULLIF(current_setting('app.current_org_id', true), '')
    )
    OR workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')
  );

-- 5. RLS Policy: Execution Jobs (Tenant Isolation by workspace ownership)
DROP POLICY IF EXISTS tenant_isolation_execution_jobs ON execution_jobs;
CREATE POLICY tenant_isolation_execution_jobs ON execution_jobs
  FOR ALL
  TO zyntheor_app_role
  USING (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE org_id = NULLIF(current_setting('app.current_org_id', true), '')
    )
    OR workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE org_id = NULLIF(current_setting('app.current_org_id', true), '')
    )
    OR workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')
  );

-- 6. RLS Policy: Audit Events (Tenant Isolation & Append-Only)
DROP POLICY IF EXISTS tenant_isolation_audit_select ON audit_events;
CREATE POLICY tenant_isolation_audit_select ON audit_events
  FOR SELECT
  TO zyntheor_app_role
  USING (tenant_id = NULLIF(current_setting('app.current_org_id', true), ''));

DROP POLICY IF EXISTS audit_writer_append_only ON audit_events;
CREATE POLICY audit_writer_append_only ON audit_events
  FOR INSERT
  TO zyntheor_audit_writer, zyntheor_app_role
  WITH CHECK (true);

-- 7. Tamper-Proof Audit Guard: Block UPDATE and DELETE on audit_events
CREATE OR REPLACE FUNCTION prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'TAMPER_DETECTED: Modifications or deletions of audit_events are strictly prohibited (Zero-Tamper policy).';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_update ON audit_events;
CREATE TRIGGER trg_prevent_audit_update
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_tampering();

-- 8. Grant Restricted Permissions
GRANT USAGE ON SCHEMA public TO zyntheor_app_role, zyntheor_audit_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspaces, agent_memory, execution_jobs TO zyntheor_app_role;
GRANT SELECT, INSERT ON audit_events TO zyntheor_app_role;
GRANT INSERT ON audit_events TO zyntheor_audit_writer;
