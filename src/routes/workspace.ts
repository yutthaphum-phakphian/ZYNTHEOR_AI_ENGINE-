import fs from 'node:fs';
import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import {
  getGitStatus,
  getBuildStatus,
  getCiCdStatus,
  getCodeIntegrityStatus,
  getWorkspaceFiles,
  validateDeploymentReadiness,
  executeProductionDeploy,
} from '../services/workspaceManager.js';
import { getPipelineStatus, triggerPipelineRun } from '../services/pipelineService.js';
import { resolveRequestUser, requireRole, requireMinimumRole, type AuthenticatedUser } from '../services/authService.js';
import {
  findByTenant,
  findOneByTenant,
  createForTenant,
  updateForTenant,
  deleteForTenant,
  getQuarantinedLegacyProjects,
  classifyLegacyProject,
  createTenantBackup,
  restoreTenantBackup,
  type TenantBackupPayload,
} from '../services/tenantScopedStorage.js';

const router = Router();

/**
 * User-Scoped Active Workspace State Map
 * Prevents process-global active workspace pollution across users/tenants.
 */
const userActiveWorkspaces = new Map<string, string>();

function getRequestUser(req: Request): AuthenticatedUser {
  const user = (req as any).user || resolveRequestUser(req);
  const attachedTenant = (req as any).tenantId || req.tenantId;
  if (attachedTenant) {
    user.tenantId = attachedTenant;
  }
  return user;
}

// 1. Projects listing (Tenant-Scoped)
router.get('/api/workspace/projects', (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const result = findByTenant(user);

    if (!result.success) {
      return res.status(user.isTokenVerified ? 403 : 401).json({
        ok: false,
        error: result.error || 'authorization_denied',
        message: result.reason,
      });
    }

    res.json({
      ok: true,
      projects: result.data || [],
      lastBackupAt: new Date().toISOString(),
      source: 'tenant_scoped_storage',
      count: result.count || 0,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'failed_to_load_projects', message: err.message });
  }
});

// 2. Project create / update (Tenant-Scoped with Zero Client Trust for tenantId)
router.post('/api/workspace/projects', (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const body = req.body || {};

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return res.status(400).json({ ok: false, error: 'invalid_project_name', message: 'Project name is required' });
    }

    let result;
    if (body.id) {
      result = updateForTenant(user, String(body.id).trim(), body);
    } else {
      result = createForTenant(user, body);
    }

    if (!result.success) {
      const isNotFound = result.error === 'project_not_found';
      return res.status(isNotFound ? 404 : 403).json({
        ok: false,
        error: result.error || 'tenant_authorization_denied',
        message: result.reason,
      });
    }

    const allResult = findByTenant(user);
    res.status(body.id ? 200 : 201).json({
      ok: true,
      project: result.data,
      projects: allResult.data || [],
      lastBackupAt: new Date().toISOString(),
      count: allResult.count || 0,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes('Access denied') || err.message.includes('not authorized'));
    res.status(isAuth ? 403 : 400).json({ ok: false, error: isAuth ? 'forbidden_idor' : 'failed_to_save_project', message: err.message });
  }
});

// 3. Project deletion (Tenant-Scoped)
router.delete('/api/workspace/projects/:id', (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'id_required', message: 'Project ID is required' });
    }

    const result = deleteForTenant(user, id);
    if (!result.success) {
      const isNotFound = result.error === 'project_not_found';
      return res.status(isNotFound ? 404 : 403).json({
        ok: false,
        error: result.error || 'tenant_authorization_denied',
        message: result.reason,
      });
    }

    const allResult = findByTenant(user);
    res.json({
      ok: true,
      deletedId: result.data?.deletedId || id,
      projects: allResult.data || [],
      lastBackupAt: new Date().toISOString(),
      count: allResult.count || 0,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes('Access denied') || err.message.includes('not authorized'));
    const isNotFound = err.message && err.message.includes('not found');
    res.status(isAuth ? 403 : isNotFound ? 404 : 400).json({ ok: false, error: isAuth ? 'forbidden_idor' : 'failed_to_delete_project', message: err.message });
  }
});

// 4. Quarantined Legacy Projects Audit Endpoint (Patch 4)
router.get('/api/workspace/projects/quarantine', (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const result = getQuarantinedLegacyProjects(user);

    if (!result.success) {
      return res.status(403).json({ ok: false, error: result.error, message: result.reason });
    }

    res.json({
      ok: true,
      quarantinedProjects: result.data || [],
      count: result.count || 0,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'quarantine_audit_failed', message: err.message });
  }
});

