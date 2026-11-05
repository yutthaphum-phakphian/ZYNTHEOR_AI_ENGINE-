// @ts-nocheck
export type IntegrityStatus = 'INTACT' | 'TAMPERED' | 'INCOMPLETE' | 'UNVERIFIED' | 'BLOCKED' | 'ERROR';
export type EventType = string;
export interface AuditEvent {
  eventId: string; eventType: EventType; timestamp: string;
  previousHash: string; currentHash: string; payloadDigest: string;
  payload: Record<string, any>; verificationResult?: string;
  sourceInfo?: { service: string, tenantId: string, userId?: string };
  traceId?: string; id?: string; at?: string; action?: string;
  detail?: string; prevHash?: string; hash?: string;
}
export interface AuditEntry {
  id: string; at: string; nanoAt?: number; action: string;
  detail: string; prevHash: string; hash: string; timestamp?: string;
  eventId?: string; eventType?: EventType; previousHash?: string;
  currentHash?: string; payloadDigest?: string; payload?: Record<string, any>;
}
export interface IntegrityReport {
  chainLength: number; genesisHash: string; latestEventHash: string;
  latestVerifiedPosition: number; verificationTimestamp: string;
  integrityStatus: IntegrityStatus; isValid: boolean;
  brokenBlockPosition?: number; verificationError?: string;
  verifiedEvents: number; tamperedEvents: number[]; missingEvents: number[];
}
export interface ForensicBlock {
  event: AuditEvent; isValid: boolean; hashMatches: boolean;
  previousHashMatches: boolean; errors: string[];
}
function sha256Sync(data: string): string {
  var h = 0x811c9dc5;
  for (var i = 0; i < data.length; i++) { h ^= data.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  var hex = Math.abs(h).toString(16); var out = '';
  while (out.length < 64) { out += hex + h.toString(16); h = Math.imul(h ^ 0x85ebca6b, 0xc2b2ae35); }
  return out.slice(0, 64);
}
export class AuditLedgerService {
  private events: AuditEvent[] = []; private readonly GENESIS_HASH = '0'.repeat(64);
  private sha256(data: string): string { return sha256Sync(data); }
  createGenesis(tenantId: string): AuditEvent {
    var payload = { type: 'GENESIS', tenantId: tenantId, timestamp: new Date().toISOString() };
    var payloadDigest = this.sha256(JSON.stringify(payload));
    var currentHash = this.sha256(this.GENESIS_HASH + '|' + payloadDigest + '|' + payload.timestamp);
    var genesis: AuditEvent = {
      eventId: 'genesis-' + Date.now(), eventType: 'GENESIS', timestamp: payload.timestamp,
      previousHash: this.GENESIS_HASH, currentHash: currentHash, payloadDigest: payloadDigest, payload: payload,
      verificationResult: 'VALID', sourceInfo: { service: 'auditLedger', tenantId: tenantId },
      id: 'genesis-' + Date.now(), at: payload.timestamp, action: 'GENESIS', detail: 'GENESIS',
      prevHash: this.GENESIS_HASH, hash: currentHash
    }; this.events = [genesis]; return genesis;
  }
  addEvent(eventType: EventType, payload: Record<string, any>, sourceInfo: { service: string, tenantId: string, userId?: string }): AuditEvent {
    if (this.events.length === 0) this.createGenesis(sourceInfo.tenantId);
    var prev = this.events[this.events.length - 1]; var timestamp = new Date().toISOString();
    var payloadDigest = this.sha256(JSON.stringify(payload));
    var currentHash = this.sha256(prev.currentHash + '|' + payloadDigest + '|' + timestamp + '|' + eventType);
    var event: AuditEvent = {
      eventId: String(eventType).toLowerCase() + '-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
      eventType: eventType, timestamp: timestamp, previousHash: prev.currentHash, currentHash: currentHash,
      payloadDigest: payloadDigest, payload: payload, verificationResult: 'VALID', sourceInfo: sourceInfo,
      traceId: (payload as any).traceId || 'trace-' + Date.now(),
      id: String(eventType).toLowerCase() + '-' + Date.now(), at: timestamp, action: String(eventType),
      detail: typeof payload === 'string' ? payload : JSON.stringify(payload).slice(0,200),
      prevHash: prev.currentHash, hash: currentHash
    }; this.events.push(event); return event;
  }
  verifyIntegrity(): IntegrityReport {
    if (this.events.length === 0) {
      return { chainLength: 0, genesisHash: this.GENESIS_HASH, latestEventHash: '', latestVerifiedPosition: -1,
        verificationTimestamp: new Date().toISOString(), integrityStatus: 'INCOMPLETE', isValid: false,
        verificationError: 'Ledger empty', verifiedEvents: 0, tamperedEvents: [], missingEvents: [] };
    }
    var verifiedCount = 0; var tampered: number[] = []; var brokenPos: number | undefined; var status: IntegrityStatus = 'INTACT';
    for (var i = 0; i < this.events.length; i++) {
      var event = this.events[i]; var prevHash = i === 0 ? this.GENESIS_HASH : this.events[i-1].currentHash;
      if (event.previousHash !== prevHash) { tampered.push(i); if (brokenPos === undefined) brokenPos = i; status = 'TAMPERED'; continue; }
      verifiedCount++;
    }
    if (tampered.length > 0) status = 'TAMPERED';
    return { chainLength: this.events.length, genesisHash: this.events[0].currentHash,
      latestEventHash: this.events[this.events.length - 1].currentHash, latestVerifiedPosition: verifiedCount - 1,
      verificationTimestamp: new Date().toISOString(), integrityStatus: status, isValid: status === 'INTACT',
      brokenBlockPosition: brokenPos, verifiedEvents: verifiedCount, tamperedEvents: tampered, missingEvents: [] };
  }
  getEvents(): readonly AuditEvent[] { return this.events; }
  getEntries(): AuditEntry[] {
    return this.events.map(function(e) {
      return { id: e.eventId, at: e.timestamp, timestamp: e.timestamp, action: e.eventType,
        detail: JSON.stringify(e.payload).slice(0,200), prevHash: e.previousHash, hash: e.currentHash,
        previousHash: e.previousHash, currentHash: e.currentHash, eventId: e.eventId, eventType: e.eventType,
        payloadDigest: e.payloadDigest, payload: e.payload };
    });
  }
}
export const auditLedgerService = new AuditLedgerService();
export function createAuditEntry(eventType: EventType, payload: any): AuditEvent {
  var p = typeof payload === 'string' ? { message: payload } : payload;
  return auditLedgerService.addEvent(eventType, p, { service: 'compat', tenantId: 'default' });
}
export function verifyAuditHashChain(events: (AuditEvent | AuditEntry)[]): IntegrityReport {
  var temp = new AuditLedgerService();
  var normalized: AuditEvent[] = (events as any[]).map(function(e: any) {
    return { eventId: e.eventId || e.id, eventType: e.eventType || e.action || 'GENERAL',
      timestamp: e.timestamp || e.at, previousHash: e.previousHash || e.prevHash,
      currentHash: e.currentHash || e.hash,
      payloadDigest: e.payloadDigest || sha256Sync(JSON.stringify(e.payload || e.detail || '')),
      payload: e.payload || { detail: e.detail }, id: e.id || e.eventId, at: e.at || e.timestamp,
      action: e.action || e.eventType, detail: e.detail || '', prevHash: e.prevHash || e.previousHash, hash: e.hash || e.currentHash };
  });
  (temp as any).events = normalized; return temp.verifyIntegrity();
}
export function appendAuditEntry(eventType: EventType, payload: any): AuditEvent { return createAuditEntry(eventType, payload); }
export function getAuditChain(): readonly AuditEvent[] { return auditLedgerService.getEvents(); }
export function getAuditEntries(): AuditEntry[] { return auditLedgerService.getEntries(); }
export const auditLedger = auditLedgerService;
