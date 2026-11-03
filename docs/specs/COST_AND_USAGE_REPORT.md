# ZYNTHEOR Cost & Usage Metering Report

## 1. Unit Economics & Cost Projections

| Subscription Tier | Monthly Price (THB) | Included AI Requests | Est. Token Consumption | Est. Infra Cost / User | Margin Estimate |
| --- | --- | --- | --- | --- | --- |
| **FREE Starter** | ฿0 | 500 | ~1.5M tokens | ฿15 / mo | N/A (Lead gen) |
| **PRO Engineer** | ฿990 | 10,000 | ~30M tokens | ฿180 / mo | ~81.8% |
| **TEAM Sovereign** | ฿3,900 | 50,000 | ~150M tokens | ฿850 / mo | ~78.2% |
| **ENTERPRISE** | ฿19,900 | 1,000,000 | ~3B tokens | ฿4,200 / mo | ~78.9% |

---

## 2. Server-Side Quota Enforcement

All usage is tracked idempotently in `usageRecords` and aggregated monthly per tenant by `usageMeteringService`. Quotas are enforced on the backend before dispatching inference requests.
