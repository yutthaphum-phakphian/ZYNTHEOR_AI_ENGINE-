import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { CodeIntelligence, type CodeAnalysis, type SymbolInfo } from '../../lib/code-intelligence.ts';

export type RepositoryScanStatus = 'COMPLETED' | 'PARTIAL' | 'FAILED';
export type RepositoryFileKind = 'source' | 'test' | 'configuration';

export interface RepositoryFileRecord {
  id: string;
  name: string;
  path: string;
  size: number;
  kind: RepositoryFileKind;
  language: string;
  analysis: CodeAnalysis | null;
  analysisTruncated: boolean;
}

export interface DependencyGraphResult {
  nodes: string[];
  edges: Array<{ source: string; target: string; evidence: string; relationship: 'IMPORT' | 'RE_EXPORT' }>;
  externalDependencies: Array<{ source: string; specifier: string; packageName: string }>;
  unresolvedDependencies: Array<{ source: string; specifier: string }>;
  circularDependencies: string[][];
}

export interface RepositoryContext {
  schemaVersion: '1.0';
  workspaceIdentifier: string;
  scanIdentifier: string;
  repository: { name: string; version: string | null };
  scan: { timestamp: string; status: RepositoryScanStatus; scannedFiles: number; totalBytes: number };
  fileInventory: Array<{ path: string; sizeBytes: number; kind: RepositoryFileKind; language: string }>;
  moduleHierarchy: Array<{ path: string; parent: string | null; kind: 'directory' | 'module' }>;
  symbolTable: Array<{ file: string; symbols: SymbolInfo[] }>;
  moduleExports: Array<{ file: string; exports: string[] }>;
  dependencyGraph: DependencyGraphResult;
  complexityMetrics: {
    formula: string;
    modules: Array<{ file: string; cyclomatic: number; branches: number; maxNestingDepth: number; functionCount: number; averageFunctionLength: number }>;
  };
  parserWarnings: Array<{ file: string; warning: string }>;
  unresolvedDependencies: DependencyGraphResult['unresolvedDependencies'];
  provenance: {
    scanner: string;
    parser: string;
    sourceContentIncluded: false;
    verifiedFindings: string[];
    hypotheses: string[];
    unknowns: string[];
  };
  truncation: {
    truncated: boolean;
    reasons: string[];
    omittedContextFiles: number;
    omittedModules: number;
    omittedSymbols: number;
    omittedExports: number;
    omittedDependencies: number;
    scanFileLimit: number;
    scanByteLimit: number;
  };
}

export interface RepositoryScanResult {
  status: RepositoryScanStatus;
  summary: {
    scannedFiles: number;
    totalModules: number;
    totalSymbols: number;
    totalExports: number;
    totalImports: number;
    averageComplexity: number | null;
    scannedBytes: number;
    scannedAt: string;
    warnings: string[];
  };
  files: RepositoryFileRecord[];
  dependencyGraph: DependencyGraphResult;
  context: RepositoryContext;
  contextJson: string;
  contextValidation: { valid: true; schemaVersion: '1.0'; bytes: number };
}

export interface RepositoryScanLimits {
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
  maxContextBytes: number;
}

const DEFAULT_LIMITS: RepositoryScanLimits = {
  maxFiles: 2000,
  maxFileBytes: 256 * 1024,
  maxTotalBytes: 8 * 1024 * 1024,
  maxContextBytes: 2 * 1024 * 1024,
};
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.cjs']);
const CONFIG_FILENAMES = new Set(['package.json', 'tsconfig.json', 'jsconfig.json', 'vite.config.ts', 'vitest.config.ts']);
const EXCLUDED_DIRECTORIES = new Set([
  '.git', '.hg', '.svn', 'node_modules', 'dist', 'build', 'coverage', 'out', '.next', '.turbo',
  '.cache', 'workspace_data', 'vendor', 'tmp', 'temp',
]);
const SENSITIVE_FILE = /(^|\/)(\.env(?:\..*)?|credentials(?:\.[^/]*)?|secrets?(?:\.[^/]*)?|id_rsa[^/]*|[^/]+\.(?:pem|key|p12|pfx))$/i;
const MAX_SYMBOLS_PER_FILE = 1000;
const MAX_TOTAL_SYMBOLS = 20000;
const MAX_WARNING_COUNT = 500;
const MAX_IGNORE_FILE_BYTES = 64 * 1024;
const MAX_METADATA_FILE_BYTES = 64 * 1024;
const MAX_VISITED_DIRECTORIES = 20000;
const MAX_DIRECTORY_DEPTH = 64;
const COMPLEXITY_FORMULA = 'module cyclomatic complexity = 1 + if/loop/case/catch/conditional/logical-expression branches';

