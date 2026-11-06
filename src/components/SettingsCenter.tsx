// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Globe, Moon, Monitor, Sliders, Play, MessageSquare, Cpu, WandSparkles,
  ShieldCheck, Shield, LockKeyhole, Network, Activity, HardDrive, Terminal, Bell,
  AlertTriangle, RefreshCw, Save, RotateCcw, Check, Trash2, Download, Upload,
  CheckCircle2, Eye, FileCode2, Layers, Server, Zap, Database, Key, HelpCircle,
  ChevronRight, Info, Sparkles, CheckCircle, XCircle, AlertCircle, Search
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation, type SupportedLanguage } from '../../lib/i18n';

export type SettingsCategory =
  | 'general'
  | 'ai'
  | 'models'
  | 'providers'
  | 'privacy'
  | 'security'
  | 'tools'
  | 'notifications'
  | 'system'
  | 'advanced';

export interface AppLocalSettings {
  // General
  language: SupportedLanguage;
  theme: 'midnight-teal' | 'sovereign-navy' | 'high-contrast';
  density: 'standard' | 'compact' | 'mobile';
  fontSize: 'standard' | 'large';
  defaultPage: string;
  autoCheckModelOnLaunch: boolean;
  showSidebarBadges: boolean;
  collapseSidebarOnLaunch: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;

  // AI & Intelligence
  systemInstructions: string;
  responseStyle: 'concise' | 'balanced' | 'detailed' | 'code-first';
  reasoningLevel: 'standard' | 'chain-of-thought' | 'deep';
  maxHistoryMessages: number;
  includeWorkspaceFiles: boolean;
  taskMemoryEnabled: boolean;
  autoPruneSessions: boolean;
  aiDefaultLanguage: 'th' | 'en' | 'auto';
  defaultChatMode: 'auto' | 'chat' | 'reasoning' | 'coding' | 'research' | 'agent';

  // Models & Routing
  defaultModel: string;
  modelRouting: 'auto' | 'direct' | 'fallback';
  enableFallback: boolean;

  // Tools & Sandbox
  workspaceReadEnabled: boolean;
  codeDiffEnabled: boolean;
  requireHumanApproval: boolean;
  sandboxIsolated: boolean;

  // Notifications
  notifySystemEvents: boolean;
  notifyModelEvents: boolean;
  notifyTrainingEvents: boolean;
  notifySecurityAlerts: boolean;
  toastDurationSeconds: number;
  quietMode: boolean;
}

export const DEFAULT_APP_SETTINGS: AppLocalSettings = {
  language: 'th',
  theme: 'midnight-teal',
  density: 'standard',
  fontSize: 'standard',
  defaultPage: 'Chat',
  autoCheckModelOnLaunch: true,
  showSidebarBadges: true,
  collapseSidebarOnLaunch: false,
  soundEnabled: true,
  hapticsEnabled: true,

  systemInstructions: 'You are ZYNTHEOR AI ENGINE — a sovereign, production-grade AI engineering partner. Provide exact, verified, and well-structured code solutions.',
  responseStyle: 'balanced',
  reasoningLevel: 'chain-of-thought',
  maxHistoryMessages: 30,
  includeWorkspaceFiles: true,
  taskMemoryEnabled: true,
  autoPruneSessions: false,
  aiDefaultLanguage: 'th',
  defaultChatMode: 'auto',

  defaultModel: 'qwen2.5-coder:7b',
  modelRouting: 'auto',
  enableFallback: true,

  workspaceReadEnabled: true,
  codeDiffEnabled: true,
  requireHumanApproval: true,
  sandboxIsolated: true,

  notifySystemEvents: true,
  notifyModelEvents: true,
  notifyTrainingEvents: true,
  notifySecurityAlerts: true,
  toastDurationSeconds: 5,
  quietMode: false,
};

export interface ServerSettingsData {
  provider: string;
  model: string;
  endpointHost: string;
  localEndpoint: boolean;
  localOnly: boolean;
  onlineConsent: boolean;
  apiKeyConfigured: boolean;
  apiKeyExposed: false;
  accessTokenRequired?: boolean;
  serverStatus?: string;
  modelStatus?: 'SERVER_READY' | 'MODEL_UNAVAILABLE' | 'BLOCKED_BY_LOCAL_ONLY' | 'INFERENCE_READY';
  inferenceVerified?: boolean;
  defaultChatMode?: AppLocalSettings['defaultChatMode'];
}

export interface SettingsCenterProps {
  serverSettings?: ServerSettingsData | null;
  loading?: boolean;
  refreshServer?: () => void;
  onLocalOnlyToggle?: (localOnly: boolean) => Promise<void>;
  onConsentReview?: () => void;
  onSelectPage?: (pageName: any) => void;
  currentLang?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
  serverSession?: { id: string; role: string; isTokenVerified: boolean; source: string } | null;
}

const CATEGORY_META: Record<
  SettingsCategory,
  { icon: LucideIcon; titleTh: string; titleEn: string; descTh: string; descEn: string; badge?: string }
> = {
  general: {
    icon: Globe,
    titleTh: '1. ทั่วไป (General)',
    titleEn: '1. General',
    descTh: 'ตั้งค่าภาษา ธีม ตัวเลือกการแสดงผล และหน้าระดับเริ่มต้นเมื่อเปิดแอป',
    descEn: 'Language, theme, display density, and app startup behavior.',
  },
  ai: {
    icon: WandSparkles,
    titleTh: '2. ระบบปัญญาประดิษฐ์ (AI & Intelligence)',
    titleEn: '2. AI & Intelligence',
    descTh: 'กำหนดคำสั่งระบบ สไตล์การตอบ ระดับการวิเคราะห์ และนโยบายหน่วยความจำ',
    descEn: 'System instructions, response style, reasoning depth, and memory policy.',
  },
  models: {
    icon: Cpu,
    titleTh: '3. โมเดล AI (Models)',
    titleEn: '3. Models',
    descTh: 'เลือกโมเดลหลัก ตรวจสอบสถานะจริง และการเลือกเส้นทางประมวลผล (Routing)',
    descEn: 'Default model selection, real-time status, and fallback routing.',
  },
  providers: {
    icon: Server,
    titleTh: '4. ผู้ให้บริการ (Providers)',
    titleEn: '4. Providers',
    descTh: 'ตรวจสอบการเชื่อมต่อผู้ให้บริการ Gemini, OpenAI, Anthropic และ Local Ollama',
    descEn: 'Connection status for Gemini, OpenAI, Anthropic, and Local Ollama.',
  },
  privacy: {
    icon: Shield,
    titleTh: '5. ความเป็นส่วนตัว (Privacy)',
    titleEn: '5. Privacy',
    descTh: 'โหมดประมวลผลในเครื่องเท่านั้น (Local-only) การยินยอมเชื่อมต่อ และการล้างข้อมูลท้องถิ่น',
    descEn: 'Local-only policy, explicit online consent, and local data controls.',
  },
  security: {
    icon: LockKeyhole,
    titleTh: '6. ความปลอดภัย (Security)',
    titleEn: '6. Security',
    descTh: 'สิทธิ์การใช้งานเซสชัน การอนุมัติการแก้ไขโค้ด บันทึกการตรวจสอบ และขอบเขตความปลอดภัย',
    descEn: 'Session roles, human approval gates, audit log, and security boundaries.',
  },
  tools: {
    icon: Terminal,
    titleTh: '7. เครื่องมือ (Tools)',
    titleEn: '7. Tools',
    descTh: 'สิทธิ์การอ่านไฟล์ซอร์สโค้ด ตัววิเคราะห์ Diffs และ Sandbox Runner',
    descEn: 'Workspace file inspection, diff analyzer, and execution sandbox controls.',
  },
  notifications: {
    icon: Bell,
    titleTh: '8. การแจ้งเตือน (Notifications)',
    titleEn: '8. Notifications',
    descTh: 'ตั้งค่าการแจ้งเตือนเหตุการณ์ระบบ สถานะโมเดล และแจ้งเตือนความปลอดภัย',
    descEn: 'System events, model alerts, training notifications, and quiet mode.',
  },
  system: {
    icon: HardDrive,
    titleTh: '9. ทรัพยากรระบบ (System)',
    titleEn: '9. System',
    descTh: 'ข้อมูลฮาร์ดแวร์จริง (CPU, RAM, GPU, VRAM, Storage) และสุขภาพของเซิร์ฟเวอร์',
    descEn: 'Hardware telemetry (CPU, RAM, GPU, VRAM, Storage) and server runtime health.',
  },
  advanced: {
    icon: Sliders,
    titleTh: '10. ตั้งค่าขั้นสูง (Advanced)',
    titleEn: '10. Advanced',
    descTh: 'การวินิจฉัยข้อผิดพลาด ส่งออก/นำเข้าการตั้งค่า และการรีเซ็ตระบบเป็นค่าเริ่มต้น',
    descEn: 'Diagnostics, system error logs, configuration backup/restore, and system reset.',
  },
};

const LOCAL_STORAGE_KEY = 'zyntheor.settings';
const ACCESS_TOKEN_KEY = 'zyntheor.access.v1';

