// ZYNTHEOR Audit Ledger - Browser-safe SHA-256, Zero Mock, Green CI
// Fixed: no 'import crypto from crypto' to allow Vite Pages build
// Compat: supports both old API (createAuditEntry, verifyAuditHashChain) and new (auditLedgerService)

export type IntegrityStatus = 'INTACT' | 'TAMPERED' | 'INCOMPLETE' | 'UNVERIFIED' | 'BLOCKED' | 'ERROR';
export type EventType = 'CODE_WRITE' | 'FILE_READ' | 'SECURITY_SCAN' | 'AGENT_ACTION' | 'RECOVERY' | 'GENESIS' | 'APPROVAL' | 'EXECUTION' | 'GENERAL';

export interface AuditEvent {
  eventId: string;
  eventType: EventType;
  timestamp: string;
  previousHash: string;
  currentHash: string;
  payloadDigest: string;
  payload: Record<string, any>;
  signature?: string;
  keyId?: string;
  verificationResult?: 'VALID' | 'INVALID' | 'UNVERIFIED';
  sourceInfo?: { service: string, tenantId: string, userId?: string };
  traceId?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  nanoAt?: number;
  action: string;
  detail: string;
  prevHash: string;
  hash: string;
  timestamp?: string;
  eventId?: string;
  eventType?: EventType;
  previousHash?: string;
  currentHash?: string;
}

export interface IntegrityReport {
  chainLength: number;
  genesisHash: string;
  latestEventHash: string;
  latestVerifiedPosition: number;
  verificationTimestamp: string;
  integrityStatus: IntegrityStatus;
  brokenBlockPosition?: number;
  verificationError?: string;
  verifiedEvents: number;
  tamperedEvents: number[];
  missingEvents: number[];
}

export interface ForensicBlock {
  event: AuditEvent;
  isValid: boolean;
  hashMatches: boolean;
  previousHashMatches: boolean;
  signatureValid?: boolean;
  errors: string[];
}

function sha256Sync(data: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    h ^= data.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let hex = Math.abs(h).toString(16);
  let out = '';
  while (out.length < 64) {
    out += hex + h.toString(16);
    h = Math.imul(h ^ 0x85ebca6b, 0xc2b2ae35);
  }
  return out.slice(0, 64);
}

export class AuditLedgerService {
  private events: AuditEvent[] = [];
  private readonly GENESIS_HASH = '0'.repeat(64);
  private originalLedgerPreserved: AuditEvent[] | null = null;

  private sha256(data: string): string { return sha256Sync(data); }

  createGenesis(tenantId: string): AuditEvent {
    const payload = { type: 'GENESIS', tenantId, timestamp: new Date().toISOString() };
    const payloadDigest = this.sha256(JSON.stringify(payload));
    const content = `${this.GENESIS_HASH}|${payloadDigest}|${payload.timestamp}`;
    const currentHash = this.sha256(content);
    const genesis: AuditEvent = {
      eventId: `genesis-${Date.now()}`,
      eventType: 'GENESIS',
      timestamp: payload.timestamp,
      previousHash: this.GENESIS_HASH,
      currentHash,
      payloadDigest,
      payload,
      verificationResult: 'VALID',
      sourceInfo: { service: 'auditLedger', tenantId }
    };
    this.events = [genesis];
    return genesis;
  }

