/**
 * ZYNTHEOR AI ENGINE — DEVELOPER PLATFORM, API & SDK GOVERNANCE (STEP 10)
 * Master Principle: ZERO FAKE — REAL COMPLETENESS ONLY
 *
 * Capabilities:
 * - Sovereign Developer API Key Management with SHA-256 Secret Hashing
 * - Bearer Token Validation & Tier-based Rate Limiting per Key
 * - Persistent Disk Storage (`.aistudio/developer_keys_store.json`)
 * - Developer Usage Metering & Quota Tracking
 * - OpenAPI 3.0.3 Specification Contract Generator
 */

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type KeyStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';
export type KeyTier = 'developer' | 'pro' | 'enterprise';

export interface DeveloperApiKey {
  id: string;
  workspaceId: string;
  name: string;
  keyPrefix: string;      // e.g. "zyntheor_live_a1b2c3"
  keyHash: string;        // SHA-256 hash of secret key
  tier: KeyTier;
  permissions: string[];
  rateLimitPerMin: number;
  monthlyQuotaRequests: number;
  requestCountCurrentMonth: number;
  accessCount: number;
  status: KeyStatus;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  reason?: string;
  keyRecord?: DeveloperApiKey;
}

const KEYS_STORE_PATH = path.resolve(process.cwd(), '.aistudio/developer_keys_store.json');

