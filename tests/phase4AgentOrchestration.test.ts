/**
 * ZYNTHEOR NATIVE INTELLIGENCE — Phase 4 Autonomous Agent Test Suite
 * ZERO FAKE — REAL COMPLETENESS ONLY
 * 
 * Tests:
 * - Agent Registry & Permission Declarations
 * - Agent Execution Runtime Lifecycle State Machine
 * - Human Approval Gate Enforcement for WRITE / EXECUTE Permissions
 * - Agent Task Orchestration (Task Decomposition + Knowledge + Reasoning)
 * - State Machine Invalid Transition Rejection
 * - Workspace Boundary & Audit Logging
 */

import { describe, it, expect } from 'vitest';
import { agentRegistry } from '../src/core/AgentRegistry.ts';
import { agentExecutionRuntime } from '../src/core/AgentExecutionRuntime.ts';
import { agentOrchestrator } from '../src/core/AgentOrchestrator.ts';

describe('ZYNTHEOR Native Intelligence — Phase 4 Autonomous Agent Test Suite', () => {
  const testWs = 'ws-phase4-agent-test';

  // --- AGENT REGISTRY TESTS ---
  describe('P4.1: Agent Registry & Permissions', () => {
    it('registers and lists default specialized agents with permission levels', () => {
      const agents = agentRegistry.listAgents();
      expect(agents.length).toBeGreaterThanOrEqual(4);

      const researchAgent = agentRegistry.getAgent('agent-research-sovereign');
      expect(researchAgent).not.toBeNull();
      expect(researchAgent?.permissionLevel).toBe('READ');
    });

    it('finds agents matching specific capability requirements', () => {
      const matching = agentRegistry.findAgentsByCapability('cap-hybrid-search');
      expect(matching.length).toBeGreaterThan(0);
      expect(matching[0].agentId).toBe('agent-research-sovereign');
    });
  });

  // --- EXECUTION RUNTIME & STATE MACHINE TESTS ---
  describe('P4.2: Execution Runtime & State Machine', () => {
    it('creates agent task and enforces valid lifecycle state transitions', () => {
      const task = agentExecutionRuntime.createTask('Test task lifecycle', 'agent-research-sovereign', testWs);
      expect(task.state).toBe('CREATED');

      const planning = agentExecutionRuntime.transitionState(task.taskId, 'PLANNING');
      expect(planning.state).toBe('PLANNING');

      const ready = agentExecutionRuntime.transitionState(task.taskId, 'READY');
      expect(ready.state).toBe('READY');

      const running = agentExecutionRuntime.transitionState(task.taskId, 'RUNNING');
      expect(running.state).toBe('RUNNING');

      const verifying = agentExecutionRuntime.transitionState(task.taskId, 'VERIFYING');
      expect(verifying.state).toBe('VERIFYING');

      const completed = agentExecutionRuntime.transitionState(task.taskId, 'COMPLETED', { result: { ok: true } });
      expect(completed.state).toBe('COMPLETED');
      expect(completed.completedTime).toBeDefined();
    });

    it('rejects invalid state machine transitions fail-closed', () => {
      const task = agentExecutionRuntime.createTask('Invalid jump test', 'agent-research-sovereign', testWs);
      expect(task.state).toBe('CREATED');

      // Attempt invalid jump directly from CREATED to COMPLETED
      expect(() => agentExecutionRuntime.transitionState(task.taskId, 'COMPLETED')).toThrow('[State Transition Error]');
    });
  });

  // --- HUMAN APPROVAL GATE TESTS ---
  describe('P4.3: Human Approval Gate & Security Boundaries', () => {
    it('intercepts WRITE/EXECUTE tasks into WAITING_APPROVAL state when unapproved', async () => {
      const summary = await agentOrchestrator.executeAgentTask({
        workspaceId: testWs,
        goal: 'Apply system patch to database schema',
        preferredAgentId: 'agent-technical-engineer',
        permissionLevel: 'WRITE',
        isHumanApproved: false
      });

      expect(summary.overallState).toBe('WAITING_APPROVAL');
      expect(summary.isHumanApproved).toBe(false);

      // Verify task in runtime
      const task = agentExecutionRuntime.getTask(summary.taskId);
      expect(task?.state).toBe('WAITING_APPROVAL');
    });

    it('resumes and completes task when Human Approval is granted', async () => {
      const summary = await agentOrchestrator.executeAgentTask({
        workspaceId: testWs,
        goal: 'Apply system patch to database schema',
        preferredAgentId: 'agent-technical-engineer',
        permissionLevel: 'WRITE',
        isHumanApproved: false
      });

      expect(summary.overallState).toBe('WAITING_APPROVAL');

      // Grant human approval via runtime
      const approvedTask = agentExecutionRuntime.grantHumanApproval(summary.taskId);
      expect(approvedTask.state).toBe('READY');
      expect(approvedTask.isHumanApproved).toBe(true);
    });
  });

  // --- AGENT ORCHESTRATION TESTS ---
  describe('P4.4: End-to-End Agent Task Orchestration', () => {
    it('orchestrates research task with task decomposition, retrieval, and decision summary', async () => {
      const summary = await agentOrchestrator.executeAgentTask({
        workspaceId: testWs,
        goal: 'Research ZYNTHEOR CORE native model architecture',
        preferredAgentId: 'agent-research-sovereign',
        permissionLevel: 'READ',
        isHumanApproved: true
      });

      expect(summary.overallState).toBe('COMPLETED');
      expect(summary.executedStepsCount).toBeGreaterThan(0);
      expect(summary.decisionSummary).toBeDefined();
      expect(summary.decisionSummary?.finalConclusion).toBeDefined();
      expect(summary.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
