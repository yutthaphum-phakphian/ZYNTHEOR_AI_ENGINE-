import test from 'node:test';
import assert from 'node:assert/strict';
import fs, { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { execSync } from 'node:child_process';
import {
  getProjects,
  saveProject,
  deleteProject,
  createSnapshotBackup,
  restoreProjectsFromBackup,
  getGitStatus,
  getBuildStatus,
  getCiCdStatus,
  getCodeIntegrityStatus,
  getWorkspaceFiles,
} from '../src/services/workspaceManager.ts';
import { getPipelineStatus, triggerPipelineRun } from '../src/services/pipelineService.ts';
import { logSystemError, getSystemErrors, resolveSystemError } from '../src/services/errorLogger.ts';
import { extractToken, tokenMatches } from '../lib/access.mjs';
import { resolveRequestUser, serverSessionMiddleware } from '../src/services/authService.ts';
import { createAuditEntry, verifyAuditHashChain, sha256Sync, generateSignedAuditCsv } from '../src/services/auditLedger.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Workspace: database/schema.ts defines valid Drizzle ORM structures for users and projects', async () => {
  const schemaPath = path.join(root, 'database/schema.ts');
  assert.ok(existsSync(schemaPath), 'database/schema.ts must exist');

  const content = readFileSync(schemaPath, 'utf8');
  assert.ok(content.includes("export const users = pgTable('users'"), 'users table must be defined');
  assert.ok(content.includes("export const projects = pgTable('projects'"), 'projects table must be defined');
  assert.ok(content.includes("export const workspaceSnapshots = pgTable('workspace_snapshots'"), 'snapshots table must be defined');
  assert.ok(content.includes("export const systemErrors = pgTable('system_errors'"), 'systemErrors table must be defined');
  assert.ok(content.includes('ownerId'), 'projects table should support user relationship');
});

test('Workspace Storage: getProjects loads server-side storage and handles atomic writes', () => {
  const initial = getProjects();
  assert.ok(Array.isArray(initial.projects), 'projects must be an array');
  assert.ok(initial.projects.length >= 1, 'must have initial seed projects');

  const testProjectName = `Test Project ${Date.now()}`;
  const saveResult = saveProject({
    name: testProjectName,
    description: 'Unit test project for server-side persistence',
    status: 'Testing',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    tags: ['test', 'automated'],
  });

  assert.equal(saveResult.project.name, testProjectName);
  assert.ok(saveResult.project.id);
  assert.ok(saveResult.projects.some(p => p.id === saveResult.project.id));

  // Verify atomic persistence by re-reading
  const refreshed = getProjects();
  const found = refreshed.projects.find(p => p.id === saveResult.project.id);
  assert.ok(found, 'saved project must be retrievable from disk');
  assert.equal(found.name, testProjectName);

  // Clean up
  const deleteResult = deleteProject(saveResult.project.id);
  assert.equal(deleteResult.deletedId, saveResult.project.id);
  const afterDelete = getProjects();
  assert.ok(!afterDelete.projects.some(p => p.id === saveResult.project.id));
});

test('Workspace Storage: saveProject validates required fields and handles errors', () => {
  assert.throws(() => {
    saveProject({ name: '' });
  }, /Project name cannot be empty/);

  assert.throws(() => {
    saveProject({ name: '   ' });
  }, /Project name cannot be empty/);

  assert.throws(() => {
    saveProject({ name: 'x'.repeat(101) });
  }, /cannot exceed 100 characters/);

  assert.throws(() => {
    deleteProject('non-existent-id-999999');
  }, /not found/);
});

test('Workspace Storage: snapshot backup and restore workflow executes safely', () => {
  const backup = createSnapshotBackup();
  assert.ok(backup.backupFilename.startsWith('projects_snapshot_'));
  assert.ok(backup.itemCount >= 1);
  assert.ok(backup.timestamp);

  // Restore from specific snapshot
  const restored = restoreProjectsFromBackup(backup.backupFilename);
  assert.ok(Array.isArray(restored.projects));
  assert.equal(restored.restoredFrom, backup.backupFilename);
});

