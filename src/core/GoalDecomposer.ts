import { TaskGraph, NodeStatus } from './TaskGraph';
import { ContextPackage } from './ContextCompiler';

export class GoalDecomposer {
  async decompose(context: ContextPackage): Promise<TaskGraph> {
    console.log('🧠 Decomposing Goal...');
    // Zero-Mock: Heuristic task graph generation based on context evidence
    const graph = new TaskGraph(context.objective);
    const files = context.relevantFiles.slice(0, 3);
    const fileList = files.length > 0 ? files.map((f) => f.path).join(', ') : 'workspace codebase';

    graph.addNode({
      id: 'TASK-1',
      description: `Analyze ${fileList} for ${context.objective}`,
      assignedAgent: 'ARCHITECT',
      dependencies: [],
      acceptanceCriteria: 'Architecture map generated',
      status: NodeStatus.PENDING,
    });

    graph.addNode({
      id: 'TASK-2',
      description: `Implement core logic for ${context.objective}`,
      assignedAgent: 'DEVELOPER',
      dependencies: ['TASK-1'],
      acceptanceCriteria: 'Code passes tsc --noEmit',
      status: NodeStatus.PENDING,
    });

    graph.addNode({
      id: 'TASK-3',
      description: 'Security scan for hardcoded secrets and permission compliance',
      assignedAgent: 'SECURITY',
      dependencies: ['TASK-2'],
      acceptanceCriteria: 'No CONFIRMED_FINDING',
      status: NodeStatus.PENDING,
    });

    graph.addNode({
      id: 'TASK-4',
      description: 'Run verification tests and regression validation',
      assignedAgent: 'TESTER',
      dependencies: ['TASK-2'],
      acceptanceCriteria: 'npm test passes',
      status: NodeStatus.PENDING,
    });

    graph.validateGraph();
    return graph;
  }
}
