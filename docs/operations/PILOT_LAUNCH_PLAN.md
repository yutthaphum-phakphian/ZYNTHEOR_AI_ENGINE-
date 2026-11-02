# ZYNTHEOR Pilot Launch Plan (P7)

## 1. Pilot Objectives

The ZYNTHEOR Pilot Launch (P7) introduces a controlled, invite-only deployment of the ZYNTHEOR AI Engine to validate real-world engineering workflows, subscription billing lifecycle, local-first security boundaries, and system stability.

---

## 2. Staged Pilot Rollout Strategy

```
+-----------------------------------------------------------------------+
| STAGE 1: Internal Validation (Internal Core Engineers)               |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| STAGE 2: Invited Pilot (20 Handpicked Engineering Teams)              |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| STAGE 3: Limited Expansion (Up to 100 Organizations)                  |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| STAGE 4: Commercial Review & General Launch Gate                      |
+-----------------------------------------------------------------------+
```

---

## 3. Environment Isolation & Safety Controls

- **Separate Data Storage**: Pilot operations run on isolated environment configurations (`.env.pilot`) with independent database storage dirs (`workspace_data/pilot/`).
- **Sandbox Payment Gateway**: Stripe and PromptPay integrations operate in sandbox mode during pilot phases. No live credit card or bank charges occur without explicit human operator override.
- **Access Limits**: Maximum 100 pilot organizations, each capped at 25 members.
