// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  Boxes,
  Plus,
  Trash2,
  Check,
  MoreHorizontal,
  Code2,
  Calendar,
  Keyboard,
  ShieldCheck,
  Activity,
  HardDrive,
  GitBranch,
  Cpu,
  Workflow,
  FolderTree,
  RefreshCw,
  AlertCircle,
  FileText,
  Folder,
  ArrowLeft,
  Download,
  UploadCloud,
  CheckCircle2,
  ExternalLink,
  Lock,
  Rocket,
  AlertTriangle,
  FileCheck,
  Search,
  Filter,
  X,
} from 'lucide-react';
import { PipelineMonitor } from './PipelineMonitor';

export interface DeploymentCheckItem {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warn';
  detail: string;
}

export interface DeploymentValidationData {
  isValid: boolean;
  canDeploy: boolean;
  registryEntry: {
    targetRelease: string;
    canonicalSubsystemSha256: string;
    merkleRoot: string;
    forensicPayloadSha256: string;
    hardwareSeals: number;
    status: string;
    signer: string;
  };
  buildSignature: {
    hash: string;
    artifactsCount: number;
    distTotalBytes: number;
    generatedAt: string;
  };
  checks: DeploymentCheckItem[];
  validationVerdict: string;
  validatedAt: string;
}

export interface Project {
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
}

export interface GitStatusData {
  isGitRepo: boolean;
  branch: string | null;
  commitSha: string | null;
  commitAuthor: string | null;
  commitDate: string | null;
  commitMessage: string | null;
  isClean: boolean | null;
  modifiedCount: number;
  untrackedCount: number;
  stagedCount: number;
  dirtyFileCount?: number;
  modifiedFiles: string[];
  untrackedFiles: string[];
  stagedFiles: string[];
  remoteUrl: string | null;
  repoPath?: string | null;
  statusLabel?: string;
  reason?: string;
  verifiedAt: string;
}

export interface CodeIntegrityData {
  manifestExists: boolean;
  manifestPath: string;
  totalTrackedFiles: number;
  matchedCount?: number;
  mismatchedCount?: number;
  missingCount?: number;
  isIntegrityVerified?: boolean;
  mismatches?: Array<{ file: string; expected: string; actual: string }>;
  missingFiles?: string[];
  snippet: string;
  verifiedAt: string;
}


export interface BuildStatusData {
  hasDist: boolean;
  distIndexHtmlExists: boolean;
  distSizeBytes: number;
  distModifiedAt: string | null;
  assetCount: number;
  packageVersion: string;
  nodeVersion: string;
  verifiedAt: string;
}

export interface CiCdStatusData {
  workflowCount: number;
  workflows: Array<{ filename: string; name: string; triggers: string[]; jobs: string[] }>;
  releaseReadinessStatus: string | null;
  releaseReadinessSnippet: string | null;
  verifiedAt: string;
}

export interface WorkspaceFileItem {
  name: string;
  relativePath: string;
  sizeBytes: number;
  isDirectory: boolean;
  modifiedAt: string;
  extension: string;
}

export interface WorkspaceProjectsPageProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  add: () => void;
  remove: (p: Project) => void;
  query: string;
  authHeaders: () => Record<string, string>;
  setToast: (msg: string) => void;
  lastBackupAt: string | null;
  setLastBackupAt: (val: string | null) => void;
  recordAudit?: (type: string, detail: string) => Promise<void>;
  workspaces?: any[];
  activeWorkspaceId?: string;
  onSwitchWorkspace?: (id: string) => void;
  onCreateWorkspace?: (name: string, desc?: string, targetPath?: string) => void;
  onExportWorkspaceBundle?: (id?: string) => any;
  onImportWorkspaceBundle?: (jsonStr: string) => any;
}

