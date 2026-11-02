# ZYNTHEOR CODE GRAPH — Specification

**Document Version**: 1.0.0 (Phase P2 Code Graph)  

---

## 1. Overview

The Code Graph Service (`src/services/codeGraph.ts`) performs static AST and regex dependency analysis across workspace files, constructing a directed graph of software components, import dependencies, API endpoints, services, and unit tests.

---

## 2. Graph Node & Relationship Schema

### Graph Nodes (`GraphNode`)
- `id`: Relative file path (e.g. `src/App.tsx`).
- `language`: `TypeScript`, `TypeScript React`, `JavaScript`, `JSON`, etc.
- `symbols`: Array of exported function, class, type, or component names.
- `category`: `component`, `service`, `route`, `lib`, `test`, `config`, `other`.

### Relationship Types (`RelationshipType`)
- `IMPORTS`: Direct ES import or CJS require statement.
- `CALLS`: Function or method invocation.
- `DEPENDS_ON`: External package import from `node_modules` (prefixed `package:`).
- `TESTS`: Test file importing target source file (`tests/*.test.mjs` → `src/*`).
- `SERVES_API`: API route handler importing service implementation (`src/routes/*` → `src/services/*`).

---

## 3. Performance & Incremental Indexing

- **mtime Caching**: Tracks file modification timestamps (`mtimeMs`). Unchanged files skip AST re-parsing during graph rebuilds.
- **Path Resolution**: Resolves relative import paths (`./`, `../`) to canonical workspace relative file paths.
- **Graph Queries**:
  - `findRelatedNodes(targetFile, depth)`: Discovers direct dependencies, consumers, and associated unit tests.
  - `queryGraphForContext(query, maxEdges)`: Finds graph nodes and edges matching query keywords.