test('Workspace Access Control: server-side requireWorkspaceAuth enforces ZYNTHEOR_ACCESS_TOKEN for /api/workspace/*', () => {
  const serverContent = readFileSync(path.join(root, 'server.ts'), 'utf8');
  assert.ok(serverContent.includes('export function requireWorkspaceAuth'), 'server.ts must define requireWorkspaceAuth middleware');
  assert.ok(serverContent.includes("app.use('/api/workspace', requireWorkspaceAuth)"), 'server.ts must apply requireWorkspaceAuth to /api/workspace');
  assert.ok(serverContent.includes("WORKSPACE_ACCESS_DENIED"), 'server.ts must log audit on unauthorized workspace access');

  // Verify token validation logic
  const mockToken = 'secret-workspace-token-buffalo-2026';
  assert.equal(tokenMatches(mockToken, 'secret-workspace-token-buffalo-2026'), true);
  assert.equal(tokenMatches(mockToken, 'wrong-token'), false);
  assert.equal(tokenMatches(mockToken, ''), false);

  // Header extraction check
  assert.equal(extractToken({ authorization: `Bearer ${mockToken}` }), mockToken);
  assert.equal(extractToken({ 'x-zyntheor-token': mockToken }), mockToken);
  assert.equal(extractToken({}), '');
});

test('Workspace App.tsx: createProject implements retry mechanism and proper failure logging', () => {
  const appContent = readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
  assert.ok(appContent.includes('const MAX_RETRIES = 3'), 'createProject must define MAX_RETRIES');
  assert.ok(appContent.includes('PROJECT_CREATION_FAILED_ATTEMPT'), 'must audit failed creation attempts');
  assert.ok(appContent.includes('PROJECT_CREATION_SERVER_FAILED'), 'must audit exhausted retries');
  assert.ok(appContent.includes('console.error'), 'must log failures to console');
  assert.ok(!appContent.includes('PROJECT_CREATED_LOCAL_FALLBACK'), 'must not silently fallback to local storage without retries');
});

test('Workspace Git & Environment: verified Git status checks without fabricating data', () => {
  const git = getGitStatus();
  assert.equal(typeof git.isGitRepo, 'boolean');
  assert.ok(git.verifiedAt);
  if (!git.isGitRepo) {
    assert.equal(git.branch, null);
    assert.equal(git.commitSha, null);
    assert.ok(git.reason);
  } else {
    assert.equal(typeof git.branch, 'string');
    assert.ok(Array.isArray(git.modifiedFiles));
  }
});

test('Workspace Build & CI/CD: separates build artifacts and workflow definitions honestly', () => {
  const build = getBuildStatus();
  assert.equal(typeof build.hasDist, 'boolean');
  assert.equal(typeof build.distIndexHtmlExists, 'boolean');
  assert.ok(build.verifiedAt);

  const cicd = getCiCdStatus();
  assert.equal(typeof cicd.workflowCount, 'number');
  assert.ok(Array.isArray(cicd.workflows));
  assert.ok(cicd.verifiedAt);
});

test('Workspace Files: prevents path traversal and suppresses sensitive files', () => {
  // Directory traversal attempt
  assert.throws(() => {
    getWorkspaceFiles('../../etc');
  }, /Access denied|not found/i);

  const rootFiles = getWorkspaceFiles('');
  assert.ok(Array.isArray(rootFiles.files));
  
  // Sensitive file suppression
  const fileNames = rootFiles.files.map(f => f.name.toLowerCase());
  assert.ok(!fileNames.includes('.env'));
  assert.ok(!fileNames.includes('node_modules'));
  assert.ok(!fileNames.includes('.git'));
});

test('Workspace Git Status: includes dirtyFileCount calculation', () => {
  const git = getGitStatus();
  assert.equal(typeof git.dirtyFileCount, 'number');
  assert.ok(git.dirtyFileCount >= 0);
});

test('Pipeline Service & CI/CD Monitor: status and trigger work with honest progress metrics', () => {
  const status = getPipelineStatus();
  assert.ok(status.pipelineId);
  assert.ok(Array.isArray(status.steps));
  assert.ok(status.steps.length >= 4);
  assert.equal(typeof status.progress, 'number');
  assert.ok(status.summary);
  assert.equal(typeof status.summary.total, 'number');

  const triggered = triggerPipelineRun();
  assert.equal(triggered.status, 'running');
  assert.ok(triggered.steps.length >= 4);
});