// 5. Legacy Project Classification Endpoint (Patch 4)
router.post('/api/workspace/projects/classify', (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const { projectId, targetTenantId } = req.body || {};

    if (!projectId || !targetTenantId) {
      return res.status(400).json({ ok: false, error: 'missing_parameters', message: 'projectId and targetTenantId are required' });
    }

    const result = classifyLegacyProject(user, String(projectId), String(targetTenantId));
    if (!result.success) {
      return res.status(403).json({ ok: false, error: result.error, message: result.reason });
    }

    res.json({
      ok: true,
      classifiedProject: result.data,
      message: `Project '${projectId}' successfully classified and assigned to tenant '${targetTenantId}'`,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'classification_failed', message: err.message });
  }
});

// 6. Tenant-Scoped Backup (Patch 6: OWNER / ADMIN Allowed)
router.post('/api/workspace/backup', (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const result = createTenantBackup(user);

    if (!result.success) {
      return res.status(403).json({ ok: false, error: result.error, message: result.reason });
    }

    res.json({
      ok: true,
      backup: result.data?.backup,
      backupFilename: result.data?.backupFilename,
      message: 'Tenant-scoped snapshot backup created successfully',
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'backup_failed', message: err.message });
  }
});

// 7. Tenant-Scoped Restore (Patch 6: OWNER Allowed, ADMIN Denied)
router.post('/api/workspace/restore', (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    let backupPayload: TenantBackupPayload | null = req.body?.backup || null;

    if (!backupPayload && typeof req.body?.backupFile === 'string') {
      const cleanFilename = path.basename(req.body.backupFile);
      const backupPath = path.resolve(process.cwd(), 'workspace_data/backups', cleanFilename);
      if (fs.existsSync(backupPath)) {
        backupPayload = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      }
    }

    if (!backupPayload) {
      return res.status(400).json({ ok: false, error: 'missing_backup_payload', message: 'Valid backup payload or backupFile is required' });
    }

    const result = restoreTenantBackup(user, backupPayload, req.body?.targetTenantId);
    if (!result.success) {
      return res.status(403).json({
        ok: false,
        error: result.error || 'restore_failed',
        message: result.reason,
      });
    }

    res.json({
      ok: true,
      restoredCount: result.data?.restoredCount,
      tenantId: result.data?.tenantId,
      preview: result.data?.preview,
      message: `Successfully restored ${result.data?.restoredCount} projects for tenant '${result.data?.tenantId}'`,
    });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: 'restore_failed', message: err.message });
  }
});

// 8. Verified Git Status
router.get('/api/workspace/git', (_req: Request, res: Response) => {
  try {
    const git = getGitStatus();
    const dirtyFileCount = (git.modifiedCount || 0) + (git.untrackedCount || 0) + (git.stagedCount || 0);
    res.json({ ok: true, git: { ...git, dirtyFileCount }, dirtyFileCount });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'git_status_failed', message: err.message });
  }
});

// 9. Verified Build Status
router.get('/api/workspace/build', (_req: Request, res: Response) => {
  try {
    const build = getBuildStatus();
    res.json({ ok: true, build });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'build_status_failed', message: err.message });
  }
});

// 10. Verified CI/CD Status
router.get('/api/workspace/cicd', (_req: Request, res: Response) => {
  try {
    const cicd = getCiCdStatus();
    res.json({ ok: true, cicd });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'cicd_status_failed', message: err.message });
  }
});

// 11. Verified Workspace Files
router.get('/api/workspace/files', (req: Request, res: Response) => {
  try {
    const subDir = typeof req.query.path === 'string' ? req.query.path : '';
    const result = getWorkspaceFiles(subDir);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    const status = err.message.includes('Access denied') ? 403 : 400;
    res.status(status).json({ ok: false, error: 'file_access_error', message: err.message });
  }
});

// 12. Real-time CI/CD Pipeline status
router.get('/api/workspace/pipeline', (_req: Request, res: Response) => {
  try {
    const pipeline = getPipelineStatus();
    res.json({ ok: true, pipeline });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'pipeline_status_failed', message: err.message });
  }
});

router.get('/api/workspace/integrity', (_req: Request, res: Response) => {
  try {
    const integrity = getCodeIntegrityStatus();
    res.json({ ok: true, integrity });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'integrity_status_failed', message: err.message });
  }
});

router.post('/api/workspace/pipeline/trigger', requireMinimumRole('engineer'), (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const role = user.role || 'viewer';
    if (role === 'viewer') {
      return res.status(403).json({ ok: false, error: 'insufficient_permissions', message: 'Viewer role cannot trigger pipeline runs' });
    }
    const pipeline = triggerPipelineRun();
    res.json({ ok: true, pipeline, message: 'Local workspace verification pipeline execution triggered' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'pipeline_trigger_failed', message: err.message });
  }
});

