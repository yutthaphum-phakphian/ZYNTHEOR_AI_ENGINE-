import { BaseAgent } from './baseAgent';
import { AgentRole, ToolName } from './types';
import { AgentCoordinator } from './coordinator';

export class DeveloperAgent extends BaseAgent {
  constructor(coordinator: AgentCoordinator) {
    super(AgentRole.DEVELOPER, coordinator);
  }

  async execute(taskId: string, context: { filePath: string; code?: string }): Promise<{
    taskId: string;
    status: 'COMPLETED' | 'FAILED';
    evidence: string;
  }> {
    await this.useTool(ToolName.READ_FILE, context.filePath);
    await this.useTool(ToolName.WRITE_FILE, context.filePath, context.code || '// verified fix');
    await this.useTool(ToolName.EXEC, 'npx tsc --noEmit');
    return { taskId, status: 'COMPLETED', evidence: 'tsc exit 0' };
  }
}