test('Error Logger: persistent storage, resolution and filtering', () => {
  const logged = logSystemError({
    level: 'error',
    category: 'api',
    message: 'Test system error for persistent logger verification',
    endpoint: '/api/test',
  });
  assert.ok(logged.id);
  assert.equal(logged.message, 'Test system error for persistent logger verification');

  const errors = getSystemErrors({ category: 'api' });
  assert.ok(errors.errors.some(e => e.id === logged.id));

  const resolved = resolveSystemError(logged.id);
  assert.equal(resolved.ok, true);

  const errorsAfterResolve = getSystemErrors();
  const foundResolved = errorsAfterResolve.errors.find(e => e.id === logged.id);
  assert.ok(foundResolved);
  assert.equal(foundResolved.resolved, true);
});

test('Workspace & Diagnostics Routes: exposes pipeline, git, and system errors endpoints', () => {
  const routesContent = readFileSync(path.join(root, 'src/routes/workspace.ts'), 'utf8');
  assert.ok(routesContent.includes("router.get('/api/workspace/pipeline'"), 'workspace.ts must expose GET /api/workspace/pipeline');
  assert.ok(routesContent.includes("router.post('/api/workspace/pipeline/trigger'"), 'workspace.ts must expose POST /api/workspace/pipeline/trigger');
  assert.ok(routesContent.includes("router.get('/api/workspace/git'"), 'workspace.ts must expose GET /api/workspace/git');

  const serverContent = readFileSync(path.join(root, 'server.ts'), 'utf8');
  assert.ok(serverContent.includes("app.get('/api/diagnostics/errors'"), 'server.ts must expose GET /api/diagnostics/errors');
  assert.ok(serverContent.includes("app.post('/api/diagnostics/errors'"), 'server.ts must expose POST /api/diagnostics/errors');
});

test('Workspace IDOR & Ownership: enforces project owner segregation and prevents unauthorized mutation', () => {
  // 1. Create project owned by User A
  const projectA = saveProject(
    { name: 'User A Secret Project', description: 'Confidential' },
    { id: 'user-alice', role: 'engineer' }
  );
  assert.equal(projectA.project.ownerId, 'user-alice');

  // 2. User B attempts to modify User A's project (IDOR attack) -> should fail
  assert.throws(() => {
    saveProject(
      { id: projectA.project.id, name: 'Hacked by Bob' },
      { id: 'user-bob', role: 'engineer' }
    );
  }, /Access denied.*IDOR protection/);

  // 3. User B attempts to delete User A's project (IDOR attack) -> should fail
  assert.throws(() => {
    deleteProject(projectA.project.id, { id: 'user-bob', role: 'engineer' });
  }, /Access denied.*IDOR protection/);

  // 4. Admin can manage project despite not being direct owner
  const adminUpdated = saveProject(
    { id: projectA.project.id, name: 'Admin Reviewed Project' },
    { id: 'admin-charlie', role: 'admin' }
  );
  assert.equal(adminUpdated.project.name, 'Admin Reviewed Project');

  // 5. User A can delete their own project
  const deleteResult = deleteProject(projectA.project.id, { id: 'user-alice', role: 'engineer' });
  assert.equal(deleteResult.deletedId, projectA.project.id);
});

test('Workspace App.tsx: implements true exponential backoff and form input retention on failure', () => {
  const appContent = readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
  // Check exponential backoff formula
  assert.ok(appContent.includes('Math.pow(2, attempt - 1)'), 'must use true exponential backoff (2^(attempt-1))');
  // Check form retention error state
  assert.ok(appContent.includes('projectFormError'), 'must retain form inputs and track projectFormError');
  assert.ok(appContent.includes('บันทึกไม่สำเร็จ:'), 'modal form must display error message while preserving inputs');
});

test('Workspace & Diagnostics Permissions: role-based restrictions block unauthorized triggers and wipes', () => {
  const workspaceRoutes = readFileSync(path.join(root, 'src/routes/workspace.ts'), 'utf8');
  assert.ok(workspaceRoutes.includes("if (role === 'viewer')"), 'pipeline trigger must block viewer role');
  assert.ok(workspaceRoutes.includes('insufficient_permissions'), 'must return insufficient_permissions on unauthorized trigger');

  const serverContent = readFileSync(path.join(root, 'server.ts'), 'utf8');
  assert.ok(serverContent.includes("if (role === 'viewer' && (action === 'clear' || action === 'resolve'))"), 'diagnostics error modification must block viewer role');
});