interface IgnoreRule {
  base: string;
  regex: RegExp;
  negated: boolean;
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function compileIgnorePattern(pattern: string, base: string): IgnoreRule | null {
  let value = pattern.trim();
  if (!value || value.startsWith('#')) return null;
  const negated = value.startsWith('!');
  if (negated) value = value.slice(1);
  if (!value || value.startsWith('!')) return null;
  const anchored = value.startsWith('/');
  if (anchored) value = value.slice(1);
  value = value.replace(/\/$/, '');
  const hasSlash = value.includes('/');
  let body = '';
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '*' && value[index + 1] === '*') {
      body += '.*';
      index += 1;
    } else if (character === '*') body += '[^/]*';
    else if (character === '?') body += '[^/]';
    else body += escapeRegex(character);
  }
  const prefix = anchored || hasSlash ? '^' : '(?:^|/)';
  return { base, regex: new RegExp(`${prefix}${body}(?:/.*)?$`), negated };
}

function loadIgnoreRules(directory: string, base: string): IgnoreRule[] {
  const ignorePath = path.join(directory, '.gitignore');
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(ignorePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    if (!fs.fstatSync(descriptor).isFile() || fs.fstatSync(descriptor).size > MAX_IGNORE_FILE_BYTES) {
      throw new Error('ignore file size limit exceeded');
    }
    return fs.readFileSync(descriptor, 'utf8').split(/\r?\n/)
      .map(line => compileIgnorePattern(line, base))
      .filter((rule): rule is IgnoreRule => Boolean(rule));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function isIgnored(relativePath: string, rules: IgnoreRule[]): boolean {
  let ignored = false;
  for (const rule of rules) {
    const pathFromBase = rule.base ? path.posix.relative(rule.base, relativePath) : relativePath;
    if (pathFromBase.startsWith('../') || path.posix.isAbsolute(pathFromBase)) continue;
    if (rule.regex.test(pathFromBase)) ignored = !rule.negated;
  }
  return ignored;
}

function classifyFile(relativePath: string): RepositoryFileKind | null {
  const baseName = path.posix.basename(relativePath).toLowerCase();
  const extension = path.posix.extname(baseName);
  if (SENSITIVE_FILE.test(relativePath)) return null;
  if (baseName.endsWith('.test.ts') || baseName.endsWith('.test.tsx') || baseName.endsWith('.test.js') ||
      baseName.endsWith('.test.jsx') || baseName.endsWith('.spec.ts') || baseName.endsWith('.spec.tsx') ||
      baseName.endsWith('.spec.js') || baseName.endsWith('.spec.jsx') || relativePath.startsWith('tests/') || relativePath.startsWith('__tests__/')) {
    return SOURCE_EXTENSIONS.has(extension) ? 'test' : null;
  }
  if (extension === '.json' || CONFIG_FILENAMES.has(baseName) || /\.config\.[cm]?[jt]sx?$/.test(baseName)) return 'configuration';
  return SOURCE_EXTENSIONS.has(extension) ? 'source' : null;
}

function languageFor(relativePath: string): string {
  const extension = path.posix.extname(relativePath).toLowerCase();
  if (extension === '.tsx' || extension === '.ts' || extension === '.mts') return 'TypeScript';
  if (extension === '.jsx' || extension === '.js' || extension === '.mjs' || extension === '.cjs') return 'JavaScript';
  if (extension === '.json') return 'JSON';
  return 'Configuration';
}

function withinRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function collectFiles(root: string, limits: RepositoryScanLimits): { candidates: Array<{ path: string; fullPath: string }>; warnings: string[]; truncated: boolean } {
  const candidates: Array<{ path: string; fullPath: string }> = [];
  const warnings: string[] = [];
  let truncated = false;
  let visitedDirectories = 0;

  const walk = (directory: string, relativeDirectory: string, inheritedRules: IgnoreRule[], depth: number) => {
    if (truncated) return;
    visitedDirectories += 1;
    if (visitedDirectories > MAX_VISITED_DIRECTORIES || depth > MAX_DIRECTORY_DEPTH) {
      warnings.push(`Directory traversal limit reached at ${relativeDirectory || '.'}.`);
      truncated = true;
      return;
    }
    let canonicalDirectory: string;
    try {
      canonicalDirectory = fs.realpathSync(directory);
      if (!withinRoot(root, canonicalDirectory)) {
        warnings.push(`Skipped directory outside workspace: ${relativeDirectory || '.'}`);
        return;
      }
    } catch (error) {
      warnings.push(`Could not access directory ${relativeDirectory || '.'}: ${(error as NodeJS.ErrnoException).code || 'read error'}`);
      return;
    }

    let localRules: IgnoreRule[];
    try {
      localRules = [...inheritedRules, ...loadIgnoreRules(directory, relativeDirectory)];
    } catch (error) {
      warnings.push(`Could not read ignore rules in ${relativeDirectory || '.'}: ${(error as NodeJS.ErrnoException).code || 'read error'}`);
      return;
    }

    let directoryHandle: fs.Dir;
    try {
      directoryHandle = fs.opendirSync(directory);
    } catch (error) {
      warnings.push(`Could not list ${relativeDirectory || '.'}: ${(error as NodeJS.ErrnoException).code || 'read error'}`);
      return;
    }

    try {
      let entry: fs.Dirent | null;
      while ((entry = directoryHandle.readSync()) !== null) {
        const relativePath = path.posix.join(relativeDirectory, entry.name);
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) {
          if (EXCLUDED_DIRECTORIES.has(entry.name.toLowerCase()) || isIgnored(relativePath, localRules)) continue;
          walk(path.join(directory, entry.name), relativePath, localRules, depth + 1);
          if (truncated) return;
          continue;
        }
        if (!entry.isFile() || isIgnored(relativePath, localRules)) continue;
        if (!classifyFile(relativePath)) continue;
        if (candidates.length >= limits.maxFiles) {
          warnings.push(`File limit reached (${limits.maxFiles}); remaining files were not scanned.`);
          truncated = true;
          return;
        }
        candidates.push({ path: relativePath, fullPath: path.join(directory, entry.name) });
      }
    } finally {
      directoryHandle.closeSync();
    }
  };

  walk(root, '', [], 0);
  return { candidates, warnings: warnings.slice(0, MAX_WARNING_COUNT), truncated };
}

function readWorkspaceFile(root: string, candidate: { path: string; fullPath: string }, maxFileBytes: number): { content: string; size: number } | null {
  const absolute = path.resolve(candidate.fullPath);
  if (!withinRoot(root, absolute)) return null;
  let descriptor: number | undefined;
  try {
    const noFollow = fs.constants.O_NOFOLLOW || 0;
    descriptor = fs.openSync(absolute, fs.constants.O_RDONLY | noFollow);
    const stat = fs.fstatSync(descriptor);
    if (!stat.isFile() || stat.size > maxFileBytes) return null;
    const buffer = fs.readFileSync(descriptor);
    if (buffer.includes(0)) return null;
    return { content: buffer.toString('utf8'), size: stat.size };
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function readPackageMetadata(root: string): { name: string; version: string | null } {
  try {
    const packagePath = path.join(root, 'package.json');
    const read = readWorkspaceFile(root, { path: 'package.json', fullPath: packagePath }, MAX_METADATA_FILE_BYTES);
    if (!read) return { name: 'workspace', version: null };
    const parsed = JSON.parse(read.content) as { name?: unknown; version?: unknown };
    const repositoryName = typeof parsed.name === 'string' && /^[a-zA-Z0-9@._/-]{1,120}$/.test(parsed.name)
      ? parsed.name
      : 'workspace';
    const version = typeof parsed.version === 'string' && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(parsed.version)
      ? parsed.version
      : null;
    return {
      name: repositoryName,
      version,
    };
  } catch {
    return { name: 'workspace', version: null };
  }
}

function readPathAliases(root: string): { baseUrl: string; paths: Record<string, string[]> } | null {
  try {
    const configPath = path.join(root, 'tsconfig.json');
    const read = readWorkspaceFile(root, { path: 'tsconfig.json', fullPath: configPath }, MAX_METADATA_FILE_BYTES);
    if (!read) return null;
    const parsedConfig = ts.parseConfigFileTextToJson(configPath, read.content);
    if (parsedConfig.error) return null;
    const config = parsedConfig.config as {
      compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> };
    };
    const compilerOptions = config.compilerOptions || {};
    const baseUrl = typeof compilerOptions.baseUrl === 'string' ? compilerOptions.baseUrl : '.';
    const paths = Object.fromEntries(Object.entries(compilerOptions.paths || {})
      .filter(([, values]) => Array.isArray(values) && values.every(value => typeof value === 'string')));
    return { baseUrl: path.posix.normalize(baseUrl), paths };
  } catch {
    return null;
  }
}

function moduleCandidates(base: string): string[] {
  const normalized = path.posix.normalize(base.replace(/\\/g, '/')).replace(/^\.\//, '');
  const extensions = ['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs', '.cjs'];
  const candidates = [normalized];
  for (const extension of extensions) {
    candidates.push(`${normalized}${extension}`);
    if (normalized.endsWith('.js') || normalized.endsWith('.jsx')) candidates.push(normalized.slice(0, normalized.lastIndexOf('.')) + extension);
  }
  for (const extension of extensions) candidates.push(path.posix.join(normalized, `index${extension}`));
  return [...new Set(candidates)];
}

function resolveInternalImport(
  specifier: string,
  source: string,
  knownFiles: Set<string>,
  aliases: ReturnType<typeof readPathAliases>,
): string | null {
  const bases: string[] = [];
  const matchesAlias = aliases && Object.entries(aliases.paths).some(([pattern, targets]) => {
    const wildcardIndex = pattern.indexOf('*');
    const prefix = wildcardIndex < 0 ? pattern : pattern.slice(0, wildcardIndex);
    const suffix = wildcardIndex < 0 ? '' : pattern.slice(wildcardIndex + 1);
    if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) return false;
    const wildcard = specifier.slice(prefix.length, specifier.length - suffix.length || undefined);
    for (const target of targets) bases.push(path.posix.join(aliases.baseUrl, target.replace('*', wildcard)));
    return true;
  });
  if (specifier.startsWith('.')) bases.push(path.posix.join(path.posix.dirname(source), specifier));
  else if (!matchesAlias && aliases) bases.push(path.posix.join(aliases.baseUrl, specifier));
  for (const base of bases) {
    for (const candidate of moduleCandidates(base)) if (knownFiles.has(candidate)) return candidate;
  }
  return null;
}

function safeModuleSpecifier(specifier: string): string {
  const normalized = specifier.trim().slice(0, 200);
  if (!normalized || /[\r\n\u0000]/.test(normalized)) return '[invalid-module-specifier]';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized) || /(?:token|secret|password|api[-_]?key|credential)\s*[:=]/i.test(normalized) ||
      /(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{12,}|AIza[A-Za-z0-9_-]{20,})/.test(normalized)) {
    return '[redacted-module-specifier]';
  }
  if (/[?#]/.test(normalized)) return `${normalized.split(/[?#]/, 1)[0]}?[redacted]`;
  return normalized;
}

function dependencyGraph(files: RepositoryFileRecord[], aliases: ReturnType<typeof readPathAliases>): DependencyGraphResult {
  const knownFiles = new Set(files.filter(file => file.kind !== 'configuration').map(file => file.path));
  const graph: DependencyGraphResult = { nodes: [...knownFiles].sort(), edges: [], externalDependencies: [], unresolvedDependencies: [], circularDependencies: [] };
  const edgeKeys = new Set<string>();
  for (const file of files) {
    if (!file.analysis) continue;
    const observedDependencies = [
      ...file.analysis.imports.map(specifier => ({ specifier, relationship: 'IMPORT' as const })),
      ...file.analysis.reExports.map(specifier => ({ specifier, relationship: 'RE_EXPORT' as const })),
    ];
    for (const { specifier, relationship } of observedDependencies) {
      const target = resolveInternalImport(specifier, file.path, knownFiles, aliases);
      if (target) {
        const key = `${file.path}\0${target}\0${specifier}\0${relationship}`;
        if (!edgeKeys.has(key)) {
          edgeKeys.add(key);
          graph.edges.push({ source: file.path, target, evidence: safeModuleSpecifier(specifier), relationship });
        }
      } else if (specifier.startsWith('.') || (aliases && Object.keys(aliases.paths).some(alias => specifier.startsWith(alias.split('*')[0])))) {
        graph.unresolvedDependencies.push({ source: file.path, specifier: safeModuleSpecifier(specifier) });
      } else {
        const safeSpecifier = safeModuleSpecifier(specifier);
        const packageName = safeSpecifier.startsWith('@') ? safeSpecifier.split('/').slice(0, 2).join('/') : safeSpecifier.split('/')[0];
        graph.externalDependencies.push({ source: file.path, specifier: safeSpecifier, packageName });
      }
    }
  }

  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) adjacency.set(node, []);
  for (const edge of graph.edges) adjacency.get(edge.source)?.push(edge.target);
  let index = 0;
  const indexes = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const visit = (node: string) => {
    indexes.set(node, index);
    lowLinks.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);
    for (const target of adjacency.get(node) || []) {
      if (!indexes.has(target)) {
        visit(target);
        lowLinks.set(node, Math.min(lowLinks.get(node)!, lowLinks.get(target)!));
      } else if (onStack.has(target)) lowLinks.set(node, Math.min(lowLinks.get(node)!, indexes.get(target)!));
    }
    if (lowLinks.get(node) !== indexes.get(node)) return;
    const component: string[] = [];
    let member = '';
    do {
      member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
    } while (member !== node);
    if (component.length > 1 || (adjacency.get(node) || []).includes(node)) graph.circularDependencies.push(component.sort());
  };
  for (const node of graph.nodes) if (!indexes.has(node)) visit(node);
  return graph;
}

