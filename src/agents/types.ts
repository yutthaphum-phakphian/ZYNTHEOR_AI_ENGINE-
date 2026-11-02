export enum AgentRole {
  ARCHITECT = 'ARCHITECT',
  RESEARCHER = 'RESEARCHER',
  PLANNER = 'PLANNER',
  DEVELOPER = 'DEVELOPER',
  DEBUGGER = 'DEBUGGER',
  SECURITY_REVIEWER = 'SECURITY_REVIEWER',
  CODE_REVIEWER = 'CODE_REVIEWER',
  TEST_ENGINEER = 'TEST_ENGINEER',
  RELEASE_MANAGER = 'RELEASE_MANAGER',
}

export enum ToolName {
  READ_FILE = 'readFile',
  WRITE_FILE = 'writeFile',
  EXEC = 'exec',
  GIT_PUSH = 'gitPush',
  MERGE_PR = 'mergePR',
  APPROVE_GATE = 'approveGate',
  SEMANTIC_SEARCH = 'semanticSearch',
  SECURITY_SCAN = 'securityScan',
}

export interface AgentDefinition {
  role: AgentRole;
  responsibility: string;
  allowedTools: ToolName[];
  permissionLevel: 'L1_READ' | 'L2_WRITE' | 'L3_EXEC' | 'L4_APPROVE' | 'L5_RELEASE';
  maxRetries: number;
  requiresApproval: boolean;
  inputSchema: any;
  outputSchema: any;
}

export interface AgentMessage {
  from: AgentRole;
  to: AgentRole | 'COORDINATOR';
  taskId: string;
  type: 'PROPOSE' | 'CONFLICT' | 'EVIDENCE' | 'COMPLETED' | 'FAILED';
  payload: any;
  timestamp: string;
  digest: string;
}
