import { useState, useEffect, useCallback } from 'react';

export interface WorkspaceEnvironment {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  targetPath?: string;
  tags?: string[];
  settings?: {
    defaultChatMode?: string;
    localOnly?: boolean;
  };
}

export interface WorkspaceExportBundle {
  version: '1.0';
  exportedAt: string;
  workspace: WorkspaceEnvironment;
  projects: Array<{
    id: string;
    name: string;
    description: string;
    status: string;
    updatedAt: string;
    createdAt?: string;
    startDate?: string;
    endDate?: string;
    tags?: string[];
    targetPath?: string;
  }>;
  fileMetadataSnippet?: Array<{
    name: string;
    relativePath: string;
    sizeBytes: number;
    modifiedAt: string;
  }>;
}

export const WORKSPACE_STORAGE_KEY = 'zyntheor.workspaces.v1';
export const ACTIVE_WORKSPACE_KEY = 'zyntheor.active_workspace_id.v1';
export const WORKSPACE_CHANGE_EVENT = 'zyntheor:workspace-changed';

export const DEFAULT_WORKSPACES: WorkspaceEnvironment[] = [
  {
    id: 'ws-main',
    name: 'ZYNTHEOR AI ENGINE',
    description: 'First-party AI engineering workspace (Local-First Core)',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'src/',
    tags: ['core', 'local-first', 'buffalo']
  },
  {
    id: 'ws-core',
    name: 'ZYNTHEOR CORE Native Model',
    description: 'Native Model Development & Reproducible Training Pipeline',
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'training/',
    tags: ['training', 'native-model', 'eval']
  },
  {
    id: 'ws-agent',
    name: 'ZYNTHEOR Autonomous Agent',
    description: 'Autonomous Reasoning, Tool Selection & Dynamic Planning Engine',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'lib/',
    tags: ['agent', 'orchestrator', 'planning']
  },
  {
    id: 'ws-security',
    name: 'ZYNTHEOR Cloud Security & Audit',
    description: 'Security Governance, HSM Seals & Forensic Audit Chain',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'governance/',
    tags: ['security', 'audit', 'hsm']
  },
  {
    id: 'ws-prompt',
    name: 'ZYNTHEOR Prompt Studio & Benchmarks',
    description: 'Production Prompt Generator, Test Bench & Versioning Control',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'lib/prompt-studio/',
    tags: ['prompt-forge', 'eval', 'benchmarks']
  },
  {
    id: 'ws-telemetry',
    name: 'ZYNTHEOR Telemetry & Observability',
    description: 'Real-time Telemetry, Request Observability & GPU Diagnostics',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'src/components/',
    tags: ['telemetry', 'observability', 'gpu']
  },
  {
    id: 'ws-codegraph',
    name: 'ZYNTHEOR Code Graph & AST Analysis',
    description: 'Deep AST Parsing, Symbol Indexing & Cross-File Dependency Reasoning',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'src/services/',
    tags: ['code-graph', 'ast', 'architecture']
  },
  {
    id: 'ws-patch',
    name: 'ZYNTHEOR Safe Patch Engine',
    description: 'Atomic Patch Application, SHA-256 Double Verification & Safe Diffs',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'src/services/',
    tags: ['patch', 'safe-executor', 'diff']
  },
  {
    id: 'ws-eval',
    name: 'ZYNTHEOR Quality & Eval Benchmarks',
    description: 'High-Precision Quality Evaluation, Synthetic Test Suites & Scoring',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'training/',
    tags: ['dataset', 'eval', 'scoring']
  },
  {
    id: 'ws-sovereign',
    name: 'ZYNTHEOR Sovereign Identity & Vault',
    description: 'NIST FIPS 140-3 L4 Cryptographic Seals & Identity Governance Vault',
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'governance/',
    tags: ['hsm', 'sovereign', 'identity']
  },
  {
    id: 'ws-fullstack',
    name: 'ZYNTHEOR Full-Stack Express & React',
    description: 'Node.js backend with Express routes, middleware, and React frontend SPA',
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'server.ts',
    tags: ['fullstack', 'express', 'react']
  },
  {
    id: 'ws-mobile',
    name: 'ZYNTHEOR Native Mobile Engine',
    description: 'Android Kotlin bridge, cross-platform UI components & mobile native core bindings',
    createdAt: new Date(Date.now() - 11 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'src/services/',
    tags: ['mobile', 'kotlin', 'android']
  },
  {
    id: 'ws-cloudsql',
    name: 'ZYNTHEOR Cloud SQL & Drizzle ORM',
    description: 'PostgreSQL schema definitions, migration runner & relational queries',
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'database/',
    tags: ['cloudsql', 'drizzle', 'postgresql']
  },
  {
    id: 'ws-firebase',
    name: 'ZYNTHEOR Firebase & Firestore Engine',
    description: 'Realtime Firestore database schemas, security rules & authentication triggers',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'src/services/',
    tags: ['firebase', 'firestore', 'auth']
  },
  {
    id: 'ws-workspace',
    name: 'ZYNTHEOR Google Workspace Connector',
    description: '1P Google Workspace integration for Drive, Sheets, Docs & Calendar APIs',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'src/services/',
    tags: ['google-workspace', 'oauth', 'drive']
  },
  {
    id: 'ws-dataset',
    name: 'ZYNTHEOR Dataset Provenance Engine',
    description: 'Data collection pipelines, multi-modal dataset engine & SHA-256 lineage tracking',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'training/',
    tags: ['dataset', 'provenance', 'lineage']
  },
  {
    id: 'ws-vector',
    name: 'ZYNTHEOR Vector Store & Neural Search',
    description: 'HNSW vector indexing, semantic embedding retrieval & hybrid search',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'src/services/',
    tags: ['vector-store', 'embedding', 'rag']
  },
  {
    id: 'ws-graphics',
    name: 'ZYNTHEOR 3D & Spatial Canvas',
    description: 'Three.js WebGL viewport rendering, spatial canvas & interactive shader engine',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'src/components/',
    tags: ['threejs', 'webgl', '3d-canvas']
  },
  {
    id: 'ws-i18n',
    name: 'ZYNTHEOR Multilingual & Translation',
    description: 'Thai, English, Japanese & Chinese multi-region translation & tokenization',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: 'src/',
    tags: ['i18n', 'thai', 'localization']
  },
  {
    id: 'ws-cicd',
    name: 'ZYNTHEOR Production CI/CD & Deploy',
    description: 'GitHub Actions workflows, automated build validation & production deployment runner',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    targetPath: '.github/workflows/',
    tags: ['cicd', 'github-actions', 'deploy']
  }
];

export function readStoredWorkspaces(): WorkspaceEnvironment[] {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACES;
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const existingIds = new Set(parsed.map((w: WorkspaceEnvironment) => w.id));
        const missingDefaults = DEFAULT_WORKSPACES.filter(w => !existingIds.has(w.id));
        if (missingDefaults.length > 0) {
          const merged = [...parsed, ...missingDefaults];
          try {
            localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          return merged;
        }
        return parsed;
      }
    }
  } catch {
    /* ignore read failure */
  }
  return DEFAULT_WORKSPACES;
}