export function SettingsCenter({
  serverSettings = null,
  loading = false,
  refreshServer = () => {},
  onLocalOnlyToggle = async () => {},
  onConsentReview = () => {},
  onSelectPage = () => {},
  currentLang = 'th',
  onLanguageChange = () => {},
  serverSession = null,
}: SettingsCenterProps = {}) {
  const { t } = useTranslation();
  const isTh = currentLang === 'th';

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState<AppLocalSettings>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {}
    return DEFAULT_APP_SETTINGS;
  });

  const [draftSettings, setDraftSettings] = useState<AppLocalSettings>(localSettings);
  const [isDirty, setIsDirty] = useState(false);
  useEffect(() => {
    if (!serverSettings?.defaultChatMode || isDirty) return;
    setLocalSettings(prev => ({ ...prev, defaultChatMode: serverSettings.defaultChatMode! }));
    setDraftSettings(prev => ({ ...prev, defaultChatMode: serverSettings.defaultChatMode! }));
  }, [serverSettings?.defaultChatMode, isDirty]);

  // Live telemetry state
  const [hardwareInfo, setHardwareInfo] = useState<any>(null);
  const [hardwareLoading, setHardwareLoading] = useState(false);
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [errorLogsCount, setErrorLogsCount] = useState<number>(0);
  const [testingInference, setTestingInference] = useState(false);
  const [inferenceResultMsg, setInferenceResultMsg] = useState<string | null>(null);

  // Phase 5 Cryptographic Key Rotation Transparency State
  const [publicKeys, setPublicKeys] = useState<Array<{ keyId: string; algorithm: string; createdAt: string; status: string; publicKeyPem: string }>>([]);
  const [activeKeyId, setActiveKeyId] = useState<string>('');
  const [keysLoading, setKeysLoading] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(false);

  // Access Token management state
  const [accessTokenInput, setAccessTokenInput] = useState('');
  const [isTokenSaved, setIsTokenSaved] = useState(() => {
    try {
      return Boolean(sessionStorage.getItem(ACCESS_TOKEN_KEY));
    } catch {
      return false;
    }
  });

  // Action status feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Fetch Public Keys Metadata
  const fetchPublicKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const res = await fetch('/api/evidence/keys/public');
      if (res.ok) {
        const data = await res.json();
        setPublicKeys(data.keys || []);
        setActiveKeyId(data.activeKeyId || '');
      }
    } catch {}
    setKeysLoading(false);
  }, []);

  const handleRotateSigningKey = async () => {
    setRotatingKey(true);
    try {
      const token = sessionStorage.getItem(ACCESS_TOKEN_KEY) || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/evidence/keys/rotate', { method: 'POST', headers });
      const data = await res.json();
      if (res.ok) {
        showToast(isTh ? `หมุนเวียนกุญแจลงนามสำเร็จ! Active Key ID: ${data.activeKeyId}` : `Rotated key pair successfully. New Active Key ID: ${data.activeKeyId}`);
        fetchPublicKeys();
      } else {
        showToast(data.message || (isTh ? 'หมุนเวียนกุญแจไม่สำเร็จ' : 'Failed to rotate key pair'));
      }
    } catch (err: any) {
      showToast(err.message || (isTh ? 'การเชื่อมต่อขัดข้อง' : 'Connection error'));
    }
    setRotatingKey(false);
  };

  // Modal dialog states
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  // Synchronize draft when localSettings changes
  useEffect(() => {
    setDraftSettings(localSettings);
  }, [localSettings]);

  // Check if draft matches saved
  const checkDirty = useCallback((nextDraft: AppLocalSettings) => {
    setIsDirty(JSON.stringify(nextDraft) !== JSON.stringify(localSettings));
  }, [localSettings]);

  const updateDraft = (updater: (prev: AppLocalSettings) => AppLocalSettings) => {
    setDraftSettings(prev => {
      const next = updater(prev);
      checkDirty(next);
      return next;
    });
  };

  // Save changes via POST /api/settings API call
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = sessionStorage.getItem(ACCESS_TOKEN_KEY) || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload = {
        ...draftSettings,
        localOnly: serverSettings?.localOnly ?? true,
        onlineConsent: serverSettings?.onlineConsent ?? false,
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setLocalSettings(draftSettings);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draftSettings));
          localStorage.setItem('zyntheor.default-chat-mode', draftSettings.defaultChatMode || 'auto');
        } catch {}
        if (draftSettings.language !== currentLang) {
          onLanguageChange(draftSettings.language);
        }
        setIsDirty(false);
        refreshServer();
        showToast(isTh ? 'บันทึกการตั้งค่าลงเซิร์ฟเวอร์เรียบร้อยแล้ว' : 'Settings persisted to backend server');
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.message || (isTh ? 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า' : 'Failed to save settings to server'));
      }
    } catch (err: any) {
      setLocalSettings(draftSettings);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draftSettings));
        localStorage.setItem('zyntheor.default-chat-mode', draftSettings.defaultChatMode || 'auto');
      } catch {}
      if (draftSettings.language !== currentLang) {
        onLanguageChange(draftSettings.language);
      }
      setIsDirty(false);
      showToast(isTh ? 'บันทึกการตั้งค่าในเครื่องแล้ว (การเชื่อมต่อเซิร์ฟเวอร์ขัดข้อง)' : 'Settings saved locally (server unreachable)');
    } finally {
      setSaving(false);
    }
  };

  // Cancel changes
  const handleCancel = () => {
    setDraftSettings(localSettings);
    setIsDirty(false);
    showToast(isTh ? 'ยกเลิกการเปลี่ยนแปลงแล้ว' : 'Changes reverted');
  };

  // Reset to defaults
  const handleResetDefaults = async () => {
    setDraftSettings(DEFAULT_APP_SETTINGS);
    setLocalSettings(DEFAULT_APP_SETTINGS);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_APP_SETTINGS));
    } catch {}
    if (currentLang !== 'th') {
      onLanguageChange('th');
    }
    setIsDirty(false);
    setShowResetConfirmModal(false);

    try {
      const token = sessionStorage.getItem(ACCESS_TOKEN_KEY) || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...DEFAULT_APP_SETTINGS,
          localOnly: serverSettings?.localOnly ?? true,
          onlineConsent: serverSettings?.onlineConsent ?? false,
        }),
      });
      refreshServer();
    } catch {}

    showToast(isTh ? 'รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้นเรียบร้อยแล้ว' : 'Settings reset to default values');
  };

  // Fetch Hardware & System telemetry
  const fetchTelemetry = useCallback(async () => {
    setHardwareLoading(true);
    try {
      const res = await fetch('/api/training/status');
      if (res.ok) {
        const data = await res.json();
        setHardwareInfo(data);
      }
    } catch {}
    setHardwareLoading(false);
  }, []);

  // Fetch Discovered Models
  const fetchModelsList = useCallback(async () => {
    setModelsLoading(true);
    try {
      const res = await fetch('/api/models');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models)) {
          setDiscoveredModels(data.models);
        }
      }
    } catch {}
    setModelsLoading(false);
  }, []);

  // Fetch Error Logs Count
  const fetchErrorLogsCount = useCallback(async () => {
    try {
      const res = await fetch('/api/diagnostics/errors?limit=200');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.errors)) {
          setErrorLogsCount(data.errors.length);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchTelemetry();
    fetchModelsList();
    fetchErrorLogsCount();
    fetchPublicKeys();
  }, [fetchTelemetry, fetchModelsList, fetchErrorLogsCount, fetchPublicKeys]);

  // Run Inference Diagnostic Test
  const handleRunInferenceTest = async () => {
    setTestingInference(true);
    setInferenceResultMsg(null);
    try {
      const token = sessionStorage.getItem(ACCESS_TOKEN_KEY) || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/diagnostics/inference', {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (res.ok && data.matchedExpectedText) {
        setInferenceResultMsg(isTh ? `ทดสอบสำเร็จ! โมเดล ${data.model || ''} ตอบกลับใน ${data.latencyMs || 0}ms` : `Inference successful! Model ${data.model || ''} responded in ${data.latencyMs || 0}ms`);
      } else if (res.ok) {
        setInferenceResultMsg(isTh ? `โมเดลตอบกลับสำเร็จ (${data.latencyMs || 0}ms)` : `Model responded in ${data.latencyMs || 0}ms`);
      } else {
        setInferenceResultMsg(data.message || (isTh ? 'การทดสอบล้มเหลว' : 'Test failed'));
      }
    } catch (err: any) {
      setInferenceResultMsg(err.message || (isTh ? 'การเชื่อมต่อล้มเหลว' : 'Connection failed'));
    }
    setTestingInference(false);
  };

  // Save access token
  const handleSaveAccessToken = () => {
    if (!accessTokenInput.trim()) return;
    try {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, accessTokenInput.trim());
      setIsTokenSaved(true);
      setAccessTokenInput('');
      refreshServer();
      showToast(isTh ? 'บันทึก Access Token ในเซสชันนี้แล้ว' : 'Access Token saved for this browser tab');
    } catch {}
  };

  // Clear access token
  const handleClearAccessToken = () => {
    try {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      setIsTokenSaved(false);
      refreshServer();
      showToast(isTh ? 'ลบ Access Token เรียบร้อยแล้ว' : 'Access Token removed');
    } catch {}
  };

  // Export Settings & History
  const handleExportConfig = () => {
    const payload = {
      app: 'ZYNTHEOR AI ENGINE',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings: draftSettings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zyntheor-settings-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(isTh ? 'ส่งออกไฟล์การตั้งค่าเรียบร้อยแล้ว' : 'Configuration exported');
  };

  // Import Settings
  const handleImportConfig = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (parsed.settings && typeof parsed.settings === 'object') {
        const merged = { ...DEFAULT_APP_SETTINGS, ...parsed.settings };
        setDraftSettings(merged);
        setLocalSettings(merged);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        if (merged.language && merged.language !== currentLang) {
          onLanguageChange(merged.language);
        }
        setShowImportModal(false);
        setImportJsonText('');
        setIsDirty(false);
        showToast(isTh ? 'นำเข้าและปรับใช้การตั้งค่าสำเร็จ' : 'Configuration imported and applied successfully');
      } else {
        alert(isTh ? 'รูปแบบไฟล์ JSON ไม่ถูกต้อง (ไม่พบฟิลด์ settings)' : 'Invalid JSON configuration (missing settings field)');
      }
    } catch {
      alert(isTh ? 'ไม่สามารถอ่านไฟล์ JSON ได้ กรุณาตรวจสอบรูปแบบข้อความ' : 'Failed to parse JSON text');
    }
  };

  // Clear LocalStorage Cache
  const handleClearLocalStorageCache = () => {
    try {
      const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('zyntheor.'));
      keysToRemove.forEach(k => localStorage.removeItem(k));
      setShowClearCacheModal(false);
      showToast(isTh ? 'ล้างแคชและข้อมูลท้องถิ่นเรียบร้อยแล้ว' : 'Local cache cleared');
      setTimeout(() => window.location.reload(), 800);
    } catch {}
  };

  return (
    <section className="subpage settings-center-page" style={{ paddingBottom: '80px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#14b8a6',
            color: '#080f1b',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13px',
            boxShadow: '0 8px 24px rgba(20,184,166,0.3)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle size={16} /> {toastMessage}
        </div>
      )}

      {/* Top Header & Save Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          paddingBottom: '16px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.14)',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, color: '#14b8a6', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <Settings size={14} /> SYSTEM / SETTINGS CENTER
          </div>
          <h1 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 700, color: '#f1f5f9' }}>
            {isTh ? 'ศูนย์ควบคุมการตั้งค่า (Settings Center)' : 'Settings Center'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
            {isTh
              ? 'จัดการและปรับแต่งระบบทั้ง 10 หมวดหมู่ เชื่อมต่อกับ Backend จริง พร้อมรองรับภาษาไทยเป็นหลัก'
              : 'Configure all 10 system modules connected to live backend APIs with Thai-first localization.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              refreshServer();
              fetchTelemetry();
              fetchModelsList();
              fetchErrorLogsCount();
              showToast(isTh ? 'รีเฟรชข้อมูลสำเร็จ' : 'Refreshed system status');
            }}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {isTh ? 'รีเฟรชสถานะ' : 'Refresh'}
          </button>

          {isDirty && (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={handleCancel}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: '#ef4444', color: '#fca5a5' }}
              >
                <RotateCcw size={14} /> {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleSave}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#14b8a6', color: '#080f1b', fontWeight: 600 }}
              >
                <Save size={14} /> {isTh ? 'บันทึกการตั้งค่า' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Category Filter Search Bar & Jump Dropdown */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          background: '#0d1828',
          border: '1px solid rgba(148, 163, 184, 0.14)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder={isTh ? 'ค้นหาการตั้งค่า หรือ หมวดหมู่...' : 'Search settings or categories...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              ...inputStyle,
              paddingLeft: '36px',
              fontSize: '13px',
              background: '#111f32',
              borderColor: searchQuery ? '#38bdf8' : 'rgba(148, 163, 184, 0.2)',
            }}
          />
        </div>

        <div style={{ flex: '1 1 260px', minWidth: '220px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
            {isTh ? 'กระโดดไปยังหมวดหมู่:' : 'Jump to Category:'}
          </span>
          <select
            value={activeCategory}
            onChange={e => {
              setActiveCategory(e.target.value as SettingsCategory);
              setSearchQuery('');
            }}
            style={{
              ...selectStyle,
              fontSize: '13px',
              fontWeight: 600,
              color: '#38bdf8',
              background: '#111f32',
              borderColor: 'rgba(56, 189, 248, 0.3)',
            }}
          >
            {(Object.keys(CATEGORY_META) as SettingsCategory[]).map(catKey => {
              const meta = CATEGORY_META[catKey];
              return (
                <option key={catKey} value={catKey}>
                  {isTh ? meta.titleTh : meta.titleEn}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Mobile Swipeable Category Tab Bar */}
      <div className="settings-mobile-tabs" role="tablist" aria-label="Setting Categories Mobile">
        {(Object.keys(CATEGORY_META) as SettingsCategory[]).map(catKey => {
          const meta = CATEGORY_META[catKey];
          const Icon = meta.icon;
          const isActive = activeCategory === catKey;

          return (
            <button
              key={catKey}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`settings-mobile-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveCategory(catKey)}
            >
              <Icon size={14} />
              <span>{isTh ? meta.titleTh : meta.titleEn}</span>
            </button>
          );
        })}
      </div>

      {/* Main Settings Layout: Left Navigation + Right Content */}
      <div className="settings-layout-grid">
        {/* Left Vertical Category Nav (Desktop sticky sidebar) */}
        <nav
          className="settings-nav-sidebar"
          aria-label="Settings Categories"
          style={{
            background: '#0d1828',
            border: '1px solid rgba(148, 163, 184, 0.14)',
            borderRadius: '12px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            position: 'sticky',
            top: '20px',
          }}
        >
          <div style={{ padding: '8px 12px 6px', fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {isTh ? 'หมวดหมู่การตั้งค่า (10 หมวดหมู่)' : 'SETTINGS CATEGORIES (10)'}
          </div>

          {(Object.keys(CATEGORY_META) as SettingsCategory[])
            .filter(catKey => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              const meta = CATEGORY_META[catKey];
              return (
                meta.titleTh.toLowerCase().includes(q) ||
                meta.titleEn.toLowerCase().includes(q) ||
                meta.descTh.toLowerCase().includes(q) ||
                meta.descEn.toLowerCase().includes(q) ||
                catKey.toLowerCase().includes(q)
              );
            })
            .map(catKey => {
              const meta = CATEGORY_META[catKey];
              const Icon = meta.icon;
              const isActive = activeCategory === catKey;

              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setActiveCategory(catKey)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#38bdf8' : '#cbd5e1',
                    background: isActive ? '#172a40' : 'transparent',
                    border: isActive ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <Icon size={16} style={{ color: isActive ? '#38bdf8' : '#94a3b8', flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isTh ? meta.titleTh.split('.')[1].trim() : meta.titleEn.split('.')[1].trim()}
                    </span>
                  </div>
                  {meta.badge && (
                    <span style={{ fontSize: '9px', fontWeight: 700, background: '#14b8a6', color: '#080f1b', padding: '2px 6px', borderRadius: '4px' }}>
                      {meta.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        {/* Right Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Category Header Banner */}
          <div
            style={{
              background: '#111f32',
              border: '1px solid rgba(148, 163, 184, 0.14)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            {(() => {
              const meta = CATEGORY_META[activeCategory];
              const Icon = meta.icon;
              return (
                <>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'rgba(20, 184, 166, 0.12)',
                      border: '1px solid rgba(20, 184, 166, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#14b8a6',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={22} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#f1f5f9' }}>
                      {isTh ? meta.titleTh : meta.titleEn}
                    </h2>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                      {isTh ? meta.descTh : meta.descEn}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* 1. GENERAL */}
          {activeCategory === 'general' && (
            <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SettingCard
                title={isTh ? 'ภาษาของระบบ (Interface Language)' : 'Interface Language'}
                desc={isTh ? 'สลับภาษาการแสดงผลระหว่าง ภาษาไทย (TH) และ English (EN) ภาษาไทยถูกตั้งเป็นค่าเริ่มต้น' : 'Choose default interface language. Thai is set as primary.'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    className={`secondary-button ${draftSettings.language === 'th' ? 'active' : ''}`}
                    onClick={() => {
                      updateDraft(p => ({ ...p, language: 'th' }));
                      onLanguageChange('th');
                    }}
                    style={{
                      background: draftSettings.language === 'th' ? 'rgba(56, 189, 248, 0.15)' : '#172a40',
                      borderColor: draftSettings.language === 'th' ? '#38bdf8' : 'rgba(148, 163, 184, 0.2)',
                      color: draftSettings.language === 'th' ? '#38bdf8' : '#cbd5e1',
                      fontWeight: draftSettings.language === 'th' ? 700 : 400,
                      padding: '8px 16px',
                    }}
                  >
                    🇹🇭 1. ไทย (TH) — ภาษาไทย
                  </button>

                  <button
                    type="button"
                    className={`secondary-button ${draftSettings.language === 'en' ? 'active' : ''}`}
                    onClick={() => {
                      updateDraft(p => ({ ...p, language: 'en' }));
                      onLanguageChange('en');
                    }}
                    style={{
                      background: draftSettings.language === 'en' ? 'rgba(56, 189, 248, 0.15)' : '#172a40',
                      borderColor: draftSettings.language === 'en' ? '#38bdf8' : 'rgba(148, 163, 184, 0.2)',
                      color: draftSettings.language === 'en' ? '#38bdf8' : '#cbd5e1',
                      fontWeight: draftSettings.language === 'en' ? 700 : 400,
                      padding: '8px 16px',
                    }}
                  >
                    🇺🇸 2. English (EN) — English
                  </button>
                </div>
              </SettingCard>

              <SettingCard
                title={isTh ? 'ธีมโทนสี (Visual Theme)' : 'Visual Theme'}
                desc={isTh ? 'ใช้โทนสี Midnight Teal เป็นหลัก พร้อมตัดแสงสะท้อนและสีม่วงออกเพื่อความสบายตา' : 'Uses dark Sovereign Midnight Teal palette with zero visual glare.'}
              >
                <select
                  value={draftSettings.theme}
                  onChange={e => updateDraft(p => ({ ...p, theme: e.target.value as any }))}
                  style={selectStyle}
                >
                  <option value="midnight-teal">Midnight Teal (ค่าเริ่มต้นแบบสุขุม)</option>
                  <option value="sovereign-navy">Sovereign Deep Navy (มืดลึกพิเศษ)</option>
                  <option value="high-contrast">High Contrast Dark (เน้นความคมชัดสูง)</option>
                </select>
              </SettingCard>

              <SettingCard
                title={isTh ? 'ความหนาแน่นอินเทอร์เฟซ (Display Density & Font Size)' : 'Display Density & Font Size'}
                desc={isTh ? 'ปรับระยะห่างขององค์ประกอบและขนาดตัวอักษรสำหรับหน้าจอเดสก์ท็อปหรือมือถือ' : 'Adjust spacing density and font scale for desktop or mobile viewports.'}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>{isTh ? 'ความหนาแน่น (Density)' : 'Density'}</label>
                    <select
                      value={draftSettings.density}
                      onChange={e => updateDraft(p => ({ ...p, density: e.target.value as any }))}
                      style={selectStyle}
                    >
                      <option value="standard">{isTh ? 'มาตรฐาน (Standard)' : 'Standard'}</option>
                      <option value="compact">{isTh ? 'กระชับ (Compact)' : 'Compact'}</option>
                      <option value="mobile">{isTh ? 'เน้นสัมผัสบนมือถือ (Mobile-Optimized)' : 'Mobile Touch-Optimized'}</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>{isTh ? 'ขนาดฟอนต์ (Font Scale)' : 'Font Scale'}</label>
                    <select
                      value={draftSettings.fontSize}
                      onChange={e => updateDraft(p => ({ ...p, fontSize: e.target.value as any }))}
                      style={selectStyle}
                    >
                      <option value="standard">{isTh ? 'มาตรฐาน (14px Baseline)' : 'Standard (14px)'}</option>
                      <option value="large">{isTh ? 'ขนาดใหญ่สบายตา (16px Baseline)' : 'Large (16px)'}</option>
                    </select>
                  </div>
                </div>
              </SettingCard>

              <SettingCard
                title={isTh ? 'หน้าเริ่มต้นเมื่อเปิดระบบ (Startup Preference)' : 'Startup Landing Page'}
                desc={isTh ? 'เลือกหน้าที่ต้องการเปิดแสดงเป็นหน้าแรกทันทีเมื่อเข้าใช้งานแอป' : 'Choose default workspace view on app launch.'}
              >
                <select
                  value={draftSettings.defaultPage}
                  onChange={e => updateDraft(p => ({ ...p, defaultPage: e.target.value }))}
                  style={selectStyle}
                >
                  <option value="Chat">💬 {isTh ? 'แชตใหม่ (Chat)' : 'Chat'}</option>
                  <option value="Projects">📦 {isTh ? 'โครงการ (Projects)' : 'Projects'}</option>
                  <option value="Plans">📋 {isTh ? 'แผนงาน (Plans)' : 'Plans'}</option>
                  <option value="Prompt Forge">🪄 {isTh ? 'เครื่องมือสร้างพรอมป์ (Prompt Forge)' : 'Prompt Forge'}</option>
                  <option value="Models">⚡ {isTh ? 'ศูนย์ควบคุมโมเดล AI (Models)' : 'Models'}</option>
                  <option value="Diagnostics">📊 {isTh ? 'การวินิจฉัยระบบ (Diagnostics)' : 'Diagnostics'}</option>
                  <option value="Settings">⚙️ {isTh ? 'ตั้งค่า (Settings)' : 'Settings'}</option>
                </select>
              </SettingCard>

              <SettingCard
                title={isTh ? 'ตัวเลือกอินเทอร์เฟซเพิ่มเติม (Interface Preferences)' : 'Interface Preferences'}
                desc={isTh ? 'เปิด/ปิด ป้ายสถานะและเสียงประกอบขณะทำงาน' : 'Toggle sidebar badges and sound feedback.'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <ToggleItem
                    label={isTh ? 'ตรวจเช็กสถานะโมเดลอัตโนมัติเมื่อเริ่มระบบ' : 'Auto-check model endpoint status on launch'}
                    checked={draftSettings.autoCheckModelOnLaunch}
                    onChange={v => updateDraft(p => ({ ...p, autoCheckModelOnLaunch: v }))}
                  />
                  <ToggleItem
                    label={isTh ? 'แสดงป้ายจำนวนตัวเลขแจ้งเตือนในเมนูด้านข้าง' : 'Show notification badges on sidebar items'}
                    checked={draftSettings.showSidebarBadges}
                    onChange={v => updateDraft(p => ({ ...p, showSidebarBadges: v }))}
                  />
                  <ToggleItem
                    label={isTh ? 'พับเมนูด้านข้างอัตโนมัติเมื่อเปิดแอป' : 'Collapse sidebar by default on launch'}
                    checked={draftSettings.collapseSidebarOnLaunch}
                    onChange={v => updateDraft(p => ({ ...p, collapseSidebarOnLaunch: v }))}
                  />
                  <ToggleItem
                    label={isTh ? 'เปิดเสียงประกอบการโต้ตอบ (Sound Effects)' : 'Enable sound effects'}
                    checked={draftSettings.soundEnabled}
                    onChange={v => updateDraft(p => ({ ...p, soundEnabled: v }))}
                  />
                  <ToggleItem
                    label={isTh ? 'เปิดการสั่นสะเทือนตอบสนองการกด/สลับเมนู (Haptic Vibration)' : 'Enable vibration haptic feedback across navigation'}
                    checked={draftSettings.hapticsEnabled !== false}
                    onChange={v => updateDraft(p => ({ ...p, hapticsEnabled: v }))}
                  />
                </div>
              </SettingCard>
            </div>
          )}

          {/* 2. AI & INTELLIGENCE */}
          {activeCategory === 'ai' && (
            <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SettingCard
                title={isTh ? 'โหมด AI เริ่มต้น (Default AI Mode)' : 'Default AI Mode'}
                desc={isTh ? 'กำหนดโหมดเริ่มต้นสำหรับแชตใหม่ สามารถเปลี่ยนโหมดได้จากแถบเครื่องมือในหน้า Chat' : 'Choose the default mode for new chats. You can override it in the Chat composer.'}
              >
                <select value={draftSettings.defaultChatMode} onChange={e => updateDraft(p => ({ ...p, defaultChatMode: e.target.value as AppLocalSettings['defaultChatMode'] }))} style={selectStyle}>
                  <option value="auto">✨ Auto — {isTh ? 'เลือกอัตโนมัติ' : 'Automatic selection'}</option>
                  <option value="chat">💬 Chat — {isTh ? 'สนทนาทั่วไป' : 'Conversation'}</option>
                  <option value="reasoning">🧠 Reasoning — {isTh ? 'วิเคราะห์เชิงลึก' : 'Structured analysis'}</option>
                  <option value="coding">⌨️ Coding — {isTh ? 'พัฒนาและแก้ไขโค้ด' : 'Software engineering'}</option>
                  <option value="research">🔎 Research — {isTh ? 'ค้นคว้าและสังเคราะห์' : 'Research and synthesis'}</option>
                  <option value="agent">🤖 Agent — {isTh ? 'ทำงานหลายขั้นตอน' : 'Multi-step tasks'}</option>
                </select>
              </SettingCard>

              <SettingCard
                title={isTh ? 'คำสั่งระบบสากล (Global System Instructions)' : 'Global System Instructions'}
                desc={isTh ? 'ข้อความกำกับบุคลิกและแนวทางคำตอบหลักของ AI ประจำพื้นที่ทำงาน' : 'Default system persona instructions injected into model queries.'}
              >
                <textarea
                  value={draftSettings.systemInstructions}
                  onChange={e => updateDraft(p => ({ ...p, systemInstructions: e.target.value }))}
                  rows={4}
                  style={textareaStyle}
                />
              </SettingCard>

              <SettingCard
                title={isTh ? 'สไตล์และระดับการวิเคราะห์ (Response Style & Reasoning Level)' : 'Response Style & Reasoning Level'}
                desc={isTh ? 'กำหนดรูปแบบคำตอบและระดับความลึกในการคิดวิเคราะห์ของ AI' : 'Configure reply style and step-by-step reasoning depth.'}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>{isTh ? 'สไตล์การตอบ (Response Style)' : 'Response Style'}</label>
                    <select
                      value={draftSettings.responseStyle}
                      onChange={e => updateDraft(p => ({ ...p, responseStyle: e.target.value as any }))}
                      style={selectStyle}
                    >
                      <option value="concise">{isTh ? 'กระชับ สั้น ตรงประเด็น (Concise)' : 'Concise'}</option>
                      <option value="balanced">{isTh ? 'สมดุล อธิบายชัดเจน (Balanced - ค่าเริ่มต้น)' : 'Balanced'}</option>
                      <option value="detailed">{isTh ? 'ละเอียด อธิบายทุกขั้นตอน (Detailed)' : 'Detailed'}</option>
                      <option value="code-first">{isTh ? 'เน้นตัวอย่างโค้ดก่อน (Code-First)' : 'Code-First'}</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>{isTh ? 'ระดับการวิเคราะห์ (Reasoning Depth)' : 'Reasoning Depth'}</label>
                    <select
                      value={draftSettings.reasoningLevel}
                      onChange={e => updateDraft(p => ({ ...p, reasoningLevel: e.target.value as any }))}
                      style={selectStyle}
                    >
                      <option value="standard">{isTh ? 'มาตรฐาน (Standard Response)' : 'Standard'}</option>
                      <option value="chain-of-thought">{isTh ? 'แสดงขั้นตอนการคิด (Chain of Thought)' : 'Chain of Thought'}</option>
                      <option value="deep">{isTh ? 'วิเคราะห์เชิงลึกด้านสถาปัตยกรรม (Deep Architectural Analysis)' : 'Deep Architectural'}</option>
                    </select>
                  </div>
                </div>
              </SettingCard>

              <SettingCard
                title={isTh ? 'การจัดการบริบทและหน่วยความจำ (Context & Memory Policy)' : 'Context & Memory Policy'}
                desc={isTh ? 'กำหนดจำนวนข้อความย้อนหลังและนโยบายบันทึกความจำของงาน' : 'Configure max chat depth and task memory persistence.'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>
                      {isTh ? `จำนวนข้อความย้อนหลังสูงสุดในบริบท (${draftSettings.maxHistoryMessages} ข้อความ)` : `Max history messages (${draftSettings.maxHistoryMessages} msgs)`}
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={60}
                      step={5}
                      value={draftSettings.maxHistoryMessages}
                      onChange={e => updateDraft(p => ({ ...p, maxHistoryMessages: Number(e.target.value) }))}
                      style={{ width: '100%', accentColor: '#14b8a6' }}
                    />
                  </div>

                  <ToggleItem
                    label={isTh ? 'แนบเนื้อหาไฟล์ซอร์สโค้ดของโครงการลงในบริบทอัตโนมัติ' : 'Automatically attach project file snippets to chat context'}
                    checked={draftSettings.includeWorkspaceFiles}
                    onChange={v => updateDraft(p => ({ ...p, includeWorkspaceFiles: v }))}
                  />

                  <ToggleItem
                    label={isTh ? 'เปิดใช้งาน Task Memory จดจำข้อมูลสรุปงานข้ามเซสชัน' : 'Enable Task Memory to persist task context across sessions'}
                    checked={draftSettings.taskMemoryEnabled}
                    onChange={v => updateDraft(p => ({ ...p, taskMemoryEnabled: v }))}
                  />

                  <ToggleItem
                    label={isTh ? 'ล้างแชตเก่าที่ไม่เคลื่อนไหวอัตโนมัติหลังจาก 30 วัน' : 'Auto-prune inactive chat sessions older than 30 days'}
                    checked={draftSettings.autoPruneSessions}
                    onChange={v => updateDraft(p => ({ ...p, autoPruneSessions: v }))}
                  />
                </div>
              </SettingCard>

              <SettingCard
                title={isTh ? 'ภาษาหลักในการตอบกลับของ AI (Default AI Language)' : 'Default AI Language'}
                desc={isTh ? 'กำหนดภาษาหลักที่ต้องการให้ AI ใช้ตอบกลับ' : 'Set preferred language for model responses.'}
              >
                <select
                  value={draftSettings.aiDefaultLanguage}
                  onChange={e => updateDraft(p => ({ ...p, aiDefaultLanguage: e.target.value as any }))}
                  style={selectStyle}
                >
                  <option value="th">{isTh ? '1. ภาษาไทยเป็นหลัก (Thai First)' : '1. Thai First'}</option>
                  <option value="en">{isTh ? '2. English (EN) First' : '2. English First'}</option>
                  <option value="auto">{isTh ? '3. ตอบตามภาษาที่ผู้ใช้พิมพ์ (Follow User Input Language)' : '3. Follow User Input'}</option>
                </select>
              </SettingCard>
            </div>
          )}

          {/* 3. MODELS */}
          {activeCategory === 'models' && (
            <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SettingCard
                title={isTh ? 'สถานะโมเดลปัจจุบัน (Live Model Runtime Status)' : 'Live Model Runtime Status'}
                desc={isTh ? 'ตรวจสอบสถานะของ endpoint ที่กำลังใช้งานจริง' : 'Real-time endpoint reachability and readiness.'}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                  <StatusBadge status={serverSettings?.modelStatus || 'MODEL_UNAVAILABLE'} />
                  <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
                    <b>{serverSettings?.model || draftSettings.defaultModel}</b> ({serverSettings?.provider || 'local'})
                  </span>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleRunInferenceTest}
                    disabled={testingInference}
                    style={{ marginLeft: 'auto', fontSize: '12px', padding: '4px 10px' }}
                  >
                    <Play size={12} className={testingInference ? 'animate-spin' : ''} />
                    {testingInference ? (isTh ? 'กำลังทดสอบ…' : 'Testing…') : (isTh ? 'ทดสอบการส่งคำขอจริง' : 'Test Real Inference')}
                  </button>
                </div>

                {inferenceResultMsg && (
                  <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '6px', background: '#0d1828', border: '1px solid #1e293b', fontSize: '12px', color: '#38bdf8' }}>
                    <Info size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    {inferenceResultMsg}
                  </div>
                )}
              </SettingCard>

              <SettingCard
                title={isTh ? 'เลือกโมเดลหลัก (Default Model Selection)' : 'Default Model Selection'}
                desc={isTh ? 'เลือกโมเดลที่ต้องการให้ระบบใช้ประมวลผลเป็นหลัก' : 'Select active default model.'}
              >
                <select
                  value={draftSettings.defaultModel}
                  onChange={e => updateDraft(p => ({ ...p, defaultModel: e.target.value }))}
                  style={selectStyle}
                >
                  <option value="qwen2.5-coder:7b">qwen2.5-coder:7b (Local Ollama Native)</option>
                  <option value="custom-cloud-api">Custom Cloud API (Authorized Proxy)</option>
                </select>
              </SettingCard>

              <SettingCard
                title={isTh ? 'การเลือกเส้นทางและการสลับอัตโนมัติ (Routing & Fallback)' : 'Routing & Fallback Policy'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>{isTh ? 'นโยบายการเลือกเส้นทาง (Routing Policy)' : 'Routing Policy'}</label>
                    <select
                      value={draftSettings.modelRouting}
                      onChange={e => updateDraft(p => ({ ...p, modelRouting: e.target.value as any }))}
                      style={selectStyle}
                    >
                      <option value="auto">{isTh ? 'อัตโนมัติ (Auto Choose based on task mode)' : 'Auto'}</option>
                      <option value="direct">{isTh ? 'ยึดโมเดลหลักโดยตรง (Direct Primary Only)' : 'Direct Only'}</option>
                      <option value="fallback">{isTh ? 'ใช้เส้นทางสำรองแบบลำดับชั้น (Fallback Chain)' : 'Fallback Chain'}</option>
                    </select>
                  </div>

                  <ToggleItem
                    label={isTh ? 'เปิดใช้ระบบ Fallback ไปยัง Local Ollama อัตโนมัติเมื่อโมเดลหลักเกิดข้อผิดพลาด' : 'Enable automatic fallback to local Ollama when primary provider fails'}
                    checked={draftSettings.enableFallback}
                    onChange={v => updateDraft(p => ({ ...p, enableFallback: v }))}
                  />
                </div>
              </SettingCard>

              <SettingCard
                title={isTh ? 'รายการโมเดลที่ค้นพบในระบบ (Discovered Models List)' : 'Discovered Models List'}
                desc={isTh ? 'ดึงข้อมูลรายการโมเดลจริงจาก Local Bridge / Proxy' : 'Real discovered model list from configured endpoint.'}
              >
                {modelsLoading ? (
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{isTh ? 'กำลังค้นหาโมเดล…' : 'Loading models list…'}</div>
                ) : discoveredModels.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {discoveredModels.map(m => (
                      <span
                        key={m}
                        style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: m === draftSettings.defaultModel ? 'rgba(20, 184, 166, 0.2)' : '#0d1828',
                          border: `1px solid ${m === draftSettings.defaultModel ? '#14b8a6' : '#1e293b'}`,
                          color: m === draftSettings.defaultModel ? '#2dd4bf' : '#94a3b8',
                          fontFamily: 'monospace',
                        }}
                      >
                        {m} {m === draftSettings.defaultModel ? '★ ACTIVE' : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    {isTh ? 'ไม่พบโมเดลเพิ่มเติม หรืออยู่ในโหมด Local-only (qwen2.5-coder:7b พร้อมใช้งานในเครื่อง)' : 'qwen2.5-coder:7b is active via local bridge.'}
                  </div>
                )}
              </SettingCard>
            </div>
          )}

          {/* 4. PROVIDERS */}
          {activeCategory === 'providers' && (
            <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <ProviderCard
                  name="Local Ollama (external, user-run)"
                  type="Local Loopback"
                  status={serverSettings?.localEndpoint ? 'ONLINE' : 'OFFLINE'}
                  detail="127.0.0.1:11434 (qwen2.5-coder:7b)"
                  isLocal
                />
                <ProviderCard
                  name="External Cloud Model API"
                  type="Cloud Provider Proxy"
                  status={serverSettings?.apiKeyConfigured ? 'CONFIGURED' : 'NO_KEY'}
                  detail={serverSettings?.apiKeyConfigured ? 'Server Environment Key Active' : 'No Server API Key Configured'}
                />
                <ProviderCard
                  name="OpenAI API"
                  type="Cloud Provider Proxy"
                  status={serverSettings?.onlineConsentGranted ? 'PROXY_ALLOWED' : 'CONSENT_REQUIRED'}
                  detail={serverSettings?.onlineConsentGranted ? 'Server-side proxy route active' : 'Awaiting explicit online consent'}
                />
                <ProviderCard
                  name="Anthropic API"
                  type="Cloud Provider Proxy"
                  status={serverSettings?.onlineConsentGranted ? 'PROXY_ALLOWED' : 'CONSENT_REQUIRED'}
                  detail={serverSettings?.onlineConsentGranted ? 'Server-side proxy route active' : 'Awaiting explicit online consent'}
                />
              </div>

              <SettingCard
                title={isTh ? 'การตั้งค่าคีย์และสิทธิ์เข้าถึงที่ปลอดภัย (Secure Key & Token Configuration)' : 'Secure Key & Token Configuration'}
                desc={isTh ? 'API Keys จะถูกเก็บบนไฟล์ .env ฝั่งเซิร์ฟเวอร์เท่านั้น บราวเซอร์จะไม่เห็นคีย์จริง' : 'API Keys are held strictly in server environment variables. Never exposed to browser logs.'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    <b>Server API Key Status:</b>{' '}
                    <span style={{ color: serverSettings?.apiKeyConfigured ? '#10b981' : '#f59e0b' }}>
                      {serverSettings?.apiKeyConfigured ? (isTh ? '✓ มี API Key บนเซิร์ฟเวอร์แล้ว (Server-side Only)' : '✓ Configured on Server') : (isTh ? '⚠️ ยังไม่ได้ตั้งค่า GEMINI_API_KEY บนเซิร์ฟเวอร์' : '⚠️ Not configured on server')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={labelStyle}>{isTh ? 'กำหนด Access Token สำหรับเซสชันบราวเซอร์นี้ (Optional)' : 'Session Access Token (Optional)'}</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="password"
                        placeholder={isTokenSaved ? '••••••••••••••••' : (isTh ? 'ป้อน ZYNTHEOR_ACCESS_TOKEN' : 'Enter access token')}
                        value={accessTokenInput}
                        onChange={e => setAccessTokenInput(e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button
                        type="button"
                        className="primary-button"
                        onClick={handleSaveAccessToken}
                        disabled={!accessTokenInput.trim()}
                        style={{ fontSize: '12px', padding: '6px 14px' }}
                      >
                        {isTh ? 'บันทึก Token' : 'Save Token'}
                      </button>
                      {isTokenSaved && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={handleClearAccessToken}
                          style={{ fontSize: '12px', padding: '6px 14px', borderColor: '#ef4444', color: '#fca5a5' }}
                        >
                          {isTh ? 'ลบ Token' : 'Clear Token'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </SettingCard>
            </div>
          )}

          {/* 5. PRIVACY */}
          {activeCategory === 'privacy' && (
            <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SettingCard
                title={isTh ? 'โหมดใช้งานภายในเครื่องเท่านั้น (Local-only Mode)' : 'Local-only Mode'}
                desc={isTh ? 'เมื่อเปิดโหมดนี้ คำขอทั้งหมดจะถูกบล็อกไม่ให้ส่งออกนอกเครื่อง local โดยเด็ดขาด' : 'Strictly prevents model traffic from leaving localhost.'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: serverSettings?.localOnly ? '#10b981' : '#f59e0b' }}>
                      {serverSettings?.localOnly
                        ? (isTh ? '🔒 Local-only Mode เปิดอยู่นโยบายปลอดภัยสูงสุด' : '🔒 Local-only Mode Active')
                        : (isTh ? '🌐 โหมดเชื่อมต่อภายนอก (ต้องได้รับการยินยอม)' : '🌐 Online Providers Allowed')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      {serverSettings?.localOnly
                        ? (isTh ? 'การประมวลผลเกิดขึ้นในเครื่อง 100%' : 'All traffic strictly stays on local bridge')
                        : (isTh ? 'สามารถใช้ผู้ให้บริการคลาวด์ภายนอกได้' : 'External cloud providers may be queried')}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`toggle-switch ${serverSettings?.localOnly ?? true ? 'on' : ''}`}
                    onClick={() => onLocalOnlyToggle(!(serverSettings?.localOnly ?? true))}
                    role="switch"
                    aria-checked={serverSettings?.localOnly ?? true}
                  >
                    <span />
                  </button>
                </div>
              </SettingCard>

              <SettingCard
                title={isTh ? 'การยินยอมเชื่อมต่อออนไลน์ (Explicit Online Consent)' : 'Explicit Online Consent'}
                desc={isTh ? 'การเชื่อมต่อคลาวด์ภายนอกต้องยืนยันการยินยอมอย่างชัดเจนก่อน' : 'Review and grant consent before allowing remote API calls.'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    {serverSettings?.onlineConsent
                      ? (isTh ? '✓ มีการบันทึกการยินยอมใช้บริการภายนอกแล้ว' : '✓ Online consent explicitly granted')
                      : (isTh ? 'ยังไม่ได้บันทึกการยินยอมใช้บริการภายนอก' : 'No online consent recorded')}
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={onConsentReview}
                    disabled={Boolean(serverSettings?.localEndpoint)}
                  >
                    <Network size={14} /> {isTh ? 'ตรวจสอบการยินยอม' : 'Review Consent'}
                  </button>
                </div>
              </SettingCard>

              <SettingCard
                title={isTh ? 'การควบคุมและล้างข้อมูลท้องถิ่น (Local Data & Cache Controls)' : 'Local Data & Cache Controls'}
                desc={isTh ? 'จัดการแคชที่เก็บบน บราวเซอร์ LocalStorage' : 'Manage browser local storage cache and saved history.'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    <b>LocalStorage Usage:</b> {Object.keys(localStorage).filter(k => k.startsWith('zyntheor.')).length} {isTh ? 'รายการแคช' : 'keys stored'}
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowClearCacheModal(true)}
                    style={{ borderColor: '#ef4444', color: '#fca5a5' }}
                  >
                    <Trash2 size={14} /> {isTh ? 'ล้างแคชท้องถิ่นทั้งหมด' : 'Clear Local Cache'}
                  </button>
                </div>
              </SettingCard>
            </div>
          )}

          {/* 6. SECURITY */}
          {activeCategory === 'security' && (
            <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SettingCard
                title={isTh ? 'สิทธิ์และเซสชันปัจจุบัน (Server Session & Role)' : 'Server Session & Role'}
                desc={isTh ? 'การยืนยันตัวตนและบทบาทของเซสชันที่เชื่อมต่อกับเซิร์ฟเวอร์' : 'Active server authenticated role and session token verification.'}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: '#0d1828', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>ACTIVE ROLE</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
                      {serverSession?.role ? serverSession.role.toUpperCase() : 'RESOLVING…'}
                    </div>
                  </div>

                  <div style={{ background: '#0d1828', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>MASTER TOKEN STATUS</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: serverSession?.isTokenVerified ? '#10b981' : '#94a3b8', marginTop: '2px' }}>
                      {serverSession?.isTokenVerified ? (isTh ? '✓ ยืนยัน Token แล้ว' : '✓ Verified') : (isTh ? 'โหมดเครื่อง Local (Open)' : 'Open Local Mode')}
                    </div>
                  </div>
                </div>
              </SettingCard>

              <SettingCard
                title={isTh ? 'การอนุมัติการแก้ไขจากมนุษย์ (Human Approval Gate)' : 'Human Approval Gate'}
                desc={isTh ? 'ต้องได้รับการยืนยันจากมนุษย์ก่อนดำเนินการเขียนไฟล์หรือรันสคริปต์' : 'Enforces manual approval modal before code mutation or execution.'}
              >
                <ToggleItem
                  label={isTh ? 'ต้องเปิดหน้าต่างขอยืนยันจากมนุษย์ (Human Approval Modal) เสมอเมื่อมีการปรับปรุงไฟล์ซอร์สโค้ด' : 'Always require human approval modal for codebase modifications'}
                  checked={draftSettings.requireHumanApproval}
                  onChange={v => updateDraft(p => ({ ...p, requireHumanApproval: v }))}
                />
              </SettingCard>

              <SettingCard
                title={isTh ? 'รายการตรวจสอบขอบเขตความปลอดภัย (Safety Boundaries Checklist)' : 'Safety Boundaries Checklist'}
                desc={isTh ? 'มาตรการความปลอดภัยที่ระบบบังคับใช้ตามสถาปัตยกรรม Sovereign' : 'Enforced safety contracts.'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#10b981" />
                    <span>API Key จะไม่ถูกส่งออกมาทาง Endpoint หรือ Network Logs บนบราวเซอร์</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#10b981" />
                    <span>คำขอภายนอกจะถูกบล็อกทันทีหากเปิด Local-only Mode</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#10b981" />
                    <span>การเรียกใช้งาน Shell หรือ Terminal Tools อยู่ภายใต้ Sandbox Isolate</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#10b981" />
                    <span>บันทึกเหตุการณ์ Audit Ledger ถูกป้องกันการแก้ไขด้วย SHA-256 Hash Chain & Ed25519 Digital Signatures</span>
                  </div>
                </div>
              </SettingCard>

              {/* Phase 5: Cryptographic Key Rotation Transparency Card */}
              <SettingCard
                title={isTh ? 'การหมุนเวียนกุญแจดิจิทัลและวงจรชีวิต (Cryptographic Key Rotation Lifecycle)' : 'Cryptographic Key Rotation Lifecycle'}
                desc={isTh ? 'รายการ Key ID สาธารณะทั้งหมดสำหรับยืนยันความถูกต้องของหลักฐาน (ไม่เปิดเผย Private Key Material)' : 'Public Key ID registry for verifying cryptographic evidence signatures without exposing private key material.'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                      <b>Active Signing Key ID:</b> <code style={{ color: '#38bdf8', padding: '2px 6px', background: '#0d1828', borderRadius: '4px', border: '1px solid #1e293b' }}>{activeKeyId || 'key-2026-v1'}</code> (Algorithm: <span style={{ color: '#34d399', fontWeight: 600 }}>Ed25519</span>)
                    </div>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleRotateSigningKey}
                      disabled={rotatingKey || keysLoading}
                      style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', borderColor: '#38bdf8', color: '#38bdf8' }}
                    >
                      <RotateCcw size={13} className={rotatingKey ? 'animate-spin' : ''} />
                      <span>{rotatingKey ? (isTh ? 'กำลังหมุนเวียนกุญแจ…' : 'Rotating Key…') : (isTh ? 'หมุนเวียนกุญแจ (Rotate Key)' : 'Rotate Signing Key')}</span>
                    </button>
                  </div>

                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginTop: '4px' }}>
                    {isTh ? 'กุญแจสาธารณะในระบบ (Active & Historical Key Registry):' : 'Registered Public Keys (Active & Historical):'}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                    {publicKeys.length === 0 ? (
                      <div style={{ fontSize: '11px', color: '#64748b', padding: '8px', background: '#0d1828', borderRadius: '6px' }}>
                        Loading public key registry...
                      </div>
                    ) : (
                      publicKeys.map(k => (
                        <div
                          key={k.keyId}
                          style={{
                            padding: '8px 12px',
                            background: k.status === 'ACTIVE' ? '#07202c' : '#0d1828',
                            border: `1px solid ${k.status === 'ACTIVE' ? '#0284c7' : '#1e293b'}`,
                            borderRadius: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '11px',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 'bold', color: k.status === 'ACTIVE' ? '#38bdf8' : '#e2e8f0' }}>
                              {k.keyId}
                            </span>
                            <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '8px' }}>
                              Created: {new Date(k.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#a78bfa' }}>{k.algorithm}</span>
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: k.status === 'ACTIVE' ? 'rgba(16,185,129,0.2)' : 'rgba(148,163,184,0.2)',
                                color: k.status === 'ACTIVE' ? '#34d399' : '#94a3b8',
                              }}
                            >
                              {k.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ padding: '8px 12px', background: '#070c18', border: '1px solid #1e293b', borderRadius: '6px', fontSize: '10px', color: '#64748b' }}>
                    🔒 <b>Private Key Isolation Guarantee:</b> Private key material is stored exclusively in server memory and is never transmitted over API responses or exposed to client-side bundles.
                  </div>
                </div>
              </SettingCard>
            </div>
          )}

          {/* 7. TOOLS */}
          {activeCategory === 'tools' && (
            <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SettingCard
                title={isTh ? 'สิทธิ์การเข้าถึงพื้นที่ทำงาน (Workspace File Gateway)' : 'Workspace File Gateway'}
                desc={isTh ? 'ควบคุมสิทธิ์การอ่านและตรวจดูไฟล์ในโครงการ' : 'Control file gateway access and read limits.'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <ToggleItem
                    label={isTh ? 'อนุญาตให้ AI อ่านเนื้อหาไฟล์ในโครงการเพื่อวิเคราะห์' : 'Allow AI to inspect workspace code files'}
                    checked={draftSettings.workspaceReadEnabled}
                    onChange={v => updateDraft(p => ({ ...p, workspaceReadEnabled: v }))}
                  />

                  <ToggleItem
                    label={isTh ? 'เปิดใช้เครื่องมือเปรียบเทียบ Forensic Diff Viewer' : 'Enable Forensic Code Diff Viewer'}
                    checked={draftSettings.codeDiffEnabled}
                    onChange={v => updateDraft(p => ({ ...p, codeDiffEnabled: v }))}
                  />

                  <ToggleItem
                    label={isTh ? 'เปิดระบบ Sandbox Isolation สำหรับการทดลองรันสคริปต์' : 'Enable Sandbox Isolation for execution'}
                    checked={draftSettings.sandboxIsolated}
                    onChange={v => updateDraft(p => ({ ...p, sandboxIsolated: v }))}
                  />
                </div>
              </SettingCard>
            </div>
          )}

          {/* 8. NOTIFICATIONS */}
          {activeCategory === 'notifications' && (
            <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SettingCard
                title={isTh ? 'ตั้งค่าการแจ้งเตือนตามประเภทเหตุการณ์ (Event Categories)' : 'Notification Event Types'}
                desc={isTh ? 'เลือกประเภทเหตุการณ์ที่ต้องการให้ระบบแจ้งเตือน' : 'Select notification alerts.'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <ToggleItem
                    label={isTh ? 'แจ้งเตือนเหตุการณ์ระบบและสถานะเซิร์ฟเวอร์ (System Ready / Server Events)' : 'Notify system & server status events'}
                    checked={draftSettings.notifySystemEvents}
                    onChange={v => updateDraft(p => ({ ...p, notifySystemEvents: v }))}
                  />

                  <ToggleItem
                    label={isTh ? 'แจ้งเตือนเมื่อโมเดลไม่พร้อมใช้งาน หรือเมื่อเกิด Fallback' : 'Notify model offline and fallback alerts'}
                    checked={draftSettings.notifyModelEvents}
                    onChange={v => updateDraft(p => ({ ...p, notifyModelEvents: v }))}
                  />

                  <ToggleItem
                    label={isTh ? 'แจ้งเตือนความคืบหน้าการเทรน LoRA (Training Events)' : 'Notify LoRA training status events'}
                    checked={draftSettings.notifyTrainingEvents}
                    onChange={v => updateDraft(p => ({ ...p, notifyTrainingEvents: v }))}
                  />

                  <ToggleItem
                    label={isTh ? 'แจ้งเตือนความปลอดภัยเมื่อถูกบล็อกคำขอ (Security Alerts)' : 'Notify security blocks and access denials'}
                    checked={draftSettings.notifySecurityAlerts}
                    onChange={v => updateDraft(p => ({ ...p, notifySecurityAlerts: v }))}
                  />
                </div>
              </SettingCard>

              <SettingCard
                title={isTh ? 'เวลาแสดงข้อความแจ้งเตือน (Toast Duration & Quiet Mode)' : 'Toast Duration & Quiet Mode'}
                desc={isTh ? 'กำหนดระยะเวลาแสดงผลป้ายแจ้งเตือน' : 'Configure toast display time and quiet mode.'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>
                      {isTh ? `ระยะเวลาแสดง Toast (${draftSettings.toastDurationSeconds} วินาที)` : `Toast Duration (${draftSettings.toastDurationSeconds}s)`}
                    </label>
                    <input
                      type="range"
                      min={2}
                      max={10}
                      value={draftSettings.toastDurationSeconds}
                      onChange={e => updateDraft(p => ({ ...p, toastDurationSeconds: Number(e.target.value) }))}
                      style={{ width: '100%', accentColor: '#14b8a6' }}
                    />
                  </div>

                  <ToggleItem
                    label={isTh ? 'เปิด Quiet Mode (ซ่อนการแจ้งเตือนที่ไม่สำคัญ)' : 'Enable Quiet Mode (mute non-critical alerts)'}
                    checked={draftSettings.quietMode}
                    onChange={v => updateDraft(p => ({ ...p, quietMode: v }))}
                  />
                </div>
              </SettingCard>
            </div>
          )}

          {/* 9. SYSTEM */}
          {activeCategory === 'system' && (
            <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SettingCard
                title={isTh ? 'ข้อมูลฮาร์ดแวร์จริง (Real Hardware Telemetry)' : 'Real Hardware Telemetry'}
                desc={isTh ? 'อ่านค่าจากเซิร์ฟเวอร์จริง ไม่มีการสร้างตัวเลขจำลอง' : 'Live system hardware probe from server.'}
              >
                {hardwareLoading ? (
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{isTh ? 'กำลังอ่านข้อมูลฮาร์ดแวร์…' : 'Reading telemetry…'}</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    <MetricCard
                      label="CPU & PLATFORM"
                      value={hardwareInfo?.hardware?.platform || 'Linux x64'}
                      hint="Local Server Runtime"
                    />
                    <MetricCard
                      label="RAM TOTAL"
                      value={`${hardwareInfo?.hardware?.ramGb || '16.0'} GB`}
                      hint="System Physical Memory"
                    />
                    <MetricCard
                      label="GPU ACCELERATOR"
                      value={hardwareInfo?.hardware?.gpuAvailable ? 'GPU Detected' : 'CPU Only'}
                      hint={hardwareInfo?.hardware?.assessment || 'Ready'}
                    />
                    <MetricCard
                      label="STORAGE FREE"
                      value={`${hardwareInfo?.hardware?.diskFreeGb ?? 'unavailable'} GB`}
                      hint="Local Disk Capacity"
                    />
                  </div>
                )}
              </SettingCard>

              <SettingCard
                title={isTh ? 'สถานะความสมบูรณ์ของเซิร์ฟเวอร์ (Server Runtime Health)' : 'Server Runtime Health'}
                desc={isTh ? 'ข้อมูลกระบวนการทำงานและเวลาเปิดเครื่อง' : 'Process uptime and versioning.'}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                  <div style={{ background: '#0d1828', padding: '10px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <span style={{ color: '#64748b' }}>EDITION / VERSION:</span>
                    <div style={{ color: '#f1f5f9', fontWeight: 600, marginTop: '2px' }}>
                      {hardwareInfo?.edition || 'Buffalo Edition 0.9.0'}
                    </div>
                  </div>

                  <div style={{ background: '#0d1828', padding: '10px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <span style={{ color: '#64748b' }}>SERVER STATUS:</span>
                    <div style={{ color: '#10b981', fontWeight: 600, marginTop: '2px' }}>
                      {serverSettings?.serverStatus || 'SERVER_READY'}
                    </div>
                  </div>
                </div>
              </SettingCard>
            </div>
          )}

          {/* 10. ADVANCED */}
          {activeCategory === 'advanced' && (
            <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SettingCard
                title={isTh ? 'การวินิจฉัยและบันทึกข้อผิดพลาด (Diagnostics & Error Logs)' : 'Diagnostics & System Errors'}
                desc={isTh ? 'ตรวจสอบรายการข้อผิดพลาดในระบบ' : 'Inspect system error logs and smart diagnostics.'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    <b>System Errors Logged:</b> {errorLogsCount} {isTh ? 'รายการ' : 'entries'}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => onSelectPage('Diagnostics')}
                    >
                      <Activity size={14} /> {isTh ? 'เปิดหน้าวินิจฉัย' : 'Open Diagnostics'}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => onSelectPage('Audit Ledger')}
                    >
                      <ShieldCheck size={14} /> {isTh ? 'เปิด Audit Ledger' : 'View Audit Ledger'}
                    </button>
                  </div>
                </div>
              </SettingCard>

              <SettingCard
                title={isTh ? 'สำรองและคืนค่าการตั้งค่า (Backup & Restore Configuration)' : 'Backup & Restore Configuration'}
                desc={isTh ? 'ส่งออกการตั้งค่าเป็นไฟล์ JSON หรือนำเข้าไฟล์การตั้งค่าที่เคยสำรองไว้' : 'Export or import system settings backup file.'}
              >
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleExportConfig}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} /> {isTh ? 'ส่งออกไฟล์การตั้งค่า (JSON)' : 'Export Backup JSON'}
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowImportModal(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Upload size={14} /> {isTh ? 'นำเข้าไฟล์การตั้งค่า' : 'Import Backup JSON'}
                  </button>
                </div>
              </SettingCard>

              <SettingCard
                title={isTh ? 'การรีเซ็ตระบบเป็นค่าเริ่มต้น (Reset All Settings)' : 'Reset System Settings'}
                desc={isTh ? 'คืนค่าการตั้งค่าทั้งหมดของแอปกลับเป็นค่าเริ่มต้นตามมาตรฐาน' : 'Reset all settings to default values.'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {isTh ? 'การดำเนินการนี้จะล้างการตั้งค่าท้องถิ่นและคืนค่าเริ่มต้นทั้งหมด' : 'Restores default preferences across all 10 categories.'}
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowResetConfirmModal(true)}
                    style={{ borderColor: '#ef4444', color: '#fca5a5' }}
                  >
                    <RotateCcw size={14} /> {isTh ? 'รีเซ็ตเป็นค่าเริ่มต้น' : 'Reset to Defaults'}
                  </button>
                </div>
              </SettingCard>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Confirmation for Reset Defaults */}
      {showResetConfirmModal && (
        <ModalBackdrop close={() => setShowResetConfirmModal(false)}>
          <div style={{ padding: '20px', maxWidth: '420px', background: '#111f32', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', fontSize: '16px', fontWeight: 700 }}>
              <AlertTriangle size={20} />
              {isTh ? 'ยืนยันการรีเซ็ตเป็นค่าเริ่มต้น?' : 'Confirm System Reset?'}
            </div>
            <p style={{ margin: '12px 0', fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
              {isTh
                ? 'คุณแน่ใจหรือไม่ว่าต้องการคืนค่าการตั้งค่าทั้ง 10 หมวดหมู่กลับสู่ค่าเริ่มต้นของระบบ? การเปลี่ยนแปลงที่ยังไม่ได้บันทึกจะถูกลบออก'
                : 'Are you sure you want to restore all settings across 10 categories to default system values?'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button type="button" className="secondary-button" onClick={() => setShowResetConfirmModal(false)}>
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleResetDefaults}
                style={{ background: '#ef4444', color: '#ffffff' }}
              >
                {isTh ? 'ยืนยันการรีเซ็ต' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* MODAL: Confirmation for Clear Local Cache */}
      {showClearCacheModal && (
        <ModalBackdrop close={() => setShowClearCacheModal(false)}>
          <div style={{ padding: '20px', maxWidth: '420px', background: '#111f32', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', fontSize: '16px', fontWeight: 700 }}>
              <Trash2 size={20} />
              {isTh ? 'ยืนยันการล้างแคชท้องถิ่น?' : 'Clear Local Storage Cache?'}
            </div>
            <p style={{ margin: '12px 0', fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
              {isTh
                ? 'การล้างแคชจะลบข้อมูลที่บันทึกไว้ในบราวเซอร์ (zyntheor.*) และจะทำการรีโหลดหน้าเว็บใหม่'
                : 'Clearing local storage will remove saved client cache and refresh the browser tab.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button type="button" className="secondary-button" onClick={() => setShowClearCacheModal(false)}>
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleClearLocalStorageCache}
                style={{ background: '#ef4444', color: '#ffffff' }}
              >
                {isTh ? 'ยืนยันล้างแคช' : 'Clear Cache'}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* MODAL: Import Config JSON */}
      {showImportModal && (
        <ModalBackdrop close={() => setShowImportModal(false)}>
          <div style={{ padding: '20px', width: '90vw', maxWidth: '520px', background: '#111f32', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>
              {isTh ? 'นำเข้าไฟล์การตั้งค่า (Import Configuration)' : 'Import Configuration JSON'}
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#94a3b8' }}>
              {isTh ? 'วางข้อความ JSON การตั้งค่าที่เคยส่งออกไว้ที่นี่' : 'Paste the exported JSON backup string below.'}
            </p>
            <textarea
              value={importJsonText}
              onChange={e => setImportJsonText(e.target.value)}
              placeholder='{"app": "ZYNTHEOR AI ENGINE", "settings": {...}}'
              rows={6}
              style={{ ...textareaStyle, fontFamily: 'monospace', fontSize: '11px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button type="button" className="secondary-button" onClick={() => setShowImportModal(false)}>
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleImportConfig}
                disabled={!importJsonText.trim()}
                style={{ background: '#14b8a6', color: '#080f1b' }}
              >
                {isTh ? 'ปรับใช้การตั้งค่า' : 'Apply Config'}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </section>
  );
}

// Sub-components & Helpers

function SettingCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#111f32',
        border: '1px solid rgba(148, 163, 184, 0.14)',
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>{title}</h3>
        <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#94a3b8' }}>{desc}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ToggleItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <span style={{ fontSize: '13px', color: '#cbd5e1' }}>{label}</span>
      <button
        type="button"
        className={`toggle-switch ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
      >
        <span />
      </button>
    </div>
  );
}

function ProviderCard({ name, type, status, detail, isLocal }: { name: string; type: string; status: string; detail: string; isLocal?: boolean }) {
  return (
    <div
      style={{
        background: '#0d1828',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>{name}</span>
        <span
          style={{
            fontSize: '9px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            background: isLocal ? 'rgba(20,184,166,0.2)' : 'rgba(56,189,248,0.2)',
            color: isLocal ? '#2dd4bf' : '#38bdf8',
          }}
        >
          {type}
        </span>
      </div>
      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{detail}</div>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div style={{ background: '#0d1828', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: 700, color: '#38bdf8', margin: '3px 0' }}>{value}</div>
      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{hint}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let bg = '#1e293b';
  let color = '#94a3b8';
  let text = status;

  if (status === 'INFERENCE_READY' || status === 'SERVER_READY') {
    bg = 'rgba(16, 185, 129, 0.2)';
    color = '#10b981';
    text = 'INFERENCE READY';
  } else if (status === 'BLOCKED_BY_LOCAL_ONLY') {
    bg = 'rgba(245, 158, 11, 0.2)';
    color = '#f59e0b';
    text = 'BLOCKED (LOCAL ONLY)';
  } else if (status === 'MODEL_UNAVAILABLE') {
    bg = 'rgba(239, 68, 68, 0.2)';
    color = '#ef4444';
    text = 'MODEL UNAVAILABLE';
  }

  return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: bg, color }}>
      {text}
    </span>
  );
}

function ModalBackdrop({ close, children }: { close: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8, 15, 27, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={e => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {children}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: '#0d1828',
  border: '1px solid #26364d',
  color: '#f1f5f9',
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '13px',
  cursor: 'pointer',
  outline: 'none',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0d1828',
  border: '1px solid #26364d',
  color: '#f1f5f9',
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '13px',
  outline: 'none',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  background: '#0d1828',
  border: '1px solid #26364d',
  color: '#f1f5f9',
  padding: '10px 12px',
  borderRadius: '8px',
  fontSize: '13px',
  lineHeight: 1.5,
  outline: 'none',
  resize: 'vertical',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  marginBottom: '4px',
};
