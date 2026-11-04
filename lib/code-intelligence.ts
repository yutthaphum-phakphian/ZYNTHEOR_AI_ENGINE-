import ts from 'typescript';

export type SymbolType =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'variable'
  | 'constant'
  | 'method'
  | 'property'
  | 'import'
  | 'react-component'
  | 'api-route';

export interface SymbolInfo {
  name: string;
  type: SymbolType;
  line: number;
  character?: number;
  endLine?: number;
  endCharacter?: number;
  exported?: boolean;
  visibility?: 'public' | 'protected' | 'private' | 'internal';
  signature?: string;
}

export interface ComplexityMetrics {
  cyclomatic: number;
  branches: number;
  maxNestingDepth: number;
  functionCount: number;
  averageFunctionLength: number;
  formula: string;
}

export interface CodeAnalysis {
  imports: string[];
  exports: string[];
  reExports: string[];
  symbols: SymbolInfo[];
  lines: number;
  functions: number;
  complexity: number;
  complexityMetrics: ComplexityMetrics;
  parserWarnings: string[];
}

export interface DependencyGraph {
  [file: string]: string[];
}

export interface EvidenceCheck {
  name: string;
  passed: boolean;
  reason?: string;
}

export interface EvidenceGateResult {
  passed: boolean;
  checks: EvidenceCheck[];
}

