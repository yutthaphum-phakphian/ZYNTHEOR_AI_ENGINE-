// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  HardDrive, AlertTriangle, CheckCircle2, RefreshCw, Trash2, Download,
  RotateCcw, Copy, Check, FileJson, ShieldAlert, Eye, Search, Filter, Info
} from 'lucide-react';

export type KeyValidationStatus = 'VALID' | 'MALFORMED_JSON' | 'INVALID_SCHEMA' | 'MISSING_PAYLOAD' | 'UNRECOGNIZED_KEY';

export interface StorageKeyAuditResult {
  key: string;
  rawValue: string;
  byteSize: number;
  status: KeyValidationStatus;
  isKnownKey: boolean;
  expectedType: 'array' | 'object' | 'string' | 'boolean' | 'enum';
  validationMessage: string;
  itemCount?: number;
  parsedPreview?: unknown;
}

export interface KnownKeySchema {
  key: string;
  description: string;
  expectedType: 'array' | 'object' | 'string' | 'boolean' | 'enum';
  defaultValue: unknown;
  validate?: (parsed: unknown) => { valid: boolean; reason?: string; count?: number };
}

const KNOWN_SCHEMAS: Record<string, KnownKeySchema> = {
  'zyntheor.rebuild.chat.v1': {
    key: 'zyntheor.rebuild.chat.v1',
    description: 'Active chat message history payload (STORAGE.messages)',
    expectedType: 'array',
    defaultValue: [],
    validate: (parsed) => {
      if (!Array.isArray(parsed)) return { valid: false, reason: 'Expected JSON array of chat messages' };
      const validItems = parsed.every(m => typeof m === 'object' && m !== null && typeof m.id === 'string' && typeof m.role === 'string');
      if (!validItems && parsed.length > 0) return { valid: false, reason: 'Items in array do not match ChatMessage schema (missing id or role)' };
      return { valid: true, count: parsed.length };
    }
  },
  'zyntheor.rebuild.chat_sessions.v2': {
    key: 'zyntheor.rebuild.chat_sessions.v2',
    description: 'Persisted chat sessions list (STORAGE.sessions)',
    expectedType: 'array',
    defaultValue: [],
    validate: (parsed) => {
      if (!Array.isArray(parsed)) return { valid: false, reason: 'Expected JSON array of chat sessions' };
      const validItems = parsed.every(s => typeof s === 'object' && s !== null && typeof s.id === 'string' && Array.isArray(s.messages));
      if (!validItems && parsed.length > 0) return { valid: false, reason: 'Items do not match ChatSession schema (missing id or messages array)' };
      return { valid: true, count: parsed.length };
    }
  },
  'zyntheor.rebuild.projects.v1': {
    key: 'zyntheor.rebuild.projects.v1',
    description: 'Workspace projects repository state (STORAGE.projects)',
    expectedType: 'array',
    defaultValue: [],
    validate: (parsed) => {
      if (!Array.isArray(parsed)) return { valid: false, reason: 'Expected JSON array of workspace projects' };
      const validItems = parsed.every(p => typeof p === 'object' && p !== null && typeof p.id === 'string' && typeof p.name === 'string');
      if (!validItems && parsed.length > 0) return { valid: false, reason: 'Items do not match Project schema (missing id or name)' };
      return { valid: true, count: parsed.length };
    }
  },
  'zyntheor.rebuild.plans.v1': {
    key: 'zyntheor.rebuild.plans.v1',
    description: 'Workspace planning tasks and execution steps (STORAGE.plans)',
    expectedType: 'array',
    defaultValue: [],
    validate: (parsed) => {
      if (!Array.isArray(parsed)) return { valid: false, reason: 'Expected JSON array of plan items' };
      return { valid: true, count: parsed.length };
    }
  },
  'zyntheor.rebuild.audit.v1': {
    key: 'zyntheor.rebuild.audit.v1',
    description: 'Cryptographic hash-chained audit ledger events (STORAGE.audit)',
    expectedType: 'array',
    defaultValue: [],
    validate: (parsed) => {
      if (!Array.isArray(parsed)) return { valid: false, reason: 'Expected JSON array of audit entries' };
      const validItems = parsed.every(a => typeof a === 'object' && a !== null && typeof a.id === 'string' && typeof a.hash === 'string');
      if (!validItems && parsed.length > 0) return { valid: false, reason: 'Items do not match AuditEntry schema (missing id or hash fingerprint)' };
      return { valid: true, count: parsed.length };
    }
  },
  'zyntheor.app_settings.v1': {
    key: 'zyntheor.app_settings.v1',
    description: 'Global application settings and AI model routing configuration',
    expectedType: 'object',
    defaultValue: { provider: 'Ollama', model: 'qwen2.5-coder:7b', localEndpoint: true, localOnly: true },
    validate: (parsed) => {
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return { valid: false, reason: 'Expected JSON object for app settings' };
      }
      return { valid: true };
    }
  },
  'zyntheor.default-chat-mode': {
    key: 'zyntheor.default-chat-mode',
    description: 'Default chat mode preference (auto, chat, reasoning, coding, research, agent)',
    expectedType: 'enum',
    defaultValue: 'auto',
    validate: (parsed) => {
      const allowed = ['auto', 'chat', 'reasoning', 'coding', 'research', 'agent'];
      if (!allowed.includes(String(parsed))) {
        return { valid: false, reason: `Value "${parsed}" is not a valid chat mode enum (${allowed.join(', ')})` };
      }
      return { valid: true };
    }
  },
  'zyntheor.workspaces.v1': {
    key: 'zyntheor.workspaces.v1',
    description: 'Multi-workspace profiles state',
    expectedType: 'array',
    defaultValue: [],
    validate: (parsed) => {
      if (!Array.isArray(parsed)) return { valid: false, reason: 'Expected JSON array of workspace objects' };
      return { valid: true, count: parsed.length };
    }
  },
  'zyntheor.active_workspace.v1': {
    key: 'zyntheor.active_workspace.v1',
    description: 'Currently active workspace identifier',
    expectedType: 'string',
    defaultValue: 'default',
    validate: (parsed) => {
      if (typeof parsed !== 'string') return { valid: false, reason: 'Expected string workspace ID' };
      return { valid: true };
    }
  },
  'zyntheor.draft_project_name.v1': {
    key: 'zyntheor.draft_project_name.v1',
    description: 'Draft project name buffer',
    expectedType: 'string',
    defaultValue: '',
    validate: (parsed) => ({ valid: typeof parsed === 'string' })
  },
  'zyntheor.draft_project_desc.v1': {
    key: 'zyntheor.draft_project_desc.v1',
    description: 'Draft project description buffer',
    expectedType: 'string',
    defaultValue: '',
    validate: (parsed) => ({ valid: typeof parsed === 'string' })
  },
  'zyntheor.hardware_simulation_mode': {
    key: 'zyntheor.hardware_simulation_mode',
    description: 'Hardware readiness simulation toggle flag',
    expectedType: 'enum',
    defaultValue: 'false',
    validate: (parsed) => {
      if (parsed !== 'true' && parsed !== 'false' && parsed !== true && parsed !== false) {
        return { valid: false, reason: 'Expected boolean string ("true" or "false")' };
      }
      return { valid: true };
    }
  },
  'zyntheor.i18n.lang.v1': {
    key: 'zyntheor.i18n.lang.v1',
    description: 'User UI language preference (th / en)',
    expectedType: 'enum',
    defaultValue: 'th',
    validate: (parsed) => {
      if (parsed !== 'th' && parsed !== 'en') return { valid: false, reason: 'Expected "th" or "en"' };
      return { valid: true };
    }
  },
  'zyntheor.access.v1': {
    key: 'zyntheor.access.v1',
    description: 'Session bearer token override key',
    expectedType: 'string',
    defaultValue: '',
    validate: (parsed) => ({ valid: typeof parsed === 'string' })
  }
};

