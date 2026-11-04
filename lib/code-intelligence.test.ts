import { describe, it, expect } from 'vitest';
import { CodeIntelligence } from './code-intelligence';

describe('Code Intelligence - 9 PASS', () => {
  const ci = new CodeIntelligence();

  it('1. extracts imports correctly', () => {
    const code = `import React from 'react'; import { useState } from 'react'; const x = require('fs');`;
    const imports = ci.extractImports(code);
    expect(imports).toContain('react');
    expect(imports).toContain('fs');
  });

  it('2. extracts exports correctly', () => {
    const code = `export const foo = 1; export function bar(){}; export default MyClass;`;
    const exports = ci.extractExports(code);
    expect(exports).toContain('foo');
    expect(exports).toContain('bar');
    expect(exports).toContain('default');
    expect(exports).not.toContain('MyClass');
  });

  it('3. analyzes complexity', () => {
    const code = `function a(){ if(true){ for(let i=0;i<10;i++){ console.log(i); } } }`;
    const { complexity, functions } = ci.analyzeComplexity(code);
    expect(complexity).toBeGreaterThan(1);
    expect(functions).toBeGreaterThan(0);
  });

  it('4. builds dependency graph', () => {
    const files = {
      'a.ts': `import { b } from './b';`,
      'b.ts': `import { c } from './c';`,
      'c.ts': `export const c = 1;`
    };
    const graph = ci.buildDependencyGraph(files);
    expect(graph['a.ts'].length).toBeGreaterThan(0);
  });

  it('5. gets related files', () => {
    const graph = { 'a.ts': ['b.ts'], 'b.ts': ['c.ts'], 'c.ts': [], 'd.ts': ['a.ts'] };
    const related = ci.getRelatedFiles('b.ts', graph, 1);
    expect(related).toContain('c.ts');
    expect(related).toContain('a.ts');
  });

  it('6. full analyze returns all fields', () => {
    const code = `import x from './y'; export const z = 1; function foo(){}`;
    const analysis = ci.analyze(code);
    expect(analysis.imports.length).toBeGreaterThan(0);
    expect(analysis.exports).toContain('z');
    expect(analysis.lines).toBeGreaterThan(0);
  });

  it('7. evidence gate passes valid analysis', () => {
    const code = `export const a = 1;`;
    const analysis = ci.analyze(code);
    const ev = ci.verifyAnalysis(code, analysis);
    expect(ev.passed).toBe(true);
  });

  it('8. handles empty code', () => {
    const analysis = ci.analyze('');
    expect(analysis.imports.length).toBe(0);
    expect(analysis.lines).toBe(0);
  });

  it('9. integration complex file analysis', () => {
    const code = `
      import { DynamicReplanner } from './dynamic-replanning';
      import { planWithDependencies } from './dependency-aware-planning';
      export class MyOrchestrator {
        async run(){ 
          if(true){ 
            const r = new DynamicReplanner();
            return r;
          }
        }
      }
      export const version = '1.2.0';
    `;
    const analysis = ci.analyze(code);
    expect(analysis.imports.length).toBe(2);
    expect(analysis.exports).toContain('MyOrchestrator');
    expect(analysis.complexity).toBeGreaterThan(1);
    const ev = ci.verifyAnalysis(code, analysis);
    expect(ev.passed).toBe(true);
  });

  it('10. parses declarations, aliases, re-exports, visibility, and line numbers from AST', () => {
    const code = [
      '// export const fabricated = true;',
      "import DefaultThing, { sourceName as localName } from './source';",
      'interface Contract { run(): void; }',
      'type Identifier = string;',
      'const internalValue = 1;',
      'export { internalValue as publicValue };',
      "export { remoteValue as copiedValue } from './remote';",
      'class Service {',
      '  private secretField = 1;',
      '  public execute() { if (this.secretField) return localName; }',
      '}',
    ].join('\n');
    const analysis = ci.analyze(code, 'service.ts');

    expect(analysis.symbols.find(symbol => symbol.name === 'fabricated')).toBeUndefined();
    expect(analysis.symbols.find(symbol => symbol.name === 'Contract')).toMatchObject({ type: 'interface', line: 3 });
    expect(analysis.symbols.find(symbol => symbol.name === 'Identifier')).toMatchObject({ type: 'type', line: 4 });
    expect(analysis.symbols.find(symbol => symbol.name === 'internalValue')).toMatchObject({ exported: true, visibility: 'public' });
    expect(analysis.symbols.find(symbol => symbol.name === 'execute')).toMatchObject({ type: 'method', visibility: 'public' });
    expect(analysis.symbols.find(symbol => symbol.name === 'secretField')).toMatchObject({ type: 'property', visibility: 'private' });
    expect(analysis.exports).toEqual(expect.arrayContaining(['publicValue', 'copiedValue']));
    expect(analysis.reExports).toContain('./remote');
    expect(analysis.imports).toContain('./source');
    expect(analysis.imports).not.toContain('./remote');
  });

  it('11. parses JSX, reports syntax diagnostics, and exposes the complexity formula', () => {
    const jsx = ci.analyze('export const Widget = () => <section>{ready && <span />}</section>;', 'widget.tsx');
    expect(jsx.symbols.find(symbol => symbol.name === 'Widget')).toMatchObject({ type: 'react-component', exported: true });
    expect(jsx.complexityMetrics.formula).toContain('1 +');
    expect(jsx.complexityMetrics.branches).toBeGreaterThan(0);

    const invalid = ci.analyze('function broken( {', 'broken.ts');
    expect(invalid.parserWarnings.length).toBeGreaterThan(0);
  });
});
