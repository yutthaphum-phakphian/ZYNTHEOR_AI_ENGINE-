// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import { buildCodeGraph, findRelatedNodes, queryGraphForContext, type GraphNode, type GraphEdge } from './codeGraph.ts';

export interface ProjectMetadata {
  workspaceId: string;
  projectName: string;
  description: string;
  rootDir: string;
  packageVersion: string;
  frameworks: string[];
  entryPoints: string[];
  apiRoutes: string[];
  components: string[];
  services: string[];
  tests: string[];
  configs: string[];
  totalFileCount: number;
  totalSizeBytes: number;
  languages: Record<string, number>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  lastIndexedAt: string;
}

export interface RetrievedExcerpt {
  file: string;
  language: string;
  startLine: number;
  endLine: number;
  totalLines: number;
  sizeBytes: number;
  content: string;
  relevanceScore: number;
  matchedKeywords: string[];
  retrievalSource: 'DIRECT_MATCH' | 'CODE_GRAPH_EDGE' | 'MANIFEST_ENTRY';
}

export interface ContextRetrievalResult {
  workspaceId: string;
  query: string;
  projectMetadata: Partial<ProjectMetadata>;
  retrievedExcerpts: RetrievedExcerpt[];
  graphEdges: GraphEdge[];
  relevantSymbols: string[];
  totalContextBytes: number;
  estimatedTokens: number;
  contextBudgetExceeded: boolean;
  missingFiles: string[];
  contextFreshnessTimestamp: string;
  isFresh: boolean;
  securitySanitized: true;
}

const ROOT_DIR = path.resolve(process.cwd());
const MAX_INDEXED_FILE_BYTES = 1024 * 1024;

/** Tokenize Thai and English without relying on whitespace-only splitting. */
function extractQueryKeywords(query: string): string[] {
  const normalized = query.toLocaleLowerCase().normalize('NFKC');
  const tokens = new Set<string>();
  // Preserve identifiers, API paths, and English technical terms.
  for (const match of normalized.matchAll(/[a-z0-9_./:-]{2,}/g)) tokens.add(match[0]);
  // Thai has no mandatory spaces between words. Segmenter improves matching
  // when available; contiguous Thai runs are retained as a safe fallback.
  try {
    const Segmenter = (Intl as any).Segmenter;
    if (Segmenter) {
      const segmenter = new Segmenter('th', { granularity: 'word' });
      for (const part of segmenter.segment(normalized)) {
        const word = String(part.segment).trim();
        if (part.isWordLike && word.length >= 2) tokens.add(word);
      }
    } else {
      for (const match of normalized.matchAll(/[\u0E00-\u0E7F]{2,}/g)) tokens.add(match[0]);
    }
  } catch {
    for (const match of normalized.matchAll(/[\u0E00-\u0E7F]{2,}/g)) tokens.add(match[0]);
  }
  return [...tokens].filter(token => token.length > 1).slice(0, 80);
}

const SENSITIVE_PATTERNS = [
  /^\.env/i,
  /token/i,
  /secret/i,
  /\.key$/i,
  /\.pem$/i,
  /id_rsa/i,
  /cloud_sql_proxy/i,
  /^\.dev\./i,
];

/**
 * Neutralizes potential prompt injection markers embedded in repository source files
 */
function sanitizeRepositoryContent(text: string): string {
  if (!text) return '';
  return text
    .replace(/<\|im_start\|>/g, '[IM_START]')
    .replace(/<\|im_end\|>/g, '[IM_END]')
    .replace(/\[AIS_METADATA_SECTION_START\]/g, '[METADATA_START_MUTED]')
    .replace(/\[AIS_METADATA_SECTION_END\]/g, '[METADATA_END_MUTED]')
    .replace(/System Instruction:/gi, 'Source Note:')
    .replace(/Ignore previous instructions/gi, 'Note from source file:');
}

/**
 * Builds structured project metadata by inspecting package.json, entry points, and filesystem
 */