// 13. Deployment Validation & Production Deploy Workflow
router.get('/api/workspace/deploy/validation', (_req: Request, res: Response) => {
  try {
    const validation = validateDeploymentReadiness();
    res.json({ ok: true, validation });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'validation_check_failed', message: err.message });
  }
});

router.post('/api/workspace/deploy', requireRole('admin'), (_req: Request, res: Response) => {
  try {
    const deployment = executeProductionDeploy();
    res.json({
      ok: true,
      message: 'Production deployment validated and executed successfully',
      deployment,
    });
  } catch (err: any) {
    res.status(400).json({
      ok: false,
      error: 'deployment_validation_failed',
      message: err.message,
    });
  }
});

router.get('/api/workspace/deploy/history', (_req: Request, res: Response) => {
  try {
    const deployFilePath = path.join(process.cwd(), 'workspace_data', 'deployments.json');
    let history: any[] = [];
    if (fs.existsSync(deployFilePath)) {
      history = JSON.parse(fs.readFileSync(deployFilePath, 'utf8'));
    }
    res.json({ ok: true, deployments: history });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'failed_to_load_deploy_history', message: err.message });
  }
});

// 14. User-Scoped Active Workspace Memory
router.get('/api/workspace/active', (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const tenantResult = findByTenant(user);
    const tenantProjects = tenantResult.data || [];

    let activeId = userActiveWorkspaces.get(user.id);
    if (!activeId || !tenantProjects.some((p) => p.id === activeId)) {
      activeId = tenantProjects[0]?.id || 'project-main';
      userActiveWorkspaces.set(user.id, activeId);
    }

    const activeProject = tenantProjects.find((p) => p.id === activeId) || tenantProjects[0] || null;
    res.json({ ok: true, activeWorkspaceId: activeId, activeProject });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'failed_to_get_active_workspace', message: err.message });
  }
});

router.post('/api/workspace/active', (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const targetId = typeof req.body?.workspaceId === 'string' ? req.body.workspaceId.trim() : '';

    if (!targetId) {
      return res.status(400).json({ ok: false, error: 'workspace_id_required', message: 'workspaceId is required' });
    }

    // Verify project belongs to user's tenant
    const projectResult = findOneByTenant(user, targetId);
    if (!projectResult.success || !projectResult.data) {
      return res.status(404).json({
        ok: false,
        error: 'workspace_not_found',
        message: `Workspace "${targetId}" does not exist in tenant '${user.tenantId || 'org-default'}'`,
      });
    }

    userActiveWorkspaces.set(user.id, targetId);
    const activeProject = projectResult.data;

    res.json({
      ok: true,
      activeWorkspaceId: targetId,
      activeProject,
      message: `Switched active workspace to "${activeProject.name || targetId}"`,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'failed_to_set_active_workspace', message: err.message });
  }
});

// 15. Project Context Engine Endpoint
router.get('/api/workspace/context', async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const { inspectProjectMetadata, retrieveRelevantContext } = await import('../services/projectContextEngine.js');

    let wsId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : userActiveWorkspaces.get(user.id) || 'project-main';
    const query = typeof req.query.query === 'string' ? req.query.query : '';
    const maxTokens = typeof req.query.maxTokens === 'string' ? Number(req.query.maxTokens) : 4000;

    if (query) {
      const retrieved = retrieveRelevantContext({ workspaceId: wsId, query, maxTokens });
      return res.json({ ok: true, retrieved });
    }

    const projectResult = findOneByTenant(user, wsId);
    const project = projectResult.data;
    const metadata = inspectProjectMetadata(wsId, project?.name || 'ZYNTHEOR AI ENGINE');
    res.json({ ok: true, metadata });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'context_retrieval_failed', message: err.message });
  }
});

// 16. Code Graph Inspection and Reindex Endpoints
router.get('/api/workspace/graph', async (_req: Request, res: Response) => {
  try {
    const { buildCodeGraph, getCodeGraphSummary } = await import('../services/codeGraph.js');
    const graph = buildCodeGraph();
    const summary = getCodeGraphSummary();
    res.json({ ok: true, summary, graph });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'code_graph_failed', message: err.message });
  }
});

router.post('/api/workspace/graph/reindex', async (_req: Request, res: Response) => {
  try {
    const { buildCodeGraph, getCodeGraphSummary } = await import('../services/codeGraph.js');
    const graph = buildCodeGraph({ forceReindex: true });
    const summary = getCodeGraphSummary();
    res.json({ ok: true, message: 'Code graph fully reindexed', summary, graph });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'reindex_failed', message: err.message });
  }
});

export default router;
