import { Project } from 'ts-morph';
import { EmbeddingService } from './EmbeddingService';
import path from 'path';
import fs from 'fs';

export interface CodeChunk {
  filePath: string;
  content: string;
  type: 'function' | 'class' | 'interface' | 'file';
  symbolName?: string;
  vector: number[];
  score?: number;
}

export class CodebaseIndexer {
  private project: Project;
  private chunks: CodeChunk[] = [];
  private indexed = false;
  private workspaceDir: string;

  constructor(workspaceDir: string = process.cwd()) {
    this.workspaceDir = path.resolve(workspaceDir);
    const tsConfigPath = path.join(this.workspaceDir, 'tsconfig.json');

    if (fs.existsSync(tsConfigPath)) {
      this.project = new Project({
        tsConfigFilePath: tsConfigPath,
        skipAddingFilesFromTsConfig: false,
        skipFileDependencyResolution: true,
      });
    } else {
      this.project = new Project({
        compilerOptions: { allowJs: true },
        skipFileDependencyResolution: true,
      });
    }

    const globPattern = path.join(this.workspaceDir, 'src/**/*.{ts,tsx}');
    this.project.addSourceFilesAtPaths(globPattern);
  }

  async indexWorkspace(maxFiles: number = 30): Promise<void> {
    this.chunks = [];
    const sourceFiles = this.project.getSourceFiles().slice(0, maxFiles); // Budgeting: 30 files max

    for (const sf of sourceFiles) {
      const filePath = sf.getFilePath();
      if (filePath.includes('node_modules') || filePath.includes('.test.') || filePath.includes('.spec.')) {
        continue;
      }

      // Chunk per function
      const functions = sf.getFunctions().slice(0, 20);
      for (const fn of functions) {
        const text = fn.getText().substring(0, 1500);
        if (text.length < 20) continue;
        const vector = await EmbeddingService.embed(text);
        this.chunks.push({
          filePath,
          content: text,
          type: 'function',
          symbolName: fn.getName() || undefined,
          vector,
        });
      }

      // Chunk per class
      const classes = sf.getClasses().slice(0, 10);
      for (const cls of classes) {
        const text = cls.getText().substring(0, 1500);
        const vector = await EmbeddingService.embed(text);
        this.chunks.push({
          filePath,
          content: text,
          type: 'class',
          symbolName: cls.getName() || undefined,
          vector,
        });
      }

      // Chunk per interface
      const interfaces = sf.getInterfaces().slice(0, 10);
      for (const iface of interfaces) {
        const text = iface.getText().substring(0, 1000);
        if (text.length < 20) continue;
        const vector = await EmbeddingService.embed(text);
        this.chunks.push({
          filePath,
          content: text,
          type: 'interface',
          symbolName: iface.getName() || undefined,
          vector,
        });
      }
    }

    this.indexed = true;
    console.log(`✅ Indexed ${this.chunks.length} chunks (Hybrid AST+Vector)`);
  }

  async search(query: string, topK: number = 5): Promise<CodeChunk[]> {
    if (!this.indexed) {
      await this.indexWorkspace();
    }

    if (this.chunks.length === 0) {
      return [];
    }

    const qVec = await EmbeddingService.embed(query);
    const scored = this.chunks.map((ch) => {
      const sim = EmbeddingService.cosineSimilarity(qVec, ch.vector);
      const exactBonus =
        ch.symbolName && query.toLowerCase().includes(ch.symbolName.toLowerCase()) ? 0.2 : 0;
      return {
        ...ch,
        score: Number((sim + exactBonus).toFixed(4)),
      };
    });

    return scored
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, topK);
  }

  getChunkCount(): number {
    return this.chunks.length;
  }
}