test('Workspace Git Regression: non-git directory returns Git Unavailable without fabricating branch, commit SHA, or clean status', () => {
  // Pass a directory known to not be a git repo
  const nonGitDir = os.tmpdir();
  const git = getGitStatus(nonGitDir);

  assert.equal(git.isGitRepo, false, 'isGitRepo must be false for non-git directory');
  assert.equal(git.branch, null, 'branch must be null when Git is unavailable');
  assert.equal(git.commitSha, null, 'commitSha must be null when Git is unavailable');
  assert.equal(git.commitAuthor, null, 'commitAuthor must be null when Git is unavailable');
  assert.equal(git.commitDate, null, 'commitDate must be null when Git is unavailable');
  assert.equal(git.commitMessage, null, 'commitMessage must be null when Git is unavailable');
  assert.equal(git.isClean, null, 'isClean must be null when Git is unavailable');
  assert.equal(git.dirtyFileCount, 0, 'dirtyFileCount must be 0');
  assert.equal(git.statusLabel, 'Git Unavailable', 'statusLabel must be Git Unavailable');
  assert.ok(git.reason && git.reason.includes('No active .git repository'), 'must provide clear explanation');
});

test('Workspace Git Regression: valid git repository returns real branch, commit SHA, and detects dirty files accurately', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zyntheor-git-test-'));
  try {
    // 1. Initialize git repo
    execSync('git init -b main', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git config user.email "test@zyntheor.ai" && git config user.name "Zyntheor Tester"', { cwd: tmpDir, stdio: 'pipe' });

    // 2. Initial clean commit
    const testFile = path.join(tmpDir, 'tracked.txt');
    fs.writeFileSync(testFile, 'initial content\n', 'utf8');
    execSync('git add tracked.txt && git commit -m "initial test commit"', { cwd: tmpDir, stdio: 'pipe' });

    // 3. Inspect clean state
    const cleanStatus = getGitStatus(tmpDir);
    assert.equal(cleanStatus.isGitRepo, true, 'isGitRepo must be true');
    assert.ok(cleanStatus.branch === 'main' || cleanStatus.branch === 'master', 'branch must be real git branch');
    assert.ok(cleanStatus.commitSha && cleanStatus.commitSha.length >= 7, 'commitSha must be real commit hash');
    assert.equal(cleanStatus.commitAuthor, 'Zyntheor Tester');
    assert.equal(cleanStatus.commitMessage, 'initial test commit');
    assert.equal(cleanStatus.isClean, true, 'isClean must be true for clean repo');
    assert.equal(cleanStatus.dirtyFileCount, 0, 'dirtyFileCount must be 0 for clean repo');
    assert.equal(cleanStatus.statusLabel, 'Clean');

    // 4. Modify tracked file and add untracked file (dirty repo)
    fs.appendFileSync(testFile, 'modified line\n', 'utf8');
    const untrackedFile = path.join(tmpDir, 'untracked.txt');
    fs.writeFileSync(untrackedFile, 'untracked file\n', 'utf8');

    const dirtyStatus = getGitStatus(tmpDir);
    assert.equal(dirtyStatus.isGitRepo, true);
    assert.equal(dirtyStatus.isClean, false, 'isClean must be false when changes exist');
    assert.equal(dirtyStatus.modifiedCount, 1, 'modifiedCount must be 1');
    assert.equal(dirtyStatus.untrackedCount, 1, 'untrackedCount must be 1');
    assert.equal(dirtyStatus.dirtyFileCount, 2, 'dirtyFileCount must equal modified + untracked + staged');
    assert.ok(dirtyStatus.modifiedFiles.includes('tracked.txt'));
    assert.ok(dirtyStatus.untrackedFiles.includes('untracked.txt'));
    assert.equal(dirtyStatus.statusLabel, '2 Dirty Files');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Workspace Separation Regression: Git status, Code Integrity Manifest, and GitHub Actions are distinct', () => {
  // 1. Code Integrity Manifest is separate
  const integrity = getCodeIntegrityStatus();
  assert.equal(integrity.manifestExists, true);
  assert.equal(integrity.manifestPath, 'FILE_MANIFEST.sha256');
  assert.ok(integrity.totalTrackedFiles >= 20, 'must have tracked entries in FILE_MANIFEST.sha256');

  // 2. GitHub Actions definitions are separate
  const cicd = getCiCdStatus();
  assert.ok(cicd.workflowCount >= 1, 'must have workflows defined in .github/workflows/');
  assert.ok(cicd.workflows.some(w => w.filename.includes('audit') || w.filename.includes('native-core')));

  // 3. Local Verification Suite does not pretend to be GitHub Actions
  const pipeline = getPipelineStatus();
  assert.equal(pipeline.name, 'Local Workspace Verification Suite', 'must accurately label local verification suite');
  assert.ok(!pipeline.name.includes('GitHub Actions'), 'pipeline must not claim to be GitHub Actions');
});

test('Workspace Security Hardening: unverified callers cannot elevate to admin via x-user-role header', () => {
  // Test 1: Caller sends x-user-role: admin without valid token -> must NOT be admin
  const spoofedReq = {
    headers: {
      'x-user-role': 'admin',
      'x-user-id': 'attacker-user',
    },
  };
  const resolved = resolveRequestUser(spoofedReq);
  assert.notEqual(resolved.role, 'admin', 'unverified caller sending x-user-role: admin must not receive admin role');
  assert.equal(resolved.role, 'engineer');

  // Test 2: Caller requests viewer mode -> viewer mode allowed
  const viewerReq = {
    headers: {
      'x-user-role': 'viewer',
      'x-user-id': 'guest-viewer',
    },
  };
  const viewerResolved = resolveRequestUser(viewerReq);
  assert.equal(viewerResolved.role, 'viewer');
});

test('Workspace Security Hardening: serverSessionMiddleware injects server-verified role and neutralizes client header tampering', () => {
  const req = {
    headers: {
      'x-user-role': 'admin',
      'x-user-id': 'untrusted-client',
    },
  };
  const responseHeaders = {};
  const res = {
    setHeader(name, val) {
      responseHeaders[name] = val;
    },
  };
  let nextCalled = false;
  serverSessionMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true, 'serverSessionMiddleware must invoke next()');
  assert.notEqual(req.headers['x-user-role'], 'admin', 'client-supplied admin role must be overwritten');
  assert.equal(req.headers['x-user-role'], 'engineer', 'must inject server-verified role (engineer)');
  assert.equal(responseHeaders['X-User-Role'], 'engineer', 'response header must reflect server-verified role');
  assert.ok(req.user, 'req.user must be attached by session middleware');
  assert.equal(req.user.role, 'engineer');
});

