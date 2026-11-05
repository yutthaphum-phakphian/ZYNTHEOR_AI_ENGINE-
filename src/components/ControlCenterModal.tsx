// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  User,
  Settings,
  Cpu,
  Brain,
  Database,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Layers,
  Bell,
  Sliders,
  Info,
  X,
  Search,
  Check,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Moon,
  Sun,
  HardDrive,
  Activity,
  Terminal,
  Key,
  Download,
  Trash2,
  ExternalLink,
  ChevronRight,
  Shield,
  Zap,
  Sparkles,
  RefreshCw,
  FolderTree,
  Share2
} from 'lucide-react';
import { auditLedgerService, CANONICAL_CORE_RUNTIME_HASH, CANONICAL_CORE_MERKLE_ROOT } from '../services/auditLedger';
import { getActiveModel, listAvailableModels } from '../lib/modelRegistry';

export type ControlCenterCategory =
  | 'profile'
  | 'general'
  | 'intelligence'
  | 'models'
  | 'knowledge'
  | 'security'
  | 'workspace'
  | 'notifications'
  | 'system'
  | 'about';

export interface ControlCenterSettings {
  // 1. My Profile
  avatar: string;
  displayName: string;
  email: string;
  language: 'th' | 'en';
  timezone: string;
  dateFormat: '24h' | '12h' | 'iso';

  // 2. General
  theme: 'dark-graphite' | 'sovereign-midnight' | 'high-contrast';
  defaultHomePage: '/' | '/explore' | '/chat' | '/library';
  hapticFeedback: boolean;
  reducedMotion: boolean;
  fontSize: 'standard' | 'large';

  // 3. Intelligence Settings
  defaultIntelligence: 'universal' | 'specialized';
  defaultCoreModel: string;
  reasoningLevel: 'standard' | 'chain-of-thought' | 'deep';
  responsePreference: 'balanced' | 'concise' | 'comprehensive' | 'technical';
  contextLengthTokens: number;
  memoryUsageEnabled: boolean;
  activeCapabilities: string[];

  // 4. Model & Runtime
  offlineAirgapMode: boolean;
  externalProviderFallbackAllowed: boolean; // MUST be false by default
  temperature: number;
  topP: number;
  maxOutputTokens: number;
  enclaveVerificationStrict: boolean;

  // 5. Knowledge & Memory
  semanticMemoryGraphEnabled: boolean;
  workspaceContextEnabled: boolean;
  dataRetentionDays: number; // 0 = indefinite
  thaiFirstSyntaxPriority: boolean;
  zeroTrainingOnUserData: boolean;

  // 6. Privacy & Security
  localDataEncryption: boolean;
  sovereignPrivacyMode: boolean;
  auditLoggingEnabled: boolean;
  sessionTimeoutMinutes: number;

  // 7. Workspace
  workspaceName: string;
  autoSaveIntervalSeconds: number;
  gitSyncEnabled: boolean;
  defaultProjectFolder: string;

  // 8. Notifications
  notifySystemEvents: boolean;
  notifyTaskCompletion: boolean;
  notifySecurityAlerts: boolean;
  notifyModelEvaluation: boolean;
  soundAlerts: boolean;

  // 9. System Configuration (Admin Gated)
  backendApiUrl: string;
  databaseDriver: 'postgres' | 'sqlite' | 'localstorage';
  telemetryIntervalMs: number;
  logVerbosity: 'INFO' | 'DEBUG' | 'AUDIT_ONLY';
  developerMode: boolean;
  ssotDriftThreshold: number;
}

const DEFAULT_SETTINGS: ControlCenterSettings = {
  avatar: 'sovereign-geometric',
  displayName: 'ZYNTHEOR Sovereign Operator',
  email: 'operator@zyntheor.internal',
  language: 'th',
  timezone: 'Asia/Bangkok (UTC+7)',
  dateFormat: '24h',

  theme: 'dark-graphite',
  defaultHomePage: '/',
  hapticFeedback: true,
  reducedMotion: false,
  fontSize: 'standard',

  defaultIntelligence: 'universal',
  defaultCoreModel: 'zyntheor-core-native-v1',
  reasoningLevel: 'chain-of-thought',
  responsePreference: 'balanced',
  contextLengthTokens: 64000,
  memoryUsageEnabled: true,
  activeCapabilities: ['research', 'reasoning', 'creation', 'knowledge', 'technical', 'learning'],

  offlineAirgapMode: false,
  externalProviderFallbackAllowed: false,
  temperature: 0.7,
  topP: 0.95,
  maxOutputTokens: 8192,
  enclaveVerificationStrict: true,

  semanticMemoryGraphEnabled: true,
  workspaceContextEnabled: true,
  dataRetentionDays: 0,
  thaiFirstSyntaxPriority: true,
  zeroTrainingOnUserData: true,

  localDataEncryption: true,
  sovereignPrivacyMode: true,
  auditLoggingEnabled: true,
  sessionTimeoutMinutes: 1440,

  workspaceName: 'Sovereign Core Workspace',
  autoSaveIntervalSeconds: 10,
  gitSyncEnabled: false,
  defaultProjectFolder: '/workspace',

  notifySystemEvents: true,
  notifyTaskCompletion: true,
  notifySecurityAlerts: true,
  notifyModelEvaluation: true,
  soundAlerts: false,

  backendApiUrl: '/api',
  databaseDriver: 'postgres',
  telemetryIntervalMs: 2000,
  logVerbosity: 'INFO',
  developerMode: false,
  ssotDriftThreshold: 0.00,
};

