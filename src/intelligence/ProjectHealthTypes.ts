export enum Priority {
  P0 = 'P0',
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4',
}

export interface HealthFinding {
  id?: string;
  priority: Priority;
  category:
    | 'architecture'
    | 'tech-debt'
    | 'dependency'
    | 'test-coverage'
    | 'security'
    | 'performance'
    | 'duplicate'
    | 'incomplete'
    | 'docs';
  title: string;
  evidence: string;
  filePath?: string;
  line?: number;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface ProjectHealthReport {
  scores: {
    architecture: number;
    techDebt: number;
    security: number;
    testCoverage: number;
  };
  findings: HealthFinding[];
  timestamp: string;
  requiresApproval: boolean;
}
