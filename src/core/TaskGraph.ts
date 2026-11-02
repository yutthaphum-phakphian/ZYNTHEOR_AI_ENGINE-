export enum NodeStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
}

export interface TaskNode {
  id: string;
  description: string;
  assignedAgent: 'ARCHITECT' | 'DEVELOPER' | 'DEBUGGER' | 'SECURITY' | 'TESTER';
  dependencies: string[];
  acceptanceCriteria: string;
  status: NodeStatus;
  result?: string;
}

export class TaskGraph {
  public nodes = new Map<string, TaskNode>();

  constructor(public objective: string) {}

  addNode(node: TaskNode): void {
    this.nodes.set(node.id, node);
  }

  validateGraph(): boolean {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const hasCycle = (id: string): boolean => {
      if (stack.has(id)) return true;
      if (visited.has(id)) return false;

      visited.add(id);
      stack.add(id);

      const node = this.nodes.get(id);
      if (node && Array.isArray(node.dependencies)) {
        for (const dep of node.dependencies) {
          if (hasCycle(dep)) return true;
        }
      }

      stack.delete(id);
      return false;
    };

    for (const id of this.nodes.keys()) {
      if (hasCycle(id)) {
        throw new Error(`❌ INVALID GRAPH: Cyclic dependency involving ${id}`);
      }
    }

    return true;
  }

  getReadyNodes(): TaskNode[] {
    return Array.from(this.nodes.values()).filter((n) => {
      if (n.status !== NodeStatus.PENDING && n.status !== NodeStatus.READY) return false;
      return n.dependencies.every((depId) => this.nodes.get(depId)?.status === NodeStatus.COMPLETED);
    });
  }
}
