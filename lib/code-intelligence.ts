// @ts-nocheck
export interface SymbolInfo {
  name: string;
  type: 'interface' | 'type' | 'class' | 'function' | 'react-component' | 'api-route' | 'variable' | 'method';
  file?: string;
  line: number;
  endLine?: number;
  character: number;
  exported?: boolean;
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
}

export class CodeIntelligence {
  static analyzeSourceFile(filePath: string, code: string): CodeAnalysis {
    const ci = new CodeIntelligence();
    return ci.analyze(code, filePath);
  }

  analyze(code: string, filePath: string = 'unknown.ts'): CodeAnalysis {
    const lines = (code || '').split('\n');
    const symbols: SymbolInfo[] = [];
    const imports: string[] = [];

    // Track imported symbol names
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
        });
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
        });
      }
    }

    const language = filePath.endsWith('.tsx') || filePath.endsWith('.ts') ? 'typescript' : 'javascript';
    const complexity = Math.max(1, Math.floor(lines.length / 10));

    return {
      language,
      symbols,
      complexity,
      linesOfCode: lines.length,
      imports: Array.from(importedSymbols),
      calls: this.extractCallGraph(code, filePath),
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
      const fnHeader = line.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=)/);
      if (fnHeader) {
        currentCaller = fnHeader[1] || fnHeader[2] || currentCaller;
      }

      const callMatches = line.matchAll(/(\w+)\s*\(/g);
      for (const m of callMatches) {
        const callee = m[1];
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
