# Task Planning Engine Specification
**ZYNTHEOR AI ENGINE — Phase P8 Core Intelligence Advancement**

## 1. Executive Summary

The **Task Planning Engine** generates, manages, and executes structured multi-step plans. It maintains a 9-state state machine, supports task cancellation and recovery, enforces context token budgets, and ensures no task is marked `COMPLETED` without verified criteria passing.

---

## 2. 9-State Lifecycle Machine

```
      +------------+
      |  CREATED   |
      +-----+------+
            |
            v
      +------------+
      | ANALYZING  |
      +-----+------+
            |
            v
      +------------+
      |  PLANNING  |
      +-----+------+
            |
            +-----------------------+
            |                       |
            v                       v
  +------------------+     +------------------+
  | WAITING_APPROVAL |     |    EXECUTING     |
  +---------+--------+     +--------+---------+
            |                       |
            | (Human Approved)      v
            +----------------> +----+-----+
                               | VERIFYING|
                               +----+-----+
                                    |
            +-----------------------+-----------------------+
            |                       |                       |
            v                       v                       v
      +-----------+           +-----------+           +-----------+
      | COMPLETED |           |  FAILED   |           | CANCELLED |
      +-----------+           +-----------+           +-----------+
```

| State | Description |
| :--- | :--- |
| `CREATED` | Request received; task initialized with unique ID. |
| `ANALYZING` | Query analyzed for task classification and context scope. |
| `PLANNING` | Step sequence, risk tiers, and required tools mapped. |
| `WAITING_FOR_APPROVAL` | Execution paused at Human Approval Gate for high-risk operation. |
| `EXECUTING` | Authorized steps running under Tool Governance bounds. |
| `VERIFYING` | Tool outputs and criteria being validated by Verification Engine. |
| `COMPLETED` | All verification criteria passed with verified cryptographic evidence. |
| `FAILED` | Tool execution error, permission rejection, or verification failure. |
| `CANCELLED` | Aborted by user signal or system timeout. |

---

## 3. Plan Data Schema

```ts
export interface TaskPlan {
  taskId: string;
  workspaceId: string;
  userIntent: string;
  objective: string;
  taskType: TaskType;
  requiredContext: string[];
  contextBudgetTokens: number;
  plannedSteps: TaskPlanStep[];
  requiredTools: string[];
  requiredPermissions: string[];
  expectedOutput: string;
  verificationCriteria: string[];
  status: TaskState;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancellationReason?: string;
}
```

---

## 4. Single-Step Optimization for Simple Requests

To avoid unnecessary multi-step reasoning overhead, the Task Planning Engine evaluates prompt classification:
- For `SIMPLE_QUESTION` and `TECHNICAL_EXPLANATION`, it generates a single direct step (`order: 1`, `riskTier: 'LOW'`, `requiresApproval: false`).
- For `DEBUGGING`, `CODE_GENERATION`, `WORKSPACE_ANALYSIS`, `RESTRICTED_OPERATION`, and `MULTI_STEP_TASK`, it constructs a full multi-step plan with explicit tool gates.
