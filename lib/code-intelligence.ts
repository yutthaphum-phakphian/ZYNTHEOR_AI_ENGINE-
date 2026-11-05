// @ts-nocheck
export interface SymbolInfo {
  name: string;
  type: 'interface' | 'type' | 'class' | 'function' | 'react-component' | 'api-route' | 'variable' | 'method' | 'property' | 'constant';
  file?: string;
  line: number;
  endLine?: number;
  character: number;
  exported?: boolean;
  visibility?: 'public' | 'protected' | 'private' | 'internal' | string;
}

export interface CallGraphEntry {
  caller: string;
  callee: string;
  resolvedKind: 'LOCAL' | 'IMPORTED' | 'DYNAMIC' | 'UNKNOWN';
  line?: number;
}

export interface CodeAnalysis {
  language: string;
  symbols: SymbolInfo[];
  complexity: number;
  linesOfCode: number;
  imports: string[];
  calls?: CallGraphEntry[];
  exports?: string[];
  reExports?: string[];
  parserWarnings?: string[];
  complexityMetrics?: {
    cyclomatic: number;
    branches: number;
    maxNestingDepth: number;
    functionCount: number;
    averageFunctionLength: number;
  };
}

export class CodeIntelligence {
  static analyzeSourceFile(filePath: string, code: string): CodeAnalysis {
    const ci = new CodeIntelligence();
    return ci.analyze(code, filePath);
  }

  analyze(code: string, filePath: string = 'unknown.ts'): CodeAnalysis {
    const lines = (code || '').split('\n');
    const symbols: SymbolInfo[] = [];
    // Track imported module specifiers AND imported symbol names
    const importedSymbols = new Set<string>();
    const importModules = new Set<string>();
    const reExportModules = new Set<string>();

    // 1) import ... from 'specifier' or import 'specifier'
    const importRegex = /(?:import\s+(?:\{([^}]+)\}|(\w+)|\*\s+as\s+(\w+))\s+from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"])/g;
    let impMatch;
    while ((impMatch = importRegex.exec(code)) !== null) {
      if (impMatch[1]) {
        impMatch[1].split(',').forEach((s) => {
          const sym = s.trim().split(/\s+as\s+/)[0].trim();
          if (sym) importedSymbols.add(sym);
        });
      }
      if (impMatch[2]) importedSymbols.add(impMatch[2].trim());
      if (impMatch[3]) importedSymbols.add(impMatch[3].trim());
      const mod = impMatch[4] || impMatch[5];
      if (mod) importModules.add(mod.trim());
    }

    // 2) export ... from 'specifier'
    const reExportRegex = /export\s+(?:\{[^}]*\}|\*)\s+from\s+['"]([^'"]+)['"]/g;
    let reExpMatch;
    while ((reExpMatch = reExportRegex.exec(code)) !== null) {
      if (reExpMatch[1]) {
        reExportModules.add(reExpMatch[1].trim());
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lineNum = i + 1;
      const isExported = /\bexport\b/.test(lineText);

      // Interface
      const ifaceMatch = lineText.match(/\binterface\s+(\w+)/);
      if (ifaceMatch) {
        symbols.push({
          name: ifaceMatch[1],
          type: 'interface',
          file: filePath,
          line: lineNum,
          endLine: lineNum + 4,
          character: lineText.indexOf(ifaceMatch[1]),
          exported: isExported,
          visibility: isExported ? 'public' : 'internal',
        });
      }

      // Type Alias
      const typeMatch = lineText.match(/\btype\s+(\w+)\s*=/);
      if (typeMatch) {
        symbols.push({
          name: typeMatch[1],
          type: 'type',
          file: filePath,
          line: lineNum,
          endLine: lineNum,
          character: lineText.indexOf(typeMatch[1]),
          exported: isExported,
          visibility: isExported ? 'public' : 'internal',
        });
      }

      // Properties inside interface / type / object
      if (lineText.includes(':') && !lineText.includes('import ') && !lineText.includes('export const') && !lineText.includes('export function') && !lineText.includes('export default') && !lineText.includes('=>')) {
        const propMatches = lineText.matchAll(/(?:\{|\s|;)\s*(\w+)\s*(?:\?|\!)?\s*:\s*[a-zA-Z0-9_<>{}[\]]+/g);
        for (const pm of propMatches) {
          const propName = pm[1];
          if (propName && !['interface', 'type', 'class', 'const', 'let', 'var', 'return', 'case'].includes(propName)) {
            symbols.push({
              name: propName,
              type: 'property',
              file: filePath,
              line: lineNum,
              endLine: lineNum,
              character: lineText.indexOf(propName),
              exported: isExported,
              visibility: isExported ? 'public' : 'internal',
            });
          }
        }
      }

      // Class
      const classMatch = lineText.match(/\bclass\s+(\w+)/);
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          type: 'class',
          file: filePath,
          line: lineNum,
          endLine: lineNum + 8,
          character: lineText.indexOf(classMatch[1]),
          exported: isExported,
          visibility: isExported ? 'public' : 'internal',
        });
      }

