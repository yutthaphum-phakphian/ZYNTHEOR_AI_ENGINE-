-- Rollback for 0001_identity_foundation.sql. Drops only objects created by this migration.
DROP INDEX IF EXISTS sessions_user_active_idx;
DROP INDEX IF EXISTS organization_members_user_idx;
DROP INDEX IF EXISTS workspaces_org_idx;
DROP INDEX IF EXISTS workspaces_one_default_per_org;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS workspaces;
DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS organizations;
DROP TABLE IF EXISTS users;