test('Audit Ledger: validates sequential cryptographic SHA-256 hash chain and detects tampering', () => {
  // 1. Create a valid sequence of 3 audit records
  const rec1 = createAuditEntry('WORKSPACE_OPENED', 'Initial workspace view', null, 'rec-1', '2026-10-29T10:00:00.000Z');
  assert.equal(rec1.prevHash, 'GENESIS');
  assert.ok(rec1.hash && rec1.hash.length === 64, 'hash must be 64-char sha256 hex string');

  const rec2 = createAuditEntry('PROJECT_CREATED', 'Project Alpha', rec1, 'rec-2', '2026-10-29T10:01:00.000Z');
  assert.equal(rec2.prevHash, rec1.hash, 'rec2 prevHash must point to rec1 hash');

  const rec3 = createAuditEntry('CHAT_MESSAGE_SENT', 'Prompt sent', rec2, 'rec-3', '2026-10-29T10:02:00.000Z');
  assert.equal(rec3.prevHash, rec2.hash, 'rec3 prevHash must point to rec2 hash');

  // Stored in newest-first order
  const validChain = [rec3, rec2, rec1];
  const validResult = verifyAuditHashChain(validChain);
  assert.equal(validResult.isValid, true, 'valid chain must pass verification');
  assert.equal(validResult.verifiedCount, 3);
  assert.equal(validResult.rootHash, rec3.hash);

  // 2. Tamper Test: Modify payload of rec2 without re-signing
  const tamperedPayloadChain = [
    rec3,
    { ...rec2, detail: 'Project Alpha (HACKED_DATA)' },
    rec1,
  ];
  const tamperedPayloadResult = verifyAuditHashChain(tamperedPayloadChain);
  assert.equal(tamperedPayloadResult.isValid, false, 'tampered payload must fail validation');
  assert.equal(tamperedPayloadResult.brokenRecordId, 'rec-2');
  assert.ok(tamperedPayloadResult.reason.includes('mismatch') || tamperedPayloadResult.reason.includes('modified'));

  // 3. Pointer Break Test: Delete middle record rec2 (breaking link between rec3 and rec1)
  const brokenLinkChain = [rec3, rec1];
  const brokenLinkResult = verifyAuditHashChain(brokenLinkChain);
  assert.equal(brokenLinkResult.isValid, false, 'deleted record must break pointer chain');
  assert.equal(brokenLinkResult.brokenRecordId, 'rec-3');
  assert.ok(brokenLinkResult.reason.includes('Hash pointer mismatch'));
});

