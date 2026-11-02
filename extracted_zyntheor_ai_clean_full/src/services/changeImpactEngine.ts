import { workspaceGraphService } from './workspaceGraph.ts';

export interface ImpactAnalysisReport {
  targetFile: string;
  changeType: 'schema' | 'api' | 'service' | 'component' | 'config';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedFiles: string[];
  dependentModules: string[];
  breakingApiContracts: string[];
  potentiallyBrokenTests: string[];
  affectedDbFields: string[];
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

    const affectedFilesSet = new Set<string>();
    const dependentModulesSet = new Set<string>();
    const breakingApiContractsSet = new Set<string>();
    const potentiallyBrokenTestsSet = new Set<string>();
    const affectedDbFieldsSet = new Set<string>();

    for (const edge of graphDetails.graph.edges) {
      if (edge.targetFile === targetNorm) {
        affectedFilesSet.add(edge.sourceFile);
        if (edge.sourceFile.startsWith('tests/')) {
          potentiallyBrokenTestsSet.add(edge.sourceFile);
        } else {
          dependentModulesSet.add(edge.sourceFile);
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
    } else if (targetNorm.includes('routes') || targetNorm.includes('server')) {
      changeType = 'api';
      riskLevel = 'HIGH';
      breakingApiContractsSet.add(`API Contract in ${targetNorm}`);
    } else if (targetNorm.includes('auth') || targetNorm.includes('rbac') || targetNorm.includes('billing')) {
      changeType = 'service';
      riskLevel = 'HIGH';
    } else if (targetNorm.includes('components')) {
      changeType = 'component';
      riskLevel = 'MEDIUM';
    } else if (targetNorm.includes('config') || targetNorm === 'package.json') {
      changeType = 'config';
      riskLevel = 'HIGH';
    }

    if (affectedFilesSet.size > 5 && riskLevel === 'LOW') {
      riskLevel = 'MEDIUM';
    }

    const recommendations: string[] = [];
    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      recommendations.push('Require Human Approval Gate before applying patch.');
      recommendations.push(`Run full automated regression test suite (${potentiallyBrokenTestsSet.size} test files affected).`);
    }
    recommendations.push('Verify API response signatures and backwards compatibility.');

    return {
      targetFile: targetNorm,
      changeType,
      riskLevel,
      affectedFiles: Array.from(affectedFilesSet),
      dependentModules: Array.from(dependentModulesSet),
      breakingApiContracts: Array.from(breakingApiContractsSet),
      potentiallyBrokenTests: Array.from(potentiallyBrokenTestsSet),
      affectedDbFields: Array.from(affectedDbFieldsSet),
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const changeImpactEngine = new ChangeImpactEngine();