function buildModuleHierarchy(files: RepositoryFileRecord[]): RepositoryContext['moduleHierarchy'] {
  const directories = new Set<string>();
  for (const file of files) {
    const segments = file.path.split('/');
    for (let index = 1; index < segments.length; index += 1) directories.add(segments.slice(0, index).join('/'));
  }
  const hierarchy: RepositoryContext['moduleHierarchy'] = [...directories].sort().map(directory => ({
    path: directory,
    parent: path.posix.dirname(directory) === '.' ? null : path.posix.dirname(directory),
    kind: 'directory',
  }));
  hierarchy.push(...files.map(file => ({ path: file.path, parent: path.posix.dirname(file.path) === '.' ? null : path.posix.dirname(file.path), kind: 'module' as const })));
  return hierarchy;
}

function analyzedSymbolCount(files: RepositoryFileRecord[]): number {
  return files.reduce((total, file) => total + (file.analysis?.symbols.length || 0), 0);
}

export function validateRepositoryContext(value: unknown): value is RepositoryContext {
  const isRecord = (candidate: unknown): candidate is Record<string, unknown> => Boolean(candidate) && typeof candidate === 'object' && !Array.isArray(candidate);
  const isStringArray = (candidate: unknown): candidate is string[] => Array.isArray(candidate) && candidate.every(item => typeof item === 'string');
  const isCount = (candidate: unknown): candidate is number => typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0;
  if (!isRecord(value)) return false;
  const context = value;
  const repository = context.repository;
  const scan = context.scan;
  const inventory = context.fileInventory;
  const hierarchy = context.moduleHierarchy;
  const symbolTable = context.symbolTable;
  const exports = context.moduleExports;
  const graph = context.dependencyGraph;
  const complexity = context.complexityMetrics;
  const provenance = context.provenance;
  const truncation = context.truncation;
  const symbolTypes = new Set(['function', 'class', 'interface', 'type', 'variable', 'constant', 'method', 'property', 'import']);

  return context.schemaVersion === '1.0' && typeof context.workspaceIdentifier === 'string' &&
    typeof context.scanIdentifier === 'string' && isRecord(repository) && typeof repository.name === 'string' &&
    (repository.version === null || typeof repository.version === 'string') && isRecord(scan) &&
    typeof scan.timestamp === 'string' && ['COMPLETED', 'PARTIAL', 'FAILED'].includes(String(scan.status)) &&
    isCount(scan.scannedFiles) && isCount(scan.totalBytes) && Array.isArray(inventory) && inventory.every(item =>
      isRecord(item) && typeof item.path === 'string' && isCount(item.sizeBytes) &&
      ['source', 'test', 'configuration'].includes(String(item.kind)) && typeof item.language === 'string') &&
    Array.isArray(hierarchy) && hierarchy.every(item => isRecord(item) && typeof item.path === 'string' &&
      (item.parent === null || typeof item.parent === 'string') && ['directory', 'module'].includes(String(item.kind))) &&
    Array.isArray(symbolTable) && symbolTable.every(item => isRecord(item) && typeof item.file === 'string' &&
      Array.isArray(item.symbols) && item.symbols.every(symbol => isRecord(symbol) && typeof symbol.name === 'string' &&
        symbolTypes.has(String(symbol.type)) && isCount(symbol.line) && typeof symbol.exported === 'boolean' &&
        ['public', 'protected', 'private', 'internal'].includes(String(symbol.visibility)))) &&
    Array.isArray(exports) && exports.every(item => isRecord(item) && typeof item.file === 'string' && isStringArray(item.exports)) &&
    isRecord(graph) && isStringArray(graph.nodes) && Array.isArray(graph.edges) && graph.edges.every(edge => isRecord(edge) &&
      typeof edge.source === 'string' && typeof edge.target === 'string' && typeof edge.evidence === 'string' &&
      ['IMPORT', 'RE_EXPORT'].includes(String(edge.relationship))) &&
    Array.isArray(graph.externalDependencies) && graph.externalDependencies.every(item => isRecord(item) &&
      typeof item.source === 'string' && typeof item.specifier === 'string' && typeof item.packageName === 'string') &&
    Array.isArray(graph.unresolvedDependencies) && graph.unresolvedDependencies.every(item => isRecord(item) &&
      typeof item.source === 'string' && typeof item.specifier === 'string') &&
    Array.isArray(graph.circularDependencies) && graph.circularDependencies.every(isStringArray) &&
    isRecord(complexity) && typeof complexity.formula === 'string' && Array.isArray(complexity.modules) &&
    complexity.modules.every(item => isRecord(item) && typeof item.file === 'string' && isCount(item.cyclomatic) &&
      isCount(item.branches) && isCount(item.maxNestingDepth) && isCount(item.functionCount) && isCount(item.averageFunctionLength)) &&
    Array.isArray(context.parserWarnings) && context.parserWarnings.every(item => isRecord(item) &&
      typeof item.file === 'string' && typeof item.warning === 'string') &&
    Array.isArray(context.unresolvedDependencies) && context.unresolvedDependencies.every(item => isRecord(item) &&
      typeof item.source === 'string' && typeof item.specifier === 'string') &&
    isRecord(provenance) && typeof provenance.scanner === 'string' && typeof provenance.parser === 'string' &&
    provenance.sourceContentIncluded === false && isStringArray(provenance.verifiedFindings) &&
    isStringArray(provenance.hypotheses) && isStringArray(provenance.unknowns) &&
    isRecord(truncation) && typeof truncation.truncated === 'boolean' && isStringArray(truncation.reasons) &&
    isCount(truncation.omittedContextFiles) && isCount(truncation.omittedModules) && isCount(truncation.omittedSymbols) &&
    isCount(truncation.omittedExports) && isCount(truncation.omittedDependencies) &&
    isCount(truncation.scanFileLimit) && isCount(truncation.scanByteLimit);
}

