import { identityService } from './identityService.ts';

export class TenantIsolationService {
  /**
   * Asserts that a user is a member of the specified organization (tenant).
   * Prevents cross-tenant access and data leaks.
   */
  public verifyTenantMembership(userId: number, tenantId: string): void {
    const org = identityService.getOrganization(tenantId);
    if (!org) {
      throw new Error(`TENANT ACCESS DENIED: Organization '${tenantId}' does not exist.`);
    }

    const members = identityService.getOrganizationMembers(tenantId);
    const isMember = members.some(m => m.userId === userId);

    if (!isMember) {
      throw new Error(`TENANT ISOLATION VIOLATION: User ID ${userId} is not a member of organization '${tenantId}'. Cross-tenant access blocked.`);
    }
  }

  /**
   * Scopes database/file query filters strictly to tenantId
   */
  public applyTenantScope<T extends { tenantId?: string; orgId?: string }>(items: T[], tenantId: string): T[] {
    return items.filter(item => (item.tenantId || item.orgId) === tenantId);
  }
}

export const tenantIsolationService = new TenantIsolationService();
