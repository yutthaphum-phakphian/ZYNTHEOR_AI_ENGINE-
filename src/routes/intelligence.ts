import { Router } from 'express';
import { getCodeGraph } from '../services/codeGraph.ts';
import { analyzeProblem } from '../services/problemAnalyzer.ts';
import { IntelligenceOrchestrationEngine, TaskPlanningEngine } from '../../lib/intelligence-orchestrator.ts';
import { projectStructureEngine } from '../services/projectStructureEngine.ts';
import { workspaceGraphService } from '../services/workspaceGraph.ts';
import { crossFileReasoningEngine } from '../services/crossFileReasoning.ts';
import { changeImpactEngine } from '../services/changeImpactEngine.ts';
import { workspaceMemoryService } from '../services/workspaceMemory.ts';
import { projectAwareDebugger } from '../services/projectAwareDebugger.ts';
import {
  buildFocusedRepositoryContext,
  scanRepositoryFiles,
  buildSymbolIndex,
  searchSymbols,
  type RepositoryScanResult
} from '../services/repositoryIntelligence.ts';

const r = Router();
const orchestrator = new IntelligenceOrchestrationEngine();
const planner = new TaskPlanningEngine();

r.post('/api/intelligence/analyze', (req, res) => {
  const { files, log } = req.body as any;
  if (!Array.isArray(files) || files.length > 20) return res.status(400).json({ error: 'files 1-20 only' });
  res.json({ bounded: true, doesNotClaimExecution: true, contexts: getCodeGraph(files), analysis: analyzeProblem(log || '') });
});

r.post('/api/intelligence/orchestrate', async (req, res) => {
  try {
    const { query, workspaceId, language, responseLanguage, isDryRun, onlineConsent } = req.body as any;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Query is required string' });
    }

    const response = await orchestrator.execute({
      query: query.trim(),
      workspaceId,
      language,
      responseLanguage,
      humanApprovals: {},
      isDryRun: Boolean(isDryRun),
      onlineConsent: Boolean(onlineConsent),
    });

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Orchestration error' });
  }
});

r.post('/api/intelligence/plan', (req, res) => {
  try {
    const { query, workspaceId, language } = req.body as any;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Query is required string' });
    }

    const taskType = orchestrator.classifyTaskType(query);
    const plan = planner.createTaskPlan({
      taskId: `plan-${Date.now().toString(36)}`,
      workspaceId: workspaceId || 'default',
      query: query.trim(),
      taskType,
      isThai: language === 'th' || /[\u0E00-\u0E7F]/.test(query),
    });

    res.json({ taskType, plan });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Planning error' });
  }
});

// --- P9 WORKSPACE-AWARE INTELLIGENCE ENDPOINTS ---