function buildContext(
  files: RepositoryFileRecord[],
  graph: DependencyGraphResult,
  root: string,
  scanId: string,
  timestamp: string,
  status: RepositoryScanStatus,
  totalBytes: number,
  limits: RepositoryScanLimits,
  reasons: string[],
  maxSymbols: number,
): RepositoryContext {
  const selectedFiles = files;
  const dependencyGraphForContext = graph;
  const selectedAnalyzed = selectedFiles.filter(file => file.analysis);
  const symbolsByFile = selectedAnalyzed.map(file => [...file.analysis!.symbols].sort((left, right) => {
    const typeOrder: Record<SymbolInfo['type'], number> = { function: 0, method: 1, class: 2, interface: 3, type: 4, constant: 5, variable: 6, property: 7, import: 8 };
    return Number(Boolean(right.exported)) - Number(Boolean(left.exported)) || typeOrder[left.type] - typeOrder[right.type] || left.line - right.line;
  }));
  const symbolsForContext = selectedAnalyzed.map(file => ({ file: file.path, symbols: [] as SymbolInfo[] }));
  let includedSymbols = 0;
  for (let symbolIndex = 0; includedSymbols < maxSymbols; symbolIndex += 1) {
    let foundSymbol = false;
    for (let fileIndex = 0; fileIndex < symbolsByFile.length && includedSymbols < maxSymbols; fileIndex += 1) {
      const symbol = symbolsByFile[fileIndex][symbolIndex];
      if (!symbol) continue;
      symbolsForContext[fileIndex].symbols.push(symbol);
      includedSymbols += 1;
      foundSymbol = true;
    }
    if (!foundSymbol) break;
  }
  const totalContextSymbols = selectedAnalyzed.reduce((sum, file) => sum + file.analysis!.symbols.length, 0);
  const omittedSymbols = totalContextSymbols - includedSymbols;
  const contextReasons = omittedSymbols ? [...reasons, 'Context symbol limit reached; omitted symbol count is recorded.'] : [...reasons];
  const packageInfo = readPackageMetadata(root);
  return {
    schemaVersion: '1.0',
    workspaceIdentifier: createHash('sha256').update(root).digest('hex').slice(0, 20),
    scanIdentifier: scanId,
    repository: packageInfo,
    scan: { timestamp, status, scannedFiles: files.length, totalBytes },
    fileInventory: selectedFiles.map(file => ({ path: file.path, sizeBytes: file.size, kind: file.kind, language: file.language })),
    moduleHierarchy: buildModuleHierarchy(selectedFiles),
    symbolTable: symbolsForContext,
    moduleExports: selectedAnalyzed.map(file => ({ file: file.path, exports: file.analysis!.exports })),
    dependencyGraph: dependencyGraphForContext,
    complexityMetrics: {
      formula: COMPLEXITY_FORMULA,
      modules: selectedAnalyzed.map(file => ({
        file: file.path,
        cyclomatic: file.analysis!.complexityMetrics.cyclomatic,
        branches: file.analysis!.complexityMetrics.branches,
        maxNestingDepth: file.analysis!.complexityMetrics.maxNestingDepth,
        functionCount: file.analysis!.complexityMetrics.functionCount,
        averageFunctionLength: file.analysis!.complexityMetrics.averageFunctionLength,
      })),
    },
    parserWarnings: selectedAnalyzed.flatMap(file => file.analysis!.parserWarnings.map(warning => ({ file: file.path, warning }))),
    unresolvedDependencies: dependencyGraphForContext.unresolvedDependencies,
    provenance: {
      scanner: 'bounded-filesystem-walk-v1',
      parser: 'TypeScript Compiler API',
      sourceContentIncluded: false,
      verifiedFindings: ['file paths and sizes were read from the workspace filesystem', 'symbols/imports/exports were derived from parsed source ASTs'],
      hypotheses: [],
      unknowns: ['Runtime behavior and dynamically constructed imports were not executed or inferred.', 'Ignored, excluded, oversized, and unreadable files are outside the findings; omitted symbols are listed in truncation.omittedSymbols.'],
    },
    truncation: {
      truncated: contextReasons.length > 0 || omittedSymbols > 0,
      reasons: contextReasons,
      omittedContextFiles: 0,
      omittedModules: 0,
      omittedSymbols,
      omittedExports: 0,
      omittedDependencies: 0,
      scanFileLimit: limits.maxFiles,
      scanByteLimit: limits.maxTotalBytes,
    },
  };
}

