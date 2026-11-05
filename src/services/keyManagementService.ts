// @ts-nocheck
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface PublicKeyMetadata {
  keyId: string;
  algorithm: 'Ed25519';
  createdAt: string;
  status: 'ACTIVE' | 'ROTATED' | 'REVOKED';
  publicKeyPem: string;
}

interface KeyPairRecord {
  keyId: string;
  algorithm: 'Ed25519';
  createdAt: string;
  status: 'ACTIVE' | 'ROTATED' | 'REVOKED';
  privateKeyPem: string;
  publicKeyPem: string;
}

class KeyManagementService {
  private keyRegistry = new Map<string, KeyPairRecord>();
  private activeKeyId = 'key-2026-v1';
  private storagePath: string;
  private secretKey: Buffer;

  constructor() {
    const root = process.cwd();
    const dataDir = path.join(root, 'workspace_data', 'keys');
    this.storagePath = path.join(dataDir, 'key_store.enc.json');

    // Derive or generate encryption key for persistent server key storage
    const rawSecret = process.env.TENANT_STORAGE_HMAC_SECRET || 'zyntheor-sovereign-master-key-2026';
    this.secretKey = crypto.createHash('sha256').update(rawSecret).digest();

    this.initOrLoadKeys(dataDir);
  }

  private encryptPayload(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.secretKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  private decryptPayload(encryptedText: string): string {
    const [ivHex, authTagHex, encryptedData] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.secretKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private saveKeysToDisk() {
    try {
      const recordsArray = Array.from(this.keyRegistry.values());
      const payload = JSON.stringify({ activeKeyId: this.activeKeyId, keys: recordsArray });
      const encrypted = this.encryptPayload(payload);
      fs.mkdirSync(path.dirname(this.storagePath), { recursive: true });
      fs.writeFileSync(this.storagePath, encrypted, { encoding: 'utf8', mode: 0o600 });
    } catch {
      // Best effort disk persistence; falls back gracefully if disk read-only
    }
  }

  private initOrLoadKeys(dataDir: string) {
    try {
      if (fs.existsSync(this.storagePath)) {
        const encrypted = fs.readFileSync(this.storagePath, 'utf8');
        const decrypted = this.decryptPayload(encrypted);
        const parsed = JSON.parse(decrypted);

        if (Array.isArray(parsed.keys) && parsed.keys.length > 0) {
          this.keyRegistry.clear();
          for (const rec of parsed.keys) {
            this.keyRegistry.set(rec.keyId, rec);
          }
          this.activeKeyId = parsed.activeKeyId || parsed.keys[0].keyId;
          return;
        }
      }
    } catch {
      // In case of corrupt file or key mismatch, re-generate clean key pair
    }

    // Generate initial Ed25519 key pair
    const initialKeyId = 'key-2026-v1';
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });

    const record: KeyPairRecord = {
      keyId: initialKeyId,
      algorithm: 'Ed25519',
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
      privateKeyPem: privateKey,
      publicKeyPem: publicKey,
    };

    this.keyRegistry.set(initialKeyId, record);
    this.activeKeyId = initialKeyId;
    this.saveKeysToDisk();
  }

  /**
   * Returns metadata for all public keys (active and historical) for transparency and verification.
   * Private key material is strictly excluded.
   */
  public getPublicKeysMetadata(): PublicKeyMetadata[] {
    return Array.from(this.keyRegistry.values()).map(record => ({
      keyId: record.keyId,
      algorithm: record.algorithm,
      createdAt: record.createdAt,
      status: record.status,
      publicKeyPem: record.publicKeyPem,
    }));
  }

  public getActiveKeyId(): string {
    return this.activeKeyId;
  }

  public getPublicKey(keyId: string): string | undefined {
    return this.keyRegistry.get(keyId)?.publicKeyPem;
  }

  /**
   * Cryptographically signs data using the specified keyId (or active keyId).
   */
  public signData(payload: string, keyId?: string): { signature: string; keyId: string; algorithm: 'Ed25519' } {
    const targetKeyId = keyId || this.activeKeyId;
    const keyRecord = this.keyRegistry.get(targetKeyId);

    if (!keyRecord) {
      throw new Error(`KEY_NOT_FOUND: Signing key '${targetKeyId}' not found in registry`);
    }

    if (keyRecord.status === 'REVOKED') {
      throw new Error(`KEY_REVOKED: Key '${targetKeyId}' has been revoked and cannot sign data`);
    }

    const privateKey = crypto.createPrivateKey(keyRecord.privateKeyPem);
    const signatureBuffer = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey);
    const signatureHex = signatureBuffer.toString('hex');

    return {
      signature: signatureHex,
      keyId: targetKeyId,
      algorithm: 'Ed25519',
    };
  }

  /**
   * Verifies an Ed25519 digital signature against historical or active public key.
   */
  public verifySignature(payload: string, signatureHex: string, keyId: string): boolean {
    const keyRecord = this.keyRegistry.get(keyId);
    if (!keyRecord) return false;

    try {
      const publicKey = crypto.createPublicKey(keyRecord.publicKeyPem);
      const signatureBuffer = Buffer.from(signatureHex, 'hex');
      return crypto.verify(null, Buffer.from(payload, 'utf8'), publicKey, signatureBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Rotates the active signing key, marking the previous active key as ROTATED.
   * Historical public keys remain in memory & disk to support verifying older signatures.
   */
  public rotateSigningKey(): PublicKeyMetadata {
    const currentActive = this.keyRegistry.get(this.activeKeyId);
    if (currentActive) {
      currentActive.status = 'ROTATED';
    }

    const newKeyIndex = this.keyRegistry.size + 1;
    const newKeyId = `key-2026-v${newKeyIndex}`;

    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });

    const newRecord: KeyPairRecord = {
      keyId: newKeyId,
      algorithm: 'Ed25519',
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
      privateKeyPem: privateKey,
      publicKeyPem: publicKey,
    };

    this.keyRegistry.set(newKeyId, newRecord);
    this.activeKeyId = newKeyId;
    this.saveKeysToDisk();

    return {
      keyId: newRecord.keyId,
      algorithm: newRecord.algorithm,
      createdAt: newRecord.createdAt,
      status: newRecord.status,
      publicKeyPem: newRecord.publicKeyPem,
    };
  }
}

export const keyManagementService = new KeyManagementService();
export default keyManagementService;