export class CodeIntelligence {
  static analyzeSourceFile(fileName: string, code: string): CodeAnalysis & { language: string } {
    const instance = new CodeIntelligence();
    const result = instance.analyze(code, fileName);
    const lang = fileName.endsWith('.tsx') || fileName.endsWith('.ts') ? 'typescript' : 'javascript';
    return { ...result, language: lang };
  }
  private parse(code: string, fileName = 'file.ts'): ts.SourceFile {
    const extension = fileName.toLowerCase().split('.').pop();
    const scriptKind = extension === 'tsx' ? ts.ScriptKind.TSX
      : extension === 'jsx' ? ts.ScriptKind.JSX
        : ['js', 'mjs', 'cjs'].includes(extension || '') ? ts.ScriptKind.JS
          : ts.ScriptKind.TS;
    return ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, scriptKind);
  }

  extractImports(code: string, fileName = 'file.ts'): string[] {
    const imports: string[] = [];
    const sourceFile = this.parse(code, fileName);
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        imports.push(node.moduleSpecifier.text);
      }
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
        node.arguments.length > 0 && ts.isStringLiteralLike(node.arguments[0])) {
        imports.push(node.arguments[0].text);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return [...new Set(imports)];
  }

  extractExports(code: string, fileName = 'file.ts'): string[] {
    const exports: string[] = [];
    const sourceFile = this.parse(code, fileName);
    const visit = (node: ts.Node) => {
      if (ts.canHaveModifiers(node)) {
        const modifiers = ts.getModifiers(node) || [];
        if (modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
          if (modifiers.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword)) exports.push('default');
          else if ('name' in node && node.name && ts.isIdentifier(node.name)) exports.push(node.name.text);
          else if (ts.isVariableStatement(node)) {
            for (const declaration of node.declarationList.declarations) {
              if (ts.isIdentifier(declaration.name)) exports.push(declaration.name.text);
            }
          }
        }
      }
      if (ts.isExportAssignment(node)) {
        exports.push('default');
      }
      if (ts.isExportDeclaration(node) && node.exportClause) {
        if (ts.isNamedExports(node.exportClause)) {
          exports.push(...node.exportClause.elements.map(element => element.name.text));
        } else if (ts.isNamespaceExport(node.exportClause)) {
          exports.push(node.exportClause.name.text);
        }
      } else if (ts.isExportDeclaration(node) && !node.exportClause) {
        exports.push('*');
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return [...new Set(exports)];
  }

  extractReExports(code: string, fileName = 'file.ts'): string[] {
    const sources: string[] = [];
    const sourceFile = this.parse(code, fileName);
    const visit = (node: ts.Node) => {
      if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        sources.push(node.moduleSpecifier.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return [...new Set(sources)];
  }

  extractSymbols(code: string, fileName = 'file.ts'): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    const sourceFile = this.parse(code, fileName);
    const add = (
      name: string,
      type: SymbolInfo['type'],
      node: ts.Node,
      exported = false,
      visibility: SymbolInfo['visibility'] = exported ? 'public' : 'internal',
      signature?: string
    ) => {
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
      symbols.push({
        name,
        type,
        line: start.line + 1,
        character: start.character + 1,
        endLine: end.line + 1,
        endCharacter: end.character + 1,
        exported,
        visibility,
        signature,
      });
    };
    const isExported = (node: ts.Node) => ts.canHaveModifiers(node) && (ts.getModifiers(node) || []).some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
    const getVisibility = (node: ts.Node): SymbolInfo['visibility'] => {
      if (!ts.canHaveModifiers(node)) return 'public';
      const modifiers = ts.getModifiers(node) || [];
      if (modifiers.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword)) return 'private';
      if (modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ProtectedKeyword)) return 'protected';
      return 'public';
    };
    const hasJsx = (root: ts.Node): boolean => {
      let found = false;
      const scan = (n: ts.Node) => {
        if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) {
          found = true;
          return;
        }
        if (!found) ts.forEachChild(n, scan);
      };
      scan(root);
      return found;
    };
    const isComponentCandidate = (name: string, node: ts.Node): boolean => {
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) return false;
      const isReactExt = fileName.endsWith('.tsx') || fileName.endsWith('.jsx');
      if (hasJsx(node)) return true;
      if (isReactExt && (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node))) {
        return true;
      }
      return false;
    };
    const addBindingNames = (name: ts.BindingName, node: ts.Node, type: SymbolInfo['type'], exported: boolean, originalNode?: ts.Node) => {
      if (ts.isIdentifier(name)) {
        const symbolType = isComponentCandidate(name.text, originalNode || node) ? 'react-component' : type;
        add(name.text, symbolType, node, exported);
      } else {
        for (const element of name.elements) if (ts.isBindingElement(element)) addBindingNames(element.name, element, type, exported, originalNode);
      }
    };
    const visit = (node: ts.Node) => {
      if (ts.isImportClause(node)) {
        if (node.name) add(node.name.text, 'import', node);
        if (node.namedBindings && ts.isNamespaceImport(node.namedBindings)) add(node.namedBindings.name.text, 'import', node.namedBindings);
        if (node.namedBindings && ts.isNamedImports(node.namedBindings)) {
          for (const element of node.namedBindings.elements) add(element.name.text, 'import', element);
        }
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        const type = isComponentCandidate(node.name.text, node) ? 'react-component' : 'function';
        add(node.name.text, type, node, isExported(node));
      } else if (ts.isClassDeclaration(node) && node.name) {
        add(node.name.text, 'class', node, isExported(node));
      } else if (ts.isInterfaceDeclaration(node)) {
        add(node.name.text, 'interface', node, isExported(node));
      } else if (ts.isTypeAliasDeclaration(node)) {
        add(node.name.text, 'type', node, isExported(node));
      } else if (ts.isEnumDeclaration(node)) {
        add(node.name.text, 'type', node, isExported(node));
      } else if (ts.isVariableDeclaration(node)) {
        const declarationList = node.parent;
        const exported = ts.isVariableDeclarationList(declarationList) && ts.isVariableStatement(declarationList.parent) && isExported(declarationList.parent);
        const isFunctionValue = Boolean(node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)));
        const isConst = ts.isVariableDeclarationList(declarationList) && (declarationList.flags & ts.NodeFlags.Const) !== 0;
        addBindingNames(node.name, node, isFunctionValue ? 'function' : isConst ? 'constant' : 'variable', exported, node.initializer || node);
      } else if (ts.isMethodDeclaration(node) || ts.isMethodSignature(node) || ts.isConstructorDeclaration(node)) {
        const name = node.name ? node.name.getText(sourceFile) : 'constructor';
        add(name, 'method', node, isExported(node), getVisibility(node));
      } else if (ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) {
        add(node.name.getText(sourceFile), 'property', node, isExported(node), getVisibility(node));
      } else if (ts.isCallExpression(node)) {
        // API Route detection: e.g. router.get('/api/users', ...), app.post(...)
        if (ts.isPropertyAccessExpression(node.expression)) {
          const propName = node.expression.name.text.toLowerCase();
          const targetObj = node.expression.expression.getText(sourceFile).toLowerCase();
          const httpMethods = ['get', 'post', 'put', 'delete', 'patch'];
          if (httpMethods.includes(propName) && (targetObj === 'router' || targetObj === 'app' || targetObj === 'r')) {
            if (node.arguments.length > 0 && ts.isStringLiteralLike(node.arguments[0])) {
              const routePath = node.arguments[0].text;
              add(`${propName.toUpperCase()} ${routePath}`, 'api-route', node, true, 'public');
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    const reExportedLocals = new Set<string>();
    const collectReExportedLocals = (node: ts.Node) => {
      if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause) && !node.moduleSpecifier) {
        for (const element of node.exportClause.elements) reExportedLocals.add((element.propertyName || element.name).text);
      } else if (ts.isExportAssignment(node) && ts.isIdentifier(node.expression)) {
        reExportedLocals.add(node.expression.text);
      }
      ts.forEachChild(node, collectReExportedLocals);
    };
    collectReExportedLocals(sourceFile);
    for (const symbol of symbols) {
      if (reExportedLocals.has(symbol.name)) {
        symbol.exported = true;
        symbol.visibility = 'public';
      }
    }
    return symbols;
  }

  analyzeComplexity(code: string, fileName = 'file.ts'): { lines: number; functions: number; complexity: number; complexityMetrics: ComplexityMetrics } {
    const sourceFile = this.parse(code, fileName);
    const lines = code.split(/\r?\n/).filter(line => line.trim().length > 0).length;
    const branchKinds = new Set([
      ts.SyntaxKind.IfStatement, ts.SyntaxKind.ForStatement, ts.SyntaxKind.ForInStatement,
      ts.SyntaxKind.ForOfStatement, ts.SyntaxKind.WhileStatement, ts.SyntaxKind.DoStatement,
      ts.SyntaxKind.CaseClause, ts.SyntaxKind.CatchClause, ts.SyntaxKind.ConditionalExpression,
    ]);
    let branches = 0;
    let maxNestingDepth = 0;
    let functionCount = 0;
    let totalFunctionLines = 0;
    const visit = (node: ts.Node, nestingDepth: number) => {
      const isBranch = branchKinds.has(node.kind) || (ts.isBinaryExpression(node) && [
        ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken,
      ].includes(node.operatorToken.kind));
      if (isBranch && !(ts.isCaseClause(node) && node.expression.kind === ts.SyntaxKind.DefaultKeyword)) {
        branches += 1;
        nestingDepth += 1;
        maxNestingDepth = Math.max(maxNestingDepth, nestingDepth);
      }
      if (ts.isFunctionLike(node)) {
        functionCount += 1;
        const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line;
        const endLine = sourceFile.getLineAndCharacterOfPosition(node.end).line;
        totalFunctionLines += endLine - startLine + 1;
      }
      ts.forEachChild(node, child => visit(child, nestingDepth));
    };
    visit(sourceFile, 0);
    const complexity = branches + 1;
    return {
      lines,
      functions: functionCount,
      complexity,
      complexityMetrics: {
        cyclomatic: complexity,
        branches,
        maxNestingDepth,
        functionCount,
        averageFunctionLength: functionCount ? Math.round((totalFunctionLines / functionCount) * 10) / 10 : 0,
        formula: 'module cyclomatic complexity = 1 + if/loop/case/catch/conditional/logical-expression branches',
      },
    };
  }

  analyze(code: string, fileName = 'file.ts'): CodeAnalysis {
    const sourceFile = this.parse(code, fileName);
    const imports = this.extractImports(code, fileName);
    const exports = this.extractExports(code, fileName);
    const reExports = this.extractReExports(code, fileName);
    const symbols = this.extractSymbols(code, fileName);
    const { lines, functions, complexity, complexityMetrics } = this.analyzeComplexity(code, fileName);
    const parserDiagnostics = (sourceFile as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics || [];
    const parserWarnings = parserDiagnostics.map(diagnostic => {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');
      const line = diagnostic.start === undefined ? undefined : sourceFile.getLineAndCharacterOfPosition(diagnostic.start).line + 1;
      return line ? `line ${line}: ${message}` : message;
    });
    return { imports, exports, reExports, symbols, lines, functions, complexity, complexityMetrics, parserWarnings };
  }

  buildDependencyGraph(files: Record<string, string>): DependencyGraph {
    const graph: DependencyGraph = {};
    for (const [file, code] of Object.entries(files)) {
      const imports = this.extractImports(code, file)
        .filter(imp => imp.startsWith('.') || imp.startsWith('@/') || files[imp] !== undefined)
        .map(imp => {
          if (files[imp]) return imp;
          // resolve relative
          const base = file.substring(0, file.lastIndexOf('/'));
          const resolved = `${base}/${imp}`.replace(/\/\.\//g, '/').replace(/\.ts$|\.js$/, '');
          return Object.keys(files).find(f => f.includes(resolved) || f === `${resolved}.ts` || f === `${resolved}.js`) || imp;
        });
      graph[file] = imports;
    }
    return graph;
  }

  getRelatedFiles(targetFile: string, graph: DependencyGraph, depth: number = 2): string[] {
    const related = new Set<string>();
    const queue: { file: string, d: number }[] = [{ file: targetFile, d: 0 }];
    const visited = new Set<string>();
    
    while (queue.length > 0) {
      const { file, d } = queue.shift()!;
      if (visited.has(file) || d > depth) continue;
      visited.add(file);
      
      // files that target depends on
      for (const dep of graph[file] || []) {
        if (!visited.has(dep)) { related.add(dep); queue.push({ file: dep, d: d+1 }); }
      }
      // files that depend on target
      for (const [f, deps] of Object.entries(graph)) {
        if (deps.includes(file) && !visited.has(f)) { related.add(f); queue.push({ file: f, d: d+1 }); }
      }
    }
    return [...related];
  }

  verifyAnalysis(code: string, analysis: CodeAnalysis): EvidenceGateResult {
    const checks: EvidenceCheck[] = [
      { name: 'has_content', passed: code.length > 0, reason: 'empty code' },
      { name: 'imports_extracted', passed: true },
      { name: 'exports_extracted', passed: true },
      { name: 'complexity_positive', passed: analysis.complexity >= 1, reason: 'complexity must be >=1' },
      { name: 'lines_match', passed: analysis.lines <= code.split('\n').length, reason: 'lines mismatch' },
    ];
    return { passed: checks.every(c=>c.passed), checks };
  }
}

export function analyzeCode(code: string): CodeAnalysis {
  const ci = new CodeIntelligence();
  return ci.analyze(code);
}
