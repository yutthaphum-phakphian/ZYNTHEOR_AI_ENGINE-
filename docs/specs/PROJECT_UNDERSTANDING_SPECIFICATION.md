# ZYNTHEOR AI ENGINE — PROJECT STRUCTURE UNDERSTANDING SPECIFICATION

**Phase**: P9 — Workspace-Aware Intelligence  
**Component**: Project Structure Engine (`src/services/projectStructureEngine.ts`)  
**Status**: Verified & Active  

---

## 1. Overview & Purpose

The **Project Structure Engine** provides automated structural awareness for ZYNTHEOR. It analyzes directory hierarchies, classifies files into semantic categories, identifies tech stack frameworks, maps package dependencies, detects entry points, and extracts test suite conventions across any software workspace.

---

## 2. Core Capabilities

1. **Directory Topology & Hierarchy Mapping**: Recursively scans workspace trees, ignoring build artifacts (`node_modules`, `.git`, `dist`, `.aistudio`), and produces structured tree maps.
2. **Semantic File Classification**: Categorizes files into `source`, `test`, `config`, `document`, `asset`, `style`, `build`, or `other`, along with programming language detection.
3. **Tech Stack & Framework Identification**: Reads `package.json` dependencies and configuration footprints to detect React 19, Vite, Express, TypeScript, Tailwind CSS, D3, Drizzle ORM, and Node.js test runners.
4. **Dependency Graph Overview**: Extracts all direct and developer dependencies with exact version strings.
5. **Entry Point & Config Isolation**: Pinpoints application entry points (`server.ts`, `src/App.tsx`, `index.html`) and system configs (`vite.config.ts`, `tsconfig.json`, `fly.toml`).
6. **Test Suite Conventions**: Maps test folders (`/tests`), counts test files, and identifies execution runners.

---

## 3. Data Schema

```typescript
export interface ProjectStructureAnalysis {
  rootPath: string;
  totalFiles: number;
  hierarchy: Record<string, string[]>;
  files: FileClassification[];
  frameworks: string[];
  entryPoints: string[];
  configFiles: string[];
  testStructure: {
    directory: string;
    totalTestFiles: number;
    framework: string;
  };
  dependencies: DependencyOverview[];
  analyzedAt: string;
}
```

---

## 4. REST API Integration

* **Endpoint**: `GET /api/intelligence/workspace-structure`
* **Response**:
```json
{
  "ok": true,
  "analysis": {
    "rootPath": "/app/applet",
    "totalFiles": 142,
    "frameworks": ["React 19.0.0", "Vite", "Express", "TypeScript"],
    "entryPoints": ["server.ts", "src/App.tsx", "index.html"],
    "testStructure": {
      "directory": "/tests",
      "totalTestFiles": 32,
      "framework": "Node Test Runner (node --test)"
    }
  }
}
```