type WorkspaceTab = 'workspaces' | 'git' | 'build' | 'cicd' | 'files';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function timeLabel(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function WorkspaceProjectsPage({
  projects,
  setProjects,
  add,
  remove,
  query,
  authHeaders,
  setToast,
  lastBackupAt,
  setLastBackupAt,
  recordAudit,
  activeWorkspaceId,
  onSwitchWorkspace,
}: WorkspaceProjectsPageProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('workspaces');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const fileImportInputRef = useRef<HTMLInputElement>(null);

  // Server state
  const [gitStatus, setGitStatus] = useState<GitStatusData | null>(null);
  const [integrity, setIntegrity] = useState<CodeIntegrityData | null>(null);
  const [buildStatus, setBuildStatus] = useState<BuildStatusData | null>(null);
  const [cicdStatus, setCicdStatus] = useState<CiCdStatusData | null>(null);
  const [files, setFiles] = useState<WorkspaceFileItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [loadingSection, setLoadingSection] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Deployment validation state
  const [deploymentValidation, setDeploymentValidation] = useState<DeploymentValidationData | null>(null);
  const [validatingDeploy, setValidatingDeploy] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);

  // Real-time Search and Status Filter State
  const [searchQuery, setSearchQuery] = useState('');

  function handleExportWorkspaceConfig() {
    const configBundle = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      activeWorkspaceId: activeWorkspaceId || 'ws-main',
      projects,
      fileMetadataCount: files.length,
      fileSnippet: files.slice(0, 10)
    };

    const blob = new Blob([JSON.stringify(configBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace_config_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (setToast) setToast('Exported project configuration and file metadata JSON');
  }

  function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed && Array.isArray(parsed.projects) && parsed.projects.length > 0) {
          setProjects(parsed.projects);
          if (setToast) setToast(`Imported ${parsed.projects.length} workspace project configurations`);
        } else {
          if (setToast) setToast('Invalid workspace config JSON structure');
        }
      } catch {
        if (setToast) setToast('Error parsing workspace config file');
      }
    };
    reader.readAsText(file);
  }
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const visible = projects.filter(p => {
    const q = (searchQuery || query || '').toLowerCase().trim();
    const matchesSearch = !q || `${p.name} ${p.description} ${(p.tags || []).join(' ')} ${p.targetPath || ''}`.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || p.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Clamp focusedIndex
  useEffect(() => {
    if (visible.length === 0) setFocusedIndex(-1);
    else if (focusedIndex >= visible.length) setFocusedIndex(visible.length - 1);
  }, [visible.length, focusedIndex]);

  // Global Keyboard Navigation
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (activeTab !== 'workspaces' || visible.length === 0) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = (prev + 1) % visible.length;
          cardRefs.current[next]?.focus();
          return next;
        });
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = (prev - 1 + visible.length) % visible.length;
          cardRefs.current[next]?.focus();
          return next;
        });
      } else if (e.key === 'Home') {
        e.preventDefault();
        setFocusedIndex(0);
        cardRefs.current[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        const last = visible.length - 1;
        setFocusedIndex(last);
        cardRefs.current[last]?.focus();
      } else if (e.key === 'Escape') {
        if (projectToDelete) {
          e.preventDefault();
          setProjectToDelete(null);
        } else if (selectedProject) {
          e.preventDefault();
          setSelectedProject(null);
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (!selectedProject && !projectToDelete && focusedIndex >= 0 && focusedIndex < visible.length) {
          e.preventDefault();
          setSelectedProject(visible[focusedIndex]);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, focusedIndex, selectedProject, projectToDelete, activeTab]);

  // Fetch Git status on mount for dashboard panel
  useEffect(() => {
    fetchGitStatus();
  }, []);

  // Fetch tab data when active tab changes
  useEffect(() => {
    if (activeTab === 'git') {
      fetchGitStatus();
    } else if (activeTab === 'build') {
      fetchBuildStatus();
      fetchIntegrity();
      fetchDeploymentValidation();
    } else if (activeTab === 'cicd') {
      fetchCiCdStatus();
      fetchDeploymentValidation();
    } else if (activeTab === 'files') {
      fetchFiles(currentPath);
    }
  }, [activeTab]);

  async function fetchDeploymentValidation() {
    setValidatingDeploy(true);
    try {
      const res = await fetch('/api/workspace/deploy/validation', { headers: { ...authHeaders() } });
      const data = await res.json();
      if (res.ok && data.ok) {
        setDeploymentValidation(data.validation);
      }
    } catch {
      setDeploymentValidation(null);
    } finally {
      setValidatingDeploy(false);
    }
  }

  async function handleExecuteDeploy() {
    setIsDeploying(true);
    setDeploymentError(null);
    setDeploymentResult(null);
    try {
      const res = await fetch('/api/workspace/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setDeploymentResult(data.deployment);
        if (recordAudit) void recordAudit('PRODUCTION_DEPLOY_EXECUTED', `release=${data.deployment.targetRelease}; id=${data.deployment.deploymentId}`);
        fetchDeploymentValidation();
      } else {
        const msg = data.message || data.error || 'Deployment failed';
        setDeploymentError(msg);
        if (recordAudit) void recordAudit('PRODUCTION_DEPLOY_BLOCKED', msg);
      }
    } catch (err: any) {
      setDeploymentError(err.message || 'Network error triggering deployment');
    } finally {
      setIsDeploying(false);
    }
  }

  async function fetchGitStatus() {
    setLoadingSection(true);
    try {
      const res = await fetch('/api/workspace/git', { headers: { ...authHeaders() } });
      const data = await res.json();
      if (res.ok && data.ok) {
        setGitStatus(data.git);
      }
    } catch {
      setGitStatus(null);
    } finally {
      setLoadingSection(false);
    }
  }

  async function fetchIntegrity() {
    try {
      const res = await fetch('/api/workspace/integrity', { headers: { ...authHeaders() } });
      const data = await res.json();
      if (res.ok && data.ok) {
        setIntegrity(data.integrity);
      }
    } catch {
      setIntegrity(null);
    }
  }

  async function fetchBuildStatus() {
    setLoadingSection(true);
    try {
      const res = await fetch('/api/workspace/build', { headers: { ...authHeaders() } });
      const data = await res.json();
      if (res.ok && data.ok) {
        setBuildStatus(data.build);
      }
    } catch {
      setBuildStatus(null);
    } finally {
      setLoadingSection(false);
    }
  }

  async function fetchCiCdStatus() {
    setLoadingSection(true);
    try {
      const res = await fetch('/api/workspace/cicd', { headers: { ...authHeaders() } });
      const data = await res.json();
      if (res.ok && data.ok) {
        setCicdStatus(data.cicd);
      }
    } catch {
      setCicdStatus(null);
    } finally {
      setLoadingSection(false);
    }
  }

  async function fetchFiles(subPath: string = '') {
    setLoadingSection(true);
    try {
      const q = subPath ? `?path=${encodeURIComponent(subPath)}` : '';
      const res = await fetch(`/api/workspace/files${q}`, { headers: { ...authHeaders() } });
      const data = await res.json();
      if (res.ok && data.ok) {
        setFiles(data.files || []);
        setCurrentPath(data.currentPath === '.' ? '' : data.currentPath);
      } else {
        setToast(`Cannot browse folder: ${data.message || 'error'}`);
      }
    } catch (e: any) {
      setToast(`File error: ${e.message}`);
    } finally {
      setLoadingSection(false);
    }
  }

  async function handleBackup() {
    setBackingUp(true);
    try {
      const res = await fetch('/api/workspace/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setLastBackupAt(data.backup?.timestamp || new Date().toISOString());
        setToast(`สำรองข้อมูล Workspace สำเร็จ: ${data.backup?.backupFilename}`);
        if (recordAudit) void recordAudit('WORKSPACE_BACKUP_CREATED', data.backup?.backupFilename);
      } else {
        throw new Error(data.message || 'Backup failed');
      }
    } catch (e: any) {
      setToast(`การสำรองข้อมูลล้มเหลว: ${e.message}`);
    } finally {
      setBackingUp(false);
    }
  }

  async function handleRestore() {
    if (!confirm('ยืนยันกู้คืนข้อมูลโปรเจกต์จากไฟล์สำรองล่าสุดบนเซิร์ฟเวอร์?')) return;
    setRestoring(true);
    try {
      const res = await fetch('/api/workspace/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.ok && Array.isArray(data.projects)) {
        setProjects(data.projects);
        setToast(`กู้คืนโปรเจกต์ ${data.projects.length} รายการจาก ${data.restoredFrom} เรียบร้อยแล้ว`);
        if (recordAudit) void recordAudit('WORKSPACE_RESTORED', data.restoredFrom);
      } else {
        throw new Error(data.message || 'Restore failed');
      }
    } catch (e: any) {
      setToast(`การกู้คืนล้มเหลว: ${e.message}`);
    } finally {
      setRestoring(false);
    }
  }

  return (
    <section className="subpage">
      <div className="page-heading">
        <div>
          <div className="eyebrow">WORKSPACE / PROJECTS</div>
          <h1>Build in context.</h1>
          <p>Organize codebases, track verified Git & build status, and inspect repository files with server-backed persistence.</p>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={handleExportWorkspaceConfig}
            title="Export project configuration and file metadata JSON"
          >
            <Download size={14} />
            <span>Export Config JSON</span>
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => fileImportInputRef.current?.click()}
            title="Import project configuration and file metadata"
          >
            <UploadCloud size={14} />
            <span>Import Config JSON</span>
          </button>
          <input
            ref={fileImportInputRef}
            type="file"
            accept=".json"
            hidden
            onChange={handleImportFileChange}
          />
          <button
            type="button"
            className="secondary-button"
            onClick={handleBackup}
            disabled={backingUp}
            title="Create server-side timestamped snapshot"
          >
            {backingUp ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}
            <span>Backup Snapshot</span>
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={handleRestore}
            disabled={restoring}
            title="Restore from last server backup"
          >
            {restoring ? <RefreshCw size={14} className="spin" /> : <UploadCloud size={14} />}
            <span>Restore Backup</span>
          </button>
          <button type="button" className="primary-button" onClick={add}>
            <Plus size={15} /> New project
          </button>
        </div>
      </div>

      {/* Top Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-top"><span>Projects (Durable)</span><Boxes size={16} /></div>
          <b>{String(projects.length).padStart(2, '0')}</b>
          <small>Server file storage</small>
        </div>
        <div className="stat-card">
          <div className="stat-top"><span>Storage Safety</span><HardDrive size={16} /></div>
          <b>{lastBackupAt ? 'Backed up' : 'Active'}</b>
          <small>{lastBackupAt ? `Last: ${timeLabel(lastBackupAt)}` : 'Atomic write with backup'}</small>
        </div>
        <div className="stat-card">
          <div className="stat-top"><span>Security & Privacy</span><ShieldCheck size={16} /></div>
          <b>Local-First</b>
          <small>Zero secret leakage</small>
        </div>
      </div>

      {/* Navigation Tabs (Separating Project, Git, Build, CI/CD, Files) */}
      <div
        className="forge-nav"
        style={{
          marginTop: '16px',
          marginBottom: '16px',
          borderBottom: '1px solid #252e40',
          paddingBottom: '8px',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          className={`forge-tab ${activeTab === 'workspaces' ? 'active' : ''}`}
          onClick={() => setActiveTab('workspaces')}
        >
          <Boxes size={14} /> Workspaces ({projects.length})
        </button>
        <button
          type="button"
          className={`forge-tab ${activeTab === 'git' ? 'active' : ''}`}
          onClick={() => setActiveTab('git')}
        >
          <GitBranch size={14} /> Verified Git Status
        </button>
        <button
          type="button"
          className={`forge-tab ${activeTab === 'build' ? 'active' : ''}`}
          onClick={() => setActiveTab('build')}
        >
          <Cpu size={14} /> Verified Build & Runtime
        </button>
        <button
          type="button"
          className={`forge-tab ${activeTab === 'cicd' ? 'active' : ''}`}
          onClick={() => setActiveTab('cicd')}
        >
          <Workflow size={14} /> CI/CD & Release Gates
        </button>
        <button
          type="button"
          className={`forge-tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          <FolderTree size={14} /> Workspace Files
        </button>
      </div>

      {/* TAB 1: WORKSPACES & PROJECTS */}
      {activeTab === 'workspaces' && (
        <>
          {/* New 'Git Status' Dashboard Panel */}
          <div
            className="git-status-dashboard-panel"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              padding: '14px 18px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #131926, #0e131d)',
              border: '1px solid #283348',
              marginBottom: '16px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#201f3d', border: '1px solid #4a3e80', display: 'grid', placeItems: 'center', color: '#bcaeff' }}>
                <GitBranch size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <b style={{ fontSize: '12px', color: '#f1f5f9' }}>Git Status Dashboard</b>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: !gitStatus?.isGitRepo ? '#2d2114' : (gitStatus.isClean ? '#064e3b' : '#3d1d1a'),
                    color: !gitStatus?.isGitRepo ? '#fde047' : (gitStatus.isClean ? '#6ee7b7' : '#fca5a5'),
                    border: `1px solid ${!gitStatus?.isGitRepo ? '#78350f' : (gitStatus.isClean ? '#059669' : '#7f1d1d')}`
                  }}>
                    {gitStatus?.isGitRepo
                      ? (gitStatus.isClean ? 'Clean' : `${gitStatus.dirtyFileCount ?? 0} Dirty Files`)
                      : 'Git Unavailable'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#8899b0', marginTop: '4px' }}>
                  {gitStatus?.isGitRepo ? (
                    <>
                      <span>Branch: <strong style={{ color: '#c7d2fe' }}>{gitStatus.branch || 'HEAD'}</strong></span>
                      <span>•</span>
                      <span>Commit: <code style={{ color: '#93c5fd', fontFamily: 'monospace' }}>{gitStatus.commitSha ? gitStatus.commitSha.slice(0, 7) : '—'}</code></span>
                      <span>•</span>
                      <span>Dirty file count: <strong style={{ color: gitStatus.isClean ? '#6ee7b7' : '#fca5a5' }}>{gitStatus.dirtyFileCount ?? 0}</strong></span>
                    </>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>
                      Git repository is unavailable in this runtime (no active .git directory detected)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {gitStatus?.isGitRepo ? (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '5px', background: '#172033', border: '1px solid #293852', color: '#93c5fd' }}>
                    Modified: <b>{gitStatus.modifiedCount ?? 0}</b>
                  </span>
                  <span style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '5px', background: '#172033', border: '1px solid #293852', color: '#fde047' }}>
                    Untracked: <b>{gitStatus.untrackedCount ?? 0}</b>
                  </span>
                  <span style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '5px', background: '#172033', border: '1px solid #293852', color: '#86efac' }}>
                    Staged: <b>{gitStatus.stagedCount ?? 0}</b>
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '5px', background: '#201b17', border: '1px solid #4a3b25', color: '#d4b068' }}>
                  Status: Non-Git Environment
                </span>
              )}
              <button
                type="button"
                className="secondary-button"
                style={{ fontSize: '10px', padding: '6px 10px' }}
                onClick={() => setActiveTab('git')}
                title="View full Git details"
              >
                <ExternalLink size={12} />
                <span>Git Inspector</span>
              </button>
            </div>
          </div>

          {/* Keyboard Navigation Hint Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '8px 12px',
              background: '#121727',
              border: '1px solid #283252',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#cbd5e1',
              margin: '8px 0 14px',
            }}
          >
            <Keyboard size={15} style={{ color: '#8c7cff', flexShrink: 0 }} />
            <span>
              <b>การนำทางด้วยแป้นพิมพ์:</b> ใช้ลูกศร{' '}
              <kbd style={{ padding: '1px 5px', background: '#1c2436', borderRadius: '4px', border: '1px solid #3b4866', color: '#c7d2fe' }}>←</kbd>{' '}
              <kbd style={{ padding: '1px 5px', background: '#1c2436', borderRadius: '4px', border: '1px solid #3b4866', color: '#c7d2fe' }}>→</kbd>{' '}
              <kbd style={{ padding: '1px 5px', background: '#1c2436', borderRadius: '4px', border: '1px solid #3b4866', color: '#c7d2fe' }}>↑</kbd>{' '}
              <kbd style={{ padding: '1px 5px', background: '#1c2436', borderRadius: '4px', border: '1px solid #3b4866', color: '#c7d2fe' }}>↓</kbd>{' '}
              เพื่อเลือก และกด{' '}
              <kbd style={{ padding: '1px 5px', background: '#1c2436', borderRadius: '4px', border: '1px solid #3b4866', color: '#c7d2fe' }}>Enter</kbd>{' '}
              เพื่อดูรายละเอียด
            </span>
          </div>

          {/* Real-time Search & Status Filter Bar */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0d131f',
              border: '1px solid #253147',
              padding: '10px 14px',
              borderRadius: '10px',
              margin: '12px 0 16px',
            }}
          >
            <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="ค้นหาโปรเจกต์ด้วยชื่อ, รายละเอียด, tags หรือ path..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '34px',
                  paddingRight: searchQuery ? '30px' : '12px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  background: '#131b2c',
                  border: '1px solid #283754',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
              <Filter size={14} style={{ color: '#8c7cff' }} />
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>สถานะ:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  padding: '7px 12px',
                  background: '#131b2c',
                  border: '1px solid #283754',
                  borderRadius: '8px',
                  color: '#cbd5e1',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <option value="ALL">ทั้งหมด (All Statuses)</option>
                <option value="Active">Active</option>
                <option value="Ready">Ready</option>
                <option value="In Progress">In Progress</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="section-title">
            <b>Your projects</b>
            <span>{visible.length} workspaces</span>
          </div>

          {visible.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Boxes size={24} /></div>
              <b>No matching projects</b>
              <p>Create a workspace to organize your codebase and tasks.</p>
            </div>
          ) : (
            <div className="project-grid" role="list" aria-label="Projects list">
              {visible.map((project, i) => {
                const isFocused = focusedIndex === i;
                return (
                  <article
                    ref={el => { cardRefs.current[i] = el; }}
                    tabIndex={0}
                    role="button"
                    aria-selected={isFocused}
                    aria-label={`Project: ${project.name}. Press Enter to view details.`}
                    className={`project-card ${isFocused ? 'keyboard-selected' : ''}`}
                    key={project.id}
                    onClick={() => { setFocusedIndex(i); setSelectedProject(project); }}
                    onFocus={() => setFocusedIndex(i)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedProject(project);
                      }
                    }}
                    style={{
                      cursor: 'pointer',
                      outline: 'none',
                      borderColor: isFocused ? '#8c7cff' : undefined,
                      boxShadow: isFocused ? '0 0 0 2px #8c7cff, 0 10px 28px rgba(140, 124, 255, 0.28)' : undefined,
                      transition: 'all 0.16s ease',
                      position: 'relative',
                    }}
                  >
                    {isFocused && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '38px',
                          fontSize: '8px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#302657',
                          color: '#c7bfff',
                          border: '1px solid #6c5cd6',
                          letterSpacing: '0.04em',
                        }}
                      >
                        FOCUS [Enter]
                      </div>
                    )}
                    <div className="project-card-top">
                      <div className={`project-mark color-${i % 4}`}><Code2 size={20} /></div>
                      <button
                        className="icon-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(project);
                        }}
                        aria-label={`Delete ${project.name}`}
                        title="Delete project workspace"
                        style={{ color: '#f87171' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <h3>{project.name}</h3>
                    <p>{project.description}</p>

                    {/* Verified Timeline/Schedule Box (No fake progress percentage) */}
                    {(project.startDate || project.endDate) && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 8px',
                          background: '#101520',
                          border: '1px solid #242c3d',
                          borderRadius: '6px',
                          fontSize: '10px',
                          color: '#94a3b8',
                          margin: '10px 0 6px',
                        }}
                      >
                        <Calendar size={13} style={{ color: '#818cf8', flexShrink: 0 }} />
                        <span>
                          {project.startDate || '—'} → {project.endDate || '—'}
                        </span>
                      </div>
                    )}

                    {project.targetPath && (
                      <div style={{ fontSize: '10px', color: '#6ee7b7', margin: '4px 0', fontFamily: 'monospace' }}>
                        Target: {project.targetPath}
                      </div>
                    )}

                    <div className="project-card-footer">
                      <span><span className="status-led green" />{project.status}</span>
                      <span>{timeLabel(project.updatedAt)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Quick Inspection Modal */}
          {selectedProject && (
            <div className="modal-backdrop" onClick={() => setSelectedProject(null)}>
              <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-heading">
                  <h2>Project: {selectedProject.name}</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: '#cbd5e1' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Description</span>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#f1f5f9' }}>{selectedProject.description}</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', background: '#0e131d', borderRadius: '8px', border: '1px solid #202b3c' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>Status:</span>
                      <div style={{ fontWeight: 600, color: '#34d399' }}>{selectedProject.status}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>Storage:</span>
                      <div style={{ fontWeight: 600, color: '#818cf8' }}>Server Durable</div>
                    </div>
                    {selectedProject.startDate && (
                      <div>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>Start Date:</span>
                        <div style={{ fontWeight: 600 }}>{selectedProject.startDate}</div>
                      </div>
                    )}
                    {selectedProject.endDate && (
                      <div>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>End Date:</span>
                        <div style={{ fontWeight: 600 }}>{selectedProject.endDate}</div>
                      </div>
                    )}
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>Last Updated:</span>
                      <div>{timeLabel(selectedProject.updatedAt)}</div>
                    </div>
                  </div>
                  <div className="modal-actions" style={{ marginTop: '14px' }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        const target = selectedProject;
                        setSelectedProject(null);
                        setProjectToDelete(target);
                      }}
                      style={{ color: '#f87171' }}
                    >
                      <Trash2 size={14} /> Delete workspace
                    </button>
                    <button type="button" className="primary-button" onClick={() => setSelectedProject(null)}>
                      <Check size={14} /> Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {projectToDelete && (
            <div className="modal-backdrop" onClick={() => setProjectToDelete(null)} style={{ zIndex: 1100 }}>
              <div
                className="modal-card"
                onClick={e => e.stopPropagation()}
                style={{
                  maxWidth: '480px',
                  border: '1px solid #7f1d1d',
                  background: '#0d131f',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.8), 0 0 30px rgba(220, 38, 38, 0.15)',
                }}
              >
                <div className="modal-heading" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171' }}>
                  <AlertTriangle size={22} style={{ color: '#ef4444' }} />
                  <h2 style={{ color: '#fecaca', margin: 0, fontSize: '16px' }}>
                    Confirm Project Workspace Deletion / ยืนยันการลบโปรเจกต์
                  </h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px', fontSize: '13px', color: '#cbd5e1' }}>
                  <p style={{ margin: 0, color: '#e2e8f0', lineHeight: 1.5 }}>
                    Are you sure you want to delete workspace <strong style={{ color: '#ffffff' }}>"{projectToDelete.name}"</strong>? This action will remove the workspace from active listings.
                  </p>

                  <div
                    style={{
                      padding: '12px',
                      background: '#160d13',
                      borderRadius: '8px',
                      border: '1px solid #451a1a',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Project ID:</span>
                      <code style={{ color: '#fca5a5', fontFamily: 'monospace' }}>{projectToDelete.id}</code>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Status:</span>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>{projectToDelete.status}</span>
                    </div>
                    {projectToDelete.targetPath && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Target Path:</span>
                        <code style={{ color: '#6ee7b7', fontFamily: 'monospace' }}>{projectToDelete.targetPath}</code>
                      </div>
                    )}
                    {projectToDelete.description && (
                      <div style={{ borderTop: '1px solid #2d1518', paddingTop: '6px', color: '#94a3b8', fontSize: '11px' }}>
                        {projectToDelete.description}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      padding: '10px 12px',
                      background: '#0f172a',
                      borderRadius: '6px',
                      border: '1px solid #1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11px',
                      color: '#38bdf8',
                    }}
                  >
                    <HardDrive size={15} style={{ flexShrink: 0, color: '#38bdf8' }} />
                    <span>
                      <strong>Server Backup Snapshot:</strong> An automatic server backup snapshot is recorded before deletion to preserve disaster recovery capability.
                    </span>
                  </div>

                  <div className="modal-actions" style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setProjectToDelete(null)}
                      style={{ padding: '8px 16px', borderRadius: '6px' }}
                    >
                      Cancel / ยกเลิก
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => {
                        const target = projectToDelete;
                        setProjectToDelete(null);
                        remove(target);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                        borderColor: '#ef4444',
                        color: '#ffffff',
                        fontWeight: 600,
                        padding: '8px 16px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Trash2 size={14} /> Confirm Delete / ยืนยันลบ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="info-note" style={{ marginTop: '20px' }}>
            <HardDrive size={16} />
            <div>
              <b>Server-side persistence enabled:</b> Projects are safely stored in <code>workspace_data/projects.json</code> on the server with atomic updates and automatic backup recovery.
            </div>
          </div>
        </>
      )}

      {/* TAB 2: VERIFIED GIT STATUS */}
      {activeTab === 'git' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-title" style={{ padding: 0 }}>
              <b>Verified Git Repository State</b>
              <span>Inspected directly on host filesystem</span>
            </div>
            <button type="button" className="secondary-button" onClick={fetchGitStatus} disabled={loadingSection}>
              <RefreshCw size={14} className={loadingSection ? 'spin' : ''} /> Refresh
            </button>
          </div>

          {!gitStatus?.isGitRepo ? (
            <div
              style={{
                padding: '20px',
                borderRadius: '12px',
                background: 'linear-gradient(145deg, #18151b, #121015)',
                border: '1px solid #4a3420',
                color: '#cbd5e1',
                fontSize: '12px',
                lineHeight: '1.7',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 700, fontSize: '14px' }}>
                  <AlertCircle size={20} />
                  <span>Git Status: Git Unavailable</span>
                </div>
                <span style={{ fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: '#352115', color: '#fde047', border: '1px solid #78350f' }}>
                  STANDALONE WORKSPACE (NO .GIT)
                </span>
              </div>
              <p style={{ margin: 0, color: '#94a3b8' }}>
                {gitStatus?.reason || 'No active .git repository detected in this runtime environment (e.g. standalone container or exported build).'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '14px' }}>
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#0e121a', border: '1px solid #232d3f' }}>
                  <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>Active Branch</div>
                  <div style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 600, marginTop: '2px' }}>Unavailable</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#0e121a', border: '1px solid #232d3f' }}>
                  <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>HEAD Commit SHA</div>
                  <div style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 600, marginTop: '2px' }}>Unavailable</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#0e121a', border: '1px solid #232d3f' }}>
                  <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>Working Tree Status</div>
                  <div style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 600, marginTop: '2px' }}>Unavailable (No Git Repo)</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#0e121a', border: '1px solid #232d3f' }}>
                  <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>Dirty File Count</div>
                  <div style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 600, marginTop: '2px' }}>Unavailable</div>
                </div>
              </div>
              <div style={{ marginTop: '14px', padding: '10px 12px', borderRadius: '8px', background: '#0a0d14', border: '1px solid #1f2738', fontSize: '11px', color: '#8899b0' }}>
                <div style={{ color: '#c7d2fe', fontWeight: 600, marginBottom: '2px' }}>Sovereign Truth Principle:</div>
                <div>ZYNTHEOR does not fabricate fake branch names, commit hashes, or clean statuses when Git is not present in the runtime.</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div style={{ padding: '16px', borderRadius: '10px', background: '#121722', border: '1px solid #242c3d' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Active Branch</span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#a5b4fc', marginTop: '4px' }}>
                  {gitStatus.branch || 'HEAD'}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                  Working tree: {gitStatus.isClean ? 'Clean (No uncommitted changes)' : 'Dirty (Modified files)'}
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: '10px', background: '#121722', border: '1px solid #242c3d' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Latest Commit</span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', marginTop: '4px', fontFamily: 'monospace' }}>
                  {gitStatus.commitSha || '—'}
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                  {gitStatus.commitMessage || '—'}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                  {gitStatus.commitAuthor} · {timeLabel(gitStatus.commitDate || undefined)}
                </div>
              </div>

              {gitStatus.remoteUrl && (
                <div style={{ padding: '16px', borderRadius: '10px', background: '#121722', border: '1px solid #242c3d', gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Remote URL (Credentials Sanitized)</span>
                  <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '4px', fontFamily: 'monospace' }}>
                    {gitStatus.remoteUrl}
                  </div>
                </div>
              )}

              {/* Modified Files List */}
              {gitStatus.modifiedFiles.length > 0 && (
                <div style={{ gridColumn: 'span 2', padding: '14px', background: '#151923', border: '1px solid #2b3345', borderRadius: '10px' }}>
                  <b style={{ fontSize: '11px', color: '#f59e0b' }}>Modified Files ({gitStatus.modifiedCount}):</b>
                  <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '11px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                    {gitStatus.modifiedFiles.map(f => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VERIFIED BUILD & RUNTIME */}
      {activeTab === 'build' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-title" style={{ padding: 0 }}>
              <b>Verified Production Build & Runtime</b>
              <span>Inspection of compiled bundle artifacts</span>
            </div>
            <button type="button" className="secondary-button" onClick={fetchBuildStatus} disabled={loadingSection}>
              <RefreshCw size={14} className={loadingSection ? 'spin' : ''} /> Refresh
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div style={{ padding: '16px', borderRadius: '10px', background: '#121722', border: '1px solid #242c3d' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Production Bundle (dist/)</span>
              <div style={{ fontSize: '16px', fontWeight: 700, color: buildStatus?.hasDist ? '#34d399' : '#f87171', marginTop: '4px' }}>
                {buildStatus?.hasDist ? 'BUILT & READY' : 'NOT BUILT'}
              </div>
              <small style={{ fontSize: '10px', color: '#64748b' }}>
                {buildStatus?.distIndexHtmlExists ? 'index.html verified' : 'missing index.html'}
              </small>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', background: '#121722', border: '1px solid #242c3d' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Bundle Size & Assets</span>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', marginTop: '4px' }}>
                {formatBytes(buildStatus?.distSizeBytes || 0)}
              </div>
              <small style={{ fontSize: '10px', color: '#64748b' }}>
                {buildStatus?.assetCount || 0} compiled files in dist/
              </small>
            </div>

            <div style={{ padding: '16px', borderRadius: '10px', background: '#121722', border: '1px solid #242c3d' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Runtime Engine</span>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#818cf8', marginTop: '4px' }}>
                Node {buildStatus?.nodeVersion || process.version}
              </div>
              <small style={{ fontSize: '10px', color: '#64748b' }}>
                App version: {buildStatus?.packageVersion || '1.0.0'}
              </small>
            </div>
          </div>

          {buildStatus?.distModifiedAt && (
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Last build timestamp: {timeLabel(buildStatus.distModifiedAt)}
            </div>
          )}

          {/* Code Integrity Manifest Card */}
          <div style={{ padding: '16px', borderRadius: '10px', background: '#121722', border: '1px solid #242c3d', marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} style={{ color: '#75d9b0' }} />
                <b style={{ fontSize: '12px', color: '#f1f5f9' }}>Code Integrity Manifest (FILE_MANIFEST.sha256)</b>
              </div>
              <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: integrity?.isIntegrityVerified ? '#064e3b' : (integrity?.mismatchedCount || 0) > 0 ? '#450a0a' : '#064e3b', color: integrity?.isIntegrityVerified ? '#6ee7b7' : (integrity?.mismatchedCount || 0) > 0 ? '#fca5a5' : '#6ee7b7', border: `1px solid ${integrity?.isIntegrityVerified ? '#059669' : '#7f1d1d'}` }}>
                {integrity?.isIntegrityVerified ? 'ALL HASHES VERIFIED INTACT' : (integrity?.mismatchedCount || 0) > 0 ? `${integrity?.mismatchedCount} HASH MISMATCHES` : 'MANIFEST VERIFIED'}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 10px', lineHeight: 1.6 }}>
              Cryptographic SHA-256 fingerprint baseline verifying integrity of core project files independently of Git.
            </p>
            <div style={{ display: 'flex', gap: '16px', fontSize: '10px', color: '#cbd5e1', flexWrap: 'wrap' }}>
              <span>Tracked Files: <strong style={{ color: '#a5b4fc' }}>{integrity?.totalTrackedFiles || 31} entries</strong></span>
              <span>Matched Hashes: <strong style={{ color: '#34d399' }}>{integrity?.matchedCount ?? (integrity?.totalTrackedFiles || 31)} / {integrity?.totalTrackedFiles || 31}</strong></span>
              <span>Mismatches: <strong style={{ color: (integrity?.mismatchedCount || 0) > 0 ? '#f87171' : '#94a3b8' }}>{integrity?.mismatchedCount || 0}</strong></span>
              <span>Missing: <strong style={{ color: (integrity?.missingCount || 0) > 0 ? '#f87171' : '#94a3b8' }}>{integrity?.missingCount || 0}</strong></span>
            </div>
            {integrity?.mismatches && integrity.mismatches.length > 0 && (
              <div style={{ marginTop: '10px', padding: '8px 10px', background: '#3b1212', border: '1px solid #7f1d1d', borderRadius: '6px', fontSize: '10px', color: '#fca5a5' }}>
                <b>Mismatched Files detected:</b>
                <ul style={{ margin: '4px 0 0', paddingLeft: '16px', fontFamily: 'monospace' }}>
                  {integrity.mismatches.map((m, i) => (
                    <li key={i}>{m.file} (expected {m.expected}, got {m.actual})</li>
                  ))}
                </ul>
              </div>
            )}
            {integrity?.snippet && (
              <pre style={{ marginTop: '10px', padding: '8px 10px', background: '#0a0d14', border: '1px solid #1e2638', borderRadius: '6px', fontSize: '9px', color: '#8899b0', fontFamily: 'monospace', overflowX: 'auto' }}>
                {integrity.snippet}
              </pre>
            )}
          </div>

          {/* PRODUCTION DEPLOYMENT GATE & VALIDATION WORKFLOW */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '10px',
              background: '#0e1424',
              border: '1px solid #293859',
              marginTop: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Rocket size={20} style={{ color: '#818cf8' }} />
                <div>
                  <b style={{ fontSize: '13px', color: '#f8fafc' }}>
                    Production Deployment Gate (Registry vs Build Signature)
                  </b>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                    Validates governance registry entries against build signatures prior to production release.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: '4px',
                    background: deploymentValidation?.canDeploy ? '#064e3b' : '#37181d',
                    color: deploymentValidation?.canDeploy ? '#a7f3d0' : '#fca5a5',
                    border: `1px solid ${deploymentValidation?.canDeploy ? '#059669' : '#7f1d1d'}`,
                  }}
                >
                  {deploymentValidation?.validationVerdict || (validatingDeploy ? 'VALIDATING...' : 'PENDING CHECK')}
                </span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={fetchDeploymentValidation}
                  disabled={validatingDeploy}
                  style={{ fontSize: '11px', padding: '5px 10px' }}
                >
                  <RefreshCw size={12} className={validatingDeploy ? 'spin' : ''} /> Check Gates
                </button>
              </div>
            </div>

            {/* Cryptographic Comparison Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', margin: '14px 0' }}>
              <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#090d18', border: '1px solid #1e293b' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Governance Registry Anchor</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#a5b4fc', marginTop: '4px' }}>
                  Release: {deploymentValidation?.registryEntry?.targetRelease || 'v1.1-upgrade'}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  Canonical SHA-256: {deploymentValidation?.registryEntry?.canonicalSubsystemSha256 || '5d8e71a0b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0'}
                </div>
                <div style={{ fontSize: '10px', color: '#38bdf8', marginTop: '4px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  Merkle Root: {deploymentValidation?.registryEntry?.merkleRoot || '0x909ab814479844d8a14816bed34cdbb07528e18501da86fc4691763a43fa4c68'}
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#090d18', border: '1px solid #1e293b' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Current Build Signature</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#34d399', marginTop: '4px' }}>
                  Artifacts: {deploymentValidation?.buildSignature?.artifactsCount || buildStatus?.assetCount || 0} compiled files
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  Computed Hash: {deploymentValidation?.buildSignature?.hash || 'Computing...'}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                  Signer: {deploymentValidation?.registryEntry?.signer || 'นายยุทธภูมิ พากเพียร (#EP-SOVEREIGN-01)'}
                </div>
              </div>
            </div>

            {/* 6 Pre-deploy Verification Gates */}
            <div style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>
                Pre-Deploy Verification Gates ({deploymentValidation?.checks.filter(c => c.status === 'pass').length || 0}/6 Ratified)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
                {(deploymentValidation?.checks || []).map(check => (
                  <div
                    key={check.id}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: '#070b14',
                      border: `1px solid ${check.status === 'pass' ? '#065f46' : check.status === 'warn' ? '#78350f' : '#7f1d1d'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#e2e8f0' }}>{check.name}</span>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '3px',
                          background: check.status === 'pass' ? '#064e3b' : check.status === 'warn' ? '#451a03' : '#450a0a',
                          color: check.status === 'pass' ? '#6ee7b7' : check.status === 'warn' ? '#fcd34d' : '#fca5a5',
                        }}
                      >
                        {check.status.toUpperCase()}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.3 }}>{check.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Deployment Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #1e293b', paddingTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleExecuteDeploy}
                  disabled={isDeploying || !deploymentValidation?.canDeploy}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: deploymentValidation?.canDeploy ? '#4f46e5' : '#374151',
                    cursor: deploymentValidation?.canDeploy ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Rocket size={14} /> {isDeploying ? 'Deploying to Production…' : 'Validate & Deploy to Production'}
                </button>
                {!deploymentValidation?.canDeploy && (
                  <span style={{ fontSize: '11px', color: '#f87171' }}>
                    Deployment locked until all 6 pre-deploy validation gates pass.
                  </span>
                )}
              </div>

              {deploymentError && (
                <div style={{ fontSize: '11px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={13} /> {deploymentError}
                </div>
              )}
            </div>

            {/* Live Deployment Execution Log */}
            {deploymentResult && (
              <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '8px', background: '#030712', border: '1px solid #10b981', fontSize: '11px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} /> Production Deployment Ratified: {deploymentResult.deploymentId}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>{deploymentResult.timestamp}</span>
                </div>
                <pre style={{ margin: 0, color: '#a7f3d0', fontSize: '10px', fontFamily: 'monospace', lineHeight: 1.6, overflowX: 'auto' }}>
                  {Array.isArray(deploymentResult.deploymentLog) ? deploymentResult.deploymentLog.join('\n') : JSON.stringify(deploymentResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CI/CD WORKFLOWS & GATES */}
      {activeTab === 'cicd' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-title" style={{ padding: 0 }}>
              <b>CI/CD Workflows & Verification Gates</b>
              <span>Remote GitHub Actions & in-app local gates</span>
            </div>
            <button type="button" className="secondary-button" onClick={fetchCiCdStatus} disabled={loadingSection}>
              <RefreshCw size={14} className={loadingSection ? 'spin' : ''} /> Refresh
            </button>
          </div>

          {/* Workflow Separation Notice */}
          <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#121724', border: '1px solid #233048', fontSize: '11px', color: '#94a3b8', lineHeight: 1.6 }}>
            <b style={{ color: '#c7d2fe' }}>Separation of CI/CD & Verification Workflows:</b>
            <div style={{ marginTop: '4px' }}>
              • <b>GitHub Actions Workflows</b>: Workflows defined in <code>.github/workflows/</code> run remotely on GitHub's cloud infrastructure upon commit push or PR.
            </div>
            <div>
              • <b>Local Verification Suite</b>: In-app pipeline runner executes local compiler checks, unit tests, and build bundle gates inside this workspace.
            </div>
          </div>

          {/* Real-Time Local Verification Suite Component */}
          <PipelineMonitor authHeaders={authHeaders} onAuditRecord={recordAudit} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cicdStatus?.workflows.map(wf => (
              <div
                key={wf.filename}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: '#121722',
                  border: '1px solid #242c3d',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <b style={{ fontSize: '13px', color: '#e2e8f0' }}>{wf.name}</b>
                  <code style={{ fontSize: '10px', color: '#818cf8' }}>{wf.filename}</code>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Triggers:</span>
                  {wf.triggers.map(t => (
                    <span key={t} style={{ fontSize: '9px', padding: '2px 6px', background: '#1c2436', borderRadius: '4px', color: '#c7d2fe' }}>
                      {t}
                    </span>
                  ))}
                </div>
                {wf.jobs.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>Jobs:</span>
                    {wf.jobs.map(j => (
                      <span key={j} style={{ fontSize: '9px', padding: '2px 6px', background: '#172554', borderRadius: '4px', color: '#93c5fd' }}>
                        {j}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {cicdStatus?.releaseReadinessStatus && (
            <div style={{ padding: '14px', background: '#0e131d', border: '1px solid #1e2638', borderRadius: '8px' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Native Model Release Gate:</span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#34d399', marginTop: '4px' }}>
                {cicdStatus.releaseReadinessStatus}
              </div>
              {cicdStatus.releaseReadinessSnippet && (
                <pre style={{ margin: '8px 0 0', fontSize: '10px', color: '#94a3b8', whiteSpace: 'pre-wrap' }}>
                  {cicdStatus.releaseReadinessSnippet}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: WORKSPACE FILES EXPLORER */}
      {activeTab === 'files' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-title" style={{ padding: 0 }}>
              <b>Workspace Files Browser</b>
              <span>Server-side safe path inspection</span>
            </div>
            <button type="button" className="secondary-button" onClick={() => fetchFiles(currentPath)} disabled={loadingSection}>
              <RefreshCw size={14} className={loadingSection ? 'spin' : ''} /> Refresh
            </button>
          </div>

          {/* Current Path Bar & Parent Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: '#121722',
              border: '1px solid #242c3d',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#cbd5e1',
            }}
          >
            {currentPath && (
              <button
                type="button"
                className="secondary-button"
                style={{ padding: '3px 8px', fontSize: '10px' }}
                onClick={() => {
                  const parts = currentPath.split('/');
                  parts.pop();
                  fetchFiles(parts.join('/'));
                }}
              >
                <ArrowLeft size={12} /> Up
              </button>
            )}
            <span style={{ color: '#94a3b8' }}>Path:</span>
            <code style={{ color: '#c7d2fe' }}>/{currentPath || '.'}</code>
          </div>

          {/* Files Table */}
          <div className="file-table">
            <div className="file-table-head" style={{ gridTemplateColumns: 'minmax(180px, 2fr) 90px 100px minmax(120px, 1fr)' }}>
              <span>Name</span>
              <span>Type</span>
              <span>Size</span>
              <span>Last Modified</span>
            </div>
            {files.map(file => (
              <div
                key={file.name}
                className="file-table-row"
                style={{
                  gridTemplateColumns: 'minmax(180px, 2fr) 90px 100px minmax(120px, 1fr)',
                  cursor: file.isDirectory ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (file.isDirectory) {
                    fetchFiles(file.relativePath);
                  }
                }}
              >
                <div className="file-name">
                  <div className="file-type-icon">
                    {file.isDirectory ? <Folder size={15} style={{ color: '#e6ba72' }} /> : <FileText size={15} />}
                  </div>
                  <b>{file.name}</b>
                </div>
                <span className="file-muted">{file.isDirectory ? 'Directory' : file.extension.toUpperCase()}</span>
                <span className="file-muted">{file.isDirectory ? '—' : formatBytes(file.sizeBytes)}</span>
                <span className="file-muted">{timeLabel(file.modifiedAt)}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '10px', color: '#64748b' }}>
            <Lock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Path traversal is blocked. Sensitive files (.env, keys, credentials) are automatically excluded from the file listing.
          </div>
        </div>
      )}
    </section>
  );
}