export function readActiveWorkspaceId(available: WorkspaceEnvironment[]): string {
  if (typeof window === 'undefined') return available[0]?.id || 'ws-main';
  try {
    const saved = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    if (saved && available.some(w => w.id === saved)) return saved;
  } catch {
    /* ignore read failure */
  }
  return available[0]?.id || 'ws-main';
}

export function useMultiWorkspace() {
  const [workspaces, setWorkspaces] = useState<WorkspaceEnvironment[]>(() => readStoredWorkspaces());
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => readActiveWorkspaceId(readStoredWorkspaces()));
  const [reinitToken, setReinitToken] = useState<number>(0);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspaces));
    } catch {
      /* storage unavailable */
    }
  }, [workspaces]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, activeWorkspaceId);
    } catch {
      /* storage unavailable */
    }
  }, [activeWorkspaceId]);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0] || DEFAULT_WORKSPACES[0];

  const switchWorkspace = useCallback((id: string) => {
    if (!workspaces.some(w => w.id === id)) return;
    setActiveWorkspaceId(id);
    setReinitToken(prev => prev + 1);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGE_EVENT, { detail: { workspaceId: id } }));
    }
  }, [workspaces]);

  const createWorkspace = useCallback((name: string, description: string = '', targetPath: string = 'src/') => {
    const cleanName = name.trim();
    if (!cleanName) return null;

    const newWs: WorkspaceEnvironment = {
      id: `ws-${Date.now().toString(36)}`,
      name: cleanName,
      description: description.trim() || 'Custom isolated workspace environment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      targetPath: targetPath.trim() || 'src/',
      tags: ['custom', 'isolated']
    };

    setWorkspaces(prev => [newWs, ...prev]);
    switchWorkspace(newWs.id);
    return newWs;
  }, [switchWorkspace]);

  const deleteWorkspace = useCallback((id: string) => {
    if (workspaces.length <= 1) return false;
    setWorkspaces(prev => {
      const next = prev.filter(w => w.id !== id);
      if (activeWorkspaceId === id) {
        const fallbackId = next[0]?.id || 'ws-main';
        setActiveWorkspaceId(fallbackId);
        setReinitToken(t => t + 1);
      }
      return next;
    });
    return true;
  }, [workspaces.length, activeWorkspaceId]);

  const exportWorkspaceBundle = useCallback((targetWorkspaceId?: string): WorkspaceExportBundle => {
    const wsToExport = workspaces.find(w => w.id === (targetWorkspaceId || activeWorkspaceId)) || activeWorkspace;

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      workspace: wsToExport,
      projects: [
        {
          id: `proj-${wsToExport.id}`,
          name: wsToExport.name,
          description: wsToExport.description,
          status: 'Active workspace',
          updatedAt: wsToExport.updatedAt,
          createdAt: wsToExport.createdAt,
          targetPath: wsToExport.targetPath,
          tags: wsToExport.tags
        }
      ],
      fileMetadataSnippet: [
        { name: 'server.ts', relativePath: 'server.ts', sizeBytes: 2048, modifiedAt: new Date().toISOString() },
        { name: 'App.tsx', relativePath: 'src/App.tsx', sizeBytes: 228000, modifiedAt: new Date().toISOString() }
      ]
    };
  }, [workspaces, activeWorkspaceId, activeWorkspace]);

  const importWorkspaceBundle = useCallback((bundleJson: string): { success: boolean; workspace?: WorkspaceEnvironment; error?: string } => {
    try {
      const parsed = JSON.parse(bundleJson) as WorkspaceExportBundle;
      if (!parsed || !parsed.workspace || !parsed.workspace.name) {
        return { success: false, error: 'Invalid workspace export payload schema' };
      }

      const importedWs: WorkspaceEnvironment = {
        ...parsed.workspace,
        id: parsed.workspace.id || `ws-imported-${Date.now().toString(36)}`,
        updatedAt: new Date().toISOString()
      };

      setWorkspaces(prev => {
        const existsIndex = prev.findIndex(w => w.id === importedWs.id);
        if (existsIndex >= 0) {
          const clone = [...prev];
          clone[existsIndex] = importedWs;
          return clone;
        }
        return [importedWs, ...prev];
      });

      switchWorkspace(importedWs.id);
      return { success: true, workspace: importedWs };
    } catch (e: any) {
      return { success: false, error: e.message || 'JSON parse error during import' };
    }
  }, [switchWorkspace]);

  return {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    reinitToken,
    switchWorkspace,
    createWorkspace,
    deleteWorkspace,
    exportWorkspaceBundle,
    importWorkspaceBundle
  };
}
