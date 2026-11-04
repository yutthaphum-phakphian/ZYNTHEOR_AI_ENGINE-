import { workspaceGraphService } from './workspaceGraph.ts';

export interface ImpactAnalysisReport {
  targetFile: string;
  changeType: 'schema' | 'api' | 'service' | 'component' | 'config';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedFiles: string[];
  directlyAffectedFiles: string[];
  indirectlyAffectedFiles: string[];
  dependentModules: string[];
  breakingApiContracts: string[];
  potentiallyBrokenTests: string[];
  affectedDbFields: string[];
  securityImplications: string[];
  potentialRegressionAreas: string[];
  verifiedEvidence: string[];
  hypotheses: string[];
  recommendations: string[];
  generatedAt: string;
}

export class ChangeImpactEngine {
  public analyzeImpact(
    targetFile: string,
    proposedChangeSummary?: string
  ): ImpactAnalysisReport {
    const graphDetails = workspaceGraphService.getWorkspaceGraph();
    const targetNorm = targetFile.replace(/\\/g, '/');

    const directlyAffectedSet = new Set<string>();
    const indirectlyAffectedSet = new Set<string>();
    const dependentModulesSet = new Set<string>();
    const breakingApiContractsSet = new Set<string>();
    const potentiallyBrokenTestsSet = new Set<string>();
    const affectedDbFieldsSet = new Set<string>();
    const securityImplications: string[] = [];
    const potentialRegressionAreas: string[] = [];
    const verifiedEvidence: string[] = [];
    const hypotheses: string[] = [];

    // 1. Direct Dependents
    for (const edge of graphDetails.graph.edges) {
      if (edge.targetFile === targetNorm) {
        directlyAffectedSet.add(edge.sourceFile);
        if (edge.sourceFile.startsWith('tests/')) {
          potentiallyBrokenTestsSet.add(edge.sourceFile);
        } else {
          dependentModulesSet.add(edge.sourceFile);
        }
      }
    }

    // 2. Indirect (Transitive) Dependents
    const queue = Array.from(directlyAffectedSet);
    const visited = new Set<string>(queue);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of graphDetails.graph.edges) {
        if (edge.targetFile === current && !visited.has(edge.sourceFile) && edge.sourceFile !== targetNorm) {
          visited.add(edge.sourceFile);
          indirectlyAffectedSet.add(edge.sourceFile);
          queue.push(edge.sourceFile);
          if (edge.sourceFile.startsWith('tests/')) {
            potentiallyBrokenTestsSet.add(edge.sourceFile);
          } else {
            dependentModulesSet.add(edge.sourceFile);
          }
        }
      }
    }

    let changeType: ImpactAnalysisReport['changeType'] = 'service';
    let riskLevel: ImpactAnalysisReport['riskLevel'] = 'LOW';

    if (targetNorm.includes('schema') || targetNorm.includes('database')) {
      changeType = 'schema';
      riskLevel = 'CRITICAL';
      affectedDbFieldsSet.add('tenant_id');
      affectedDbFieldsSet.add('role');
      affectedDbFieldsSet.add('status');
      securityImplications.push('Database schema alteration: Cross-tenant data isolation must be verified.');
      potentialRegressionAreas.push('Tenant scoped queries and migration rollbacks');
      hypotheses.push('Altering schema columns without default values could fail existing read queries.');
    } else if (targetNorm.includes('routes') || targetNorm.includes('server')) {
      changeType = 'api';
      riskLevel = 'HIGH';
      breakingApiContractsSet.add(`API Contract in ${targetNorm}`);
      securityImplications.push('API route alteration: Verify authentication middleware and rate-limiting enforcement.');
      potentialRegressionAreas.push('Client API consumers and integration test suites');
      hypotheses.push('Changes to request validation schemas may reject previously valid payload keys.');
    } else if (targetNorm.includes('auth') || targetNorm.includes('rbac') || targetNorm.includes('billing')) {
      changeType = 'service';
      riskLevel = 'HIGH';
      securityImplications.push('Authorization service modification: Fail-closed role checks must remain intact.');
      potentialRegressionAreas.push('Session resolution and permission matrix validation');
      hypotheses.push('Token validation logic changes could inadvertently grant elevated privileges.');
    } else if (targetNorm.includes('components')) {
      changeType = 'component';
      riskLevel = 'MEDIUM';
      potentialRegressionAreas.push('UI rendering, state synchronization, and keyboard accessibility');
      hypotheses.push('Component prop changes may trigger cascading re-renders or missing prop errors.');
    } else if (targetNorm.includes('config') || targetNorm === 'package.json') {
      changeType = 'config';
      riskLevel = 'HIGH';
      securityImplications.push('Build or runtime configuration change: Verify port 3000 binding and dependency integrity.');
      potentialRegressionAreas.push('Container startup, dev server initialization, and module resolution');
    }

    const totalAffected = directlyAffectedSet.size + indirectlyAffectedSet.size;
    if (totalAffected > 8 && (riskLevel === 'LOW' || riskLevel === 'MEDIUM')) {
      riskLevel = 'HIGH';
    }

    // Evidence statements (strictly factual from AST graph)
    verifiedEvidence.push(`Target module '${targetNorm}' analyzed in repository AST dependency graph.`);
    verifiedEvidence.push(`Direct dependents identified: ${directlyAffectedSet.size} file(s).`);
    verifiedEvidence.push(`Transitive (indirect) dependents identified: ${indirectlyAffectedSet.size} file(s).`);
    verifiedEvidence.push(`Associated regression test files identified: ${potentiallyBrokenTestsSet.size} file(s).`);

    const recommendations: string[] = [];
    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      recommendations.push('Require Human Approval Gate before applying patch.');
      recommendations.push(`Run full automated regression test suite (${potentiallyBrokenTestsSet.size} test files affected).`);
    }
    recommendations.push('Verify API response signatures and backwards compatibility.');

    const allAffectedFiles = Array.from(new Set([...directlyAffectedSet, ...indirectlyAffectedSet]));

    return {
      targetFile: targetNorm,
      changeType,
      riskLevel,
      affectedFiles: allAffectedFiles,
      directlyAffectedFiles: Array.from(directlyAffectedSet),
      indirectlyAffectedFiles: Array.from(indirectlyAffectedSet),
      dependentModules: Array.from(dependentModulesSet),
      breakingApiContracts: Array.from(breakingApiContractsSet),
      potentiallyBrokenTests: Array.from(potentiallyBrokenTestsSet),
      affectedDbFields: Array.from(affectedDbFieldsSet),
      securityImplications,
      potentialRegressionAreas,
      verifiedEvidence,
      hypotheses,
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const changeImpactEngine = new ChangeImpactEngine();
