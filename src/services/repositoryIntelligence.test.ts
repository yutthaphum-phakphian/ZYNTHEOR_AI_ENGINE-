// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs, { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import express from 'express';
import intelligenceRoute from '../routes/intelligence';
import { buildFocusedRepositoryContext, scanRepositoryFiles, validateRepositoryContext } from './repositoryIntelligence';

describe('repository intelligence scanner', () => {
  let root: string;
  const cleanupRoots: string[] = [];

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'zyntheor-repo-scan-'));
    cleanupRoots.push(root);
  });

  afterEach(() => {
    for (const directory of cleanupRoots.splice(0)) rmSync(directory, { recursive: true, force: true });
  });

  function write(relativePath: string, content: string) {
    const filePath = path.join(root, relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, 'utf8');
  }

  it('returns a validated empty-repository result without inventing metrics', () => {
    const result = scanRepositoryFiles(root);
    expect(result.status).toBe('COMPLETED');
    expect(result.summary).toMatchObject({ scannedFiles: 0, totalModules: 0, totalSymbols: 0, totalExports: 0, averageComplexity: null });
    expect(result.contextValidation.valid).toBe(true);
    expect(validateRepositoryContext(JSON.parse(result.contextJson))).toBe(true);
  });

  it('scans actual TSX, JavaScript, JSON configuration, and test files without returning source contents', () => {
    write('src/widget.tsx', 'export interface Props { label: string; }\nexport const Widget = (props: Props) => <button>{props.label}</button>;');
    write('src/runtime.mjs', "export function start() { if (true) return require('node:fs'); }");
    write('src/widget.test.tsx', 'import { Widget } from "./widget";');
    write('tsconfig.json', '{"compilerOptions":{"jsx":"react-jsx"}}');
    write('package.json', '{"name":"fixture-workspace","version":"2.4.0"}');
    const secretLiteral = 'fixture-secret-value-should-not-leak';
    write('src/settings.ts', `const apiKey = '${secretLiteral}';`);

    const result = scanRepositoryFiles(root);
    const widget = result.files.find(file => file.path === 'src/widget.tsx');
    expect(result.status).toBe('COMPLETED');
    expect(result.summary.scannedFiles).toBe(6);
    expect(result.summary.totalModules).toBe(3);
    expect(result.summary.totalSymbols).toBeGreaterThan(0);
    expect(widget?.analysis?.symbols.map(symbol => symbol.name)).toEqual(expect.arrayContaining(['Props', 'Widget', 'label']));
    expect(result.files.find(file => file.path === 'src/widget.test.tsx')?.kind).toBe('test');
    expect(result.files.find(file => file.path === 'tsconfig.json')?.kind).toBe('configuration');
    expect(result.context.repository).toMatchObject({ name: 'fixture-workspace', version: '2.4.0' });
    expect(result.contextJson).not.toContain(secretLiteral);
    expect(result.files.every(file => !('content' in file))).toBe(true);
  });

  it('respects root and nested gitignore patterns and skips unsupported file types', () => {
    write('.gitignore', 'ignored/\n*.skip.ts\n');
    write('src/keep.ts', 'export const keep = true;');
    write('src/drop.skip.ts', 'export const drop = true;');
    write('ignored/hidden.ts', 'export const hidden = true;');
    write('script.py', 'def ignored(): pass');

    const result = scanRepositoryFiles(root);
    expect(result.files.map(file => file.path)).toEqual(['src/keep.ts']);
  });

  it('resolves tsconfig aliases and re-exports, separates external/unresolved imports, and detects cycles', () => {
    write('tsconfig.json', '{\n  // workspace aliases\n  "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["src/*"], }, },\n}');
    write('src/a.ts', "import { value } from './b';\nexport const result = value;");
    write('src/b.ts', "export { result } from './a';\nexport const value = 1;");
    write('src/entry.ts', "import { value } from '@/b';\nimport 'missing-package';\nimport './not-found';\nexport { value } from '@/b';");

    const result = scanRepositoryFiles(root);
    expect(result.dependencyGraph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'src/entry.ts', target: 'src/b.ts', relationship: 'IMPORT' }),
      expect.objectContaining({ source: 'src/entry.ts', target: 'src/b.ts', relationship: 'RE_EXPORT' }),
      expect.objectContaining({ source: 'src/b.ts', target: 'src/a.ts', relationship: 'RE_EXPORT' }),
    ]));
    expect(result.dependencyGraph.externalDependencies).toContainEqual(expect.objectContaining({ specifier: 'missing-package' }));
    expect(result.dependencyGraph.unresolvedDependencies).toContainEqual(expect.objectContaining({ specifier: './not-found' }));
    expect(result.dependencyGraph.circularDependencies).toContainEqual(['src/a.ts', 'src/b.ts']);
  });

  it('does not follow a symlink outside the authorized workspace', () => {
    const outside = mkdtempSync(path.join(os.tmpdir(), 'zyntheor-repo-outside-'));
    cleanupRoots.push(outside);
    writeFileSync(path.join(outside, 'outside.ts'), 'export const outside = true;');
    symlinkSync(outside, path.join(root, 'linked'), 'dir');
    write('src/safe.ts', 'export const safe = true;');

    const result = scanRepositoryFiles(root);
    expect(result.files.map(file => file.path)).toEqual(['src/safe.ts']);
  });

  it('redacts credential-bearing remote imports from the context graph', () => {
    write('src/remote.ts', "import remote from 'https://user:pass@example.invalid/plugin?token=secret-value';\nexport { remote };");
    const result = scanRepositoryFiles(root);
    expect(result.contextJson).not.toContain('user:pass');
    expect(result.contextJson).not.toContain('secret-value');
    expect(result.dependencyGraph.externalDependencies[0]?.specifier).toBe('[redacted-module-specifier]');
  });

  it('fails closed when a workspace ignore file is a symlink', () => {
    const outside = mkdtempSync(path.join(os.tmpdir(), 'zyntheor-ignore-outside-'));
    cleanupRoots.push(outside);
    writeFileSync(path.join(outside, 'ignore'), '*.ts\n', 'utf8');
    symlinkSync(path.join(outside, 'ignore'), path.join(root, '.gitignore'));
    write('src/hidden.ts', 'export const hidden = true;');

    const result = scanRepositoryFiles(root);
    expect(result.status).toBe('PARTIAL');
    expect(result.files).toHaveLength(0);
    expect(result.summary.warnings.join(' ')).toContain('Could not read ignore rules');
  });

  it('reports unreadable directories as partial instead of claiming a complete scan', () => {
    write('src/hidden.ts', 'export const hidden = true;');
    const openDirectory = fs.opendirSync;
    const openSpy = vi.spyOn(fs, 'opendirSync').mockImplementationOnce(() => {
      throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
    });
    try {
      const result = scanRepositoryFiles(root);
      expect(result.status).toBe('PARTIAL');
      expect(result.summary.scannedFiles).toBe(0);
      expect(result.summary.warnings.join(' ')).toContain('EACCES');
    } finally {
      openSpy.mockRestore();
      expect(openDirectory).toBeDefined();
    }
  });

  it('reports partial scans for count and size caps and parser/configuration failures', () => {
    write('a.ts', 'export function first() { if (true) return 1; }');
    write('b.ts', 'export function second() { return 2; }');
    write('oversized.ts', 'x'.repeat(100));
    const countLimited = scanRepositoryFiles(root, { maxFiles: 1 });
    expect(countLimited.status).toBe('PARTIAL');
    expect(countLimited.summary.scannedFiles).toBe(1);
    expect(countLimited.summary.warnings.join(' ')).toContain('File limit reached');

    write('broken.ts', 'function broken( {');
    write('malformed.json', '{ invalid');
    const invalid = scanRepositoryFiles(root, { maxFileBytes: 64 });
    expect(invalid.status).toBe('PARTIAL');
    expect(invalid.summary.warnings.some(warning => warning.includes('Parser warning'))).toBe(true);
    expect(invalid.summary.warnings.some(warning => warning.includes('Malformed JSON'))).toBe(true);
    expect(invalid.summary.warnings.some(warning => warning.includes('oversized.ts'))).toBe(true);
  });

  it('marks omitted symbols when the context size budget is reached', () => {
    for (const file of ['one', 'two', 'three']) {
      const declarations = Array.from({ length: 60 }, (_, index) => `export const ${file}Symbol${index} = ${index};`);
      write(`${file}.ts`, declarations.join('\n'));
    }
    const result = scanRepositoryFiles(root, { maxContextBytes: 8000 });
    expect(result.contextValidation.valid).toBe(true);
    expect(result.context.truncation.truncated).toBe(true);
    expect(result.context.truncation.omittedContextFiles).toBe(0);
    expect(result.context.truncation.omittedSymbols).toBeGreaterThan(0);
    expect(result.context.fileInventory).toHaveLength(3);
    expect(Buffer.byteLength(result.contextJson, 'utf8')).toBeLessThanOrEqual(8000);
  });

  it('rejects malformed nested schema data before Context can be used', () => {
    const valid = scanRepositoryFiles(root).context;
    const invalid = { ...valid, dependencyGraph: { ...valid.dependencyGraph, edges: [null] } };
    expect(validateRepositoryContext(invalid)).toBe(false);
  });

  it('builds a focused context for a selected module and direct graph neighbors', () => {
    write('src/focus.ts', "import { helper } from './helper';\nexport const answer = helper();");
    write('src/helper.ts', 'export function helper() { return 42; }');
    write('src/consumer.ts', "import { answer } from './focus';\nexport const output = answer;");
    write('src/unrelated.ts', 'export const unrelated = true;');
    const scan = scanRepositoryFiles(root);
    const focused = buildFocusedRepositoryContext(scan, 'src/focus.ts');

    expect(validateRepositoryContext(JSON.parse(focused.contextJson))).toBe(true);
    expect(focused.context.fileInventory).toHaveLength(4);
    expect(focused.context.dependencyGraph.nodes).toEqual(expect.arrayContaining(['src/focus.ts', 'src/helper.ts', 'src/consumer.ts']));
    expect(focused.context.symbolTable.map(module => module.file)).not.toContain('src/unrelated.ts');
    expect(focused.context.truncation.omittedModules).toBeGreaterThan(0);
    expect(focused.context.truncation.reasons.join(' ')).toContain('Focused context');
  });

  it('serves the real bounded scan contract through the intelligence HTTP route', async () => {
    const app = express();
    app.use(express.json());
    app.use(intelligenceRoute);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    try {
      const address = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/api/intelligence/scan`);
      const payload = await response.json() as {
        ok: boolean;
        status: string;
        files: Array<{ path: string; content?: string }>;
        summary: { scannedFiles: number; totalModules: number; totalSymbols: number; totalExports: number; averageComplexity: number | null };
        contextValidation: { valid: boolean; schemaVersion: string };
        contextJson: string;
      };
      expect(response.status).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.files.some(file => file.path === 'src/components/RepositoryIntelligence.tsx')).toBe(true);
      expect(payload.files.every(file => !('content' in file))).toBe(true);
      expect(payload.summary.scannedFiles).toBeGreaterThan(0);
      expect(payload.contextValidation).toEqual({ valid: true, schemaVersion: '1.0', bytes: expect.any(Number) });
      const scanIdentifier = (JSON.parse(payload.contextJson) as { scanIdentifier: string }).scanIdentifier;
      const focusedResponse = await fetch(`http://127.0.0.1:${address.port}/api/intelligence/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanIdentifier, filePath: 'src/services/repositoryIntelligence.ts' }),
      });
      const focusedPayload = await focusedResponse.json() as { ok: boolean; contextJson: string; contextValidation: { valid: boolean; schemaVersion: string } };
      expect(focusedResponse.status).toBe(200);
      expect(focusedPayload.ok).toBe(true);
      expect(focusedPayload.contextValidation.valid).toBe(true);
      expect((JSON.parse(focusedPayload.contextJson) as { truncation: { reasons: string[] } }).truncation.reasons.join(' ')).toContain('Focused context');

      const staleResponse = await fetch(`http://127.0.0.1:${address.port}/api/intelligence/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanIdentifier: 'stale-scan', filePath: 'src/services/repositoryIntelligence.ts' }),
      });
      expect(staleResponse.status).toBe(409);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  }, 20000);
});