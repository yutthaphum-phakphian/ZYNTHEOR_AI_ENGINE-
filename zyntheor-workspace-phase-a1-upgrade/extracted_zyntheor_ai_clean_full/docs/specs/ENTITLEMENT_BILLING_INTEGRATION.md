# ZYNTHEOR Entitlement & Billing Integration Specification

## 1. Plan Entitlements Mapping

When a subscription transitions to `ACTIVE`, the Entitlement Engine (`src/services/entitlementEngine.ts`) automatically updates the tenant's limits according to the active plan definition:

| Metric / Capability | FREE Starter | PRO Engineer | TEAM Sovereign | ENTERPRISE |
| --- | --- | --- | --- | --- |
| **Monthly Price** | ฿0 | ฿990 / mo | ฿3,900 / mo | ฿19,900 / mo |
| **AI Requests / mo** | 500 | 10,000 | 50,000 | 1,000,000 |
| **Max Tokens / Request** | 4,096 | 16,384 | 32,768 | 65,536 |
| **Max Workspaces** | 3 | 20 | 100 | 1,000 |
| **Max Members** | 1 | 5 | 25 | 500 |
| **Allowed Models** | Local / Qwen | All Models (*) | All Models (*) | All Models (*) |
| **Execution Sandbox** | Disabled | Enabled | Enabled | Enabled |
| **Storage Quota** | 100 MB | 5,000 MB | 50,000 MB | 1,000,000 MB |

---

## 2. Dynamic Entitlement Sync Flow

```
+--------------------------+
| Payment Verified Event   |
+--------------------------+
             |
             v
+--------------------------+
| BillingService           |
| (Transition -> ACTIVE)   |
+--------------------------+
             |
             v
+--------------------------+
| IdentityService          |
| (org.planId = 'PRO')     |
+--------------------------+
             |
             v
+--------------------------+
| EntitlementEngine        |
| (Grant PRO Quotas)       |
+--------------------------+
             |
             v
+--------------------------+
| UsageMeteringService     |
| (Track & Enforce Limits) |
+--------------------------+
```

---

## 3. Backend Enforcement Controls

Whenever an API endpoint under `/api/chat`, `/api/intelligence/run`, or `/api/workspace/*` is invoked:
1. `usageMeteringService` fetches current month usage.
2. `entitlementEngine.checkEntitlement(planId, key, usage)` evaluates quota.
3. If quota exceeded, returns HTTP 429 / 403 with upgrade prompt.