export function inspectProjectMetadata(workspaceId = 'default', projectName = 'ZYNTHEOR AI ENGINE'): ProjectMetadata {
  const graph = buildCodeGraph();
  let pkgVersion = '1.0.0';
  let deps: Record<string, string> = {};
  let devDeps: Record<string, string> = {};

  const pkgPath = path.join(ROOT_DIR, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkgVersion = pkg.version || '1.0.0';
      deps = pkg.dependencies || {};
      devDeps = pkg.devDependencies || {};
    } catch {
      // safe fallback
    }
  }

  const entryPoints: string[] = [];
  if (fs.existsSync(path.join(ROOT_DIR, 'server.ts'))) entryPoints.push('server.ts');
  if (fs.existsSync(path.join(ROOT_DIR, 'src/main.tsx'))) entryPoints.push('src/main.tsx');
  if (fs.existsSync(path.join(ROOT_DIR, 'index.html'))) entryPoints.push('index.html');

  const apiRoutes = graph.nodes.filter(n => n.category === 'route').map(n => n.file);
  const components = graph.nodes.filter(n => n.category === 'component').map(n => n.file);
  const services = graph.nodes.filter(n => n.category === 'service').map(n => n.file);
  const tests = graph.nodes.filter(n => n.category === 'test').map(n => n.file);
  const configs = graph.nodes.filter(n => n.category === 'config').map(n => n.file);

  const languages: Record<string, number> = {};
  let totalSizeBytes = 0;

  for (const node of graph.nodes) {
    languages[node.language] = (languages[node.language] || 0) + 1;
    totalSizeBytes += node.sizeBytes;
  }

  return {
    workspaceId,
    projectName,
    description: 'Local-first engineering intelligence workspace',
    rootDir: ROOT_DIR,
    packageVersion: pkgVersion,
    frameworks: ['React 19', 'Express 5', 'Vite 6', 'TypeScript 5', 'Tailwind CSS'],
    entryPoints,
    apiRoutes,
    components,
    services,
    tests,
    configs,
    totalFileCount: graph.nodes.length,
    totalSizeBytes,
    languages,
    dependencies: deps,
    devDependencies: devDeps,
    lastIndexedAt: graph.indexedAt,
  };
}

/**
 * Relevance-based context retrieval with strict context budgets and security sanitization
 */