export class DeveloperKeyService {
  private keysMap = new Map<string, DeveloperApiKey>();
  private minuteHitsMap = new Map<string, { count: number; resetAt: number }>();

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(KEYS_STORE_PATH)) {
        const raw = fs.readFileSync(KEYS_STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.keysMap.clear();
          for (const item of parsed) {
            this.keysMap.set(item.id, item);
          }
          return;
        }
      }
    } catch {
      // Fallback in-memory
    }
    this.seedDefaultDeveloperKey();
  }

  private saveToDisk() {
    try {
      const dir = path.dirname(KEYS_STORE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.keysMap.values());
      fs.writeFileSync(KEYS_STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Ignore write errors in restricted sandboxes
    }
  }

  private hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey.trim()).digest('hex');
  }

  private seedDefaultDeveloperKey() {
    // Seed default developer key for testing
    const defaultRaw = 'zyntheor_live_default_dev_key_2026_sovereign';
    const keyHash = this.hashKey(defaultRaw);

    const defaultKey: DeveloperApiKey = {
      id: 'key-dev-default-001',
      workspaceId: 'default',
      name: 'Default Sovereign Developer Key',
      keyPrefix: 'zyntheor_live_defa…',
      keyHash,
      tier: 'enterprise',
      permissions: ['chat:create', 'research:execute', 'memory:read', 'memory:write', 'models:read'],
      rateLimitPerMin: 120,
      monthlyQuotaRequests: 100000,
      requestCountCurrentMonth: 0,
      accessCount: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    this.keysMap.set(defaultKey.id, defaultKey);
    this.saveToDisk();
  }

  /**
   * Create a new developer API Key
   */
  public createApiKey(params: {
    workspaceId: string;
    name: string;
    tier?: KeyTier;
    permissions?: string[];
    rateLimitPerMin?: number;
    expiresInDays?: number;
  }): { keyRecord: DeveloperApiKey; rawSecretKey: string } {
    const workspaceId = params.workspaceId || 'default';
    const tier = params.tier || 'developer';
    const secretSuffix = randomBytes(16).toString('hex');
    const rawSecretKey = `zyntheor_live_${secretSuffix}`;
    const keyPrefix = `${rawSecretKey.slice(0, 18)}…`;
    const keyHash = this.hashKey(rawSecretKey);

    const id = `key-${Date.now().toString(36)}-${randomUUID().slice(0, 4)}`;
    const now = new Date();
    let expiresAt: string | undefined;
    if (params.expiresInDays) {
      const expDate = new Date(now.getTime() + params.expiresInDays * 86400000);
      expiresAt = expDate.toISOString();
    }

    const keyRecord: DeveloperApiKey = {
      id,
      workspaceId,
      name: params.name.trim(),
      keyPrefix,
      keyHash,
      tier,
      permissions: params.permissions || ['chat:create', 'research:execute', 'models:read'],
      rateLimitPerMin: params.rateLimitPerMin || (tier === 'enterprise' ? 120 : tier === 'pro' ? 60 : 30),
      monthlyQuotaRequests: tier === 'enterprise' ? 100000 : tier === 'pro' ? 25000 : 5000,
      requestCountCurrentMonth: 0,
      accessCount: 0,
      status: 'ACTIVE',
      createdAt: now.toISOString(),
      expiresAt,
    };

    this.keysMap.set(id, keyRecord);
    this.saveToDisk();

    return { keyRecord, rawSecretKey };
  }

  /**
   * Validate raw API Key against stored hashes & enforce rate limits
   */
  public validateApiKey(rawKey: string): ApiKeyValidationResult {
    if (!rawKey || typeof rawKey !== 'string') {
      return { valid: false, reason: 'API key string is required' };
    }

    const targetHash = this.hashKey(rawKey);
    let matchedRecord: DeveloperApiKey | undefined;

    for (const record of this.keysMap.values()) {
      if (record.keyHash === targetHash) {
        matchedRecord = record;
        break;
      }
    }

    if (!matchedRecord) {
      return { valid: false, reason: 'Invalid API key credentials' };
    }

    if (matchedRecord.status !== 'ACTIVE') {
      return { valid: false, reason: `API key status is ${matchedRecord.status}` };
    }

    if (matchedRecord.expiresAt && new Date(matchedRecord.expiresAt).getTime() < Date.now()) {
      matchedRecord.status = 'EXPIRED';
      this.saveToDisk();
      return { valid: false, reason: 'API key has expired' };
    }

    // Rate Limit Check
    const now = Date.now();
    const hit = this.minuteHitsMap.get(matchedRecord.id) || { count: 0, resetAt: now + 60000 };
    if (now > hit.resetAt) {
      hit.count = 0;
      hit.resetAt = now + 60000;
    }

    if (hit.count >= matchedRecord.rateLimitPerMin) {
      return { valid: false, reason: `Rate limit exceeded (${matchedRecord.rateLimitPerMin} req/min limit for ${matchedRecord.tier} tier)` };
    }

    hit.count++;
    this.minuteHitsMap.set(matchedRecord.id, hit);

    // Update usage stats
    matchedRecord.accessCount++;
    matchedRecord.requestCountCurrentMonth++;
    matchedRecord.lastUsedAt = new Date().toISOString();
    this.saveToDisk();

    return { valid: true, keyRecord: matchedRecord };
  }

  public listApiKeys(workspaceId: string): DeveloperApiKey[] {
    const results: DeveloperApiKey[] = [];
    for (const record of this.keysMap.values()) {
      if (record.workspaceId === workspaceId || workspaceId === 'default') {
        results.push(record);
      }
    }
    return results;
  }

  public revokeApiKey(workspaceId: string, id: string): boolean {
    const record = this.keysMap.get(id);
    if (!record || (record.workspaceId !== workspaceId && workspaceId !== 'default')) {
      return false;
    }
    record.status = 'REVOKED';
    this.saveToDisk();
    return true;
  }

  /**
   * Generates OpenAPI 3.0.3 Contract Specification JSON
   */
  public getOpenApiSpec(): Record<string, any> {
    return {
      openapi: '3.0.3',
      info: {
        title: 'ZYNTHEOR AI ENGINE — Developer API v1',
        description: 'Sovereign General-Purpose AI Platform Developer API & SDK Interface.',
        version: '1.0.0',
        contact: {
          name: 'ZYNTHEOR Engineering Team',
          url: 'https://zyntheor.ai/docs',
        },
      },
      servers: [
        {
          url: 'https://ais-dev-qb4ucfqtw74rmrruri5vtu-776662123478.asia-east1.run.app/api/v1',
          description: 'Development Server Environment',
        },
        {
          url: '/api/v1',
          description: 'Relative API Base Path',
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'API_KEY',
            description: 'Provide ZYNTHEOR Developer API Key as `Bearer zyntheor_live_...`',
          },
        },
      },
      security: [{ BearerAuth: [] }],
      paths: {
        '/chat/completions': {
          post: {
            summary: 'Chat Completions & Unified Intelligence Inference',
            description: 'Executes general-purpose inference, knowledge search, or structured reasoning.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['messages'],
                    properties: {
                      model: { type: 'string', example: 'zyntheor-core-native-v1' },
                      messages: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            role: { type: 'string', example: 'user' },
                            content: { type: 'string', example: 'Synthesize research on quantum cryptography.' },
                          },
                        },
                      },
                      temperature: { type: 'number', example: 0.7 },
                      stream: { type: 'boolean', example: false },
                    },
                  },
                },
              },
            },
            responses: {
              '200': { description: 'Successful Inference Response' },
              '401': { description: 'Unauthorized — Missing or Invalid API key' },
              '429': { description: 'Rate Limit Exceeded' },
            },
          },
        },
        '/research': {
          post: {
            summary: 'Online Multi-Source Research Execution',
            description: 'Performs multi-source web research with evidence validation and citations.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['query'],
                    properties: {
                      query: { type: 'string', example: 'Post-quantum cryptography standards' },
                      researchDepth: { type: 'string', enum: ['quick', 'standard', 'deep_comparative'] },
                      enableWebSearch: { type: 'boolean', example: true },
                    },
                  },
                },
              },
            },
            responses: {
              '200': { description: 'Research Synthesis & Evidence Ledger Response' },
            },
          },
        },
        '/models': {
          get: {
            summary: 'List Available Models & Sovereignty States',
            responses: {
              '200': { description: 'Model Registry List' },
            },
          },
        },
      },
    };
  }
}

export const developerKeyService = new DeveloperKeyService();
