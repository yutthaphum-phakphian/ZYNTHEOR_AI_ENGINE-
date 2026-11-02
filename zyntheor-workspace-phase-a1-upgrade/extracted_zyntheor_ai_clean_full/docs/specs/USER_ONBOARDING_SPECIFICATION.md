# ZYNTHEOR Pilot User Onboarding Specification

## 1. User Journey Flow

1. **Invitation & Registration**: Pilot user receives unique invitation token or registers via `/api/auth/register` or OAuth2 (`/api/auth/oauth/register-or-login`).
2. **Default Organization Provisioning**: `IdentityService` automatically provisions an initial workspace organization (`org-usr-[ID]`) with `OWNER` role.
3. **Terms & Privacy Acknowledgement**: User acknowledges Local-First privacy boundary and Terms of Service.
4. **Plan Selection & Quota Overview**: User views Starter Free quota or selects Pro Engineer / Team Sovereign test plans via `BillingCenter.tsx`.
5. **Workspace Project Creation**: User creates projects, sets timeline dates, and inspects Git repository status.
