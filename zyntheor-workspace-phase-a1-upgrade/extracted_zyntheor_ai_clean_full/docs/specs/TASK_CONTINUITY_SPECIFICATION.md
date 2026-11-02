# Task Continuity Specification
**ZYNTHEOR AI ENGINE — Phase P8 Core Intelligence Advancement**

## 1. Overview

The **Task Continuity Service** maintains persistent multi-step task memory across user sessions, allowing tasks to be paused at Human Approval Gates, resumed after approval, recovered after timeouts, and queried for historical audit.

---

## 2. Persistent Task Memory Schema

Task state is saved in `workspace_data/task_memory/` isolated by `workspaceId`:

```ts
export interface TaskMemoryRecord {
  id: string;
  taskId: string;
  workspaceId: string;
  userId?: string;
  parentTaskId?: string;
  goal: string;
  category: string;
  stagesCompleted: string[];
  findings: string[];
  evidenceDigests: string[];
  status: string; // COMPLETED | BLOCKED | FAILED | CANCELLED
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Resumption & Pause Mechanics

1. **Pause on Approval Required**:
   When a step requires human approval (`riskTier: 'HIGH'`) and `humanApprovals` is empty, the plan state transitions to `WAITING_FOR_APPROVAL` and the partial execution state is saved.
2. **Resumption**:
   When the user submits approval token (`humanApprovals: { 'workspace.mutate': true }`), the task is re-invoked with the same `taskId`, resuming from step 2 without re-running completed steps.
3. **Workspace Isolation**:
   Task memory records are stored with file locks and strictly segregated by `workspaceId`.