export function retrieveRelevantContext(params: {
  workspaceId?: string;
  query: string;
  maxTokens?: number; // default ~4,000 tokens (~16,000 chars)
  maxFiles?: number;  // default 6 files
}): ContextRetrievalResult {
  const wsId = params.workspaceId || 'default';
  const query = params.query.trim();
  const maxChars = (params.maxTokens || 4000) * 4;
  const maxFiles = params.maxFiles || 6;

  const metadata = inspectProjectMetadata(wsId);
  const graph = buildCodeGraph();
  const keywords = extractQueryKeywords(query);

  const scoredFiles: Array<{ file: string; score: number; keywords: string[] }> = [];

  for (const node of graph.nodes) {
    // Skip sensitive files strictly
    if (SENSITIVE_PATTERNS.some(p => p.test(node.file))) continue;

    let score = 0;
    const matchedKw: string[] = [];
    const fLower = node.file.toLowerCase();

    for (const kw of keywords) {
      if (fLower === kw) {
        score += 100;
        if (!matchedKw.includes(kw)) matchedKw.push(kw);
      }
      if (fLower.includes(kw)) {
        score += 10;
        if (!matchedKw.includes(kw)) matchedKw.push(kw);
      }
      if (node.symbols.some(s => s.toLowerCase().includes(kw))) {
        score += 8;
        if (!matchedKw.includes(kw)) matchedKw.push(kw);
      }
    }

    if (score > 0) {
      scoredFiles.push({ file: node.file, score, keywords: matchedKw });
    }
  }

  // Fallback: if no direct keyword matches, select default core workspace files
  if (scoredFiles.length === 0) {
    const defaultFiles = ['src/App.tsx', 'server.ts', 'lib/intelligence-core.ts', 'src/components/SettingsCenter.tsx'];
    for (const df of defaultFiles) {
      if (graph.nodes.some(n => n.file === df)) {
        scoredFiles.push({ file: df, score: 5, keywords: ['workspace-default'] });
      }
    }
  }

  // Sort files by relevance score descending
  scoredFiles.sort((a, b) => b.score - a.score);

  const topScored = scoredFiles.slice(0, maxFiles);
  const retrievedExcerpts: RetrievedExcerpt[] = [];
  let currentBytes = 0;
  let budgetExceeded = false;
  const missingFiles: string[] = [];

  for (const item of topScored) {
    const fullPath = path.resolve(ROOT_DIR, item.file);
    const relativePath = path.relative(ROOT_DIR, fullPath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      missingFiles.push(item.file);
      continue;
    }
    if (!fs.existsSync(fullPath)) {
      missingFiles.push(item.file);
      continue;
    }

    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile() || stat.size > MAX_INDEXED_FILE_BYTES) {
        missingFiles.push(item.file);
        continue;
      }
      const rawContent = fs.readFileSync(fullPath, 'utf8');
      // Avoid feeding binary or likely-secret payloads into the model context.
      if (rawContent.includes('\u0000')) {
        missingFiles.push(item.file);
        continue;
      }
      const sanitized = sanitizeRepositoryContent(rawContent);
      const lines = sanitized.split('\n');

      // Truncate file content to remaining context budget
      const remainingBytes = Math.max(500, maxChars - currentBytes);
      let boundedContent = sanitized;
      if (sanitized.length > remainingBytes) {
        boundedContent = sanitized.slice(0, remainingBytes) + '\n... [TRUNCATED_FOR_CONTEXT_BUDGET]';
        budgetExceeded = true;
      }
      const excerptBytes = Buffer.byteLength(boundedContent, 'utf8');
      const excerptLines = boundedContent.split('\n').length;

      currentBytes += excerptBytes;
      retrievedExcerpts.push({
        file: item.file,
        language: path.extname(item.file),
        startLine: 1,
        endLine: excerptLines,
        totalLines: lines.length,
        sizeBytes: excerptBytes,
        content: boundedContent,
        relevanceScore: item.score,
        matchedKeywords: item.keywords,
        retrievalSource: 'DIRECT_MATCH',
      });

      if (currentBytes >= maxChars) {
        break;
      }
    } catch {
      missingFiles.push(item.file);
    }
  }

  // Retrieve code graph relationships for retrieved files
  const relevantSymbols: string[] = [];
  const graphEdges: GraphEdge[] = [];

  for (const excerpt of retrievedExcerpts) {
    const related = findRelatedNodes(excerpt.file);
    for (const dep of related.dependencies) {
      const edge = graph.edges.find(e => e.sourceFile === excerpt.file && e.targetFile === dep);
      if (edge && !graphEdges.some(e => e.id === edge.id)) {
        graphEdges.push(edge);
      }
    }
    const node = graph.nodes.find(n => n.file === excerpt.file);
    if (node) {
      relevantSymbols.push(...node.symbols);
    }
  }

  const estimatedTokens = Math.ceil(currentBytes / 4);

  return {
    workspaceId: wsId,
    query,
    projectMetadata: {
      projectName: metadata.projectName,
      packageVersion: metadata.packageVersion,
      totalFileCount: metadata.totalFileCount,
      entryPoints: metadata.entryPoints,
    },
    retrievedExcerpts,
    graphEdges: graphEdges.slice(0, 15),
    relevantSymbols: [...new Set(relevantSymbols)].slice(0, 20),
    totalContextBytes: currentBytes,
    estimatedTokens,
    contextBudgetExceeded: budgetExceeded,
    missingFiles,
    contextFreshnessTimestamp: metadata.lastIndexedAt,
    isFresh: true,
    securitySanitized: true,
  };
}