test('Code Integrity Manifest: computes real file SHA-256 hashes against FILE_MANIFEST.sha256', () => {
  const integrity = getCodeIntegrityStatus();
  assert.equal(integrity.manifestExists, true);
  assert.equal(integrity.manifestPath, 'FILE_MANIFEST.sha256');
  assert.ok(integrity.totalTrackedFiles >= 20, 'must track manifest files');
  assert.equal(typeof integrity.matchedCount, 'number', 'matchedCount must be a number');
  assert.equal(typeof integrity.mismatchedCount, 'number', 'mismatchedCount must be a number');
  assert.equal(typeof integrity.missingCount, 'number', 'missingCount must be a number');
  assert.ok(integrity.matchedCount > 0, 'must have positive matched files');
  assert.equal(integrity.totalTrackedFiles, integrity.matchedCount + integrity.mismatchedCount + integrity.missingCount);
});

test('Audit Ledger CSV export: generates signed CSV with headers, nanoseconds, and forensic metadata', () => {
  const rec1 = createAuditEntry('WORKSPACE_OPENED', 'Initial view', null, 'rec-1', '2026-10-29T10:00:00.000Z');
  const rec2 = createAuditEntry('PROJECT_CREATED', 'Project Beta, with comma', rec1, 'rec-2', '2026-10-29T10:01:00.000Z');
  const records = [rec2, rec1];

  const csv = generateSignedAuditCsv(records);
  assert.ok(csv.includes('# ZYNTHEOR CRYPTOGRAPHIC AUDIT LEDGER - FORENSIC CSV EXPORT'));
  assert.ok(csv.includes('# Hash Chain Status: INTACT'));
  assert.ok(csv.includes('# Digital Signature SHA-256:'));
  assert.ok(csv.includes('Index,ID,Timestamp (ISO),Nanosecond Timestamp,Action,Detail,Parent Hash (prevHash),SHA-256 Hash,Calculated Hash,Block Verification'));
  assert.ok(csv.includes('"Project Beta, with comma"'), 'must properly quote CSV fields containing commas');
  assert.ok(csv.includes('VERIFIED'));
});

test('Audit Ledger Verification Endpoint: server.ts exposes /api/audit/verify route', () => {
  const serverPath = path.join(root, 'server.ts');
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  assert.ok(serverContent.includes("app.get('/api/audit/verify'"), 'server.ts must expose GET /api/audit/verify');
  assert.ok(serverContent.includes("app.post('/api/audit/verify'"), 'server.ts must expose POST /api/audit/verify');
  assert.ok(serverContent.includes("verifyAuditHashChain"), 'server.ts must call verifyAuditHashChain');
});

test('Diagnostics Security & Smart Endpoint: server.ts exposes token and smart diagnostics routes', () => {
  const serverPath = path.join(root, 'server.ts');
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  assert.ok(serverContent.includes("app.get('/api/diagnostics/access-token'"), 'server.ts must expose GET /api/diagnostics/access-token');
  assert.ok(serverContent.includes("app.get('/api/diagnostics/smart'"), 'server.ts must expose GET /api/diagnostics/smart');
});





