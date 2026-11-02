# Tool Governance Specification
**ZYNTHEOR AI ENGINE — Phase P8 Core Intelligence Advancement**

## 1. Governance Objectives

The **Tool Governance Engine** (`ToolGovernanceEngine`) provides strict server-side control over AI tool usage. It classifies tools into 3 Risk Tiers, enforces argument validation, manages execution timeouts, logs operations to an append-only Audit Ledger, and requires human authorization for high-risk operations.

---

## 2. 3-Tier Risk Classification

```
+-------------------------------------------------------------------+
|                        TOOL RISK TIERS                            |
+-------------------------------------------------------------------+
| LOW RISK:      Read-only inspection and analysis                  |
|                (repo.inspect, workspace.inspect, code.analyze)   |
+-------------------------------------------------------------------+
| MEDIUM RISK:   Proposed changes, dry-run simulations              |
|                (code.propose_diff, dryRunTool)                    |
+-------------------------------------------------------------------+
| HIGH RISK:     File modification, shell execution, deployment    |
|                (workspace.mutate, sandboxRunner)                 |
|                REQUIRES EXPLICIT HUMAN APPROVAL TOKEN!            |
+-------------------------------------------------------------------+
```

---

## 3. Tool Authorization & Human Approval Gate

- **Server-Side Validation**: Tool execution validation occurs in Express middleware and service layers.
- **Self-Approval Prohibition**: Models are strictly forbidden from approving their own restricted actions.
- **Approval Check**:
  ```ts
  if (tool.requiresHumanApproval || tool.riskTier === 'HIGH') {
    const isApproved = Boolean(ctx.humanApprovals[tool.toolId] || ctx.humanApprovals['all_tools']);
    if (!isApproved) {
      throw new Error("High-risk tool requires explicit human authorization.");
    }
  }
  ```

---

## 4. Dry Run Mode

When `isDryRun: true`:
- High-risk operations are simulated in an isolated dry-run container without modifying actual workspace files.
- The simulation outcome is logged to the Audit Ledger (`TOOL_DRY_RUN_SIMULATION`) with a cryptographic SHA-256 digest and confirmation token.
