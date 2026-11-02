# ZYNTHEOR AI ENGINE — ENTITLEMENT ENGINE SPECIFICATION

## 1. Plan Overview (`src/services/entitlementEngine.ts`)

Entitlements define feature access and usage limits for subscription plans. Roles dictate *administrative permissions*, whereas Entitlements dictate *usage quotas*.

| Entitlement Key | FREE | PRO | TEAM | ENTERPRISE |
| :--- | :--- | :--- | :--- | :--- |
| `ai.requests` (Monthly) | 500 | 10,000 | 50,000 | 1,000,000 |
| `ai.tokens` (Max/Request) | 4,096 | 16,384 | 32,768 | 65,536 |
| `workspace.count` | 3 | 20 | 100 | 1,000 |
| `project.count` (Per WS) | 5 | 50 | 200 | 1,000 |
| `collaboration.members` | 1 | 5 | 25 | 500 |
| `model.access` | Base / Core | All Models (`*`) | All Models (`*`) | All Models (`*`) |
| `tools.code_analysis` | Enabled | Enabled | Enabled | Enabled |
| `tools.sandbox` | Disabled | Enabled | Enabled | Enabled |
| `storage.capacity` | 100 MB | 5,000 MB | 50,000 MB | 1,000,000 MB |

## 2. Server-Side Quota Enforcement
- Centralized evaluation via `entitlementEngine.checkEntitlement(planId, key, currentUsage)`.
- Rejects requests when monthly quota is exhausted with a clear denial reason.
- Prevents frontend state spoofing of paid tiers.