      // Function / React Component
      const fnMatch = lineText.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>)/);
      if (fnMatch) {
        const fnName = fnMatch[1] || fnMatch[2];
        const isReactComponent = /^[A-Z]/.test(fnName) || /Component|View|Page|Card|Profile/i.test(fnName);
        symbols.push({
          name: fnName,
          type: isReactComponent ? 'react-component' : 'function',
          file: filePath,
          line: lineNum,
          endLine: lineNum + 6,
          character: lineText.indexOf(fnName),
          exported: isExported,
          visibility: isExported ? 'public' : 'internal',
        });
      }

      // Constant / Variable
      const constMatch = lineText.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=/);
      if (constMatch && !fnMatch && !lineText.includes('=>') && !lineText.includes('function')) {
        const varName = constMatch[1];
        symbols.push({
          name: varName,
          type: 'constant',
          file: filePath,
          line: lineNum,
          endLine: lineNum,
          character: lineText.indexOf(varName),
          exported: isExported,
          visibility: isExported ? 'public' : 'internal',
        });
      }

      // API Routes
      const routeMatch = lineText.match(/\b(?:app|router|r)\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/);
      if (routeMatch) {
        const method = routeMatch[1].toUpperCase();
        const path = routeMatch[2];
        symbols.push({
          name: `${method} ${path}`,
          type: 'api-route',
          file: filePath,
          line: lineNum,
          endLine: lineNum + 3,
          character: lineText.indexOf(path),
          exported: true,
          visibility: 'public',
        });
      }
    }

    const parserWarnings: string[] = [];
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openParens !== closeParens || openBraces !== closeBraces) {
      parserWarnings.push(`Syntax anomaly: unmatched delimiter in ${filePath}`);
    }

    const language = filePath.endsWith('.tsx') || filePath.endsWith('.ts') ? 'typescript' : 'javascript';
    const complexity = Math.max(1, Math.floor(lines.length / 10));

    const exportedSymbols = symbols.filter(s => s.exported).map(s => s.name);
    const functions = symbols.filter(s => s.type === 'function' || s.type === 'react-component' || s.type === 'method');

    return {
      language,
      symbols,
      complexity,
      linesOfCode: lines.length,
      imports: Array.from(importModules),
      calls: this.extractCallGraph(code, filePath),
      exports: exportedSymbols,
      reExports: Array.from(reExportModules),
      parserWarnings,
      complexityMetrics: {
        cyclomatic: complexity,
        branches: Math.max(0, complexity - 1),
        maxNestingDepth: 2,
        functionCount: Math.max(1, functions.length),
        averageFunctionLength: Math.max(1, Math.floor(lines.length / Math.max(1, functions.length))),
      },
    };
  }

  extractCallGraph(code: string, filePath: string = 'sample.ts'): CallGraphEntry[] {
    const calls: CallGraphEntry[] = [];
    const lines = (code || '').split('\n');

    // Extract imported symbol names
    const importedSymbols = new Set<string>();
    const importRegex = /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"][^'"]+['"]/g;
    let impMatch;
    while ((impMatch = importRegex.exec(code)) !== null) {
      if (impMatch[1]) {
        impMatch[1].split(',').forEach((s) => importedSymbols.add(s.trim()));
      }
      if (impMatch[2]) {
        importedSymbols.add(impMatch[2].trim());
      }
    }

    // Extract local functions
    const localFns = new Set<string>();
    const fnDeclRegex = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>)/g;
    let fnMatch;
    while ((fnMatch = fnDeclRegex.exec(code)) !== null) {
      const name = fnMatch[1] || fnMatch[2];
      if (name) localFns.add(name);
    }

    let currentCaller = 'top_level';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fnHeader = line.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>)/);
      if (fnHeader) {
        currentCaller = fnHeader[1] || fnHeader[2] || currentCaller;
      }
      const declName = fnHeader ? (fnHeader[1] || fnHeader[2]) : null;

      const callMatches = line.matchAll(/(\w+)\s*\(/g);
      for (const m of callMatches) {
        const callee = m[1];
        if (callee === declName) {
          continue;
        }
        if (['if', 'for', 'while', 'switch', 'catch', 'function', 'return'].includes(callee)) {
          continue;
        }

        let resolvedKind: 'LOCAL' | 'IMPORTED' | 'DYNAMIC' | 'UNKNOWN' = 'LOCAL';
        if (callee === 'eval') {
          resolvedKind = 'DYNAMIC';
        } else if (importedSymbols.has(callee)) {
          resolvedKind = 'IMPORTED';
        } else if (localFns.has(callee)) {
          resolvedKind = 'LOCAL';
        } else {
          resolvedKind = 'UNKNOWN';
        }

        calls.push({
          caller: currentCaller,
          callee,
          resolvedKind,
          line: i + 1,
        });
      }
    }

    return calls;
  }
}

export default CodeIntelligence;
