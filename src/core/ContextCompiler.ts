import { CodebaseIndexer, CodeChunk } from '../intelligence/CodebaseIndexer';

export interface ContextPackage {
  objective: string;
  relevantFiles: { path: string; symbols: string[]; snippet: string; score: number }[];
  constraints: string[];
  risks: string[];
  evidence: CodeChunk[];
}

export class ContextCompiler {
  private indexer: CodebaseIndexer;

  constructor(workspaceDir: string = process.cwd()) {
    this.indexer = new CodebaseIndexer(workspaceDir);
  }

  async initialize(): Promise<void> {
    await this.indexer.indexWorkspace();
  }

  async compile(userObjective: string): Promise<ContextPackage> {
    const topChunks = await this.indexer.search(userObjective, 5);
    const fileMap = new Map<string, CodeChunk[]>();

    topChunks.forEach((c) => {
      if (!fileMap.has(c.filePath)) {
        fileMap.set(c.filePath, []);
      }
      fileMap.get(c.filePath)!.push(c);
    });

    const relevantFiles = Array.from(fileMap.entries()).map(([p, chunks]) => ({
      path: p,
      symbols: chunks.map((c) => c.symbolName).filter(Boolean) as string[],
      snippet: chunks.map((c) => c.content.substring(0, 500)).join('\n\n// ---\n\n'),
      score: Math.max(...chunks.map((c) => c.score || 0)),
    }));

    return {
      objective: userObjective,
      relevantFiles,
      constraints: ['TypeScript strict mode', 'No new deps without approval', 'Local-only'],
      risks: ['High coupling may cause regression'],
      evidence: topChunks,
    };
  }
}