export function scanRepositoryFiles(rootDir = process.cwd(), suppliedLimits: Partial<RepositoryScanLimits> = {}): RepositoryScanResult {
  const limits = { ...DEFAULT_LIMITS, ...suppliedLimits };
  const root = fs.realpathSync(rootDir);
  const scanId = randomUUID();
  const timestamp = new Date().toISOString();
  const collected = collectFiles(root, limits);
  const warnings = [...collected.warnings];
  const files: RepositoryFileRecord[] = [];
  let totalBytes = 0;
  let remainingSymbolBudget = MAX_TOTAL_SYMBOLS;
  let truncated = collected.truncated;

  for (const candidate of collected.candidates) {
    let read: { content: string; size: number } | null;
    try {
      read = readWorkspaceFile(root, candidate, limits.maxFileBytes);
    } catch (error) {
      warnings.push(`Could not read ${candidate.path}: ${(error as NodeJS.ErrnoException).code || 'read error'}`);
      continue;
    }
    if (!read) {
      warnings.push(`Skipped unsupported, oversized, binary, or unsafe file: ${candidate.path}`);
      truncated = true;
      continue;
    }
    if (totalBytes + read.size > limits.maxTotalBytes) {
      warnings.push(`Total scan byte limit reached (${limits.maxTotalBytes}); remaining files were not scanned.`);
      truncated = true;
      break;
    }
    totalBytes += read.size;
    const kind = classifyFile(candidate.path)!;
    let analysis: CodeAnalysis | null = null;
    let analysisTruncated = false;
    if (kind !== 'configuration') {
      analysis = new CodeIntelligence().analyze(read.content, candidate.path);
      const allowedSymbols = Math.min(MAX_SYMBOLS_PER_FILE, remainingSymbolBudget);
      if (analysis.symbols.length > allowedSymbols) {
        analysis = { ...analysis, symbols: analysis.symbols.slice(0, allowedSymbols) };
        warnings.push(`Symbol list capped at ${allowedSymbols}: ${candidate.path}`);
        truncated = true;
        analysisTruncated = true;
      }
      remainingSymbolBudget = Math.max(0, remainingSymbolBudget - analysis.symbols.length);
      for (const parserWarning of analysis.parserWarnings) warnings.push(`Parser warning in ${candidate.path}: ${parserWarning}`);
    } else if (path.posix.extname(candidate.path).toLowerCase() === '.json') {
      try { JSON.parse(read.content); } catch { warnings.push(`Malformed JSON configuration: ${candidate.path}`); }
    }
    files.push({
      id: candidate.path,
      name: path.posix.basename(candidate.path),
      path: candidate.path,
      size: read.size,
      kind,
      language: languageFor(candidate.path),
      analysis,
      analysisTruncated,
    });
  }

  const boundedWarnings = [...new Set(warnings)].slice(0, MAX_WARNING_COUNT);
  const status: RepositoryScanStatus = boundedWarnings.length || truncated ? 'PARTIAL' : 'COMPLETED';
  const aliases = readPathAliases(root);
  const graph = dependencyGraph(files, aliases);
  const scanReasons = truncated ? ['One or more configured scan limits were reached.'] : [];
  let contextSymbolLimit = analyzedSymbolCount(files);
  let context = buildContext(files, graph, root, scanId, timestamp, status, totalBytes, limits, scanReasons, contextSymbolLimit);
  let contextJson = JSON.stringify(context);
  if (Buffer.byteLength(contextJson, 'utf8') > limits.maxContextBytes) {
    let low = 0;
    let high = contextSymbolLimit;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      const candidate = buildContext(files, graph, root, scanId, timestamp, status, totalBytes, limits, ['Context size limit reached.'], middle);
      if (Buffer.byteLength(JSON.stringify(candidate), 'utf8') <= limits.maxContextBytes) low = middle;
      else high = middle - 1;
    }
    contextSymbolLimit = low;
    context = buildContext(files, graph, root, scanId, timestamp, status, totalBytes, limits, [...scanReasons, 'Context size limit reached.'], contextSymbolLimit);
    contextJson = JSON.stringify(context);
  }
  if (Buffer.byteLength(contextJson, 'utf8') > limits.maxContextBytes) {
    throw new Error(`Repository structure exceeds the ${limits.maxContextBytes}-byte context limit`);
  }
  const parsedContext: unknown = JSON.parse(contextJson);
  if (!validateRepositoryContext(parsedContext)) throw new Error('Repository context failed schema validation');

  const analyzed = files.filter(file => file.analysis);
  const branchTotal = analyzed.reduce((sum, file) => sum + file.analysis!.complexity, 0);
  return {
    status,
    summary: {
      scannedFiles: files.length,
      totalModules: files.filter(file => file.kind === 'source').length,
      totalSymbols: analyzed.reduce((sum, file) => sum + file.analysis!.symbols.length, 0),
      totalExports: analyzed.reduce((sum, file) => sum + file.analysis!.exports.length, 0),
      totalImports: analyzed.reduce((sum, file) => sum + file.analysis!.imports.length + file.analysis!.reExports.length, 0),
      averageComplexity: analyzed.length ? Math.round((branchTotal / analyzed.length) * 10) / 10 : null,
      scannedBytes: totalBytes,
      scannedAt: timestamp,
      warnings: boundedWarnings,
    },
    files,
    dependencyGraph: graph,
    context: parsedContext,
    contextJson,
    contextValidation: { valid: true, schemaVersion: '1.0', bytes: Buffer.byteLength(contextJson, 'utf8') },
  };
}

