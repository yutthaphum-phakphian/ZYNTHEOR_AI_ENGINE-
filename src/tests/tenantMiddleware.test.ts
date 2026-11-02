import { describe, it, expect } from 'vitest';
import { tenantMiddleware, requireTenant } from '../middleware/tenant';
import type { AuthenticatedUser } from '../services/authService';

describe('Tenant Middleware Tests', () => {
  it('tenantMiddleware attaches validated tenantId and sets X-Tenant-ID header', () => {
    const mockUser: AuthenticatedUser = {
      id: 'usr-tenant-test-1',
      role: 'admin',
      isTokenVerified: true,
      source: 'verified_token',
      tenantId: 'org-tenant-custom',
    };

    const req: any = { user: mockUser };
    const headersSet: Record<string, string> = {};
    const res: any = {
      setHeader: (key: string, val: string) => {
        headersSet[key] = val;
      },
    };

    let nextCalled = false;
    tenantMiddleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(req.tenantId).toBe('org-tenant-custom');
    expect(headersSet['X-Tenant-ID']).toBe('org-tenant-custom');
  });

  it('requireTenant rejects unauthenticated request with 401', () => {
    const unverifiedUser: AuthenticatedUser = {
      id: 'unverified-viewer',
      role: 'viewer',
      isTokenVerified: false,
      source: 'unverified',
    };

    const req: any = { user: unverifiedUser };
    let jsonOutput: any = null;
    let statusCode = 200;

    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (data: any) => {
            jsonOutput = data;
          },
        };
      },
    };

    requireTenant(req, res, () => {});

    expect(statusCode).toBe(401);
    expect(jsonOutput?.ok).toBe(false);
    expect(jsonOutput?.error).toBe('unauthenticated_tenant_access');
  });
});