// 1. GET /api/intelligence/workspace-structure
r.get('/api/intelligence/workspace-structure', (_req, res) => {
  try {
    const analysis = projectStructureEngine.analyzeProjectStructure();
    return res.json({ ok: true, analysis });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 2. GET /api/intelligence/code-graph
r.get('/api/intelligence/code-graph', (_req, res) => {
  try {
    const details = workspaceGraphService.getWorkspaceGraph();
    return res.json({
      ok: true,
      summary: {
        indexedAt: details.graph.indexedAt,
        totalFiles: details.graph.totalFiles,
        totalEdges: details.graph.totalEdges,
      },
      symbolsCount: details.symbols.length,
      apiRoutesCount: details.apiRoutes.length,
      dbSchemasCount: details.dbSchemas.length,
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 3. POST /api/intelligence/cross-file-reason
r.post('/api/intelligence/cross-file-reason', (req, res) => {
  try {
    const { prompt, targetFiles } = req.body || {};
    const contextResult = crossFileReasoningEngine.assembleCrossFileContext(prompt || '', targetFiles || []);
    const editPlan = crossFileReasoningEngine.planMultiFileChanges(
      (targetFiles && targetFiles[0]) || 'src/routes/billing.ts',
      prompt || 'Synchronized update'
    );

    return res.json({
      ok: true,
      contextUnitsCount: contextResult.contextUnits.length,
      totalTokensEstimated: contextResult.totalTokensEstimated,
      editPlan,
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 4. POST /api/intelligence/change-impact
r.post('/api/intelligence/change-impact', (req, res) => {
  try {
    const { targetFile, proposedChange } = req.body || {};
    if (!targetFile) {
      return res.status(400).json({ ok: false, error: 'targetFile is required' });
    }

    const report = changeImpactEngine.analyzeImpact(targetFile, proposedChange);
    return res.json({ ok: true, report });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 5. GET /api/intelligence/workspace-memory
r.get('/api/intelligence/workspace-memory', (req, res) => {
  try {
    const workspaceId = (req.query.workspaceId as string) || 'default';
    const typeFilter = req.query.type as any;
    const entries = workspaceMemoryService.getMemoryEntries(workspaceId, typeFilter);

    return res.json({ ok: true, count: entries.length, entries });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 5b. POST /api/intelligence/workspace-memory
r.post('/api/intelligence/workspace-memory', (req, res) => {
  try {
    const { workspaceId, type, title, content, sourceFile, sourceLine, provenance, confidenceScore } = req.body || {};
    if (!title || !content) {
      return res.status(400).json({ ok: false, error: 'title and content are required' });
    }
    const targetWs = String(workspaceId || 'default');
    const entry = workspaceMemoryService.addMemoryEntry(targetWs, {
      type: type || 'architecture_summary',
      title: String(title).slice(0, 200),
      content: String(content).slice(0, 10000),
      sourceFile: sourceFile ? String(sourceFile) : undefined,
      sourceLine: typeof sourceLine === 'number' ? sourceLine : undefined,
      provenance: provenance ? String(provenance) : `manual://${targetWs}`,
      confidenceScore: typeof confidenceScore === 'number' ? confidenceScore : 1.0,
      versionMarker: '1.2.0',
    });
    return res.status(201).json({ ok: true, entry });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 5c. DELETE /api/intelligence/workspace-memory/:id
r.delete('/api/intelligence/workspace-memory/:id', (req, res) => {
  try {
    const workspaceId = (req.query.workspaceId as string) || (req.body?.workspaceId as string) || 'default';
    const id = String(req.params.id);
    const deleted = workspaceMemoryService.deleteMemoryEntry(workspaceId, id);
    if (!deleted) {
      return res.status(404).json({ ok: false, error: 'Memory record not found in workspace' });
    }
    return res.json({ ok: true, message: 'Memory record deleted successfully', id });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 6. Agent Command Center Roles and Execution
const AGENT_ROLES = [
  {
    id: 'planner',
    name: 'Planner Agent',
    nameTh: 'เอเจนต์วางแผน (Planner)',
    description: 'High-level task decomposition, dependency resolution, risk classification, and milestone planning.',
    permissions: ['workspace:read', 'plan:create', 'plan:update', 'dependencies:inspect'],
    allowedTools: ['workspace.inspect', 'plan.decompose', 'dependencies.resolve'],
    requiresApprovalFor: ['plan:publish'],
    status: 'ACTIVE',
  },
  {
    id: 'engineering',
    name: 'Engineering Agent',
    nameTh: 'เอเจนต์วิศวกรรม (Engineering)',
    description: 'AST analysis, code generation, refactoring, patch creation, and unit test execution.',
    permissions: ['code:read', 'ast:inspect', 'patch:propose', 'test:execute'],
    allowedTools: ['code.read', 'ast.parse', 'patch.propose', 'test.run'],
    requiresApprovalFor: ['patch:apply', 'file:delete', 'system:write'],
    status: 'ACTIVE',
  },
  {
    id: 'research',
    name: 'Research Agent',
    nameTh: 'เอเจนต์วิจัยและสืบค้น (Research)',
    description: 'Cross-file context synthesis, documentation indexing, provenance tracing, and factual evidence checking.',
    permissions: ['context:retrieve', 'doc:read', 'provenance:verify'],
    allowedTools: ['context.search', 'provenance.trace', 'facts.verify'],
    requiresApprovalFor: [],
    status: 'ACTIVE',
  },
  {
    id: 'security',
    name: 'Security Agent',
    nameTh: 'เอเจนต์ความมั่นคงปลอดภัย (Security)',
    description: 'Sandbox containment verification, secret scanning, fail-closed gate enforcement, and permission audits.',
    permissions: ['security:audit', 'sandbox:verify', 'secrets:scan', 'policy:enforce'],
    allowedTools: ['security.scan', 'sandbox.probe', 'policy.check'],
    requiresApprovalFor: ['policy:override'],
    status: 'ACTIVE',
  },
  {
    id: 'verification',
    name: 'Verification Agent',
    nameTh: 'เอเจนต์ตรวจสอบความถูกต้อง (Verification)',
    description: 'Cryptographic hash checking, regression test assertion, Merkle tree auditing, and sign-off logging.',
    permissions: ['audit:verify', 'hash:compute', 'regression:test', 'manifest:validate'],
    allowedTools: ['hash.sha256', 'manifest.verify', 'audit.ratify'],
    requiresApprovalFor: ['release:approve'],
    status: 'ACTIVE',
  },
];

r.get('/api/intelligence/agent/roles', (_req, res) => {
  res.json({ ok: true, roles: AGENT_ROLES });
});

r.post('/api/intelligence/agent/execute', async (req, res) => {
  try {
    const { goal, agentRole, workspaceId, isDryRun } = req.body || {};
    if (!goal || typeof goal !== 'string' || !goal.trim()) {
      return res.status(400).json({ ok: false, error: 'goal is required string' });
    }

    const role = AGENT_ROLES.find(r => r.id === agentRole) || AGENT_ROLES[0];
    const isThai = /[\u0E00-\u0E7F]/.test(goal);
    const targetWs = String(workspaceId || 'default');

    // Deconstruct through orchestrator
    const response = await orchestrator.execute({
      query: goal.trim(),
      workspaceId: targetWs,
      language: isThai ? 'th' : 'en',
      responseLanguage: isThai ? 'th' : 'en',
      humanApprovals: {},
      isDryRun: Boolean(isDryRun),
      onlineConsent: false,
    });

    res.json({
      ok: true,
      agentRole: role,
      task: response,
      humanApprovalRequired: response.taskState === 'WAITING_FOR_APPROVAL',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Agent execution failed' });
  }
});

// 7. GET /api/intelligence/scan & POST /api/intelligence/scan
let latestRepositoryScan: RepositoryScanResult | null = null;

function runRepositoryScan(): RepositoryScanResult {
  latestRepositoryScan = scanRepositoryFiles(process.cwd());
  return latestRepositoryScan;
}

function scanApiPayload(result: RepositoryScanResult) {
  const { context: _validatedContext, ...payload } = result;
  return payload;
}

r.get('/api/intelligence/scan', (_req, res) => {
  try {
    const result = runRepositoryScan();
    res.json({ ok: true, ...scanApiPayload(result) });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || 'Scan failed' });
  }
});

r.post('/api/intelligence/scan', (_req, res) => {
  try {
    const result = runRepositoryScan();
    res.json({ ok: true, ...scanApiPayload(result) });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || 'Scan failed' });
  }
});

r.post('/api/intelligence/context', (req, res) => {
  const { scanIdentifier, filePath } = req.body || {};
  if (typeof scanIdentifier !== 'string' || typeof filePath !== 'string') {
    return res.status(400).json({ ok: false, error: 'scanIdentifier and filePath are required' });
  }
  if (!latestRepositoryScan || latestRepositoryScan.context.scanIdentifier !== scanIdentifier) {
    return res.status(409).json({ ok: false, error: 'scan_stale', message: 'Rescan the repository before requesting focused context.' });
  }
  try {
    const focused = buildFocusedRepositoryContext(latestRepositoryScan, filePath);
    return res.json({
      ok: true,
      contextJson: focused.contextJson,
      contextValidation: focused.validation,
    });
  } catch (err: any) {
    return res.status(400).json({ ok: false, error: err.message || 'Focused context unavailable' });
  }
});

r.get('/api/intelligence/symbols', (req, res) => {
  try {
    const scan = latestRepositoryScan || runRepositoryScan();
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const typeFilter = typeof req.query.type === 'string' ? req.query.type : undefined;

    const symbols = searchSymbols(scan, query, typeFilter);
    res.json({
      ok: true,
      query,
      typeFilter: typeFilter || 'all',
      count: symbols.length,
      symbols,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || 'Symbols query failed' });
  }
});

r.get('/api/intelligence/dependencies', (_req, res) => {
  try {
    const scan = latestRepositoryScan || runRepositoryScan();
    res.json({
      ok: true,
      dependencyGraph: scan.dependencyGraph,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || 'Dependency graph retrieval failed' });
  }
});

export default r;
