# ZYNTHEOR Pilot Access Control Specification

## 1. Access Governance & Limits

- **Registration Gate**: Pilot registration enforces invitation token checks or whitelist verification.
- **Tenant Limit**: Max 100 pilot organizations.
- **User Cap per Org**: Max 25 members per organization under `TEAM` plan.
- **Session Timeout**: Session Bearer tokens expire after 7 days or upon explicit revocation via `/api/auth/logout`.

---

## 2. Server-Enforced RBAC Matrix

| Role | Workspace Read | Workspace Write | Invite Member | Change Member Role | Manage Billing |
| --- | --- | --- | --- | --- | --- |
| **OWNER** | Yes | Yes | Yes | Yes | Yes |
| **ADMIN** | Yes | Yes | Yes | Yes | Yes |
| **DEVELOPER** | Yes | Yes | No | No | No |
| **MEMBER** | Yes | Yes | No | No | No |
| **VIEWER** | Yes | No | No | No | No |

Enforced on backend via `requireOrgRole()` middleware in `src/services/rbacService.ts`.
