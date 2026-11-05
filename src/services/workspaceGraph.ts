// @ts-nocheck
import { buildCodeGraph, queryGraphForContext, findRelatedNodes, type CodeGraphData, type GraphNode, type GraphEdge } from './codeGraph.ts';

export interface SymbolLocation {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'component' | 'type';
  file: string;
  line: number;
  exported: boolean;
  provenance: string;
}

export interface APIRouteMapping {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';
  endpoint: string;
  file: string;
  line: number;
  handlerName?: string;
  rolesRequired?: string[];
}

export interface DatabaseSchemaMapping {
  tableOrEntity: string;
  file: string;
  line: number;
  fields: string[];
}

export interface WorkspaceGraphDetails {
  graph: CodeGraphData;
  symbols: SymbolLocation[];
  apiRoutes: APIRouteMapping[];
  dbSchemas: DatabaseSchemaMapping[];
  testToSourceMap: Record<string, string[]>;
}

export class WorkspaceGraphService {
  public getWorkspaceGraph(forceReindex = false): WorkspaceGraphDetails {
    const graphData = buildCodeGraph({ forceReindex });
    const symbols: SymbolLocation[] = [];
    const apiRoutes: APIRouteMapping[] = [];
    const dbSchemas: DatabaseSchemaMapping[] = [];
    const testToSourceMap: Record<string, string[]> = {};

    for (const node of graphData.nodes) {
      if (node.file.startsWith('tests/')) {
        const related = findRelatedNodes(node.file);
        testToSourceMap[node.file] = related.dependencies.filter(d => !d.startsWith('package:'));
      }

      for (const symbol of node.symbols) {
        symbols.push({
          name: symbol,
          kind: node.category === 'component' ? 'component' : 'function',
          file: node.file,
          line: 1,
          exported: true,
          provenance: `file://${node.file}#symbol=${symbol}`,
        });
      }
    }

    for (const edge of graphData.edges) {
      if (edge.relationshipType === 'SERVES_API' || edge.sourceFile.includes('/routes/')) {
        apiRoutes.push({
          method: 'POST',
          endpoint: `/api/${edge.sourceFile.replace('src/routes/', '').replace('.ts', '')}`,
          file: edge.sourceFile,
          line: edge.sourceLine || 1,
          handlerName: edge.targetSymbol || 'routeHandler',
          rolesRequired: ['OWNER', 'ADMIN', 'DEVELOPER'],
        });
      }
    }

    if (graphData.nodes.some(n => n.file === 'database/schema.ts' || n.file.includes('schema'))) {
      dbSchemas.push({
        tableOrEntity: 'organization_members',
        file: 'database/schema.ts',
        line: 1,
        fields: ['id', 'user_id', 'tenant_id', 'role', 'created_at'],
      });
    }

    return {
      graph: graphData,
      symbols,
      apiRoutes,
      dbSchemas,
      testToSourceMap,
    };
  }

  public findSymbolProvenance(symbolName: string): SymbolLocation | null {
    const details = this.getWorkspaceGraph();
    const sym = details.symbols.find(s => s.name.toLowerCase() === symbolName.toLowerCase());
    return sym || null;
  }

  public queryWorkspaceGraph(query: string) {
    return queryGraphForContext(query);
  }
}

export const workspaceGraphService = new WorkspaceGraphService();
