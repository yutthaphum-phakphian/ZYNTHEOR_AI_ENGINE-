# ZYNTHEOR AI ENGINE — PROJECT-AWARE DEBUGGING SPECIFICATION

**Phase**: P9 — Workspace-Aware Intelligence  
**Component**: Project-Aware Debugger (`src/services/projectAwareDebugger.ts`)  
**Status**: Verified & Active  

---

## 1. Overview & Purpose

The **Project-Aware Debugger** implements an 11-step evidence-backed workflow for isolating, diagnosing, and fixing complex software bugs across workspace file boundaries.

---

## 2. The 11-Step Evidence-Backed Debugging Workflow

```
 1. Error Symptom Capture  ===>  2. Stack Trace Parsing     ===>  3. Symbol Location
                                                                         |
 6. Hypothesis Generation  <===  5. State/Data Flow        <===  4. Call Graph Tracing
       |
       v
 7. Hypothesis Verify     ===>  8. Root Cause Isolation   ===>  9. Multi-File Fix Gen
                                                                         |
11. Regression Check      <=== 10. Impact Verification     <===---------+
```

### Detailed Workflow Steps:
1. **Error Symptom Capture**: Record unhandled exceptions, console errors, or failed test assertions.
2. **Stack Trace Parsing**: Parse stack frame filenames, line numbers, and method names.
3. **Symbol Location in Workspace**: Map stack frame paths to workspace graph nodes.
4. **Call Graph Tracing**: Traverse caller and callee edges up and down the call stack.
5. **State/Data Flow Inspection**: Analyze type definitions and function parameters.
6. **Hypothesis Generation**: Formulate precise bug hypotheses.
7. **Hypothesis Verification**: Validate hypothesis against type contracts and AST logic.
8. **Root Cause Isolation**: Pinpoint exact file and line number responsible.
9. **Multi-File Fix Generation**: Plan synchronized code modifications.
10. **Impact Verification**: Evaluate risk level using Change Impact Analysis.
11. **Regression Check against Test Suite**: Identify affected test suites for execution.

---

## 3. REST API Integration

* **Endpoint**: `POST /api/intelligence/debug-session`
* **Request Body**:
```json
{
  "errorMessage": "TypeError: Cannot read properties of undefined (reading 'status')",
  "stackTrace": "Error: TypeError\n at verifyAndApprovePayment (src/services/billingService.ts:85:12)"
}
```
* **Response**:
```json
{
  "ok": true,
  "sessionId": "debug-1730276200000",
  "rootCauseFile": "src/services/billingService.ts",
  "rootCauseLine": 85,
  "overallStatus": "ISOLATED",
  "stepsPassedCount": 11
}
```
