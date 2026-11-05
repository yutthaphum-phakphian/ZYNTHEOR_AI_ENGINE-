// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';

export interface FileClassification {
  path: string;
  category: 'source' | 'test' | 'config' | 'document' | 'asset' | 'style' | 'build' | 'other';
  language: string;
  sizeBytes: number;
}

export interface DependencyOverview {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency';
}

export interface ProjectStructureAnalysis {
  rootPath: string;
  totalFiles: number;
  hierarchy: Record<string, string[]>;
  files: FileClassification[];
  frameworks: string[];
  entryPoints: string[];
  configFiles: string[];
  testStructure: {
    directory: string;
    totalTestFiles: number;
    framework: string;
  };
  dependencies: DependencyOverview[];
  analyzedAt: string;
}

export class ProjectStructureEngine {
  public analyzeProjectStructure(
    rootPath: string = process.cwd(),
    virtualFiles?: Record<string, string>
  ): ProjectStructureAnalysis {
    let fileList: Array<{ relativePath: string; content?: string; size: number }> = [];

    if (virtualFiles && Object.keys(virtualFiles).length > 0) {
      for (const [relPath, content] of Object.entries(virtualFiles)) {
        fileList.push({
          relativePath: relPath.replace(/^\//, ''),
          content,
          size: Buffer.byteLength(content, 'utf8'),
        });
      }
    } else if (fs.existsSync(rootPath)) {
      fileList = this.walkDirectorySync(rootPath, rootPath);
    }

    const hierarchy: Record<string, string[]> = {};
    const classifiedFiles: FileClassification[] = [];
    const frameworks = new Set<string>();
    const entryPoints: string[] = [];
    const configFiles: string[] = [];
    const dependencies: DependencyOverview[] = [];
    let totalTestFiles = 0;

    for (const file of fileList) {
      const relPath = file.relativePath;
      const dir = path.dirname(relPath) === '.' ? '/' : `/${path.dirname(relPath)}`;

      if (!hierarchy[dir]) {
        hierarchy[dir] = [];
      }
      hierarchy[dir].push(path.basename(relPath));

      const classification = this.classifyFile(relPath, file.size);
      classifiedFiles.push(classification);

      if (classification.category === 'test') {
        totalTestFiles++;
      }

      if (classification.category === 'config') {
        configFiles.push(relPath);
      }

      // Framework / Stack detection based on files
      if (relPath === 'package.json') {
        try {
          const pkgContent = file.content || (fs.existsSync(path.join(rootPath, 'package.json'))
            ? fs.readFileSync(path.join(rootPath, 'package.json'), 'utf8')
            : '{}');
          const pkg = JSON.parse(pkgContent);

          if (pkg.main) entryPoints.push(pkg.main);
          if (pkg.module) entryPoints.push(pkg.module);

          const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

          if (allDeps.react) frameworks.add(`React ${allDeps.react}`);
          if (allDeps.vite) frameworks.add('Vite');
          if (allDeps.express) frameworks.add('Express');
          if (allDeps.typescript) frameworks.add('TypeScript');
          if (allDeps.tailwindcss || allDeps['@tailwindcss/vite']) frameworks.add('Tailwind CSS');
          if (allDeps.d3) frameworks.add('D3.js');

          for (const [name, version] of Object.entries(pkg.dependencies || {})) {
            dependencies.push({ name, version: String(version), type: 'dependency' });
          }
          for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
            dependencies.push({ name, version: String(version), type: 'devDependency' });
          }
        } catch {
          // ignore parse error
        }
      }

      if (['index.html', 'server.ts', 'src/main.tsx', 'src/App.tsx', 'index.ts', 'server.js'].includes(relPath)) {
        entryPoints.push(relPath);
      }
    }

    if (fs.existsSync(path.join(rootPath, 'vite.config.ts'))) frameworks.add('Vite Build Pipeline');
    if (fs.existsSync(path.join(rootPath, 'tsconfig.json'))) frameworks.add('TypeScript Static Typing');

    return {
      rootPath,
      totalFiles: classifiedFiles.length,
      hierarchy,
      files: classifiedFiles,
      frameworks: Array.from(frameworks),
      entryPoints: Array.from(new Set(entryPoints)),
      configFiles,
      testStructure: {
        directory: '/tests',
        totalTestFiles,
        framework: 'Node Test Runner (node --test)',
      },
      dependencies,
      analyzedAt: new Date().toISOString(),
    };
  }

  private classifyFile(relPath: string, sizeBytes: number): FileClassification {
    const ext = path.extname(relPath).toLowerCase();
    const basename = path.basename(relPath).toLowerCase();

    let category: FileClassification['category'] = 'source';
    let language = 'text';

    if (relPath.includes('test') || relPath.includes('spec') || relPath.startsWith('tests/')) {
      category = 'test';
    } else if (
      basename.includes('config') ||
      ['package.json', 'tsconfig.json', 'fly.toml', '.gitignore', '.env.example'].includes(basename)
    ) {
      category = 'config';
    } else if (['.md', '.txt', '.sha256'].some(e => basename.endsWith(e))) {
      category = 'document';
    } else if (['.png', '.jpg', '.svg', '.ico'].some(e => basename.endsWith(e))) {
      category = 'asset';
    } else if (['.css', '.scss', '.less'].some(e => basename.endsWith(e))) {
      category = 'style';
    }

    switch (ext) {
      case '.ts':
      case '.tsx':
        language = 'typescript';
        break;
      case '.js':
      case '.jsx':
      case '.mjs':
      case '.cjs':
        language = 'javascript';
        break;
      case '.json':
        language = 'json';
        break;
      case '.html':
        language = 'html';
        break;
      case '.css':
        language = 'css';
        break;
      case '.md':
        language = 'markdown';
        break;
      case '.yml':
      case '.yaml':
        language = 'yaml';
        break;
      case '.sh':
        language = 'shell';
        break;
      default:
        language = ext ? ext.replace('.', '') : 'unknown';
    }

    return {
      path: relPath,
      category,
      language,
      sizeBytes,
    };
  }

  private walkDirectorySync(
    dir: string,
    baseDir: string
  ): Array<{ relativePath: string; content?: string; size: number }> {
    const results: Array<{ relativePath: string; content?: string; size: number }> = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (['node_modules', '.git', 'dist', 'build', '.aistudio'].includes(entry.name)) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(baseDir, fullPath);

      if (entry.isDirectory()) {
        results.push(...this.walkDirectorySync(fullPath, baseDir));
      } else if (entry.isFile()) {
        const stats = fs.statSync(fullPath);
        results.push({
          relativePath: relPath,
          size: stats.size,
        });
      }
    }

    return results;
  }
}

export const projectStructureEngine = new ProjectStructureEngine();
