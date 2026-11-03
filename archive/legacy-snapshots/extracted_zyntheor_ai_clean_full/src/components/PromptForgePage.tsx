import { TestLabPanel } from './TestLabPanel';
import { useState, useEffect, useMemo } from 'react';
import {
  WandSparkles, Check, Copy, RefreshCw, Cpu, ShieldCheck,
  AlertTriangle, BookOpen, Play, Trash2, ArrowRight,
  Code2, CheckCircle2, Sliders, FileText, Layers, Sparkles,
  Plus, Bookmark, Star, X
} from 'lucide-react';
import type { PromptTemplate, PromptAnalysisReport, PromptTestCase } from '../../lib/prompt-engine';
import { analyzeCode } from '../../lib/code-intelligence';
import { useTranslation } from '../../lib/i18n';

interface PromptForgeProps {
  authHeaders: () => Record<string, string>;
  setToast: (msg: string) => void;
  recordAudit?: (action: string, detail: string) => Promise<void>;
}

type Tab = 'forge' | 'analyze' | 'templates' | 'testbench';

export function PromptForgePage({ authHeaders, setToast, recordAudit }: PromptForgeProps) {
  const { t, lang } = useTranslation();
  const [tab, setTab] = useState<Tab>('forge');

  // Forge state
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Website and Mobile App Development');
  const [targetLanguage, setTargetLanguage] = useState<'auto' | 'th' | 'en' | 'custom'>('auto');
  const [customLanguage, setCustomLanguage] = useState('');
  const [language, setLanguage] = useState('ไทย / Thai');
  const [outputFormat, setOutputFormat] = useState('Structured Markdown');
  const [additionalConstraints, setAdditionalConstraints] = useState('');
  const [rawPromptInput, setRawPromptInput] = useState('');
  const [activePrompt, setActivePrompt] = useState('');
  const [promptMeta, setPromptMeta] = useState<{
    mode?: string;
    modelUsed?: string;
    purpose?: string;
    designChoices?: string[];
    variablesDetected?: string[];
    policyNote?: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Analysis state
  const [analysisText, setAnalysisText] = useState('');
  const [analysisReport, setAnalysisReport] = useState<PromptAnalysisReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [templateSearch, setTemplateSearch] = useState<string>('');
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);

  // Custom Templates & Saved Prompts state
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [newTmplTitle, setNewTmplTitle] = useState('');
  const [newTmplCat, setNewTmplCat] = useState('Software Engineering');
  const [newTmplDesc, setNewTmplDesc] = useState('');
  const [newTmplBody, setNewTmplBody] = useState('');

  const [savedPrompts, setSavedPrompts] = useState<Array<{ id: string; title: string; prompt: string; at: string }>>(() => {
    try {
      const saved = localStorage.getItem('zyntheor.forge.saved_prompts.v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const PRESETS = [
    { label: '🐛 Bug Diagnostic', category: 'Bug Analysis and Debugging', intent: 'Diagnose memory leaks, race conditions, and socket errors in TypeScript server.' },
    { label: '🔒 Security Governance', category: 'System Instructions', intent: 'Build strict security governance rules for RBAC, tenant boundary isolation, and key rotation.' },
    { label: '⚡ Performance Tuning', category: 'Software Engineering', intent: 'Optimize API throughput and query execution latency for high-concurrency workloads.' },
    { label: '📱 Modern UI Widget', category: 'Website and Mobile App Development', intent: 'Build a dark-mode responsive dashboard widget with real-time telemetry charts.' },
    { label: '🤖 Autonomous AI Agent', category: 'AI Agent Design', intent: 'Design an AI Agent protocol with human confirmation gates and execution step limiters.' },
  ];

  const savePromptToBookmarks = (promptText: string) => {
    if (!promptText.trim()) return;
    const item = {
      id: `prompt-${Date.now()}`,
      title: description.trim().slice(0, 36) || 'Custom Prompt',
      prompt: promptText.trim(),
      at: new Date().toLocaleDateString(),
    };
    const updated = [item, ...savedPrompts];
    setSavedPrompts(updated);
    try { localStorage.setItem('zyntheor.forge.saved_prompts.v1', JSON.stringify(updated)); } catch {}
    setToast(lang === 'th' ? 'บันทึกพรอมป์ต์ลงรายการโปรดแล้ว' : 'Saved prompt to bookmarks');
  };

  const deleteBookmark = (id: string) => {
    const updated = savedPrompts.filter(p => p.id !== id);
    setSavedPrompts(updated);
    try { localStorage.setItem('zyntheor.forge.saved_prompts.v1', JSON.stringify(updated)); } catch {}
  };

  // Test bench state
  const [testPrompt, setTestPrompt] = useState('');
  const [testVarKey, setTestVarKey] = useState('TARGET_FEATURE');
  const [testVarVal, setTestVarVal] = useState('Authentication middleware');
  const [testCriteria, setTestCriteria] = useState('Returns status 401 when token is missing');
  const [testCases, setTestCases] = useState<PromptTestCase[]>([]);
  const [testingBench, setTestingBench] = useState(false);
  const [testSummary, setTestSummary] = useState('');

  // CodeIntelligence complexity analysis
  const codeToAnalyze = rawPromptInput || description || activePrompt;
  const codeAnalysis = useMemo(() => analyzeCode(codeToAnalyze), [codeToAnalyze]);

  // Fetch templates on mount
  useEffect(() => {
    async function load() {
      setLoadingTemplates(true);
      try {
        const res = await fetch('/api/prompts/templates', { headers: authHeaders() });
        const data = await res.json();
        if (data.ok && Array.isArray(data.templates)) {
          setTemplates(data.templates);
        }
      } catch {
        // Handled silently
      } finally {
        setLoadingTemplates(false);
      }
    }
    void load();
  }, []);

  // Sync active prompt with analysis and test bench
  const syncToActive = (text: string) => {
    setActivePrompt(text);
    setAnalysisText(text);
    setTestPrompt(text);
  };

  const copyPrompt = (text: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setToast(t('forge.toast.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      setToast(t('forge.toast.empty_intent'));
      return;
    }
    setLoading(true);
    const effectiveLang = targetLanguage === 'custom'
      ? (customLanguage.trim() || 'Custom')
      : targetLanguage;
    try {
      const res = await fetch('/api/prompts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          description: description.trim(),
          category,
          language: effectiveLang,
          targetLanguage: effectiveLang,
          outputFormat,
          additionalConstraints: additionalConstraints.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
      syncToActive(data.prompt);
      setPromptMeta({
        mode: data.mode,
        modelUsed: data.modelUsed,
        purpose: data.purpose,
        designChoices: data.designChoices,
        variablesDetected: data.variablesDetected,
        policyNote: data.policyNote,
      });
      setToast(data.mode === 'model-generated' ? (data.modelUsed ? `${t('forge.toast.gen_success_model')} (${data.modelUsed})` : t('forge.toast.gen_success_model')) : t('forge.toast.gen_success_template'));
      void recordAudit?.('PROMPT_GENERATED', `category=${category}; mode=${data.mode}; target_lang=${effectiveLang}`);
    } catch (err) {
      setToast(t('forge.error.generate_failed', { reason: err instanceof Error ? err.message : 'Unknown error' }));
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    const textToOpt = rawPromptInput.trim() || activePrompt.trim();
    if (!textToOpt) {
      setToast(t('forge.toast.empty_optimize'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/prompts/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ prompt: textToOpt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
      syncToActive(data.optimizedPrompt);
      setPromptMeta({
        mode: data.mode,
        modelUsed: data.modelUsed,
        designChoices: data.improvementsMade,
        policyNote: data.policyNote,
      });
      setToast(t('forge.toast.opt_success'));
      void recordAudit?.('PROMPT_OPTIMIZED', `mode=${data.mode}`);
    } catch (err) {
      setToast(t('forge.error.optimize_failed', { reason: err instanceof Error ? err.message : 'Unknown error' }));
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (textOverride?: string) => {
    const textToAnalyze = textOverride || analysisText.trim() || activePrompt.trim();
    if (!textToAnalyze) {
      setToast(t('forge.toast.empty_analyze'));
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch('/api/prompts/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ prompt: textToAnalyze }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
      setAnalysisReport(data.report);
      setToast(t('forge.toast.analyze_success', { score: data.report.overallScore, grade: data.report.grade }));
      void recordAudit?.('PROMPT_ANALYZED', `score=${data.report.overallScore}; grade=${data.report.grade}`);
    } catch (err) {
      setToast(t('forge.error.analyze_failed', { reason: err instanceof Error ? err.message : 'Unknown error' }));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRunTestBench = async () => {
    const target = testPrompt.trim() || activePrompt.trim();
    if (!target) {
      setToast(t('forge.toast.empty_test'));
      return;
    }
    setTestingBench(true);
    try {
      const customCases = [
        {
          id: 'case-1',
          title: 'Variable Replacement & Response Verification',
          inputVariables: testVarKey ? { [testVarKey]: testVarVal } : {},
          expectedOutputCriteria: [testCriteria || 'Produces compliant output'],
        },
      ];
      const res = await fetch('/api/prompts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ prompt: target, testCases: customCases }),
      });
      const data = await res.json();
      if (Array.isArray(data.testCases)) {
        setTestCases(data.testCases);
        setTestSummary(data.summary || '');
      }
      setToast(data.executionVerified ? t('forge.toast.test_success') : t('forge.toast.test_offline'));
    } catch (err) {
      setToast(t('forge.error.test_failed', { reason: err instanceof Error ? err.message : 'Unknown error' }));
    } finally {
      setTestingBench(false);
    }
  };

  const selectTemplate = (tmpl: PromptTemplate) => {
    syncToActive(tmpl.template);
    setDescription(tmpl.sampleInput);
    setCategory(tmpl.category);
    setTab('forge');
    setToast(t('forge.toast.load_template', { title: tmpl.title }));
  };

  const filteredTemplates = templates.filter(tmpl =>
    `${tmpl.title} ${tmpl.category} ${tmpl.description} ${tmpl.tags.join(' ')}`.toLowerCase().includes(templateSearch.toLowerCase())
  );

  return (
    <div className="forge-container">
      {/* Navigation Tabs */}
      <nav className="forge-nav">
        <button
          type="button"
          className={`forge-tab ${tab === 'forge' ? 'active' : ''}`}
          onClick={() => setTab('forge')}
        >
          <WandSparkles size={14} /> {t('forge.tab.forge')}
        </button>
        <button
          type="button"
          className={`forge-tab ${tab === 'analyze' ? 'active' : ''}`}
          onClick={() => {
            setTab('analyze');
            if (activePrompt && !analysisReport) void handleAnalyze(activePrompt);
          }}
        >
          <Sliders size={14} /> {t('forge.tab.analyze')}
        </button>
        <button
          type="button"
          className={`forge-tab ${tab === 'templates' ? 'active' : ''}`}
          onClick={() => setTab('templates')}
        >
          <BookOpen size={14} /> {t('forge.tab.templates')} ({templates.length || 10})
        </button>
        <button
          type="button"
          className={`forge-tab ${tab === 'testbench' ? 'active' : ''}`}
          onClick={() => setTab('testbench')}
        >
          <Play size={14} /> {t('forge.tab.testbench')}
        </button>
      </nav>

      {/* TAB 1: FORGE & OPTIMIZE */}
      {tab === 'forge' && (
        <div className="forge-layout">
          {/* Controls Column */}
          <div className="forge-card">
            <div className="forge-card-header">
              <div className="forge-card-title">
                <Sparkles size={16} /> {t('forge.card.title')}
              </div>
            </div>

            <form className="forge-form" onSubmit={e => { e.preventDefault(); void handleGenerate(); }}>
              <div className="forge-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="forge-label" style={{ marginBottom: 0 }}>
                    {t('forge.field.intent')}
                  </label>
                  <span style={{ fontSize: '9px', color: '#64748b' }}>Quick Presets:</span>
                </div>

                {/* Preset Chips */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setDescription(preset.intent);
                        setCategory(preset.category);
                        setToast(lang === 'th' ? `เลือกโจทย์: ${preset.label}` : `Selected preset: ${preset.label}`);
                      }}
                      style={{
                        padding: '3px 8px',
                        fontSize: '9px',
                        borderRadius: '4px',
                        background: '#0f172a',
                        border: '1px solid #1e293b',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.color = '#f8fafc';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#1e293b';
                        e.currentTarget.style.color = '#94a3b8';
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <textarea
                  className="forge-textarea"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t('forge.field.intent_ph')}
                  rows={3}
                />
              </div>

              <div className="forge-field">
                <label className="forge-label">{t('forge.field.category')}</label>
                <select
                  className="forge-select"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="Website and Mobile App Development">{t('forge.cat.web_mobile')}</option>
                  <option value="Code Writing and Inspection">{t('forge.cat.code_inspection')}</option>
                  <option value="Bug Analysis and Debugging">{t('forge.cat.bug_analysis')}</option>
                  <option value="AI Agent Design">{t('forge.cat.agent_design')}</option>
                  <option value="Image and Media Generation">{t('forge.cat.media_generation')}</option>
                  <option value="Data Analysis and Research">{t('forge.cat.data_research')}</option>
                  <option value="System Instructions">{t('forge.cat.system_instructions')}</option>
                  <option value="Software Project Planning">{t('forge.cat.software_planning')}</option>
                  <option value="Software Engineering">{t('forge.cat.software_eng')}</option>
                  <option value="Education and Tutoring">{t('forge.cat.education')}</option>
                  <option value="Business Planning">{t('forge.cat.business')}</option>
                </select>
              </div>

              <div className="forge-field">
                <label className="forge-label">{t('forge.field.output_format')} & {t('forge.field.target_language')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <select
                    className="forge-select"
                    value={outputFormat}
                    onChange={e => setOutputFormat(e.target.value)}
                  >
                    <option value="Structured Markdown">{t('forge.fmt.markdown')}</option>
                    <option value="Code-Only (Minimal Comments)">{t('forge.fmt.code_only')}</option>
                    <option value="Step-by-Step Plan">{t('forge.fmt.step_plan')}</option>
                    <option value="Strict JSON Schema">{t('forge.fmt.json')}</option>
                    <option value="Comparative Table">{t('forge.fmt.table')}</option>
                  </select>
                  <select
                    className="forge-select"
                    value={targetLanguage}
                    onChange={e => setTargetLanguage(e.target.value as 'auto' | 'th' | 'en' | 'custom')}
                    aria-label="Target Output Language"
                  >
                    <option value="auto">{t('forge.lang.auto')}</option>
                    <option value="th">{t('forge.lang.th')}</option>
                    <option value="en">{t('forge.lang.en')}</option>
                    <option value="custom">{t('forge.lang.custom')}</option>
                  </select>
                </div>
                {targetLanguage === 'custom' && (
                  <div style={{ marginTop: '6px' }}>
                    <input
                      className="forge-input"
                      value={customLanguage}
                      onChange={e => setCustomLanguage(e.target.value)}
                      placeholder={t('forge.field.custom_language_ph')}
                    />
                  </div>
                )}
              </div>

              <div className="forge-field">
                <label className="forge-label">{t('forge.field.constraints')}</label>
                <input
                  className="forge-input"
                  value={additionalConstraints}
                  onChange={e => setAdditionalConstraints(e.target.value)}
                  placeholder={t('forge.field.constraints_ph')}
                />
              </div>

              <div className="forge-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={loading || !description.trim()}
                >
                  <WandSparkles size={14} className={loading ? 'spin' : ''} />
                  {loading ? t('forge.button.optimizing') : t('forge.button.generate')}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={loading || (!rawPromptInput.trim() && !activePrompt.trim())}
                  onClick={() => void handleOptimize()}
                >
                  <Sliders size={14} /> {t('forge.button.optimize')}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setDescription('');
                    setAdditionalConstraints('');
                    setRawPromptInput('');
                    setActivePrompt('');
                    setPromptMeta(null);
                  }}
                  title={t('forge.button.clear')}
                >
                  <Trash2 size={14} /> {t('forge.button.clear')}
                </button>
              </div>
            </form>

            <div style={{ borderTop: '1px solid #202735', paddingTop: '12px', marginTop: '6px' }}>
              <label className="forge-label" style={{ marginBottom: '6px' }}>
                {t('forge.paste_label')}
              </label>
              <textarea
                className="forge-textarea"
                value={rawPromptInput}
                onChange={e => setRawPromptInput(e.target.value)}
                placeholder={lang === 'en' ? 'Paste existing prompt text here to improve clarity, structure, and constraints...' : 'วางข้อความพรอมป์ต์เดิมที่นี่เพื่อปรับปรุงความชัดเจน จัดระเบียบ และเพิ่มเงื่อนไข...'}
                rows={3}
              />
            </div>

            {/* Real-time CodeIntelligence Complexity Analysis Summary */}
            {codeToAnalyze && (
              <div style={{ marginTop: '14px', background: '#0a101b', border: '1px solid #1e2a3a', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Code2 size={14} /> Code Complexity Analysis (CodeIntelligence)
                  </span>
                  <span style={{ fontSize: '9px', padding: '2px 6px', background: '#162335', color: '#7dd3fc', borderRadius: '4px', border: '1px solid #0284c7' }}>
                    REAL-TIME AST
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                  <div style={{ background: '#111b29', padding: '8px 6px', borderRadius: '6px', border: '1px solid #1e2d42' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>{codeAnalysis.lines}</div>
                    <div style={{ fontSize: '9px', color: '#8899ac' }}>Total Lines</div>
                  </div>
                  <div style={{ background: '#111b29', padding: '8px 6px', borderRadius: '6px', border: '1px solid #1e2d42' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#34d399' }}>{codeAnalysis.functions}</div>
                    <div style={{ fontSize: '9px', color: '#8899ac' }}>Function Count</div>
                  </div>
                  <div style={{ background: '#111b29', padding: '8px 6px', borderRadius: '6px', border: '1px solid #1e2d42' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: codeAnalysis.complexity > 10 ? '#f87171' : '#fbbf24' }}>{codeAnalysis.complexity}</div>
                    <div style={{ fontSize: '9px', color: '#8899ac' }}>Cyclomatic Complexity</div>
                  </div>
                </div>
                {codeAnalysis.imports.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '9px', color: '#94a3b8' }}>
                    <b>Imports ({codeAnalysis.imports.length}):</b> {codeAnalysis.imports.slice(0, 5).join(', ')}{codeAnalysis.imports.length > 5 ? '…' : ''}
                  </div>
                )}
                {codeAnalysis.exports.length > 0 && (
                  <div style={{ marginTop: '4px', fontSize: '9px', color: '#94a3b8' }}>
                    <b>Exports ({codeAnalysis.exports.length}):</b> {codeAnalysis.exports.slice(0, 5).join(', ')}{codeAnalysis.exports.length > 5 ? '…' : ''}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Output Display Column */}
          <div className="forge-card">
            <div className="forge-card-header">
              <div className="forge-card-title">
                <FileText size={16} /> {t('forge.output.title')}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {promptMeta?.mode && (
                  <span className={`forge-pill ${promptMeta.mode.includes('model') ? 'green' : 'amber'}`}>
                    {promptMeta.mode === 'model-generated' || promptMeta.mode === 'model-optimized'
                      ? `${lang === 'en' ? 'Model' : 'โมเดล'}: ${promptMeta.modelUsed || 'Online'}`
                      : 'Template Engine'}
                  </span>
                )}
                {activePrompt && (
                  <>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => savePromptToBookmarks(activePrompt)}
                      style={{ padding: '4px 8px', fontSize: '9px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Save prompt to bookmarks"
                    >
                      <Bookmark size={12} style={{ color: '#fbbf24' }} />
                      <span>{lang === 'en' ? 'Bookmark' : 'บันทึก'}</span>
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => copyPrompt(activePrompt)}
                      style={{ padding: '4px 8px', fontSize: '9px' }}
                    >
                      {copied ? <Check size={12} className="copy-check" /> : <Copy size={12} />}
                      {copied ? t('common.copied') : t('common.copy')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {promptMeta?.policyNote && (
              <div className="info-note" style={{ margin: '0 0 10px' }}>
                <ShieldCheck size={15} />
                <div>{promptMeta.policyNote}</div>
              </div>
            )}

            {promptMeta?.purpose && (
              <div style={{ background: '#161c28', border: '1px solid #2d3b50', borderRadius: '9px', padding: '10px 12px', margin: '0 0 10px' }}>
                <span className="forge-label" style={{ color: '#8ad9b9', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Sparkles size={12} color="#75d9b0" />
                  {t('forge.output.purpose')}
                </span>
                <p style={{ margin: 0, fontSize: '10px', color: '#e0e7f5', lineHeight: '1.6' }}>
                  {promptMeta.purpose}
                </p>
              </div>
            )}

            <div className="forge-output-box">
              {activePrompt ? (
                activePrompt
              ) : (
                <span style={{ color: '#68758c', fontStyle: 'italic' }}>
                  {t('forge.output.empty')}
                </span>
              )}
            </div>

            {promptMeta?.designChoices && promptMeta.designChoices.length > 0 && (
              <div>
                <span className="forge-label">{t('forge.output.design_choices')}</span>
                <div className="forge-chips">
                  {promptMeta.designChoices.map((c, i) => (
                    <span key={i} className="forge-chip">
                      <CheckCircle2 size={10} color="#75d9b0" /> {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {promptMeta?.variablesDetected && promptMeta.variablesDetected.length > 0 && (
              <div>
                <span className="forge-label">{t('forge.output.variables')}</span>
                <div className="forge-chips">
                  {promptMeta.variablesDetected.map((v, i) => (
                    <span key={i} className="forge-chip">
                      <code>{v}</code>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activePrompt && (
              <div className="forge-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setAnalysisText(activePrompt);
                    setTab('analyze');
                    void handleAnalyze(activePrompt);
                  }}
                >
                  <Sliders size={13} /> {lang === 'en' ? 'Go to Prompt Analyzer' : 'ไปที่ Prompt Analyzer'} <ArrowRight size={12} />
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setTestPrompt(activePrompt);
                    setTab('testbench');
                  }}
                >
                  <Play size={13} /> {lang === 'en' ? 'Open Test Bench' : 'ทดสอบใน Test Bench'} <ArrowRight size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PROMPT ANALYZER */}
      {tab === 'analyze' && (
        <div className="forge-layout">
          <div className="forge-card">
            <div className="forge-card-header">
              <div className="forge-card-title">
                <Sliders size={16} /> {lang === 'en' ? 'Prompt Quality Audit' : 'ตรวจสอบคุณภาพพรอมป์ต์ (Prompt Quality Audit)'}
              </div>
            </div>
            <textarea
              className="forge-textarea"
              value={analysisText}
              onChange={e => setAnalysisText(e.target.value)}
              placeholder={lang === 'en' ? 'Paste the prompt you want to audit for structure, clarity, completeness, and constraints...' : 'วางพรอมป์ต์ที่ต้องการวิเคราะห์โครงสร้าง ความชัดเจน และจุดบกพร่อง...'}
              rows={12}
            />
            <div className="forge-actions">
              <button
                type="button"
                className="primary-button"
                disabled={analyzing || !analysisText.trim()}
                onClick={() => void handleAnalyze()}
              >
                <RefreshCw size={14} className={analyzing ? 'spin' : ''} />
                {analyzing ? (lang === 'en' ? 'Analyzing…' : 'กำลังวิเคราะห์…') : (lang === 'en' ? 'Analyze Prompt Quality' : 'วิเคราะห์คุณภาพพรอมป์ต์')}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setAnalysisText(activePrompt)}
                disabled={!activePrompt}
              >
                {lang === 'en' ? 'Load Active Prompt' : 'โหลดพรอมป์ต์ปัจจุบัน'}
              </button>
            </div>
          </div>

          <div className="forge-card">
            <div className="forge-card-header">
              <div className="forge-card-title">
                <ShieldCheck size={16} /> {lang === 'en' ? 'Rubric Audit Report' : 'รายงานการประเมินตามเกณฑ์ (Audit Report)'}
              </div>
            </div>

            {analysisReport ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="score-card">
                  <div className={`score-badge score-grade-${analysisReport.grade}`}>
                    <b>{analysisReport.overallScore}</b>
                    <span>GRADE {analysisReport.grade}</span>
                  </div>
                  <div>
                    <b style={{ fontSize: '13px', color: '#f0f3fc' }}>
                      {analysisReport.overallScore >= 80 ? (lang === 'en' ? 'Prompt has excellent structure' : 'พรอมป์ต์มีโครงสร้างดีเยี่ยม') : (lang === 'en' ? 'Prompt has areas for improvement' : 'พรอมป์ต์มีจุดที่ควรปรับปรุง')}
                    </b>
                    <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#909cb1', lineHeight: '1.6' }}>
                      {lang === 'en' ? 'Evaluated across 6 dimensions: clarity, completeness, consistency, output spec, constraints, and testability.' : 'ประเมินตาม Rubric 6 มิติ: ความชัดเจน บริบท ความสอดคล้อง รูปแบบผลลัพธ์ ข้อจำกัด และการทดสอบได้'}
                    </p>
                  </div>
                </div>

                {/* 6 Metric Bars */}
                <div>
                  <div className="metric-row">
                    <div className="metric-header">
                      <span>1. Objective Clarity</span>
                      <b>{analysisReport.metrics.objectiveClarity}%</b>
                    </div>
                    <div className="metric-bar">
                      <div className="metric-fill" style={{ width: `${analysisReport.metrics.objectiveClarity}%` }} />
                    </div>
                  </div>

                  <div className="metric-row">
                    <div className="metric-header">
                      <span>2. Context Completeness</span>
                      <b>{analysisReport.metrics.contextCompleteness}%</b>
                    </div>
                    <div className="metric-bar">
                      <div className="metric-fill" style={{ width: `${analysisReport.metrics.contextCompleteness}%` }} />
                    </div>
                  </div>

                  <div className="metric-row">
                    <div className="metric-header">
                      <span>3. Instruction Consistency</span>
                      <b>{analysisReport.metrics.instructionConsistency}%</b>
                    </div>
                    <div className="metric-bar">
                      <div className="metric-fill" style={{ width: `${analysisReport.metrics.instructionConsistency}%` }} />
                    </div>
                  </div>

                  <div className="metric-row">
                    <div className="metric-header">
                      <span>4. Output Specification</span>
                      <b>{analysisReport.metrics.outputSpecification}%</b>
                    </div>
                    <div className="metric-bar">
                      <div className="metric-fill" style={{ width: `${analysisReport.metrics.outputSpecification}%` }} />
                    </div>
                  </div>

                  <div className="metric-row">
                    <div className="metric-header">
                      <span>5. Constraint Coverage</span>
                      <b>{analysisReport.metrics.constraintCoverage}%</b>
                    </div>
                    <div className="metric-bar">
                      <div className="metric-fill" style={{ width: `${analysisReport.metrics.constraintCoverage}%` }} />
                    </div>
                  </div>

                  <div className="metric-row">
                    <div className="metric-header">
                      <span>6. Testability</span>
                      <b>{analysisReport.metrics.testability}%</b>
                    </div>
                    <div className="metric-bar">
                      <div className="metric-fill" style={{ width: `${analysisReport.metrics.testability}%` }} />
                    </div>
                  </div>
                </div>

                {/* Findings lists */}
                {analysisReport.missingInformation.length > 0 && (
                  <div style={{ background: '#241a18', border: '1px solid #543228', padding: '10px', borderRadius: '8px' }}>
                    <b style={{ fontSize: '10px', color: '#ffb3a7', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <AlertTriangle size={13} /> {lang === 'en' ? 'Missing Information & Context:' : 'ข้อมูลที่ขาดหายไป (Missing Context):'}
                    </b>
                    <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '9px', color: '#e6c8c1', lineHeight: '1.6' }}>
                      {analysisReport.missingInformation.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisReport.recommendations.length > 0 && (
                  <div style={{ background: '#161d2a', border: '1px solid #2b3952', padding: '10px', borderRadius: '8px' }}>
                    <b style={{ fontSize: '10px', color: '#b4c9ef', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CheckCircle2 size={13} /> {lang === 'en' ? 'Recommendations for Improvement:' : 'ข้อแนะนำในการปรับปรุง (Recommendations):'}
                    </b>
                    <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '9px', color: '#cad6eb', lineHeight: '1.6' }}>
                      {analysisReport.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <Sliders size={24} className="empty-icon" />
                <b>{lang === 'en' ? 'No analysis results yet' : 'ยังไม่มีผลการวิเคราะห์'}</b>
                <p>{lang === 'en' ? 'Paste a prompt on the left and click "Analyze Prompt Quality" to audit structure.' : 'วางพรอมป์ต์ในช่องซ้ายแล้วคลิก "Analyze Prompt Quality" เพื่อประเมินตามเกณฑ์มาตรฐาน'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DOMAIN TEMPLATES & BOOKMARKS */}
      {tab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <input
              className="forge-input"
              style={{ maxWidth: '350px' }}
              value={templateSearch}
              onChange={e => setTemplateSearch(e.target.value)}
              placeholder={lang === 'en' ? 'Search templates (e.g. coding, debugging, agent, image)...' : 'ค้นหาแม่แบบ (เช่น coding, debugging, agent, image)...'}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => setShowAddTemplateModal(true)}
                style={{ fontSize: '10px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={13} />
                <span>{lang === 'en' ? 'Add Custom Template' : 'สร้างแม่แบบใหม่'}</span>
              </button>
              <span style={{ fontSize: '10px', color: '#8d99ad' }}>
                {lang === 'en' ? `Showing ${filteredTemplates.length} of ${templates.length} templates` : `แสดง ${filteredTemplates.length} จาก ${templates.length} แม่แบบ`}
              </span>
            </div>
          </div>

          {/* Bookmarks Section if saved prompts exist */}
          {savedPrompts.length > 0 && (
            <div style={{ background: '#0a101b', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px 16px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <b style={{ fontSize: '12px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Star size={14} /> {lang === 'en' ? 'Bookmarked Prompts' : 'พรอมป์ต์ที่บันทึกไว้ (Bookmarks)'} ({savedPrompts.length})
                </b>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
                {savedPrompts.map(bm => (
                  <div key={bm.id} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '6px', padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <b style={{ fontSize: '10px', color: '#f3f4f6' }}>{bm.title}</b>
                        <button
                          type="button"
                          onClick={() => deleteBookmark(bm.id)}
                          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                          title="Remove bookmark"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <p style={{ fontSize: '9px', color: '#9ca3af', margin: 0, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {bm.prompt}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #1f2937' }}>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          syncToActive(bm.prompt);
                          setTab('forge');
                          setToast(lang === 'th' ? 'โหลดพรอมป์ต์ลงใน Forge แล้ว' : 'Loaded bookmark into Forge');
                        }}
                        style={{ flex: 1, padding: '3px 6px', fontSize: '9px' }}
                      >
                        Load to Forge
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => copyPrompt(bm.prompt)}
                        style={{ padding: '3px 6px', fontSize: '9px' }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="template-grid">
            {filteredTemplates.map(tmpl => (
              <div key={tmpl.id} className="template-card">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="forge-pill cyan">{tmpl.category}</span>
                    <span style={{ fontSize: '8px', color: '#778498' }}>{tmpl.targetRole.split(' ')[0]}</span>
                  </div>
                  <h4>{tmpl.title}</h4>
                  <p>{tmpl.description}</p>
                </div>
                <div style={{ display: 'flex', gap: '6px', paddingTop: '8px', borderTop: '1px solid #202735' }}>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => selectTemplate(tmpl)}
                    style={{ flex: 1, padding: '6px 8px', fontSize: '9px' }}
                  >
                    {lang === 'en' ? 'Use in Forge' : 'นำไปใช้ใน Forge'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => copyPrompt(tmpl.template)}
                    style={{ padding: '6px 8px', fontSize: '9px' }}
                  >
                    {lang === 'en' ? 'Copy' : 'คัดลอก'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TEST BENCH */}
      {tab === 'testbench' && (
        <div className="forge-layout">
          <div className="forge-card">
            <div className="forge-card-header">
              <div className="forge-card-title">
                <Play size={16} /> {lang === 'en' ? 'Prompt Test Bench' : 'กำหนดชุดทดสอบ (Prompt Test Bench)'}
              </div>
            </div>

            <div className="forge-field">
              <label className="forge-label">{lang === 'en' ? 'Target Prompt' : 'พรอมป์ต์เป้าหมาย (Target Prompt)'}</label>
              <textarea
                className="forge-textarea"
                value={testPrompt}
                onChange={e => setTestPrompt(e.target.value)}
                placeholder={lang === 'en' ? 'Paste prompt to test here...' : 'วางพรอมป์ต์ที่ต้องการนำมาทดสอบ...'}
                rows={6}
              />
            </div>

            <div className="forge-field">
              <label className="forge-label">{lang === 'en' ? 'Test Case Variables (Variable Replacement)' : 'Test Case Variables (ตัวแปรแทนที่)'}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input
                  className="forge-input"
                  value={testVarKey}
                  onChange={e => setTestVarKey(e.target.value)}
                  placeholder="Key เช่น TARGET_FEATURE"
                />
                <input
                  className="forge-input"
                  value={testVarVal}
                  onChange={e => setTestVarVal(e.target.value)}
                  placeholder="Value เช่น User login endpoint"
                />
              </div>
            </div>

            <div className="forge-field">
              <label className="forge-label">{lang === 'en' ? 'Expected Output Criteria' : 'Expected Output Criteria (เกณฑ์ที่คาดหวัง)'}</label>
              <input
                className="forge-input"
                value={testCriteria}
                onChange={e => setTestCriteria(e.target.value)}
                placeholder={lang === 'en' ? 'e.g. Must include code block, header # ROLE...' : 'เช่น ต้องมี code block, ต้องมี header # ROLE...'}
              />
            </div>

            <div className="forge-actions">
              <button
                type="button"
                className="primary-button"
                disabled={testingBench || !testPrompt.trim()}
                onClick={() => void handleRunTestBench()}
              >
                <Play size={14} className={testingBench ? 'spin' : ''} />
                {testingBench ? (lang === 'en' ? 'Running test…' : 'กำลังรันการทดสอบ…') : (lang === 'en' ? 'Run Test Bench' : 'รัน Test Bench')}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setTestPrompt(activePrompt)}
                disabled={!activePrompt}
              >
                {lang === 'en' ? 'Load Active Prompt' : 'โหลดพรอมป์ต์ปัจจุบัน'}
              </button>
            </div>
          </div>

          <div className="forge-card">
            <div className="forge-card-header">
              <div className="forge-card-title">
                <CheckCircle2 size={16} /> {lang === 'en' ? 'Bench Results & Verification' : 'ผลการประเมินและการทดสอบ (Bench Results)'}
              </div>
            </div>

            {testSummary && (
              <div className="info-note" style={{ margin: 0 }}>
                <Cpu size={15} />
                <div><b>{lang === 'en' ? 'Summary:' : 'สรุปผล:'}</b> {testSummary}</div>
              </div>
            )}

            {testCases.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {testCases.map((tc, i) => (
                  <div key={tc.id || i} className="test-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ fontSize: '10px', color: '#e5ebf6' }}>{tc.title}</b>
                      <span className={`test-status ${(tc.resultStatus || 'UNVERIFIED').toLowerCase()}`}>
                        {tc.resultStatus || 'UNVERIFIED'}
                      </span>
                    </div>

                    <div style={{ fontSize: '9px', color: '#8895aa' }}>
                      {lang === 'en' ? 'Criteria:' : 'เกณฑ์ตรวจสอบ:'} {tc.expectedOutputCriteria.join(', ')}
                    </div>

                    {tc.actualOutput && (
                      <div style={{ background: '#090c12', padding: '8px', borderRadius: '6px', fontSize: '9px', fontFamily: 'monospace', color: '#b9c6dc', whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'auto' }}>
                        {tc.actualOutput}
                      </div>
                    )}

                    {tc.evaluationNotes && (
                      <div style={{ fontSize: '8px', color: '#728096', fontStyle: 'italic' }}>
                        {tc.evaluationNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Play size={24} className="empty-icon" />
                <b>{lang === 'en' ? 'No tests executed yet' : 'ยังไม่ได้รันการทดสอบ'}</b>
                <p>{lang === 'en' ? 'Click "Run Test Bench" to simulate variable replacement and evaluate criteria.' : 'คลิก "Run Test Bench" เพื่อจำลองการส่งข้อมูลเข้าสู่พรอมป์ต์และตรวจสอบเกณฑ์ที่กำหนด'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Template Modal */}
      {showAddTemplateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', zIndex: 100, padding: '16px' }} onClick={() => setShowAddTemplateModal(false)}>
          <div style={{ width: 'min(540px, 100%)', background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <b style={{ fontSize: '14px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} style={{ color: '#38bdf8' }} /> {lang === 'en' ? 'Create Custom Prompt Template' : 'สร้างแม่แบบพรอมป์ต์ส่วนตัว'}
              </b>
              <button type="button" onClick={() => setShowAddTemplateModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
            </div>

            <form onSubmit={e => {
              e.preventDefault();
              if (!newTmplTitle.trim() || !newTmplBody.trim()) return;
              const customTmpl: PromptTemplate = {
                id: `custom-tmpl-${Date.now()}`,
                title: newTmplTitle.trim(),
                category: newTmplCat,
                description: newTmplDesc.trim() || 'Custom user template',
                targetRole: 'Custom Engineer',
                template: newTmplBody.trim(),
                sampleInput: 'Custom intent',
                tags: ['custom', newTmplCat.toLowerCase()],
              };
              setTemplates(prev => [customTmpl, ...prev]);
              setShowAddTemplateModal(false);
              setNewTmplTitle('');
              setNewTmplDesc('');
              setNewTmplBody('');
              setToast(lang === 'th' ? 'เพิ่มแม่แบบพรอมป์ต์ส่วนตัวเรียบร้อย' : 'Custom template added successfully');
            }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="forge-label">{lang === 'en' ? 'Template Title' : 'ชื่อแม่แบบ'}</label>
                <input className="forge-input" value={newTmplTitle} onChange={e => setNewTmplTitle(e.target.value)} placeholder="e.g. Senior Microservice Refactorer" required />
              </div>

              <div>
                <label className="forge-label">{lang === 'en' ? 'Category' : 'หมวดหมู่'}</label>
                <select className="forge-select" value={newTmplCat} onChange={e => setNewTmplCat(e.target.value)}>
                  <option value="Software Engineering">Software Engineering</option>
                  <option value="Website and Mobile App Development">Website and Mobile App Development</option>
                  <option value="Bug Analysis and Debugging">Bug Analysis and Debugging</option>
                  <option value="AI Agent Design">AI Agent Design</option>
                  <option value="System Instructions">System Instructions</option>
                  <option value="Business Planning">Business Planning</option>
                  <option value="Custom Domain">Custom Domain</option>
                </select>
              </div>

              <div>
                <label className="forge-label">{lang === 'en' ? 'Short Description' : 'คำอธิบายสั้นๆ'}</label>
                <input className="forge-input" value={newTmplDesc} onChange={e => setNewTmplDesc(e.target.value)} placeholder="e.g. Refactors legacy endpoints into clean async handlers" />
              </div>

              <div>
                <label className="forge-label">{lang === 'en' ? 'Template Prompt Text' : 'ข้อความแม่แบบพรอมป์ต์'}</label>
                <textarea className="forge-textarea" value={newTmplBody} onChange={e => setNewTmplBody(e.target.value)} placeholder="# ROLE & OBJECTIVE&#10;You are a..." rows={6} required />
              </div>

              <div className="forge-actions" style={{ marginTop: '8px' }}>
                <button type="submit" className="primary-button" style={{ flex: 1 }}>{lang === 'en' ? 'Save Template' : 'บันทึกแม่แบบ'}</button>
                <button type="button" className="secondary-button" onClick={() => setShowAddTemplateModal(false)}>{lang === 'en' ? 'Cancel' : 'ยกเลิก'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
