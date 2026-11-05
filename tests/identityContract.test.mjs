import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRequestUser } from '../src/services/authService.ts';
import { identityService } from '../src/services/identityService.ts';

describe('Patch 1: Identity Contract Hardening Regression Suite', () => {
  let origMasterToken;
  let origEnv;

  beforeEach(() => {
    origMasterToken = process.env.ZYNTHEOR_ACCESS_TOKEN;
    origEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    if (origMasterToken !== undefined) process.env.ZYNTHEOR_ACCESS_TOKEN = origMasterToken;
    else delete process.env.ZYNTHEOR_ACCESS_TOKEN;
    if (origEnv !== undefined) process.env.NODE_ENV = origEnv;
    else delete process.env.NODE_ENV;
  });

  test('1. Client-supplied headers (x-user-id, x-user-role) are REJECTED for privilege escalation or identity spoofing', () => {
    process.env.ZYNTHEOR_ACCESS_TOKEN = 'secret-master-token-12345';
    process.env.NODE_ENV = 'production';

    const fakeRequest = {
      headers: {
        'x-user-id': '999999',
        'x-user-role': 'admin',
        'x-owner-id': 'hacked-owner',
        'x-tenant-id': 'org-malicious',
      },
    };

    const user = resolveRequestUser(fakeRequest);
    assert.equal(user.isTokenVerified, false);
    assert.equal(user.role, 'viewer');
    assert.equal(user.id, 'unverified-viewer');
    assert.notEqual(user.id, '999999');
    assert.notEqual(user.tenantId, 'org-malicious');
  });

  test('2. Valid account session (zyntheor_sess_*) derives identity EXCLUSIVELY from trusted server records', () => {
    const uniqueEmail = `verified_${Date.now()}_${Math.random().toString(36).slice(2)}@zyntheor.local`;
    const registered = identityService.registerUser({
      email: uniqueEmail,
      password: 'StrongPassword123!',
      name: 'Verified User',
    });

    const sessionToken = registered.session.accessToken;
    assert.ok(sessionToken.startsWith('zyntheor_sess_'));

    const reqWithValidSession = {
      headers: {
        authorization: `Bearer ${sessionToken}`,
        'x-user-id': 'attempted-spoof-id',
        'x-user-role': 'admin-attempt',
      },
    };

    const user = resolveRequestUser(reqWithValidSession);
    assert.equal(user.isTokenVerified, true);
    assert.equal(user.id, String(registered.user.id));
    assert.notEqual(user.id, 'attempted-spoof-id');
    assert.equal(user.source, 'verified_token');
    assert.equal(user.tenantId, registered.session.tenantId);
  });

  test('3. Expired or Revoked account sessions fail closed immediately', () => {
    const uniqueEmail = `revoked_${Date.now()}_${Math.random().toString(36).slice(2)}@zyntheor.local`;
    const registered = identityService.registerUser({
      email: uniqueEmail,
      password: 'StrongPassword123!',
      name: 'Revoked User',
    });

    const sessionToken = registered.session.accessToken;
    
    // Revoke session
    identityService.revokeSession(registered.session.id);

    const reqWithRevokedSession = {
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
    };

    const user = resolveRequestUser(reqWithRevokedSession);
    assert.equal(user.isTokenVerified, false);
    assert.equal(user.role, 'viewer');
    assert.equal(user.id, 'unverified-viewer');
  });

  test('4. Deployment master access token provides system-level authorization separate from account sessions', () => {
    process.env.ZYNTHEOR_ACCESS_TOKEN = 'deployment-access-key-999';

    const reqWithMasterToken = {
      headers: {
        authorization: 'Bearer deployment-access-key-999',
      },
    };

    const user = resolveRequestUser(reqWithMasterToken);
    assert.equal(user.isTokenVerified, true);
    assert.equal(user.role, 'admin');
    assert.equal(user.id, 'admin-workspace');
  });

  test('5. OWNER and ADMIN roles remain strictly segregated in identity service', () => {
    const uniqueEmail = `owner_test_${Date.now()}@zyntheor.local`;
    const registered = identityService.registerUser({
      email: uniqueEmail,
      password: 'StrongPassword123!',
      name: 'Owner User',
    });

    const userOrgId = registered.session.tenantId;
    const members = identityService.getOrganizationMembers(userOrgId);
    const ownerMember = members.find(m => m.role === 'OWNER');
    assert.ok(ownerMember, 'Registered user workspace must have an OWNER member');

    // Update role to ADMIN
    const updateResult = identityService.updateMemberRole(userOrgId, ownerMember.userId, 'ADMIN');
    assert.equal(updateResult, true);
    
    const updatedMembers = identityService.getOrganizationMembers(userOrgId);
    const updatedMember = updatedMembers.find(m => m.userId === ownerMember.userId);
    assert.equal(updatedMember.role, 'ADMIN');
  });
});