export function buildFocusedRepositoryContext(
  scan: RepositoryScanResult,
  focusPath: string,
  maxContextBytes = 128 * 1024,
): { context: RepositoryContext; contextJson: string; validation: { valid: true; schemaVersion: '1.0'; bytes: number } } {
  const focusFile = scan.files.find(file => file.path === focusPath && file.analysis);
  if (!focusFile) throw new Error('The selected path is not an analyzed repository module');

  const relatedPaths = new Set([focusPath]);
  for (const edge of scan.dependencyGraph.edges) {
    if (edge.source === focusPath) relatedPaths.add(edge.target);
    if (edge.target === focusPath) relatedPaths.add(edge.source);
  }
  for (const cycle of scan.dependencyGraph.circularDependencies) {
    if (cycle.includes(focusPath)) cycle.forEach(file => relatedPaths.add(file));
  }
  const allAnalyzedFiles = scan.files.filter(file => file.analysis);
  const allSymbolCount = allAnalyzedFiles.reduce((sum, file) => sum + file.analysis!.symbols.length, 0);
  const allExportCount = allAnalyzedFiles.reduce((sum, file) => sum + file.analysis!.exports.length, 0);
  const allDependencyCount = scan.dependencyGraph.edges.length + scan.dependencyGraph.externalDependencies.length + scan.dependencyGraph.unresolvedDependencies.length;
  const relevantFiles = allAnalyzedFiles.filter(file => relatedPaths.has(file.path));
  const selectedFilePaths = new Set(relevantFiles.map(file => file.path));
  const availableSymbols = relevantFiles.map(file => file.analysis!.symbols);
  const availableSymbolCount = availableSymbols.reduce((sum, symbols) => sum + symbols.length, 0);
  const relevantExports = scan.files.filter(file => selectedFilePaths.has(file.path) && file.analysis);
  const relevantGraph = {
    nodes: scan.dependencyGraph.nodes.filter(file => relatedPaths.has(file)),
    edges: scan.dependencyGraph.edges.filter(edge => relatedPaths.has(edge.source) && relatedPaths.has(edge.target)),
    externalDependencies: scan.dependencyGraph.externalDependencies.filter(edge => relatedPaths.has(edge.source)),
    unresolvedDependencies: scan.dependencyGraph.unresolvedDependencies.filter(edge => relatedPaths.has(edge.source)),
    circularDependencies: scan.dependencyGraph.circularDependencies.filter(cycle => cycle.some(file => relatedPaths.has(file))),
  };
  const relevantDependencyCount = relevantGraph.edges.length + relevantGraph.externalDependencies.length + relevantGraph.unresolvedDependencies.length;
  const reasons = [`Focused context for ${focusPath}; full file inventory remains included.`];

  const assemble = (symbolBudget: number): RepositoryContext => {
    const symbolTable = relevantFiles.map(file => ({ file: file.path, symbols: [] as SymbolInfo[] }));
    let includedSymbols = 0;
    for (let symbolIndex = 0; includedSymbols < symbolBudget; symbolIndex += 1) {
      let foundSymbol = false;
      for (let fileIndex = 0; fileIndex < availableSymbols.length && includedSymbols < symbolBudget; fileIndex += 1) {
        const symbol = availableSymbols[fileIndex][symbolIndex];
        if (!symbol) continue;
        symbolTable[fileIndex].symbols.push(symbol);
        includedSymbols += 1;
        foundSymbol = true;
      }
      if (!foundSymbol) break;
    }
    const moduleHierarchy = scan.context.moduleHierarchy.filter(entry => {
      if (entry.kind === 'module') return relatedPaths.has(entry.path);
      return [...relatedPaths].some(file => file.startsWith(`${entry.path}/`));
    });
    return {
      ...scan.context,
      moduleHierarchy,
      symbolTable,
      moduleExports: relevantExports.map(file => ({ file: file.path, exports: file.analysis!.exports })),
      dependencyGraph: relevantGraph,
      complexityMetrics: {
        ...scan.context.complexityMetrics,
        modules: scan.context.complexityMetrics.modules.filter(module => relatedPaths.has(module.file)),
      },
      parserWarnings: scan.context.parserWarnings.filter(warning => relatedPaths.has(warning.file)),
      unresolvedDependencies: relevantGraph.unresolvedDependencies,
      truncation: {
        ...scan.context.truncation,
        truncated: true,
        reasons: [...reasons, ...(symbolBudget < availableSymbolCount ? ['Focused context symbol budget reached; omitted counts are recorded.'] : [])],
        omittedContextFiles: 0,
        omittedModules: Math.max(0, allAnalyzedFiles.length - relevantFiles.length),
        omittedSymbols: Math.max(0, allSymbolCount - includedSymbols),
        omittedExports: Math.max(0, allExportCount - relevantExports.reduce((sum, file) => sum + file.analysis!.exports.length, 0)),
        omittedDependencies: Math.max(0, allDependencyCount - relevantDependencyCount),
      },
    };
  };

  let low = 0;
  let high = availableSymbolCount;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (Buffer.byteLength(JSON.stringify(assemble(middle)), 'utf8') <= maxContextBytes) low = middle;
    else high = middle - 1;
  }
  const context = assemble(low);
  const contextJson = JSON.stringify(context);
  if (Buffer.byteLength(contextJson, 'utf8') > maxContextBytes || !validateRepositoryContext(context)) {
    throw new Error(`Focused repository context could not be validated within ${maxContextBytes} bytes`);
  }
  return { context, contextJson, validation: { valid: true, schemaVersion: '1.0', bytes: Buffer.byteLength(contextJson, 'utf8') } };
}