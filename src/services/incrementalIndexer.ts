import { buildCodeGraph, type CodeGraphData } from './codeGraph.ts';

export interface IncrementalIndexDelta {
  addedFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  invalidatedSymbols: string[];
  graphData: CodeGraphData;
  indexedAt: string;
}

export class IncrementalIndexer {
  private lastIndexedMtimes: Map<string, number> = new Map();

  public processIncrementalUpdate(changedFiles?: string[]): IncrementalIndexDelta {
    const previousGraph = buildCodeGraph();
    const updatedGraph = buildCodeGraph({
      forceReindex: false,
      targetFiles: changedFiles,
    });

    const addedFiles: string[] = [];
    const modifiedFiles: string[] = [];
    const deletedFiles: string[] = [];
    const invalidatedSymbols: string[] = [];

    const currentFilesSet = new Set(updatedGraph.nodes.map(n => n.file));
    const previousFilesSet = new Set(previousGraph.nodes.map(n => n.file));

    for (const file of currentFilesSet) {
      if (!previousFilesSet.has(file)) {
        addedFiles.push(file);
      }
    }

    for (const file of previousFilesSet) {
      if (!currentFilesSet.has(file)) {
        deletedFiles.push(file);
      }
    }

    if (changedFiles) {
      for (const file of changedFiles) {
        if (currentFilesSet.has(file) && previousFilesSet.has(file)) {
          modifiedFiles.push(file);
        }
      }
    }

    return {
      addedFiles,
      modifiedFiles,
      deletedFiles,
      invalidatedSymbols,
      graphData: updatedGraph,
      indexedAt: new Date().toISOString(),
    };
  }
}

export const incrementalIndexer = new IncrementalIndexer();
