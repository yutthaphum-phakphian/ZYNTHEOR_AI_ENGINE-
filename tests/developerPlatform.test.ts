/**
 * ZYNTHEOR AI ENGINE — DEVELOPER PLATFORM, API & SDK INTEGRATION TEST (STEP 10)
 * ZERO FAKE — REAL COMPLETENESS ONLY
 *
 * Tests:
 * 1. Developer API Key Creation & SHA-256 Secret Hashing
 * 2. Bearer Authentication & Rate Limit Quota Enforcement
 * 3. Key Revocation & Expiration Lifecycle
 * 4. OpenAPI 3.0.3 Contract Specification Schema Validation
 * 5. ZyntheorClient TypeScript SDK Operations
 */

import { describe, it, expect } from 'vitest';
import { developerKeyService, DeveloperKeyService } from '../src/services/developerPlatform.ts';
import { ZyntheorClient, ZyntheorAPIError } from '../src/sdk/zyntheor-sdk.ts';

describe('ZYNTHEOR Step 10 — Developer Platform, API v1 & SDK', () => {
  const testWs = `dev-platform-ws-${Date.now()}`;

  it('D10.1: Developer API Key Creation with SHA-256 Secret Hashing', () => {
    const { keyRecord, rawSecretKey } = developerKeyService.createApiKey({
      workspaceId: testWs,
      name: 'CI/CD Pipeline Integration Key',
      tier: 'pro',
      permissions: ['chat:create', 'research:execute'],
      rateLimitPerMin: 60,
    });

    expect(keyRecord.id).toBeDefined();
    expect(keyRecord.workspaceId).toBe(testWs);
    expect(keyRecord.tier).toBe('pro');
    expect(keyRecord.rateLimitPerMin).toBe(60);
    expect(rawSecretKey).toContain('zyntheor_live_');
    expect(keyRecord.keyHash).toHaveLength(64); // SHA-256 hex string length
    expect(keyRecord.keyHash).not.toBe(rawSecretKey); // Secret key is unretrievable after hashing
  });

  it('D10.2: API Key Validation & Rate Limit Enforcement', () => {
    const { keyRecord, rawSecretKey } = developerKeyService.createApiKey({
      workspaceId: testWs,
      name: 'Rate Limit Test Key',
      tier: 'developer',
      rateLimitPerMin: 3, // Low limit for test
    });

    // 1. Valid Key Authentication
    const val1 = developerKeyService.validateApiKey(rawSecretKey);
    expect(val1.valid).toBe(true);
    expect(val1.keyRecord?.id).toBe(keyRecord.id);

    // 2. Duplicate hits within limit
    expect(developerKeyService.validateApiKey(rawSecretKey).valid).toBe(true);
    expect(developerKeyService.validateApiKey(rawSecretKey).valid).toBe(true);

    // 3. Exceed rate limit
    const valExceeded = developerKeyService.validateApiKey(rawSecretKey);
    expect(valExceeded.valid).toBe(false);
    expect(valExceeded.reason).toContain('Rate limit exceeded');
  });

  it('D10.3: API Key Revocation Lifecycle', () => {
    const { keyRecord, rawSecretKey } = developerKeyService.createApiKey({
      workspaceId: testWs,
      name: 'Revocation Test Key',
    });

    expect(developerKeyService.validateApiKey(rawSecretKey).valid).toBe(true);

    // Revoke Key
    const revoked = developerKeyService.revokeApiKey(testWs, keyRecord.id);
    expect(revoked).toBe(true);

    // Revoked Key Rejected
    const valRevoked = developerKeyService.validateApiKey(rawSecretKey);
    expect(valRevoked.valid).toBe(false);
    expect(valRevoked.reason).toContain('REVOKED');
  });

  it('D10.4: OpenAPI 3.0.3 Specification Schema Validation', () => {
    const spec = developerKeyService.getOpenApiSpec();

    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toContain('ZYNTHEOR AI ENGINE');
    expect(spec.components.securitySchemes.BearerAuth).toBeDefined();
    expect(spec.paths['/chat/completions']).toBeDefined();
    expect(spec.paths['/research']).toBeDefined();
    expect(spec.paths['/models']).toBeDefined();
  });

  it('D10.5: TypeScript SDK Client Initialization & Error Handling', () => {
    // Fail without API Key
    expect(() => new ZyntheorClient({ apiKey: '' })).toThrow();

    // Valid Client Instance
    const client = new ZyntheorClient({
      apiKey: 'zyntheor_live_test_sdk_key_12345',
      baseUrl: 'http://localhost:3000/api/v1',
      timeoutMs: 5000,
    });

    expect(client.chat).toBeDefined();
    expect(client.chat.completions).toBeDefined();
    expect(client.research).toBeDefined();
    expect(client.memory).toBeDefined();
    expect(client.models).toBeDefined();
  });
});
