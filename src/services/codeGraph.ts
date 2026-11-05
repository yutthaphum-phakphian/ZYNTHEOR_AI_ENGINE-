// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';

export type RelationshipType =
  | 'IMPORTS'
  | 'CALLS'
  | 'DEPENDS_ON'
  | 'TESTS'
  | 'SERVES_API'
  | 'DEFINES_COMPONENT'
  | 'DEFINES_SERVICE';

export interface GraphNode {
  id: string; // relative path e.g. "src/App.tsx"
  file: string; // relative path
  extension: string;
  sizeBytes: number;
  mtimeMs: number;
  language: string;
  symbols: string[]; // exported or defined function/class/component names
  category: 'component' | 'service' | 'route' | 'lib' | 'test' | 'config' | 'other';
}

export interface GraphEdge {
  id: string;
  sourceFile: string;
  sourceLine?: number;
  targetFile: string;
  targetSymbol?: string;
  relationshipType: RelationshipType;
  metadata?: Record<string, unknown>;
}

export interface CodeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  indexedAt: string;
  totalFiles: number;
  totalEdges: number;
  incrementalUpdatedFiles: number;
}

const ROOT_DIR = process.cwd();
const ALLOWED_ROOT = path.resolve(ROOT_DIR);
const MAX_BYTES = 200_000;

// Cache state for incremental indexing
let cachedGraph: CodeGraphData | null = null;
const fileMtimeCache = new Map<string, number>();

function detectLanguage(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.ts':
    case '.mts':
      return 'TypeScript';
    case '.tsx':
      return 'TypeScript React';
    case '.js':
    case '.mjs':
      return 'JavaScript';
    case '.jsx':
      return 'JavaScript React';
    case '.json':
      return 'JSON';
    case '.css':
      return 'CSS';
    case '.html':
      return 'HTML';
    case '.py':
      return 'Python';
    case '.sh':
      return 'Shell Script';
    default:
      return 'Plain Text';
  }
}

function detectCategory(relPath: string): GraphNode['category'] {
  const norm = relPath.replace(/\\/g, '/');
  if (norm.startsWith('tests/')) return 'test';
  if (norm.startsWith('src/routes/')) return 'route';
  if (norm.startsWith('src/components/')) return 'component';
  if (norm.startsWith('src/services/')) return 'service';
  if (norm.startsWith('lib/')) return 'lib';
  if (norm.endsWith('.json') || norm.endsWith('.config.ts') || norm === 'server.ts') return 'config';
  return 'other';
}

function resolveImportPath(sourceRelFile: string, importPath: string): string | null {
  if (!importPath || typeof importPath !== 'string') return null;

  // External package import (e.g., 'express', 'react')
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return `package:${importPath}`;
  }

  const dir = path.dirname(path.join(ROOT_DIR, sourceRelFile));
  let resolvedAbsolute = path.resolve(dir, importPath);

  // Try extensions
  const extensions = ['', '.ts', '.tsx', '.mts', '.js', '.mjs', '.jsx', '/index.ts', '/index.tsx', '/index.js'];
  for (const ext of extensions) {
    const candidate = resolvedAbsolute + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.relative(ROOT_DIR, candidate).replace(/\\/g, '/');
    }
  }

  return null;
}

function extractSymbolsAndImports(content: string): { imports: Array<{ path: string; line: number }>; exports: string[] } {
  const imports: Array<{ path: string; line: number }> = [];
  const exports: string[] = [];

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Static ES import regex
    const importMatch = line.match(/import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/);
    if (importMatch) {
      imports.push({ path: importMatch[1], line: i + 1 });
    }

    // CommonJS require regex
    const requireMatch = line.match(/(?:const|let|var)\s+.*=\s*require\(['"]([^'"]+)['"]\)/);
    if (requireMatch) {
      imports.push({ path: requireMatch[1], line: i + 1 });
    }

    // Export regex: export function / const / class / type
    const exportMatch = line.match(/export\s+(?:default\s+)?(?:function|const|let|var|class|type|interface|enum)\s+([a-zA-Z0-9_$]+)/);
    if (exportMatch) {
      exports.push(exportMatch[1]);
    }
  }

  return { imports, exports };
}

/**
 * Scan workspace directory recursively for indexable source files
 */
function scanSourceFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    // Skip node_modules, .git, dist, and hidden directories
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'workspace_data') {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanSourceFiles(fullPath, fileList);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.json'].includes(ext)) {
        fileList.push(path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/'));
      }
    }
  }

  return fileList;
}

/**
 * Build or incrementally update Code Graph
 */
