# ZYNTHEOR AI ENGINE — RBAC PERMISSION MATRIX

## 1. Role Definitions
The system defines 5 hierarchical organization roles enforced on the backend:
- `OWNER`: Full organization ownership, account billing, member management, and workspace deletion.
- `ADMIN`: Organization administration, member invitation, role changes, settings configuration.
- `DEVELOPER`: Full engineering capabilities, workspace creation, AI inference, tool execution, model configuration.
- `MEMBER`: Workspace member with read/write project access, file editing, and AI inference.
- `VIEWER`: Read-only access to workspaces, projects, files, and audit logs.

## 2. Permission Matrix (`src/services/rbacService.ts`)

| Action Permission | OWNER | ADMIN | DEVELOPER | MEMBER | VIEWER |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `account:manage` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `org:manage` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `org:invite` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `workspace:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `workspace:write` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `workspace:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `project:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `project:write` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `project:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `file:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `file:write` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `ai:inference` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `tool:execute` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `model:configure` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `settings:manage` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `audit:read` | ✅ | ✅ | ✅ | ✅ | ✅ |

## 3. Enforcement Scope
`rbacService.hasPermission(role, action)` implements the permission matrix, but endpoints must explicitly invoke it or use their own verified session and membership checks. The production API gate uses the deployment-wide `ZYNTHEOR_ACCESS_TOKEN`; it is not a substitute for per-user or per-tenant authorization. Do not assume every API endpoint enforces this matrix.

Client-supplied role headers are not a source of verified identity. Production routes outside health checks and `/api/auth/*` require the configured server access token.
