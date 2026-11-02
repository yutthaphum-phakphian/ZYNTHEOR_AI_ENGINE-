import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateDiagnosticChecks,
  type DiagnosticHealth,
  type DiagnosticSettings,
  type DiagnosticModelResult,
  type SmartDiagData,
} from '../lib/diagnostics-evaluator.ts';

test('Diagnostics Evaluator: Web/API server health check evaluation', () => {
  const healthReady: DiagnosticHealth = { ok: true, uptimeSeconds: 120 };
  const resultReady = evaluateDiagnosticChecks(healthReady, null, null, null);

  const serverCheck = resultReady.checks.find(c => c.title === 'Web/API server');
  assert.ok(serverCheck, 'Web/API server check item must exist');
  assert.equal(serverCheck.ok, true);
  assert.equal(serverCheck.status, 'READY');
  assert.ok(serverCheck.detail.includes('120s'));

  const healthFailed: DiagnosticHealth = { ok: false };
  const resultFailed = evaluateDiagnosticChecks(healthFailed, null, null, null);
  const serverFailedCheck = resultFailed.checks.find(c => c.title === 'Web/API server');
  assert.ok(serverFailedCheck);
  assert.equal(serverFailedCheck.ok, false);
  assert.equal(serverFailedCheck.status, 'FAILED');

  const resultUnknown = evaluateDiagnosticChecks(null, null, null, null);
  const serverUnknownCheck = resultUnknown.checks.find(c => c.title === 'Web/API server');
  assert.ok(serverUnknownCheck);
  assert.equal(serverUnknownCheck.ok, false);
  assert.equal(serverUnknownCheck.status, 'UNKNOWN');
});

test('Diagnostics Evaluator: Model endpoint readiness & error state classification', () => {
  // Case 1: Endpoint Connected & Ready
  const modelsConnected: DiagnosticModelResult = { state: 'CONNECTED', count: 3 };
  const smartDiagReady: SmartDiagData = { endpoint: { status: 'ENDPOINT_READY', httpStatus: 200, contentType: 'application/json' } };
  const resReady = evaluateDiagnosticChecks(null, null, modelsConnected, smartDiagReady);

  const modelCheckReady = resReady.checks.find(c => c.title === 'Model endpoint');
  assert.ok(modelCheckReady);
  assert.equal(modelCheckReady.ok, true);
  assert.equal(modelCheckReady.status, 'ENDPOINT_READY');
  assert.ok(modelCheckReady.detail.includes('3 model(s) listed'));

  // Case 2: HTML error response (e.g. 503 proxy or error page)
  const modelsHtmlError: DiagnosticModelResult = { state: 'UNAVAILABLE', error: 'Received HTML response page' };
  const smartDiagHtml: SmartDiagData = { endpoint: { status: 'HTML_RESPONSE_RECEIVED', httpStatus: 503, contentType: 'text/html' } };
  const resHtml = evaluateDiagnosticChecks(null, null, modelsHtmlError, smartDiagHtml);

  const modelCheckHtml = resHtml.checks.find(c => c.title === 'Model endpoint');
  assert.ok(modelCheckHtml);
  assert.equal(modelCheckHtml.ok, false);
  assert.equal(modelCheckHtml.status, 'HTML_RESPONSE_RECEIVED');

  // Case 3: Invalid Endpoint URL or 404
  const smartDiagInvalid: SmartDiagData = { endpoint: { status: 'INVALID_ENDPOINT', httpStatus: 404, message: 'Invalid model endpoint URL' } };
  const resInvalid = evaluateDiagnosticChecks(null, null, null, smartDiagInvalid);

  const modelCheckInvalid = resInvalid.checks.find(c => c.title === 'Model endpoint');
  assert.ok(modelCheckInvalid);
  assert.equal(modelCheckInvalid.ok, false);
  assert.equal(modelCheckInvalid.status, 'INVALID_ENDPOINT');
});

test('Diagnostics Evaluator: Local-only policy and API key boundary checks', () => {
  const settingsLocal: DiagnosticSettings = { localOnly: true, apiKeyExposed: false, apiKeyConfigured: true };
  const resLocal = evaluateDiagnosticChecks(null, settingsLocal, null, null);

  const policyCheck = resLocal.checks.find(c => c.title === 'Local-only policy');
  assert.ok(policyCheck);
  assert.equal(policyCheck.ok, true);
  assert.equal(policyCheck.status, 'ENABLED');

  const apiKeyCheck = resLocal.checks.find(c => c.title === 'API key handling');
  assert.ok(apiKeyCheck);
  assert.equal(apiKeyCheck.ok, true);
  assert.equal(apiKeyCheck.status, 'NOT EXPOSED');
  assert.ok(apiKeyCheck.detail.includes('Secret configured server-side'));
});

test('Diagnostics Evaluator: Access token security enforcement & overall health calculation', () => {
  const health: DiagnosticHealth = { ok: true, uptimeSeconds: 300 };
  const settings: DiagnosticSettings = { localOnly: true, apiKeyExposed: false, apiKeyConfigured: true };
  const models: DiagnosticModelResult = { state: 'CONNECTED', count: 1 };
  const smartDiag: SmartDiagData = {
    endpoint: { status: 'ENDPOINT_READY', httpStatus: 200 },
    security: { accessTokenRequired: true },
  };

  const res = evaluateDiagnosticChecks(health, settings, models, smartDiag);

  assert.equal(res.checks.length, 6, 'Should evaluate all 6 system diagnostic checks');
  assert.equal(res.passCount, 6, 'All 6 checks should pass in healthy state');
  assert.equal(res.isHealthy, true, 'System should be healthy when passCount equals totalCount');

  const tokenCheck = res.checks.find(c => c.title === 'Access token validation');
  assert.ok(tokenCheck);
  assert.equal(tokenCheck.ok, true);
  assert.equal(tokenCheck.status, 'TOKEN_ENFORCED');
});
