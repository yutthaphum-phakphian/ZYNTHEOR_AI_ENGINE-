import { AgentRole, ToolName } from './types';
import { AgentCoordinator } from './coordinator';

export abstract class BaseAgent {
  constructor(public role: AgentRole, public coordinator: AgentCoordinator) {}

  protected async useTool(tool: ToolName, ...args: any[]): Promise<{ tool: ToolName; args: any[]; status: string }> {
    const allowed = await this.coordinator.checkPermission(this.role, tool);
    if (!allowed) {
      throw new Error(`Permission denied: ${this.role} -> ${tool}`);
    }
    console.log(`[${this.role}] using ${tool}`);
    return { tool, args, status: 'OK' };
  }

  abstract execute(taskId: string, context: any): Promise<any>;
}