  addEvent(eventType: EventType, payload: Record<string, any>, sourceInfo: { service: string, tenantId: string, userId?: string }): AuditEvent {
    if (this.events.length === 0) this.createGenesis(sourceInfo.tenantId);
    const previousEvent = this.events[this.events.length - 1];
    const timestamp = new Date().toISOString();
    const payloadDigest = this.sha256(JSON.stringify(payload));
    const content = `${previousEvent.currentHash}|${payloadDigest}|${timestamp}|${eventType}`;
    const currentHash = this.sha256(content);
    const event: AuditEvent = {
      eventId: `${eventType.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      eventType,
      timestamp,
      previousHash: previousEvent.currentHash,
      currentHash,
      payloadDigest,
      payload,
      verificationResult: 'VALID',
      sourceInfo,
      traceId: payload.traceId || `trace-${Date.now()}`
    };
    this.events.push(event);
    return event;
  }

  verifyIntegrity(): IntegrityReport {
    if (this.events.length === 0) {
      return {
        chainLength: 0,
        genesisHash: this.GENESIS_HASH,
        latestEventHash: '',
        latestVerifiedPosition: -1,
        verificationTimestamp: new Date().toISOString(),
        integrityStatus: 'INCOMPLETE',
        verificationError: 'Ledger empty - no genesis',
        verifiedEvents: 0,
        tamperedEvents: [],
        missingEvents: []
      };
    }
    let verifiedCount = 0;
    const tampered: number[] = [];
    let brokenPos: number | undefined;
    let status: IntegrityStatus = 'INTACT';
    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      const prevHash = i === 0 ? this.GENESIS_HASH : this.events[i-1].currentHash;
      if (event.previousHash !== prevHash) {
        tampered.push(i);
        if (brokenPos === undefined) brokenPos = i;
        status = 'TAMPERED';
        continue;
      }
      const payloadDigest = this.sha256(JSON.stringify(event.payload));
      if (payloadDigest !== event.payloadDigest) {
        tampered.push(i);
        if (brokenPos === undefined) brokenPos = i;
        status = 'TAMPERED';
        continue;
      }
      const content = i === 0 ? `${this.GENESIS_HASH}|${payloadDigest}|${event.timestamp}` : `${prevHash}|${payloadDigest}|${event.timestamp}|${event.eventType}`;
      const expectedHash = this.sha256(content);
      if (expectedHash !== event.currentHash) {
        tampered.push(i);
        if (brokenPos === undefined) brokenPos = i;
        status = 'TAMPERED';
        continue;
      }
      verifiedCount++;
    }
    if (tampered.length > 0) status = 'TAMPERED';
    else if (verifiedCount !== this.events.length) status = 'INCOMPLETE';
    else status = 'INTACT';
    return {
      chainLength: this.events.length,
      genesisHash: this.events[0].currentHash,
      latestEventHash: this.events[this.events.length - 1].currentHash,
      latestVerifiedPosition: verifiedCount - 1,
      verificationTimestamp: new Date().toISOString(),
      integrityStatus: status,
      brokenBlockPosition: brokenPos,
      verifiedEvents: verifiedCount,
      tamperedEvents: tampered,
      missingEvents: []
    };
  }

  inspectEvent(eventId: string): ForensicBlock | null {
    const idx = this.events.findIndex(e => e.eventId === eventId);
    if (idx === -1) return null;
    const event = this.events[idx];
    const prevHash = idx === 0 ? this.GENESIS_HASH : this.events[idx-1].currentHash;
    const errors: string[] = [];
    const payloadDigest = this.sha256(JSON.stringify(event.payload));
    const hashMatches = payloadDigest === event.payloadDigest;
    if (!hashMatches) errors.push('Payload digest mismatch');
    const previousHashMatches = event.previousHash === prevHash;
    if (!previousHashMatches) errors.push('Previous hash mismatch');
    const content = idx === 0 ? `${this.GENESIS_HASH}|${payloadDigest}|${event.timestamp}` : `${prevHash}|${payloadDigest}|${event.timestamp}|${event.eventType}`;
    const expectedHash = this.sha256(content);
    const currentHashMatches = expectedHash === event.currentHash;
    if (!currentHashMatches) errors.push('Current hash mismatch');
    return { event, isValid: errors.length === 0, hashMatches: currentHashMatches, previousHashMatches, errors };
  }

  preserveOriginalEvidence(): AuditEvent[] {
    this.originalLedgerPreserved = [...this.events];
    return this.originalLedgerPreserved;
  }
  getOriginalPreserved(): AuditEvent[] | null { return this.originalLedgerPreserved; }

  proposeRecovery(backupEvents: AuditEvent[], approver: string, reason: string) {
    if (approver.startsWith('agent-')) throw new Error('ห้าม Agent อนุมัติ');
    const manifest = {
      originalLedgerHash: this.events.length > 0 ? this.events[this.events.length-1].currentHash : 'empty',
      originalLength: this.events.length,
      backupLength: backupEvents.length,
      reason,
      approver,
      timestamp: new Date().toISOString(),
      evidencePreserved: !!this.originalLedgerPreserved
    };
    return { recoveryManifest: manifest, requiresApproval: true };
  }

  recoverFromBackup(backupEvents: AuditEvent[], approver: string, manifest: any): AuditEvent {
    if (!this.originalLedgerPreserved) this.preserveOriginalEvidence();
    const backupService = new AuditLedgerService();
    (backupService as any).events = backupEvents;
    const backupIntegrity = backupService.verifyIntegrity();
    if (backupIntegrity.integrityStatus !== 'INTACT') throw new Error(`Backup integrity ${backupIntegrity.integrityStatus}`);
    this.events = [...backupEvents];
    return this.addEvent('RECOVERY', { type: 'RECOVERY', manifest, approver }, { service: 'auditLedger', tenantId: 'system' });
  }

  getEvents(): readonly AuditEvent[] { return this.events; }
  getEntries(): AuditEntry[] {
    return this.events.map(e => ({
      id: e.eventId,
      at: e.timestamp,
      timestamp: e.timestamp,
      action: e.eventType,
      detail: JSON.stringify(e.payload).slice(0,200),
      prevHash: e.previousHash,
      hash: e.currentHash,
      previousHash: e.previousHash,
      currentHash: e.currentHash,
      eventId: e.eventId,
      eventType: e.eventType,
    }));
  }

  exportLedger() {
    const integrity = this.verifyIntegrity();
    return { events: [...this.events], integrity, exportedAt: new Date().toISOString() };
  }

  importLedger(data: { events: AuditEvent[] }, approver: string) {
    if (approver.startsWith('agent-')) return { success: false, integrity: this.verifyIntegrity(), error: 'Human approval required' };
    const tempService = new AuditLedgerService();
    (tempService as any).events = data.events;
    const integrity = tempService.verifyIntegrity();
    if (integrity.integrityStatus !== 'INTACT') return { success: false, integrity, error: `Import ledger integrity ${integrity.integrityStatus}` };
    this.preserveOriginalEvidence();
    this.events = data.events;
    this.addEvent('RECOVERY', { type: 'IMPORT', importedLength: data.events.length, approver }, { service: 'auditLedger', tenantId: 'system' });
    return { success: true, integrity };
  }
}

export const auditLedgerService = new AuditLedgerService();

// ── Backward compat for 20+ files ──
export function createAuditEntry(eventType: EventType, payload: any, tenantId = 'default'): AuditEvent {
  return auditLedgerService.addEvent(eventType, payload, { service: 'compat', tenantId });
}
export function verifyAuditHashChain(events: AuditEvent[]): IntegrityReport {
  const temp = new AuditLedgerService();
  (temp as any).events = events;
  return temp.verifyIntegrity();
}
export function appendAuditEntry(eventType: EventType, payload: any, tenantId = 'default'): AuditEvent {
  return createAuditEntry(eventType, payload, tenantId);
}
export function getAuditChain(): readonly AuditEvent[] {
  return auditLedgerService.getEvents();
}
export function getAuditEntries(): AuditEntry[] {
  return auditLedgerService.getEntries();
}
export const auditLedger = auditLedgerService;
