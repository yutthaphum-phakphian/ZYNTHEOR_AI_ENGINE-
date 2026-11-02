import { workspaceGraphService, type SymbolLocation } from './workspaceGraph.ts';
import fs from 'node:fs';
import path from 'node:path';

export interface CrossFileContextUnit {
  file: string;
  relevanceScore: number;
  reason: string;
  symbols: SymbolLocation[];
  snippet?: string;
}

export interface MultiFileEditPlan {
  planId: string;
  summary: string;
  primaryFile: string;
  dependentFiles: string[];
  edits: Array<{
    file: string;
    action: 'modify' | 'create' | 'delete';
    description: string;
    affectedSymbols: string[];
  }>;
  riskAssessment: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class CrossFileReasoningEngine {
  public assembleCrossFileContext(
    prompt: string,
    targetFiles: string[] = []
  ): { contextUnits: CrossFileContextUnit[]; totalTokensEstimated: number } {
    const graphDetails = workspaceGraphService.getWorkspaceGraph();
    const contextUnits: CrossFileContextUnit[] = [];

    const promptLower = prompt.toLowerCase();

    for (const fileNode of graphDetails.graph.nodes) {
      const isTarget = targetFiles.includes(fileNode.file);
      const isMatch = fileNode.file.toLowerCase().includes(promptLower) ||
        fileNode.symbols.some(s => promptLower.includes(s.toLowerCase()));

      if (isTarget || isMatch) {
        const fileSymbols = graphDetails.symbols.filter(s => s.file === fileNode.file);
        let snippet = '';

        try {
          const fullPath = path.join(process.cwd(), fileNode.file);
          if (fs.existsSync(fullPath)) {
            const raw = fs.readFileSync(fullPath, 'utf8');
            snippet = raw.slice(0, 1500); // Preservation of key headers and exports
          }
        } catch {
          // ignore
        }

        contextUnits.push({
          file: fileNode.file,
          relevanceScore: isTarget ? 1.0 : 0.85,
          reason: isTarget ? 'Direct target file specified by caller' : 'Symbol or filename keyword match',
          symbols: fileSymbols,
          snippet,
        });
      }
    }

    const totalTokensEstimated = contextUnits.reduce(
      (acc, unit) => acc + Math.ceil((unit.snippet?.length || 0) / 4),
      0
    );

    return {
      contextUnits,
      totalTokensEstimated,
    };
  }

  public planMultiFileChanges(
    primaryFile: string,
    changeDescription: string
  ): MultiFileEditPlan {
    const graphDetails = workspaceGraphService.getWorkspaceGraph();
    const related = graphDetails.graph.edges.filter(
      e => e.sourceFile === primaryFile || e.targetFile === primaryFile
    );

    const dependentFiles = Array.from(
      new Set(
        related
          .map(e => (e.sourceFile === primaryFile ? e.targetFile : e.sourceFile))
          .filter(f => !f.startsWith('package:'))
      )
    );

    const isHighRisk = primaryFile.includes('schema') || primaryFile.includes('auth') || primaryFile.includes('billing');

    return {
      planId: `plan-${Date.now()}`,
      summary: `Synchronized multi-file edit for '${primaryFile}'`,
      primaryFile,
      dependentFiles,
      edits: [
        {
          file: primaryFile,
          action: 'modify',
          description: changeDescription,
          affectedSymbols: [],
        },
        ...dependentFiles.map(dep => ({
          file: dep,
          action: 'modify' as const,
          description: `Update dependent references to '${primaryFile}'`,
          affectedSymbols: [],
        })),
      ],
      riskAssessment: isHighRisk ? 'HIGH' : 'LOW',
    };
  }
}

export const crossFileReasoningEngine = new CrossFileReasoningEngine();
