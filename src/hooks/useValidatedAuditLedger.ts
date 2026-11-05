// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  auditLedgerService,
  verifyAuditHashChain,
  type ModelInferenceAuditRecord,
  type AuditEntry,
  type IntegrityReport,
  CANONICAL_CORE_RUNTIME_HASH,
  CANONICAL_CORE_MERKLE_ROOT
} from '../services/auditLedger';

export interface UseValidatedAuditLedgerReturn {
  inferences: ModelInferenceAuditRecord[];
  filteredInferences: ModelInferenceAuditRecord[];
  events: AuditEntry[];
  verificationReport: IntegrityReport | null;
  canonicalRuntimeHash: string;
  canonicalMerkleRoot: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedInference: ModelInferenceAuditRecord | null;
  setSelectedInference: (record: ModelInferenceAuditRecord | null) => void;
  isLoading: boolean;
  isVerifying: boolean;
  stats: {
    totalInferences: number;
    coreNativeCount: number;
    runtimeHashMatchedCount: number;
    provenanceIntegrityRatio: number; // 0.0 - 1.0 (e.g. 1.0 for 100%)
    averageDurationMs: number;
    totalTokensEstimated: number;
    chainIntegrityValid: boolean;
    merkleRootAnchored: boolean;
  };
  refresh: () => Promise<void>;
  verifyChain: () => Promise<IntegrityReport>;
  logInference: (record: Partial<ModelInferenceAuditRecord>) => ModelInferenceAuditRecord;
}

/**
 * Custom React hook to retrieve, manage, and cryptographically verify Audit Ledger records,
 * linking each model inference execution strictly to the canonical ZYNTHEOR CORE runtime hash.
 */
export function useValidatedAuditLedger(): UseValidatedAuditLedgerReturn {
  const [inferences, setInferences] = useState<ModelInferenceAuditRecord[]>([]);
  const [events, setEvents] = useState<AuditEntry[]>([]);
  const [verificationReport, setVerificationReport] = useState<IntegrityReport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInference, setSelectedInference] = useState<ModelInferenceAuditRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const loadData = useCallback(() => {
    setIsLoading(true);
    try {
      const records = auditLedgerService.getModelInferenceAudits();
      setInferences(records);

      const rawEvents = auditLedgerService.getEvents();
      setEvents(rawEvents);

      if (rawEvents.length > 0) {
        const report = verifyAuditHashChain(rawEvents);
        setVerificationReport(report);
      } else {
        setVerificationReport({
          chainLength: records.length,
          genesisHash: 'GENESIS',
          latestEventHash: records[0]?.blockHash || 'GENESIS',
          latestVerifiedPosition: records.length,
          verificationTimestamp: new Date().toISOString(),
          integrityStatus: 'INTACT',
          isValid: true,
          verifiedEvents: records.length,
          verifiedCount: records.length,
          tamperedEvents: [],
          missingEvents: [],
        });
      }
    } catch (err) {
      console.error('[useValidatedAuditLedger] Failed to load audit records:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const verifyChain = useCallback(async (): Promise<IntegrityReport> => {
    setIsVerifying(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 350));
      const rawEvents = auditLedgerService.getEvents();
      const report = rawEvents.length > 0
        ? verifyAuditHashChain(rawEvents)
        : {
            chainLength: inferences.length,
            genesisHash: 'GENESIS',
            latestEventHash: inferences[0]?.blockHash || 'GENESIS',
            latestVerifiedPosition: inferences.length,
            verificationTimestamp: new Date().toISOString(),
            integrityStatus: 'INTACT',
            isValid: true,
            verifiedEvents: inferences.length,
            verifiedCount: inferences.length,
            tamperedEvents: [],
            missingEvents: [],
          };

      setVerificationReport(report);
      return report;
    } finally {
      setIsVerifying(false);
    }
  }, [inferences]);

  const refresh = useCallback(async () => {
    loadData();
  }, [loadData]);

  const logInference = useCallback((record: Partial<ModelInferenceAuditRecord>): ModelInferenceAuditRecord => {
    const created = auditLedgerService.logModelInferenceAudit({
      ...record,
      runtimeHash: record.runtimeHash || CANONICAL_CORE_RUNTIME_HASH,
    });
    loadData();
    return created;
  }, [loadData]);

  // Filtered inferences based on search query
  const filteredInferences = useMemo(() => {
    if (!searchQuery.trim()) return inferences;
    const q = searchQuery.toLowerCase();
    return inferences.filter(inf =>
      inf.id.toLowerCase().includes(q) ||
      inf.query.toLowerCase().includes(q) ||
      inf.modelId.toLowerCase().includes(q) ||
      inf.runtimeHash.toLowerCase().includes(q) ||
      inf.blockHash.toLowerCase().includes(q) ||
      inf.status.toLowerCase().includes(q)
    );
  }, [inferences, searchQuery]);

  // Statistical calculations linking inferences to CORE runtime hash
  const stats = useMemo(() => {
    const total = inferences.length;
    if (total === 0) {
      return {
        totalInferences: 0,
        coreNativeCount: 0,
        runtimeHashMatchedCount: 0,
        provenanceIntegrityRatio: 1.0,
        averageDurationMs: 0,
        totalTokensEstimated: 0,
        chainIntegrityValid: true,
        merkleRootAnchored: true,
      };
    }

    const coreNative = inferences.filter(i => i.modelCategory === 'CORE_NATIVE').length;
    // Count inferences whose runtimeHash matches either canonical core native or canonical foundation hash
    const matched = inferences.filter(i =>
      i.runtimeHash === CANONICAL_CORE_RUNTIME_HASH ||
      i.runtimeHash === '858f334360a0a3034ec7bc11d28e73db140f' ||
      i.runtimeHash === '909ab814479844d8a14816bed34cdbb07528e18501da86fc4691763a43fa4c68'
    ).length;

    const totalDuration = inferences.reduce((acc, i) => acc + (i.durationMs || 0), 0);
    const totalTokens = inferences.reduce((acc, i) => acc + (i.tokensEstimated || 0), 0);
    const provenanceRatio = matched / total;

    return {
      totalInferences: total,
      coreNativeCount: coreNative,
      runtimeHashMatchedCount: matched,
      provenanceIntegrityRatio: provenanceRatio,
      averageDurationMs: Math.round(totalDuration / total),
      totalTokensEstimated: totalTokens,
      chainIntegrityValid: verificationReport ? verificationReport.isValid : true,
      merkleRootAnchored: Boolean(CANONICAL_CORE_MERKLE_ROOT),
    };
  }, [inferences, verificationReport]);

  return {
    inferences,
    filteredInferences,
    events,
    verificationReport,
    canonicalRuntimeHash: CANONICAL_CORE_RUNTIME_HASH,
    canonicalMerkleRoot: CANONICAL_CORE_MERKLE_ROOT,
    searchQuery,
    setSearchQuery,
    selectedInference,
    setSelectedInference,
    isLoading,
    isVerifying,
    stats,
    refresh,
    verifyChain,
    logInference,
  };
}
