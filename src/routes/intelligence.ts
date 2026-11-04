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