describe('Patch 2: Model Identity Contract & Default Inference Strict Validation Suite', () => {
  test('1. Default inference accepts only authorized ZYNTHEOR CORE family models', async () => {
    const { validateDefaultInferenceModel } = await import('../src/contracts/modelIdentityContract.ts');
    
    // Valid Zyntheor Core foundation model
    const validModel = {
      modelId: 'zyntheor-core-0.10.0-foundation',
      displayName: 'ZYNTHEOR CORE 0.1 (Foundation Spec)',
      category: 'CORE_ADAPTED',
      provider: 'ZYNTHEOR',
      isVerified: false,
      status: 'SPECIFICATION_LOCKED_PENDING_GPU_RUN',
    };
    const res = validateDefaultInferenceModel(validModel);
    assert.equal(res.valid, true);
    assert.equal(res.isZyntheorCore, true);
    assert.equal(res.unauthorizedFallback, false);
    assert.equal(res.errors.length, 0);

    // Native core model
    const nativeModel = {
      modelId: 'zyntheor-core-native-v1',
      category: 'CORE_NATIVE',
      provider: 'ZYNTHEOR',
    };
    const nativeRes = validateDefaultInferenceModel(nativeModel);
    assert.equal(nativeRes.valid, true);
    assert.equal(nativeRes.isZyntheorCore, true);
  });

  test('2. Default inference strictly rejects unauthorized external fallbacks (Gemini, OpenAI, Claude)', async () => {
    const { validateDefaultInferenceModel } = await import('../src/contracts/modelIdentityContract.ts');
    
    // Attempted fallback to Gemini
    const geminiFallback = {
      modelId: 'gemini-3.8-flash',
      category: 'EXTERNAL_MODEL_PROVIDER',
      provider: 'GOOGLE',
    };
    const geminiRes = validateDefaultInferenceModel(geminiFallback);
    assert.equal(geminiRes.valid, false);
    assert.equal(geminiRes.isZyntheorCore, false);
    assert.equal(geminiRes.unauthorizedFallback, true);
    assert.ok(geminiRes.errors.some(e => e.includes('Unauthorized fallback')));

    // Attempted fallback to OpenAI
    const openaiFallback = {
      modelId: 'gpt-4o',
      provider: 'OPENAI',
    };
    const openaiRes = validateDefaultInferenceModel(openaiFallback);
    assert.equal(openaiRes.valid, false);
    assert.equal(openaiRes.unauthorizedFallback, true);

    // Attempted disguise of external model as CORE
    const disguisedModel = {
      modelId: 'gemini-2.5-pro',
      category: 'CORE_NATIVE',
      provider: 'GOOGLE',
    };
    const disguisedRes = validateDefaultInferenceModel(disguisedModel);
    assert.equal(disguisedRes.valid, false);
    assert.equal(disguisedRes.unauthorizedFallback, true);
  });

  test('3. Rejects empty, null, or missing model specifications for default inference', async () => {
    const { validateDefaultInferenceModel } = await import('../src/contracts/modelIdentityContract.ts');
    
    const nullRes = validateDefaultInferenceModel(null);
    assert.equal(nullRes.valid, false);
    assert.equal(nullRes.isZyntheorCore, false);

    const emptyRes = validateDefaultInferenceModel({});
    assert.equal(emptyRes.valid, false);
    assert.ok(emptyRes.errors.some(e => e.includes('Missing canonical model identifier')));
  });

  test('4. Rejects models falsely claiming verification without physical weights', async () => {
    const { validateDefaultInferenceModel } = await import('../src/contracts/modelIdentityContract.ts');
    
    const unverifiedLie = {
      modelId: 'zyntheor-core-0.10.0-foundation',
      category: 'CORE_ADAPTED',
      provider: 'ZYNTHEOR',
      status: 'SPECIFICATION_LOCKED_PENDING_GPU_RUN',
      isVerified: true, // Claiming verified without trained weights
    };
    const res = validateDefaultInferenceModel(unverifiedLie);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('Integrity failure')));
  });
});