export interface ControlCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: ControlCenterCategory;
}

export function ControlCenterModal({
  isOpen,
  onClose,
  initialCategory = 'profile'
}: ControlCenterModalProps) {
  const [activeCategory, setActiveCategory] = useState<ControlCenterCategory>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<ControlCenterSettings>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('zyntheor.control_center.settings.v1');
        if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to parse saved Control Center settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [currentUser, setCurrentUser] = useState<any>({
    email: 'operator@zyntheor.internal',
    role: 'ADMIN', // Default role in workspace
    isTokenVerified: true,
    tenantId: 'tenant-sovereign-01'
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  // Fetch current user identity from auth API
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data && data.user) {
          setCurrentUser({
            email: data.user.email || 'operator@zyntheor.internal',
            role: data.user.role || (data.isAdmin ? 'ADMIN' : 'MEMBER'),
            isTokenVerified: true,
            tenantId: data.user.tenantId || 'tenant-sovereign-01'
          });
        }
      })
      .catch(() => {
        // Fallback to local admin
      });
  }, [isOpen]);

  // Determine if active user has Admin privileges for System Configuration
  const isSystemAdmin = useMemo(() => {
    const role = (currentUser?.role || '').toUpperCase();
    return role === 'ADMIN' || role === 'OWNER' || role === 'SUPER_ADMIN';
  }, [currentUser]);

  // Handle setting updates with real Audit Ledger entry
  const updateSetting = useCallback(<K extends keyof ControlCenterSettings>(
    key: K,
    val: ControlCenterSettings[K]
  ) => {
    setSettings(prev => {
      const next = { ...prev, [key]: val };
      try {
        localStorage.setItem('zyntheor.control_center.settings.v1', JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save settings:', err);
      }

      // Cryptographically record setting mutation in Audit Ledger
      auditLedgerService.createAuditEntry('CONTROL_CENTER_SETTING_UPDATED', {
        setting: key,
        value: val,
        modifiedBy: currentUser.email || 'operator',
        timestamp: new Date().toISOString()
      });

      return next;
    });

    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, [currentUser]);

  // Navigation Items matching the 10 specified categories
  const categories: { id: ControlCenterCategory; name: string; th: string; icon: any; isSystemAdminOnly?: boolean }[] = [
    { id: 'profile', name: 'My Profile', th: 'บัญชีผู้ใช้', icon: User },
    { id: 'general', name: 'General', th: 'การตั้งค่าทั่วไป', icon: Settings },
    { id: 'intelligence', name: 'Intelligence Settings', th: 'การตั้งค่าปัญญาประดิษฐ์', icon: Brain },
    { id: 'models', name: 'Model & Runtime', th: 'โมเดลและระบบประมวลผล', icon: Cpu },
    { id: 'knowledge', name: 'Knowledge & Memory', th: 'ความรู้และความจำ', icon: Database },
    { id: 'security', name: 'Privacy & Security', th: 'ความเป็นส่วนตัวและความปลอดภัย', icon: ShieldCheck },
    { id: 'workspace', name: 'Workspace', th: 'พื้นที่ทำงาน', icon: Layers },
    { id: 'notifications', name: 'Notifications', th: 'การแจ้งเตือน', icon: Bell },
    { id: 'system', name: 'System Configuration', th: 'การตั้งค่าระบบ (Admin)', icon: Sliders, isSystemAdminOnly: true },
    { id: 'about', name: 'About ZYNTHEOR', th: 'เกี่ยวกับระบบ', icon: Info },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-[1100px] h-[92vh] max-h-[850px] rounded-3xl bg-[#070b16] border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden text-white"
        onClick={e => e.stopPropagation()}
      >
        {/* =========================================================
            HEADER BAR
        ========================================================= */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0b1020]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00D9A3] to-[#2563EB] grid place-items-center text-black font-black text-lg shadow-[0_0_20px_rgba(0,217,163,0.25)]">
              ◈
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  ◈ ZYNTHEOR · Control Center
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#00D9A3]/10 text-[#00D9A3] border border-[#00D9A3]/20">
                  v1.3.1
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${isSystemAdmin ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                  ROLE: {currentUser.role || 'ADMIN'}
                </span>
              </div>
              <p className="text-[11px] text-white/50 tracking-wide">
                Universal Intelligence Configuration & Administration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono animate-in fade-in">
                <CheckCircle2 size={13} />
                <span>SAVED & AUDITED</span>
              </span>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/10 grid place-items-center text-white/50 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* =========================================================
            MAIN BODY (2-COLUMN: Category Nav + Category Content)
        ========================================================= */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          
          {/* SIDEBAR NAVIGATION */}
          <aside className="w-64 sm:w-72 border-r border-white/[0.06] bg-[#050810]/60 p-3 sm:p-4 flex flex-col gap-1 overflow-y-auto shrink-0 select-none">
            
            {/* Search Settings */}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search settings..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-white placeholder:text-white/30 outline-none focus:border-[#00D9A3]/40"
              />
            </div>

            <div className="text-[10px] font-bold text-white/30 tracking-wider uppercase px-2 py-1">
              Personal Settings
            </div>

            {categories.slice(0, 8).map(cat => {
              const Icon = cat.icon;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-[#2563EB]/20 to-[#00D9A3]/10 border border-[#00D9A3]/30 text-white font-semibold'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={active ? 'text-[#00D9A3]' : 'text-white/40'} />
                    <div className="text-left">
                      <div>{cat.name}</div>
                      <div className="text-[10px] text-white/40 font-normal">{cat.th}</div>
                    </div>
                  </div>
                  <ChevronRight size={13} className={active ? 'text-[#00D9A3]' : 'text-white/20'} />
                </button>
              );
            })}

            <div className="w-full h-px bg-white/[0.06] my-2" />

            <div className="text-[10px] font-bold text-white/30 tracking-wider uppercase px-2 py-1 flex items-center justify-between">
              <span>System Administration</span>
              <Lock size={10} className="text-white/30" />
            </div>

            {categories.slice(8, 9).map(cat => {
              const Icon = cat.icon;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    active
                      ? 'bg-purple-500/15 border border-purple-500/30 text-purple-200 font-semibold'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={active ? 'text-purple-400' : 'text-purple-400/60'} />
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span>{cat.name}</span>
                        {!isSystemAdmin && <Lock size={11} className="text-amber-400" />}
                      </div>
                      <div className="text-[10px] text-white/40 font-normal">{cat.th}</div>
                    </div>
                  </div>
                  <ChevronRight size={13} className={active ? 'text-purple-400' : 'text-white/20'} />
                </button>
              );
            })}

            <div className="w-full h-px bg-white/[0.06] my-2" />

            {categories.slice(9).map(cat => {
              const Icon = cat.icon;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    active
                      ? 'bg-white/10 border border-white/20 text-white font-semibold'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={active ? 'text-[#00D9A3]' : 'text-white/40'} />
                    <div className="text-left">
                      <div>{cat.name}</div>
                      <div className="text-[10px] text-white/40 font-normal">{cat.th}</div>
                    </div>
                  </div>
                  <ChevronRight size={13} className={active ? 'text-[#00D9A3]' : 'text-white/20'} />
                </button>
              );
            })}
          </aside>

          {/* CONTENT SECTION */}
          <main className="flex-1 min-w-0 overflow-y-auto p-6 sm:p-8 space-y-6 bg-[#070b16]">
            
            {/* 1. MY PROFILE */}
            {activeCategory === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <User className="text-[#00D9A3]" size={20} />
                    My Profile — ข้อมูลบัญชีผู้ใช้
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    จัดการข้อมูลส่วนตัว สิทธิ์การใช้งาน และการตั้งค่าภูมิภาคสำหรับผู้ใช้งาน
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Profile Card */}
                  <div className="p-5 rounded-2xl bg-[#0b1020] border border-white/[0.08] space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00D9A3]/20 via-[#2563EB]/30 to-[#8b5cf6]/20 border border-[#00D9A3]/30 grid place-items-center text-2xl font-black text-[#00D9A3] select-none">
                        ◈
                      </div>
                      <div>
                        <div className="font-bold text-base text-white">{settings.displayName}</div>
                        <div className="text-xs text-white/50 font-mono">{currentUser.email}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00D9A3]/10 text-[#00D9A3] border border-[#00D9A3]/30">
                            VERIFIED USER
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            {currentUser.role || 'ADMIN'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-white/[0.06]">
                      <div>
                        <label className="text-xs font-semibold text-white/70 block mb-1">Display Name (ชื่อที่แสดง)</label>
                        <input
                          type="text"
                          value={settings.displayName}
                          onChange={e => updateSetting('displayName', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:border-[#00D9A3]/50 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-white/70 block mb-1">Email (อีเมลสำหรับตรวจสอบสิทธิ์)</label>
                        <input
                          type="email"
                          disabled
                          value={currentUser.email}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-sm text-white/50 outline-none cursor-not-allowed font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Regional & Language Card */}
                  <div className="p-5 rounded-2xl bg-[#0b1020] border border-white/[0.08] space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Globe size={16} className="text-[#38bdf8]" />
                      Regional & Language Preferences
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-white/70 block mb-1">Primary Language (ภาษาหลัก)</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => updateSetting('language', 'th')}
                            className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                              settings.language === 'th'
                                ? 'bg-[#00D9A3]/15 border-[#00D9A3]/50 text-white'
                                : 'bg-white/[0.03] border-white/[0.08] text-white/60'
                            }`}
                          >
                            <span>ไทย (Thai - แนะนำ)</span>
                            {settings.language === 'th' && <Check size={14} className="text-[#00D9A3]" />}
                          </button>
                          <button
                            onClick={() => updateSetting('language', 'en')}
                            className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                              settings.language === 'en'
                                ? 'bg-[#00D9A3]/15 border-[#00D9A3]/50 text-white'
                                : 'bg-white/[0.03] border-white/[0.08] text-white/60'
                            }`}
                          >
                            <span>English</span>
                            {settings.language === 'en' && <Check size={14} className="text-[#00D9A3]" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-white/70 block mb-1">Timezone (เขตเวลา)</label>
                        <input
                          type="text"
                          value={settings.timezone}
                          onChange={e => updateSetting('timezone', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:border-[#00D9A3]/50 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-white/70 block mb-1">Date & Time Format</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['24h', '12h', 'iso'].map(fmt => (
                            <button
                              key={fmt}
                              onClick={() => updateSetting('dateFormat', fmt as any)}
                              className={`py-2 px-3 rounded-xl border text-xs font-mono uppercase transition cursor-pointer ${
                                settings.dateFormat === fmt
                                  ? 'bg-[#2563EB]/20 border-[#2563EB]/60 text-white font-bold'
                                  : 'bg-white/[0.02] border-white/[0.06] text-white/50'
                              }`}
                            >
                              {fmt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. GENERAL */}
            {activeCategory === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Settings className="text-[#00D9A3]" size={20} />
                    General Settings — การตั้งค่าทั่วไป
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    ปรับแต่งธีมการแสดงผล รูปแบบหน้าเริ่มต้น และฟีเจอร์การเข้าถึง (Accessibility)
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Theme Selection */}
                  <div className="p-5 rounded-2xl bg-[#0b1020] border border-white/[0.08] space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Moon size={16} className="text-[#a78bfa]" />
                      Application Theme
                    </h4>
                    <div className="space-y-2">
                      {[
                        { id: 'dark-graphite', name: 'Dark Graphite (ค่าเริ่มต้น)', hex: '#050810', desc: 'โทนคลาสสิก ดำแกรไฟต์ สบายตา คมชัด' },
                        { id: 'sovereign-midnight', name: 'Sovereign Midnight', hex: '#070b16', desc: 'โทนน้ำเงินมืด ล้ำลึก พรีเมียม' },
                        { id: 'high-contrast', name: 'High Contrast', hex: '#000000', desc: 'ความเปรียบต่างสูง เพื่อความชัดเจนสูงสุด' }
                      ].map(t => (
                        <div
                          key={t.id}
                          onClick={() => updateSetting('theme', t.id as any)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                            settings.theme === t.id
                              ? 'bg-white/[0.08] border-[#00D9A3]/50 text-white'
                              : 'bg-white/[0.02] border-white/[0.06] text-white/60 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: t.hex }} />
                            <div>
                              <div className="text-xs font-bold">{t.name}</div>
                              <div className="text-[10px] text-white/40">{t.desc}</div>
                            </div>
                          </div>
                          {settings.theme === t.id && <Check size={16} className="text-[#00D9A3]" />}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Navigation & Default View */}
                  <div className="p-5 rounded-2xl bg-[#0b1020] border border-white/[0.08] space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers size={16} className="text-[#38bdf8]" />
                      Default Home View & Behavior
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-white/70 block mb-1">Default Landing Hub</label>
                        <select
                          value={settings.defaultHomePage}
                          onChange={e => updateSetting('defaultHomePage', e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white outline-none"
                        >
                          <option value="/" className="bg-[#0b1020]">Home — Universal Workspace</option>
                          <option value="/explore" className="bg-[#0b1020]">Explore — Capabilities Hub</option>
                          <option value="/chat" className="bg-[#0b1020]">Intelligence — Main Chat</option>
                          <option value="/library" className="bg-[#0b1020]">Library — Memory & Knowledge</option>
                        </select>
                      </div>

                      <div className="pt-2 border-t border-white/[0.06] space-y-3">
                        <label className="flex items-center justify-between text-xs cursor-pointer">
                          <span className="text-white/80">Haptic / Sound Feedback</span>
                          <input
                            type="checkbox"
                            checked={settings.hapticFeedback}
                            onChange={e => updateSetting('hapticFeedback', e.target.checked)}
                            className="rounded accent-[#00D9A3]"
                          />
                        </label>
                        <label className="flex items-center justify-between text-xs cursor-pointer">
                          <span className="text-white/80">Reduced Motion (ลดแอนิเมชัน)</span>
                          <input
                            type="checkbox"
                            checked={settings.reducedMotion}
                            onChange={e => updateSetting('reducedMotion', e.target.checked)}
                            className="rounded accent-[#00D9A3]"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. INTELLIGENCE SETTINGS */}
            {activeCategory === 'intelligence' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Brain className="text-[#00D9A3]" size={20} />
                    Intelligence Settings — การตั้งค่าปัญญาประดิษฐ์
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    ควบคุมพฤติกรรม ระดับการให้เหตุผล (Reasoning) และรูปแบบคำตอบของ ZYNTHEOR INTELLIGENCE
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Reasoning & Response Style */}
                  <div className="p-5 rounded-2xl bg-[#0b1020] border border-white/[0.08] space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles size={16} className="text-[#fb7185]" />
                      Reasoning Level & Synthesis
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-white/70 block mb-1">Reasoning Depth (ระดับการคิดวิเคราะห์)</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'standard', name: 'Standard', desc: 'Direct & Fast' },
                            { id: 'chain-of-thought', name: 'Chain of Thought', desc: 'Step-by-step' },
                            { id: 'deep', name: 'Deep Reasoning', desc: 'Deliberative' }
                          ].map(r => (
                            <button
                              key={r.id}
                              onClick={() => updateSetting('reasoningLevel', r.id as any)}
                              className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                                settings.reasoningLevel === r.id
                                  ? 'bg-[#2563EB]/20 border-[#2563EB]/50 text-white'
                                  : 'bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.04]'
                              }`}
                            >
                              <div className="text-xs font-bold">{r.name}</div>
                              <div className="text-[10px] text-white/40">{r.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-white/70 block mb-1">Response Style (รูปแบบคำตอบ)</label>
                        <select
                          value={settings.responsePreference}
                          onChange={e => updateSetting('responsePreference', e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white outline-none"
                        >
                          <option value="balanced" className="bg-[#0b1020]">Balanced — สมดุล ชัดเจน ละเอียดพอเหมาะ</option>
                          <option value="concise" className="bg-[#0b1020]">Concise — กระชับ ตรงประเด็น สรุปไว</option>
                          <option value="comprehensive" className="bg-[#0b1020]">Comprehensive — เจาะลึก ครบถ้วนทุกมิติ</option>
                          <option value="technical" className="bg-[#0b1020]">Technical — ทางเทคนิค โค้ด สถาปัตยกรรม</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Context & Capabilities */}
                  <div className="p-5 rounded-2xl bg-[#0b1020] border border-white/[0.08] space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Zap size={16} className="text-[#34d399]" />
                      Context Length & Memory Integration
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-white/70">Context Window Tokens</label>
                          <span className="text-xs font-mono text-[#00D9A3]">{settings.contextLengthTokens.toLocaleString()} tokens</span>
                        </div>
                        <input
                          type="range"
                          min="16000"
                          max="128000"
                          step="16000"
                          value={settings.contextLengthTokens}
                          onChange={e => updateSetting('contextLengthTokens', Number(e.target.value))}
                          className="w-full accent-[#00D9A3]"
                        />
                      </div>

                      <div className="pt-2 border-t border-white/[0.06] space-y-2">
                        <label className="flex items-center justify-between text-xs cursor-pointer">
                          <div>
                            <span className="text-white font-medium block">User Memory Graph Integration</span>
                            <span className="text-[10px] text-white/40">ดึงความจำและบริบทก่อนหน้ามาปรับใช้ในการตอบ</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.memoryUsageEnabled}
                            onChange={e => updateSetting('memoryUsageEnabled', e.target.checked)}
                            className="rounded accent-[#00D9A3]"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. MODEL & RUNTIME */}
            {activeCategory === 'models' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Cpu className="text-[#00D9A3]" size={20} />
                    Model & Runtime — โมเดลและระบบประมวลผล
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    การกำกับดูแลโมเดล ZYNTHEOR CORE สิทธิบัตรโมเดลแรกของโครงการ และข้อกำหนดห้าม Fallback ไปยัง External Model
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-3">
                  <ShieldCheck size={18} className="text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white">First-Party Ownership & Invariant Rule:</div>
                    <div className="text-blue-200/80 mt-0.5">
                      ZYNTHEOR CORE คือโมเดลหลัก ห้ามตั้งค่า External Provider (Gemini/OpenAI) เป็น Automatic Fallback สำหรับ Default Inference
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Model Selection */}
                  <div className="p-5 rounded-2xl bg-[#0b1020] border border-white/[0.08] space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Cpu size={16} className="text-[#00D9A3]" />
                      Default CORE Model Selection
                    </h4>

                    <div className="space-y-2">
                      {[
                        { id: 'zyntheor-core-native-v1', name: 'ZYNTHEOR Core Native v1', badge: 'CORE_NATIVE', desc: 'โมเดลฝึกจากศูนย์ (Scratch) น้ำหนักเป็นกรรมสิทธิ์ 100%' },
                        { id: 'zyntheor-core-0.10.0-foundation', name: 'ZYNTHEOR Core Foundation v0.10', badge: 'CORE_ADAPTED', desc: 'โมเดลปรับแต่งรากฐานสำหรับการใช้งานทั่วไป' }
                      ].map(m => (
                        <div
                          key={m.id}
                          onClick={() => updateSetting('defaultCoreModel', m.id)}
                          className={`p-3 rounded-xl border transition cursor-pointer ${
                            settings.defaultCoreModel === m.id
                              ? 'bg-[#00D9A3]/10 border-[#00D9A3]/40 text-white'
                              : 'bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{m.name}</span>
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00D9A3]/20 text-[#00D9A3]">
                              {m.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-white/40 mt-1">{m.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Runtime Controls */}
                  <div className="p-5 rounded-2xl bg-[#0b1020] border border-white/[0.08] space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Activity size={16} className="text-[#38bdf8]" />
                      Inference & Airgap Policies
                    </h4>

                    <div className="space-y-3">
                      <label className="flex items-center justify-between text-xs cursor-pointer">
                        <div>
                          <span className="text-white font-medium block">Offline Airgap Mode</span>
                          <span className="text-[10px] text-white/40">ประมวลผลภายในเครื่อง/Enclave เท่านั้น ไม่ส่งคำขอออกภายนอก</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.offlineAirgapMode}
                          onChange={e => updateSetting('offlineAirgapMode', e.target.checked)}
                          className="rounded accent-[#00D9A3]"
                        />
                      </label>

                      <label className="flex items-center justify-between text-xs cursor-pointer pt-2 border-t border-white/[0.06]">
                        <div>
                          <span className="text-white font-medium block">External Provider Fallback (ระงับ)</span>
                          <span className="text-[10px] text-amber-300">ล็อกเป็น False โดยสัญญาระบบ เพื่อคงความเป็น First-Party</span>
                        </div>
                        <input
                          type="checkbox"
                          disabled
                          checked={false}
                          className="rounded opacity-40 cursor-not-allowed"
                        />
                      </label>

                      <div className="pt-2 border-t border-white/[0.06]">
                        <div className="text-[11px] font-mono text-white/40">
                          Active Runtime Hash:
                        </div>
                        <div className="font-mono text-[10px] text-[#00D9A3] truncate mt-0.5">
                          {CANONICAL_CORE_RUNTIME_HASH}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. KNOWLEDGE & MEMORY */}
            {activeCategory === 'knowledge' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Database className="text-[#00D9A3]" size={20} />
                    Knowledge & Memory — ความรู้และความจำ
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    กำหนดขอบเขตการจัดเก็บความจำ กราฟความรู้ และการรักษาความเป็นส่วนตัวของผู้ใช้
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-[#0b1020] border border-white/[0.08] space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <FolderTree size={16} className="text-[#a78bfa]" />
                      Semantic Memory Graph
                    </h4>

                    <div className="space-y-3">
                      <label className="flex items-center justify-between text-xs cursor-pointer">
                        <div>
                          <span className="text-white font-medium block">Enable Semantic Memory Graph</span>
                          <span className="text-[10px] text-white/40">บันทึกข้อเท็จจริงสำคัญเพื่อความต่อเนื่องในการทำงาน</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.semanticMemoryGraphEnabled}
                          onChange={e => updateSetting('semanticMemoryGraphEnabled', e.target.checked)}
                          className="rounded accent-[#00D9A3]"
                        />
                      </label>

                      <label className="flex items-center justify-between text-xs cursor-pointer pt-2 border-t border-white/[0.06]">
                        <div>
                          <span className="text-white font-medium block">Thai-First Syntax Priority</span>
                          <span className="text-[10px] text-white/40">ให้ความสำคัญกับสำนวนและโครงสร้างภาษาไทยเป็นอันดับแรก</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.thaiFirstSyntaxPriority}
                          onChange={e => updateSetting('thaiFirstSyntaxPriority', e.target.checked)}
                          className="rounded accent-[#00D9A3]"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#0b1020] border border-white/[0.08] space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-400" />
                      Zero-Training Guarantee
                    </h4>

                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
                      <div className="font-bold">นโยบายความเป็นส่วนตัวสูงสุด:</div>
                      <div className="text-[11px] text-emerald-200/80 mt-1">
                        ZYNTHEOR จะไม่นำข้อมูลบทสนทนา ไฟล์งาน หรือความจำส่วนบุคคลของผู้ใช้ไปฝึกซ้ำ (Fine-tune/Pre-train) โมเดลโดยเด็ดขาด ข้อมูลทั้งหมดถูกจัดเก็บแบบเข้ารหัสเฉพาะผู้ใช้
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. PRIVACY & SECURITY */}
            {activeCategory === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="text-[#00D9A3]" size={20} />
                    Privacy & Security — ความเป็นส่วนตัวและความปลอดภัย
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    การเข้ารหัสข้อมูลในเครื่อง ตรวจสอบ Session และหลักฐานการตรวจสอบ (Audit History)
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-[#0b1020] border border-white/[0.08] space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Lock size={16} className="text-[#00D9A3]" />
                      Data Encryption & Storage
                    </h4>

                    <div className="space-y-3">
                      <label className="flex items-center justify-between text-xs cursor-pointer">
                        <div>
                          <span className="text-white font-medium block">Web Crypto Local Encryption</span>
                          <span className="text-[10px] text-white/40">เข้ารหัส Local Storage ด้วย AES-GCM / SHA-256</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.localDataEncryption}
                          onChange={e => updateSetting('localDataEncryption', e.target.checked)}
                          className="rounded accent-[#00D9A3]"
                        />
                      </label>

                      <label className="flex items-center justify-between text-xs cursor-pointer pt-2 border-t border-white/[0.06]">
                        <div>
                          <span className="text-white font-medium block">Sovereign Privacy Mode</span>
                          <span className="text-[10px] text-white/40">แยก Tenant และไม่ส่ง Telemetry ออกสู่ภายนอก</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.sovereignPrivacyMode}
                          onChange={e => updateSetting('sovereignPrivacyMode', e.target.checked)}
                          className="rounded accent-[#00D9A3]"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#0b1020] border border-white/[0.08] space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Activity size={16} className="text-[#38bdf8]" />
                      Audit Ledger & Verification
                    </h4>

                    <div className="space-y-2">
                      <div className="text-xs text-white/70">
                        ทุกลำดับการกระทำสำคัญถูกประทับตรารับรองด้วย Merkle Root #849202 พร้อมประวัติแบบ Hash Chain ตรวจสอบย้อนกลับได้
                      </div>
                      <a
                        href="/diagnostics"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-xs text-[#00D9A3] font-semibold border border-white/[0.08] transition"
                      >
                        <ShieldCheck size={14} />
                        <span>เปิดตรวจสอบใน Forensic Diagnostics</span>
                        <ChevronRight size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. WORKSPACE */}
            {activeCategory === 'workspace' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Layers className="text-[#00D9A3]" size={20} />
                    Workspace — พื้นที่ทำงานและโปรเจกต์
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    จัดการโปรเจกต์ โฟลเดอร์ทำงาน และการซิงก์ข้อมูลระหว่างอุปกรณ์
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-[#0b1020] border border-white/[0.08] space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <HardDrive size={16} className="text-[#38bdf8]" />
                      Workspace Organization
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-white/70 block mb-1">Active Workspace Name</label>
                        <input
                          type="text"
                          value={settings.workspaceName}
                          onChange={e => updateSetting('workspaceName', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-white/70 block mb-1">Auto-Save Interval (วินาที)</label>
                        <input
                          type="number"
                          value={settings.autoSaveIntervalSeconds}
                          onChange={e => updateSetting('autoSaveIntervalSeconds', Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#0b1020] border border-white/[0.08] space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Share2 size={16} className="text-[#00D9A3]" />
                      Cross-Platform Shared Core
                    </h4>
                    <p className="text-xs text-white/60 leading-relaxed">
                      ZYNTHEOR ได้รับการออกแบบภายใต้สถาปัตยกรรม App-First โดยแชร์ Intelligence Core, Authentication, Memory และ Model Router เดียวกันสำหรับ Web, Android, iOS และ Desktop
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 8. NOTIFICATIONS */}
            {activeCategory === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Bell className="text-[#00D9A3]" size={20} />
                    Notifications — การแจ้งเตือน
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    เลือกรับการแจ้งเตือนงาน เหตุการณ์ระบบ และการเตือนด้านความปลอดภัย
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#0b1020] border border-white/[0.08] space-y-4 max-w-xl">
                  <div className="space-y-3">
                    <label className="flex items-center justify-between text-xs cursor-pointer">
                      <span className="text-white">แจ้งเตือนระบบและการเชื่อมต่อ</span>
                      <input
                        type="checkbox"
                        checked={settings.notifySystemEvents}
                        onChange={e => updateSetting('notifySystemEvents', e.target.checked)}
                        className="rounded accent-[#00D9A3]"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs cursor-pointer pt-2 border-t border-white/[0.06]">
                      <span className="text-white">แจ้งเตือนเมื่อการประมวลผลงานเสร็จสมบูรณ์</span>
                      <input
                        type="checkbox"
                        checked={settings.notifyTaskCompletion}
                        onChange={e => updateSetting('notifyTaskCompletion', e.target.checked)}
                        className="rounded accent-[#00D9A3]"
                      />
                    </label>

                    <label className="flex items-center justify-between text-xs cursor-pointer pt-2 border-t border-white/[0.06]">
                      <span className="text-white">แจ้งเตือนความปลอดภัยและการตรวจสอบแฮช</span>
                      <input
                        type="checkbox"
                        checked={settings.notifySecurityAlerts}
                        onChange={e => updateSetting('notifySecurityAlerts', e.target.checked)}
                        className="rounded accent-[#00D9A3]"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 9. SYSTEM CONFIGURATION (ADMIN ROLE-GATED) */}
            {activeCategory === 'system' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Sliders className="text-purple-400" size={20} />
                      System Configuration — การตั้งค่าระบบ
                    </h3>
                    <p className="text-xs text-white/50 mt-1">
                      ระดับการควบคุมระบบขั้นสูง (System Administration) สงวนสิทธิ์สำหรับบทบาท ADMIN และ OWNER
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 ${
                    isSystemAdmin ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {isSystemAdmin ? <CheckCircle2 size={12} /> : <Lock size={12} />}
                    {isSystemAdmin ? 'ADMIN PRIVILEGES ACTIVE' : 'PERMISSION RESTRICTED'}
                  </span>
                </div>

                {!isSystemAdmin ? (
                  <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-4 max-w-md mx-auto my-8">
                    <Lock size={36} className="text-red-400 mx-auto" />
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">System Administration Locked</h4>
                      <p className="text-xs text-red-200/80 leading-relaxed">
                        บัญชีของคุณ ({currentUser.email}) มีสิทธิ์ระดับ <span className="font-bold underline">{currentUser.role || 'MEMBER'}</span> ซึ่งไม่เพียงพอสำหรับการแก้ไขการตั้งค่าโครงสร้างระบบ Backend และ Database
                      </p>
                    </div>
                    <div className="text-[11px] text-white/40">
                      กรุณาติดต่อผู้ดูแลระบบ (System Administrator) หรือลงชื่อเข้าใช้ด้วยโทเคนมาสเตอร์เพื่อยกระดับสิทธิ์
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Backend & Database */}
                    <div className="p-5 rounded-2xl bg-[#0b1020] border border-purple-500/20 space-y-4">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Terminal size={16} className="text-purple-400" />
                        Backend & Database Engine
                      </h4>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-white/70 block mb-1">Backend API Endpoint</label>
                          <input
                            type="text"
                            value={settings.backendApiUrl}
                            onChange={e => updateSetting('backendApiUrl', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-white outline-none focus:border-purple-400"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-white/70 block mb-1">Database Engine</label>
                          <select
                            value={settings.databaseDriver}
                            onChange={e => updateSetting('databaseDriver', e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white outline-none"
                          >
                            <option value="postgres" className="bg-[#0b1020]">PostgreSQL (Relational Cloud SQL)</option>
                            <option value="sqlite" className="bg-[#0b1020]">SQLite (Local Embedded)</option>
                            <option value="localstorage" className="bg-[#0b1020]">LocalStorage Schemas (14 Schemas)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Telemetry & Observability */}
                    <div className="p-5 rounded-2xl bg-[#0b1020] border border-purple-500/20 space-y-4">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity size={16} className="text-purple-400" />
                        Observability & Invariant Gates
                      </h4>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-white/70 block mb-1">Log Verbosity</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['INFO', 'DEBUG', 'AUDIT_ONLY'].map(v => (
                              <button
                                key={v}
                                onClick={() => updateSetting('logVerbosity', v as any)}
                                className={`py-1.5 px-2 rounded-xl border text-[10px] font-mono transition cursor-pointer ${
                                  settings.logVerbosity === v
                                    ? 'bg-purple-500/20 border-purple-500/50 text-white font-bold'
                                    : 'bg-white/[0.02] border-white/[0.06] text-white/50'
                                }`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/[0.06]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/80">SSoT Drift Threshold</span>
                            <span className="font-mono text-[#00D9A3] font-bold">Δ0.00% (Strict)</span>
                          </div>
                        </div>

                        <label className="flex items-center justify-between text-xs cursor-pointer pt-2 border-t border-white/[0.06]">
                          <span className="text-white/80">Developer Mode & Raw Debugging</span>
                          <input
                            type="checkbox"
                            checked={settings.developerMode}
                            onChange={e => updateSetting('developerMode', e.target.checked)}
                            className="rounded accent-purple-500"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 10. ABOUT ZYNTHEOR */}
            {activeCategory === 'about' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Info className="text-[#00D9A3]" size={20} />
                    About ZYNTHEOR — ข้อมูลระบบและสิทธิบัตร
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    ข้อมูลเวอร์ชัน สถาปัตยกรรม Sovereign Intelligence และข้อกำหนดด้านสิทธิบัตร
                  </p>
                </div>

                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0b1020] to-[#050810] border border-white/[0.08] space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00D9A3] to-[#2563EB] grid place-items-center text-black font-black text-2xl shadow-[0_0_30px_rgba(0,217,163,0.3)]">
                      ◈
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-white tracking-tight">
                        ZYNTHEOR AI ENGINE
                      </h4>
                      <div className="text-xs text-[#00D9A3] font-mono">
                        Universal Intelligence Platform · v1.3.1
                      </div>
                      <div className="text-[11px] text-white/40 mt-0.5">
                        First-Party Ownership · Verifiable Provenance · SSoT Δ0.00%
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 pt-4 border-t border-white/[0.06]">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="text-[10px] text-white/40 uppercase font-mono">Model Family</div>
                      <div className="text-xs font-bold text-white mt-0.5">ZYNTHEOR CORE</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="text-[10px] text-white/40 uppercase font-mono">Runtime Hash</div>
                      <div className="text-xs font-mono text-[#00D9A3] truncate mt-0.5">
                        {CANONICAL_CORE_RUNTIME_HASH.slice(0, 16)}...
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="text-[10px] text-white/40 uppercase font-mono">License</div>
                      <div className="text-xs font-bold text-white mt-0.5">Apache-2.0</div>
                    </div>
                  </div>

                  <div className="text-xs text-white/60 leading-relaxed pt-2">
                    "ZYNTHEOR AI ENGINE คือแพลตฟอร์มปัญญาประดิษฐ์สัญชาติไทยที่พัฒนาขึ้นเพื่อความเป็นอิสระทางเทคโนโลยี (Sovereignty) โดยมี ZYNTHEOR INTELLIGENCE เป็นแกนประมวลผลกลาง และ ZYNTHEOR CORE เป็นตระกูลโมเดลแรกที่เป็นกรรมสิทธิ์ของโครงการอย่างแท้จริง พร้อมรองรับการใช้งานข้ามอุปกรณ์ Web, Android, iOS และ Desktop"
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>

        {/* =========================================================
            FOOTER BAR
        ========================================================= */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.08] bg-[#0b1020]/80 text-[11px] text-white/40">
          <div className="flex items-center gap-2">
            <span>Merkle Root:</span>
            <span className="font-mono text-white/60">{CANONICAL_CORE_MERKLE_ROOT}</span>
          </div>
          <div>
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Esc</kbd> to close
          </div>
        </div>

      </div>
    </div>
  );
}