export function buildCodeGraph(options?: { forceReindex?: boolean; targetFiles?: string[] }): CodeGraphData {
  const force = options?.forceReindex ?? false;
  const filesToProcess = options?.targetFiles ?? scanSourceFiles(ROOT_DIR);

  let updatedCount = 0;
  const nodesMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  // Preserve unchanged nodes and edges from cache if available
  if (!force && cachedGraph) {
    for (const node of cachedGraph.nodes) {
      nodesMap.set(node.file, node);
    }
    edges.push(...cachedGraph.edges);
  }

  for (const relFile of filesToProcess) {
    const fullPath = path.join(ROOT_DIR, relFile);
    if (!fs.existsSync(fullPath)) continue;

    const stat = fs.statSync(fullPath);
    const mtimeMs = stat.mtimeMs;
    const prevMtime = fileMtimeCache.get(relFile);

    // Skip parsing if file is unchanged and not forced
    if (!force && prevMtime && prevMtime === mtimeMs && nodesMap.has(relFile)) {
      continue;
    }

    fileMtimeCache.set(relFile, mtimeMs);
    updatedCount++;

    // Remove old edges for this updated file before re-parsing
    for (let i = edges.length - 1; i >= 0; i--) {
      if (edges[i].sourceFile === relFile) {
        edges.splice(i, 1);
      }
    }

    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    const ext = path.extname(relFile);
    const { imports, exports } = extractSymbolsAndImports(content);

    const node: GraphNode = {
      id: relFile,
      file: relFile,
      extension: ext,
      sizeBytes: stat.size,
      mtimeMs,
      language: detectLanguage(ext),
      symbols: exports,
      category: detectCategory(relFile),
    };

    nodesMap.set(relFile, node);

    // Process import relationships
    for (const imp of imports) {
      const targetRel = resolveImportPath(relFile, imp.path);
      if (targetRel) {
        let relType: RelationshipType = 'IMPORTS';
        if (relFile.startsWith('tests/') && !targetRel.startsWith('package:')) {
          relType = 'TESTS';
        } else if (relFile.startsWith('src/routes/') && targetRel.includes('services/')) {
          relType = 'SERVES_API';
        } else if (targetRel.startsWith('package:')) {
          relType = 'DEPENDS_ON';
        }

        edges.push({
          id: `edge-${relFile}->${targetRel}-${imp.line}`,
          sourceFile: relFile,
          sourceLine: imp.line,
          targetFile: targetRel,
          relationshipType: relType,
        });
      }
    }
  }

  const nodes = Array.from(nodesMap.values());
  cachedGraph = {
    nodes,
    edges,
    indexedAt: new Date().toISOString(),
    totalFiles: nodes.length,
    totalEdges: edges.length,
    incrementalUpdatedFiles: updatedCount,
  };

  return cachedGraph;
}

/**
 * Backwards-compatible getCodeGraph function required by legacy imports
 */
export function getCodeGraph(files: string[]): Array<{ file: string; truncated: boolean; size: number }> {
  return files.slice(0,20).map(f => {
    const full = path.resolve(f);
    if (!full.startsWith(ALLOWED_ROOT)) throw new Error('Access denied');
    let content = fs.readFileSync(full, 'utf8');
    const truncated = content.length > MAX_BYTES;
    if (truncated) content = content.slice(0, MAX_BYTES);
    return { file: f, truncated, size: content.length };
  });
}

/**
 * Query Code Graph for related nodes (dependencies, consumers, tests)
 */
export function findRelatedNodes(targetFile: string, depth = 1): { dependencies: string[]; consumers: string[]; tests: string[] } {
  const graph = cachedGraph || buildCodeGraph();
  const targetNorm = targetFile.replace(/\\/g, '/');

  const dependencies = new Set<string>();
  const consumers = new Set<string>();
  const tests = new Set<string>();

  for (const edge of graph.edges) {
    if (edge.sourceFile === targetNorm) {
      dependencies.add(edge.targetFile);
    }
    if (edge.targetFile === targetNorm) {
      consumers.add(edge.sourceFile);
      if (edge.sourceFile.startsWith('tests/')) {
        tests.add(edge.sourceFile);
      }
    }
  }

  return {
    dependencies: Array.from(dependencies),
    consumers: Array.from(consumers),
    tests: Array.from(tests),
  };
}

/**
 * Search graph for symbols or keyword connections
 */
export function queryGraphForContext(query: string, maxEdges = 15): { relevantNodes: GraphNode[]; relevantEdges: GraphEdge[] } {
  const graph = cachedGraph || buildCodeGraph();
  const qLower = query.toLowerCase();

  const relevantNodes = graph.nodes.filter(n => {
    return (
      n.file.toLowerCase().includes(qLower) ||
      n.symbols.some(s => s.toLowerCase().includes(qLower))
    );
  }).slice(0, maxEdges);

  const relevantNodeFiles = new Set(relevantNodes.map(n => n.file));
  const relevantEdges = graph.edges.filter(e => {
    return relevantNodeFiles.has(e.sourceFile) || relevantNodeFiles.has(e.targetFile);
  }).slice(0, maxEdges);

  return { relevantNodes, relevantEdges };
}

/**
 * Returns summary statistics of the current Code Graph
 */
export function getCodeGraphSummary(): {
  indexedAt: string;
  totalFiles: number;
  totalEdges: number;
  categories: Record<string, number>;
} {
  const graph = cachedGraph || buildCodeGraph();
  const categories: Record<string, number> = {};

  for (const node of graph.nodes) {
    categories[node.category] = (categories[node.category] || 0) + 1;
  }

  return {
    indexedAt: graph.indexedAt,
    totalFiles: graph.totalFiles,
    totalEdges: graph.totalEdges,
    categories,
  };
}
