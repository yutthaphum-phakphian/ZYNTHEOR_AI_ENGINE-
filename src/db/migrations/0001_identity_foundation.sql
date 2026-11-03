-- P1 PostgreSQL Foundation: identity and tenant relational baseline.
-- Apply and rollback only through scripts/db-migrate.mjs.
CREATE TABLE users (
  id serial PRIMARY KEY,
  email varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  salt varchar(255) NOT NULL,
  name varchar(255) NOT NULL,
  auth_provider varchar(50) NOT NULL DEFAULT 'local',
  provider_account_id varchar(255),
  avatar_url text,
  status varchar(50) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_provider_account_unique UNIQUE (auth_provider, provider_account_id)
);

CREATE TABLE organizations (
  id varchar(64) PRIMARY KEY,
  name varchar(255) NOT NULL,
  slug varchar(255) NOT NULL UNIQUE,
  owner_id integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  plan_id varchar(50) NOT NULL DEFAULT 'FREE',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organization_members (
  id serial PRIMARY KEY,
  org_id varchar(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role varchar(50) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_members_org_user_unique UNIQUE (org_id, user_id)
);

CREATE TABLE workspaces (
  id varchar(64) PRIMARY KEY,
  org_id varchar(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text,
  owner_id integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX workspaces_one_default_per_org
  ON workspaces(org_id) WHERE is_default;

CREATE TABLE sessions (
  id varchar(64) PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash varchar(255) NOT NULL UNIQUE,
  ip_address varchar(45),
  user_agent text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sessions_expiry_after_creation CHECK (expires_at > created_at)
);
CREATE INDEX sessions_user_active_idx ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX organization_members_user_idx ON organization_members(user_id, org_id);
CREATE INDEX workspaces_org_idx ON workspaces(org_id);