export function LocalStorageAuditTool() {
  const [auditResults, setAuditResults] = useState<StorageKeyAuditResult[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const runStorageAudit = useCallback(() => {
    setIsAuditing(true);
    const results: StorageKeyAuditResult[] = [];

    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
      }

      // Ensure all known schema keys are checked even if not currently in localStorage
      Object.keys(KNOWN_SCHEMAS).forEach(k => {
        if (!keys.includes(k)) keys.push(k);
      });

      keys.sort().forEach(key => {
        const rawValue = localStorage.getItem(key);
        const existsInStorage = rawValue !== null;
        const valueToTest = rawValue ?? '';
        const byteSize = new Blob([valueToTest]).size;

        const schema = KNOWN_SCHEMAS[key];
        const isKnownKey = Boolean(schema);

        if (!existsInStorage && isKnownKey) {
          // Key not yet created in browser storage
          results.push({
            key,
            rawValue: '(Unset)',
            byteSize: 0,
            status: 'MISSING_PAYLOAD',
            isKnownKey: true,
            expectedType: schema.expectedType,
            validationMessage: `Payload missing in localStorage. Application uses default fallback: ${JSON.stringify(schema.defaultValue)}`,
            parsedPreview: schema.defaultValue
          });
          return;
        }

        let status: KeyValidationStatus = 'VALID';
        let validationMessage = 'Valid payload structure';
        let parsedValue: unknown = undefined;
        let itemCount: number | undefined = undefined;

        // Try JSON parsing first if rawValue exists
        let isJson = false;
        try {
          if (valueToTest.trim() !== '') {
            parsedValue = JSON.parse(valueToTest);
            isJson = true;
          } else {
            parsedValue = '';
          }
        } catch (jsonErr: any) {
          if (schema && (schema.expectedType === 'array' || schema.expectedType === 'object')) {
            status = 'MALFORMED_JSON';
            validationMessage = `SyntaxError: ${jsonErr.message || 'Malformed JSON string'}`;
          } else {
            // For raw strings, failure to parse JSON is okay
            parsedValue = valueToTest;
          }
        }

        if (status === 'VALID') {
          if (isKnownKey) {
            const val = schema.validate ? schema.validate(isJson ? parsedValue : valueToTest) : { valid: true };
            if (!val.valid) {
              status = 'INVALID_SCHEMA';
              validationMessage = val.reason || 'Failed schema structural validation rule';
            } else {
              validationMessage = schema.description;
              itemCount = val.count;
            }
          } else {
            status = 'UNRECOGNIZED_KEY';
            validationMessage = key.startsWith('zyntheor.')
              ? 'Unmapped Zyntheor storage key'
              : 'External or unmapped browser storage key';
          }
        }

        results.push({
          key,
          rawValue: valueToTest,
          byteSize,
          status,
          isKnownKey,
          expectedType: schema ? schema.expectedType : (isJson ? (Array.isArray(parsedValue) ? 'array' : 'object') : 'string'),
          validationMessage,
          itemCount,
          parsedPreview: parsedValue
        });
      });
    } catch (err: any) {
      console.error('Storage audit failure:', err);
    } finally {
      setAuditResults(results);
      setIsAuditing(false);
    }
  }, []);

  useEffect(() => {
    runStorageAudit();
  }, [runStorageAudit]);

  const summary = useMemo(() => {
    const totalKeys = auditResults.length;
    const totalBytes = auditResults.reduce((acc, curr) => acc + curr.byteSize, 0);
    const validCount = auditResults.filter(r => r.status === 'VALID').length;
    const malformedCount = auditResults.filter(r => r.status === 'MALFORMED_JSON').length;
    const invalidSchemaCount = auditResults.filter(r => r.status === 'INVALID_SCHEMA').length;
    const missingCount = auditResults.filter(r => r.status === 'MISSING_PAYLOAD').length;
    const unrecognizedCount = auditResults.filter(r => r.status === 'UNRECOGNIZED_KEY').length;
    const corruptedTotal = malformedCount + invalidSchemaCount;

    return { totalKeys, totalBytes, validCount, malformedCount, invalidSchemaCount, missingCount, unrecognizedCount, corruptedTotal };
  }, [auditResults]);

  const filteredResults = useMemo(() => {
    return auditResults.filter(item => {
      const matchesSearch = item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.validationMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.rawValue.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'CORRUPTED') return item.status === 'MALFORMED_JSON' || item.status === 'INVALID_SCHEMA';
      return item.status === statusFilter;
    });
  }, [auditResults, searchQuery, statusFilter]);

  const handlePurgeKey = (key: string) => {
    if (!confirm(`Purge localStorage key "${key}"?`)) return;
    try {
      localStorage.removeItem(key);
      showToast(`Key "${key}" removed from localStorage.`);
      runStorageAudit();
    } catch (err) {
      showToast(`Failed to purge key "${key}".`);
    }
  };

  const handleResetToDefault = (key: string) => {
    const schema = KNOWN_SCHEMAS[key];
    if (!schema) return;
    try {
      if (typeof schema.defaultValue === 'string') {
        localStorage.setItem(key, schema.defaultValue);
      } else {
        localStorage.setItem(key, JSON.stringify(schema.defaultValue));
      }
      showToast(`Key "${key}" reset to default schema value.`);
      runStorageAudit();
    } catch (err) {
      showToast(`Failed to reset key "${key}".`);
    }
  };

  const handlePurgeCorruptedAll = () => {
    const corrupted = auditResults.filter(r => r.status === 'MALFORMED_JSON' || r.status === 'INVALID_SCHEMA');
    if (corrupted.length === 0) {
      showToast('No corrupted or malformed keys detected.');
      return;
    }
    if (!confirm(`Purge and repair ${corrupted.length} corrupted storage key(s)?`)) return;

    corrupted.forEach(item => {
      const schema = KNOWN_SCHEMAS[item.key];
      if (schema) {
        if (typeof schema.defaultValue === 'string') {
          localStorage.setItem(item.key, schema.defaultValue);
        } else {
          localStorage.setItem(item.key, JSON.stringify(schema.defaultValue));
        }
      } else {
        localStorage.removeItem(item.key);
      }
    });

    showToast(`Repaired ${corrupted.length} corrupted keys.`);
    runStorageAudit();
  };

  const handleCopyRaw = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadBackup = () => {
    try {
      const exportObj: Record<string, string | null> = {};
      auditResults.forEach(r => {
        exportObj[r.key] = localStorage.getItem(r.key);
      });
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `zyntheor-localstorage-backup-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Exported localStorage backup successfully.');
    } catch {
      showToast('Failed to export storage backup.');
    }
  };

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#f1f5f9' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#1e293b',
            border: '1px solid #38bdf8',
            color: '#38bdf8',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Info size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(99, 102, 241, 0.08))',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(140deg, #0284c7, #2563eb)',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.3)'
            }}
          >
            <HardDrive size={22} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
              LocalStorage Schema & Integrity Audit
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Scans all browser <code>localStorage</code> keys, checks JSON validity against expected schemas, and repairs malformed payloads.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={runStorageAudit}
            disabled={isAuditing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              cursor: isAuditing ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={14} className={isAuditing ? 'animate-spin' : ''} />
            <span>{isAuditing ? 'Auditing...' : 'Re-run Audit'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadBackup}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            <span>Export Backup</span>
          </button>

          {summary.corruptedTotal > 0 && (
            <button
              type="button"
              onClick={handlePurgeCorruptedAll}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                background: 'linear-gradient(120deg, #ef4444, #dc2626)',
                border: 0,
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)'
              }}
            >
              <RotateCcw size={14} />
              <span>Repair {summary.corruptedTotal} Corrupted Key(s)</span>
            </button>
          )}
        </div>
      </div>

      {/* Audit Overview Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <div style={{ background: '#0d1522', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Total Keys Scanned</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>{summary.totalKeys}</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Size: {formatBytes(summary.totalBytes)}</div>
        </div>

        <div style={{ background: '#0d1522', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Valid & Verified</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#4ade80', marginTop: '2px' }}>{summary.validCount}</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Schema compliant</div>
        </div>

        <div style={{ background: '#0d1522', border: summary.malformedCount > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #1e293b', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Malformed JSON</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: summary.malformedCount > 0 ? '#f87171' : '#94a3b8', marginTop: '2px' }}>{summary.malformedCount}</div>
          <div style={{ fontSize: '10px', color: summary.malformedCount > 0 ? '#fca5a5' : '#64748b', marginTop: '2px' }}>Syntax error in payload</div>
        </div>

        <div style={{ background: '#0d1522', border: summary.invalidSchemaCount > 0 ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid #1e293b', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Invalid Schema</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: summary.invalidSchemaCount > 0 ? '#fde047' : '#94a3b8', marginTop: '2px' }}>{summary.invalidSchemaCount}</div>
          <div style={{ fontSize: '10px', color: summary.invalidSchemaCount > 0 ? '#fef08a' : '#64748b', marginTop: '2px' }}>Type/structure mismatch</div>
        </div>

        <div style={{ background: '#0d1522', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Unmapped Keys</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>{summary.unrecognizedCount}</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>External/legacy entries</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          padding: '12px 16px',
          borderRadius: '10px',
          background: '#0d1522',
          border: '1px solid #1e293b'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 240px' }}>
          <Search size={15} style={{ color: '#64748b' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter keys, payload or error messages..."
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f8fafc',
              fontSize: '11px',
              width: '100%',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#94a3b8' }}>
          <Filter size={14} />
          <span>Status Filter:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              background: '#090d16',
              border: '1px solid #1e293b',
              color: '#f8fafc',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Keys ({auditResults.length})</option>
            <option value="CORRUPTED">Corrupted / Malformed Only ({summary.corruptedTotal})</option>
            <option value="VALID">Valid Only ({summary.validCount})</option>
            <option value="MISSING_PAYLOAD">Missing Payloads ({summary.missingCount})</option>
            <option value="MALFORMED_JSON">Malformed JSON ({summary.malformedCount})</option>
            <option value="INVALID_SCHEMA">Invalid Schema ({summary.invalidSchemaCount})</option>
            <option value="UNRECOGNIZED_KEY">Unmapped Keys ({summary.unrecognizedCount})</option>
          </select>
        </div>
      </div>

      {/* Audit Key List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', background: '#0d1522', borderRadius: '10px', border: '1px solid #1e293b' }}>
            <CheckCircle2 size={24} style={{ color: '#4ade80', margin: '0 auto 8px' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>No Storage Keys Found</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              No keys match the specified search query or status filter.
            </div>
          </div>
        ) : (
          filteredResults.map(item => {
            const isExpanded = expandedKey === item.key;
            const schema = KNOWN_SCHEMAS[item.key];

            const badgeStyle = item.status === 'VALID'
              ? { bg: 'rgba(16, 185, 129, 0.15)', text: '#4ade80', border: 'rgba(16, 185, 129, 0.3)' }
              : item.status === 'MALFORMED_JSON'
              ? { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' }
              : item.status === 'INVALID_SCHEMA'
              ? { bg: 'rgba(234, 179, 8, 0.15)', text: '#fde047', border: 'rgba(234, 179, 8, 0.3)' }
              : item.status === 'MISSING_PAYLOAD'
              ? { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.3)' }
              : { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };

            return (
              <div
                key={item.key}
                style={{
                  background: '#0d1522',
                  border: `1px solid ${item.status === 'MALFORMED_JSON' ? 'rgba(239, 68, 68, 0.4)' : item.status === 'INVALID_SCHEMA' ? 'rgba(234, 179, 8, 0.4)' : '#1e293b'}`,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {/* Key Row Top Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: badgeStyle.bg,
                        color: badgeStyle.text,
                        border: `1px solid ${badgeStyle.border}`
                      }}
                    >
                      {item.status}
                    </span>

                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
                      {item.key}
                    </span>

                    <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#090d16', color: '#94a3b8', border: '1px solid #1e293b' }}>
                      {item.expectedType}
                    </span>

                    {item.itemCount !== undefined && (
                      <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                        {item.itemCount} item(s)
                      </span>
                    )}

                    <span style={{ fontSize: '10px', color: '#64748b' }}>
                      {formatBytes(item.byteSize)}
                    </span>
                  </div>

                  {/* Actions for single key */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyRaw(item.key, item.rawValue)}
                      title="Copy raw storage value"
                      style={{
                        padding: '4px 8px',
                        borderRadius: '5px',
                        background: '#090d16',
                        border: '1px solid #1e293b',
                        color: copiedKey === item.key ? '#4ade80' : '#94a3b8',
                        fontSize: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {copiedKey === item.key ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedKey === item.key ? 'Copied' : 'Copy'}</span>
                    </button>

                    {schema && (
                      <button
                        type="button"
                        onClick={() => handleResetToDefault(item.key)}
                        title="Reset key to default schema initial payload"
                        style={{
                          padding: '4px 8px',
                          borderRadius: '5px',
                          background: '#090d16',
                          border: '1px solid #1e293b',
                          color: '#fde047',
                          fontSize: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <RotateCcw size={12} />
                        <span>Reset</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handlePurgeKey(item.key)}
                      title="Remove key from localStorage"
                      style={{
                        padding: '4px 8px',
                        borderRadius: '5px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        fontSize: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Trash2 size={12} />
                      <span>Purge</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedKey(isExpanded ? null : item.key)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '5px',
                        background: isExpanded ? '#1e293b' : '#090d16',
                        border: '1px solid #1e293b',
                        color: '#cbd5e1',
                        fontSize: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Eye size={12} />
                      <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                    </button>
                  </div>
                </div>

                {/* Validation Info Message */}
                <div style={{ fontSize: '11px', color: item.status === 'VALID' ? '#94a3b8' : item.status === 'MALFORMED_JSON' ? '#fca5a5' : item.status === 'INVALID_SCHEMA' ? '#fde047' : '#7dd3fc' }}>
                  {item.validationMessage}
                </div>

                {/* Expanded Raw / Parsed Inspector */}
                {isExpanded && (
                  <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#05070c', border: '1px solid #141b26', padding: '10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Raw LocalStorage String</div>
                    <pre style={{ margin: 0, fontSize: '10px', fontFamily: 'monospace', color: '#cbd5e1', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '160px', overflowY: 'auto' }}>
                      {item.rawValue || '(Empty String)'}
                    </pre>

                    {item.parsedPreview !== undefined && (
                      <>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginTop: '6px' }}>Parsed Object Inspector</div>
                        <pre style={{ margin: 0, fontSize: '10px', fontFamily: 'monospace', color: '#38bdf8', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '160px', overflowY: 'auto' }}>
                          {JSON.stringify(item.parsedPreview, null, 2)}
                        </pre>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
