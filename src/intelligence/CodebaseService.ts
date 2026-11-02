import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

export interface CodeSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'enum' | 'variable' | 'method';
  line: number;
  column: number;
  exported: boolean;
  docComment?: string;
}

export interface ImportDeclarationInfo {
  moduleSpecifier: string;
  defaultImport?: string;
  namedImports: string[];
  isTypeOnly: boolean;
}

export interface ExportDeclarationInfo {
  name: string;
  isDefault: boolean;
  isTypeOnly: boolean;
}

export interface ASTAnalysisResult {
  filePath: string;
  totalLines: number;
  totalCharacters: number;
  symbols: CodeSymbol[];
  imports: ImportDeclarationInfo[];
  exports: ExportDeclarationInfo[];
  complexity: number;
  syntaxErrors: string[];
}

export class CodebaseService {
  private static workspaceRoot = path.resolve(process.cwd());

  /**
   * Sanitizes and verifies that a relative or absolute path is within the workspace
   */
  public static resolveSafePath(userPath: string): string {
    const resolved = path.resolve(this.workspaceRoot, userPath);
    const normalizedRoot = path.normalize(this.workspaceRoot);
    const normalizedTarget = path.normalize(resolved);

    if (!normalizedTarget.startsWith(normalizedRoot)) {
      throw new Error(`Path traversal denied: Target path '${userPath}' is outside the workspace root.`);
    }

    return normalizedTarget;
  }

  /**
   * Analyzes raw TypeScript / JavaScript source code via TypeScript Compiler API AST
   */
  public static analyzeSourceCode(code: string, fileName = 'temp.ts'): ASTAnalysisResult {
    const sourceFile = ts.createSourceFile(
      fileName,
      code,
      ts.ScriptTarget.Latest,
      true,
      fileName.endsWith('.tsx') || fileName.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const symbols: CodeSymbol[] = [];
    const imports: ImportDeclarationInfo[] = [];
    const exports: ExportDeclarationInfo[] = [];
    let complexity = 1; // Base cyclomatic complexity

    function isNodeExported(node: ts.Node): boolean {
      return (
        (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0 ||
        (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
      );
    }

    function visit(node: ts.Node) {
      // 1. Calculate Cyclomatic Complexity
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.CaseClause:
        case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.ConditionalExpression:
          complexity++;
          break;
        case ts.SyntaxKind.BinaryExpression: {
          const binExpr = node as ts.BinaryExpression;
          if (
            binExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
            binExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
            binExpr.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
          ) {
            complexity++;
          }
          break;
        }
      }

      // 2. Extract Imports
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
        const namedImports: string[] = [];
        let defaultImport: string | undefined;
        const isTypeOnly = node.importClause?.isTypeOnly ?? false;

        if (node.importClause) {
          if (node.importClause.name) {
            defaultImport = node.importClause.name.text;
          }
          if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
            for (const elem of node.importClause.namedBindings.elements) {
              namedImports.push(elem.name.text);
            }
          }
        }

        imports.push({ moduleSpecifier, defaultImport, namedImports, isTypeOnly });
      }

      // 3. Extract Exports & Declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const exported = (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;
        symbols.push({
          name: node.name.text,
          kind: 'function',
          line: line + 1,
          column: character + 1,
          exported,
        });
        if (exported) {
          const isDefault = (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Default) !== 0;
          exports.push({ name: node.name.text, isDefault, isTypeOnly: false });
        }
      } else if (ts.isClassDeclaration(node) && node.name) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const exported = (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;
        symbols.push({
          name: node.name.text,
          kind: 'class',
          line: line + 1,
          column: character + 1,
          exported,
        });
        if (exported) {
          const isDefault = (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Default) !== 0;
          exports.push({ name: node.name.text, isDefault, isTypeOnly: false });
        }
      } else if (ts.isInterfaceDeclaration(node)) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const exported = (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;
        symbols.push({
          name: node.name.text,
          kind: 'interface',
          line: line + 1,
          column: character + 1,
          exported,
        });
        if (exported) {
          exports.push({ name: node.name.text, isDefault: false, isTypeOnly: true });
        }
      } else if (ts.isTypeAliasDeclaration(node)) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const exported = (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;
        symbols.push({
          name: node.name.text,
          kind: 'type',
          line: line + 1,
          column: character + 1,
          exported,
        });
        if (exported) {
          exports.push({ name: node.name.text, isDefault: false, isTypeOnly: true });
        }
      } else if (ts.isEnumDeclaration(node)) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const exported = (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;
        symbols.push({
          name: node.name.text,
          kind: 'enum',
          line: line + 1,
          column: character + 1,
          exported,
        });
        if (exported) {
          exports.push({ name: node.name.text, isDefault: false, isTypeOnly: false });
        }
      } else if (ts.isVariableStatement(node)) {
        const exported = (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(decl.getStart());
            symbols.push({
              name: decl.name.text,
              kind: 'variable',
              line: line + 1,
              column: character + 1,
              exported,
            });
            if (exported) {
              exports.push({ name: decl.name.text, isDefault: false, isTypeOnly: false });
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    const lineStarts = sourceFile.getLineStarts();
    const totalLines = lineStarts.length;

    // Collect syntax diagnostics
    const syntaxErrors: string[] = [];
    const parseDiagnostics = (sourceFile as any).parseDiagnostics;
    if (Array.isArray(parseDiagnostics)) {
      for (const diag of parseDiagnostics) {
        syntaxErrors.push(typeof diag.messageText === 'string' ? diag.messageText : diag.messageText?.messageText || 'Syntax error');
      }
    }

    return {
      filePath: fileName,
      totalLines,
      totalCharacters: code.length,
      symbols,
      imports,
      exports,
      complexity,
      syntaxErrors,
    };
  }

  /**
   * Reads and analyzes a local file within the workspace
   */
  public static analyzeFileAST(relativeFilePath: string): ASTAnalysisResult {
    const safePath = this.resolveSafePath(relativeFilePath);
    if (!fs.existsSync(safePath)) {
      throw new Error(`File not found: ${relativeFilePath}`);
    }

    const code = fs.readFileSync(safePath, 'utf8');
    return this.analyzeSourceCode(code, relativeFilePath);
  }

  /**
   * Scans workspace directories for declared symbols matching a query
   */
  public static findSymbols(query: string, searchDir = 'src'): { symbol: CodeSymbol; file: string }[] {
    const results: { symbol: CodeSymbol; file: string }[] = [];
    const lowerQuery = query.toLowerCase();
    const targetDir = this.resolveSafePath(searchDir);

    if (!fs.existsSync(targetDir)) return results;

    function walk(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== 'dist' && !entry.name.startsWith('.')) {
            walk(fullPath);
          }
        } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
          try {
            const relPath = path.relative(process.cwd(), fullPath);
            const code = fs.readFileSync(fullPath, 'utf8');
            const analysis = CodebaseService.analyzeSourceCode(code, relPath);
            for (const sym of analysis.symbols) {
              if (sym.name.toLowerCase().includes(lowerQuery)) {
                results.push({ symbol: sym, file: relPath });
              }
            }
          } catch {
            // Ignore parse errors on individual files
          }
        }
      }
    }

    walk(targetDir);
    return results.slice(0, 50); // limit to top 50 matches
  }
}
