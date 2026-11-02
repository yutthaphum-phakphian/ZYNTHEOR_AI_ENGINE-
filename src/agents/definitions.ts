import { AgentRole, ToolName, AgentDefinition } from './types';

export const AGENT_DEFINITIONS: Record<AgentRole, AgentDefinition> = {
  [AgentRole.ARCHITECT]: {
    role: AgentRole.ARCHITECT,
    responsibility: 'Design architecture and task decomposition',
    allowedTools: [ToolName.READ_FILE, ToolName.SEMANTIC_SEARCH],
    permissionLevel: 'L1_READ',
    maxRetries: 2,
    requiresApproval: false,
    inputSchema: { objective: 'string' },
    outputSchema: { architectureMap: 'object' },
  },
  [AgentRole.RESEARCHER]: {
    role: AgentRole.RESEARCHER,
    responsibility: 'Research docs and evidence',
    allowedTools: [ToolName.READ_FILE, ToolName.SEMANTIC_SEARCH],
    permissionLevel: 'L1_READ',
    maxRetries: 2,
    requiresApproval: false,
    inputSchema: {},
    outputSchema: {},
  },
  [AgentRole.PLANNER]: {
    role: AgentRole.PLANNER,
    responsibility: 'Build DAG task graph',
    allowedTools: [ToolName.READ_FILE],
    permissionLevel: 'L1_READ',
    maxRetries: 3,
    requiresApproval: true, // Must approve plan
    inputSchema: {},
    outputSchema: {},
  },
  [AgentRole.DEVELOPER]: {
    role: AgentRole.DEVELOPER,
    responsibility: 'Write code fix',
    allowedTools: [
      ToolName.READ_FILE,
      ToolName.WRITE_FILE,
      ToolName.EXEC,
      ToolName.SEMANTIC_SEARCH,
    ],
    permissionLevel: 'L2_WRITE',
    maxRetries: 3,
    requiresApproval: false,
    inputSchema: {},
    outputSchema: {},
  },
  [AgentRole.DEBUGGER]: {
    role: AgentRole.DEBUGGER,
    responsibility: 'OBSERVE->REPRODUCE->LOCALIZE->FIX',
    allowedTools: [ToolName.READ_FILE, ToolName.EXEC, ToolName.WRITE_FILE],
    permissionLevel: 'L2_WRITE',
    maxRetries: 3,
    requiresApproval: false,
    inputSchema: {},
    outputSchema: {},
  },
  [AgentRole.SECURITY_REVIEWER]: {
    role: AgentRole.SECURITY_REVIEWER,
    responsibility: 'Scan secrets and injection risks',
    allowedTools: [ToolName.READ_FILE, ToolName.SECURITY_SCAN],
    permissionLevel: 'L1_READ',
    maxRetries: 1,
    requiresApproval: false,
    inputSchema: {},
    outputSchema: {},
  },
  [AgentRole.CODE_REVIEWER]: {
    role: AgentRole.CODE_REVIEWER,
    responsibility: 'Review diff before PR',
    allowedTools: [ToolName.READ_FILE],
    permissionLevel: 'L1_READ',
    maxRetries: 1,
    requiresApproval: false,
    inputSchema: {},
    outputSchema: {},
  },
  [AgentRole.TEST_ENGINEER]: {
    role: AgentRole.TEST_ENGINEER,
    responsibility: 'Run L4-L8 verification',
    allowedTools: [ToolName.READ_FILE, ToolName.EXEC],
    permissionLevel: 'L3_EXEC',
    maxRetries: 2,
    requiresApproval: false,
    inputSchema: {},
    outputSchema: {},
  },
  [AgentRole.RELEASE_MANAGER]: {
    role: AgentRole.RELEASE_MANAGER,
    responsibility: 'Create Draft PR only - CANNOT merge',
    allowedTools: [ToolName.GIT_PUSH], // Strictly disallow MERGE_PR and APPROVE_GATE
    permissionLevel: 'L3_EXEC',
    maxRetries: 1,
    requiresApproval: true,
    inputSchema: {},
    outputSchema: {},
  },
};

// Fail Closed: Agents cannot self-approve Gate or merge PR (human gate strictly enforced)
export function canApprove(requester: AgentRole, targetAction: ToolName): boolean {
  if (targetAction === ToolName.APPROVE_GATE) return false;
  if (targetAction === ToolName.MERGE_PR) return false;
  return true;
}
