// @ts-nocheck
import { useState, useRef, useEffect } from 'react';
import {
  Boxes, ChevronDown, Plus, Download, UploadCloud, Check, Sparkles, Folder, Trash2, X, AlertTriangle
} from 'lucide-react';
import type { WorkspaceEnvironment, WorkspaceExportBundle } from '../hooks/useMultiWorkspace';
import { useTranslation } from '../../lib/i18n';

export interface HeaderWorkspaceSwitcherProps {
  workspaces: WorkspaceEnvironment[];
  activeWorkspace?: WorkspaceEnvironment | null;
  activeWorkspaceId?: string;
  activeWorkspaceName?: string;
  onSwitchWorkspace: (id: string) => void;
  onCreateWorkspace: (name: string, desc?: string, targetPath?: string) => void;
  onDeleteWorkspace?: (id: string) => void;
  onExportWorkspace?: (id?: string) => WorkspaceExportBundle;
  onImportWorkspace?: (jsonStr: string) => { success: boolean; error?: string };
  onExportBundle?: (id?: string) => WorkspaceExportBundle;
  onImportBundle?: (jsonStr: string) => { success: boolean; error?: string };
  setToast?: (msg: string) => void;
}

export function HeaderWorkspaceSwitcher({
  workspaces,
  activeWorkspace: activeWsProp,
  activeWorkspaceId,
  onSwitchWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
  onExportWorkspace,
  onImportWorkspace,
  onExportBundle,
  onImportBundle,
  setToast,
}: HeaderWorkspaceSwitcherProps) {
  const { lang } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const activeWorkspace = activeWsProp || workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  const exportHandler = onExportWorkspace || onExportBundle;
  const importHandler = onImportWorkspace || onImportBundle;
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Form states
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [newWsPath, setNewWsPath] = useState('src/');
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newWsName.trim()) return;
    onCreateWorkspace(newWsName.trim(), newWsDesc.trim(), newWsPath.trim());
    setNewWsName('');
    setNewWsDesc('');
    setCreateModalOpen(false);
    setDropdownOpen(false);
    if (setToast) setToast(lang === 'th' ? `สร้างเวิร์คสเปส "${newWsName}" เรียบร้อย` : `Created workspace "${newWsName}"`);
  }

  function handleExportClick(wsId: string, name: string) {
    if (!exportHandler) return;
    const bundle = exportHandler(wsId);
    const jsonStr = JSON.stringify(bundle, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace_export_${wsId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (setToast) setToast(lang === 'th' ? `ส่งออกข้อมูลเวิร์คสเปส "${name}" เรียบร้อยแล้ว` : `Exported workspace "${name}" configuration`);
  }

  function handleFileImportPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !importHandler) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const res = importHandler(content);
        if (res.success) {
          setImportModalOpen(false);
          setDropdownOpen(false);
          if (setToast) setToast(lang === 'th' ? 'นำเข้าเวิร์คสเปสสำเร็จแล้ว' : 'Successfully imported workspace configuration');
        } else {
          setImportError(res.error || 'Import failed');
        }
      }
    };
    reader.readAsText(file);
  }

  function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setImportError(null);
    if (!importJson.trim() || !importHandler) return;
    const res = importHandler(importJson.trim());
    if (res.success) {
      setImportModalOpen(false);
      setDropdownOpen(false);
      setImportJson('');
      if (setToast) setToast(lang === 'th' ? 'นำเข้าเวิร์คสเปสสำเร็จแล้ว' : 'Successfully imported workspace configuration');
    } else {
      setImportError(res.error || 'Import failed');
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Prominent Workspace Badge Button */}
      <button
        type="button"
        onClick={() => setDropdownOpen(prev => !prev)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.18), rgba(56, 189, 248, 0.12))',
          border: '1px solid rgba(20, 184, 166, 0.35)',
          color: '#f8fafc',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(20, 184, 166, 0.15)',
          transition: 'all 0.15s ease'
        }}
        title="Quick Workspace Switcher"
      >
        <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'linear-gradient(140deg, #14b8a6, #0d9488)', display: 'grid', placeItems: 'center', color: '#fff' }}>
          <Boxes size={13} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
          <span style={{ fontSize: '8px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>WORKSPACE</span>
          <span style={{ fontSize: '11px', color: '#38bdf8', whiteSpace: 'nowrap', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeWorkspace?.name || 'ZYNTHEOR ENGINE'}
          </span>
        </div>
        <ChevronDown size={14} style={{ color: '#94a3b8', transition: 'transform 0.15s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {/* Dropdown Quick-Switch Menu */}
      {dropdownOpen && (
        <div
          className="dropdown-scale-fade"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '320px',
            background: '#0d1522',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '8px',
            boxShadow: '0 16px 36px rgba(0,0,0,0.6)',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', justifyContent: 'space-between' }}>
            <span>Available Workspaces ({workspaces.length})</span>
            <span style={{ color: '#38bdf8' }}>Isolated Envs</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '240px', overflowY: 'auto' }}>
            {workspaces.map(ws => {
              const isActive = ws.id === activeWorkspace.id;
              return (
                <div
                  key={ws.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: isActive ? 'rgba(20, 184, 166, 0.15)' : '#090d16',
                    border: isActive ? '1px solid rgba(20, 184, 166, 0.35)' : '1px solid transparent',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    onSwitchWorkspace(ws.id);
                    setDropdownOpen(false);
                    if (setToast) setToast(lang === 'th' ? `สลับสภาวะการทำงานไปที่ "${ws.name}"` : `Switched workspace to "${ws.name}"`);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    {isActive ? <Check size={14} style={{ color: '#2dd4bf', flexShrink: 0 }} /> : <Boxes size={14} style={{ color: '#64748b', flexShrink: 0 }} />}
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: isActive ? 700 : 500, color: isActive ? '#f8fafc' : '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ws.name}
                      </span>
                      <span style={{ fontSize: '9px', color: '#64748b' }}>
                        Path: {ws.targetPath || 'src/'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleExportClick(ws.id, ws.name)}
                      title="Export workspace configuration JSON"
                      style={{ background: 'transparent', border: 0, color: '#94a3b8', cursor: 'pointer', padding: '3px' }}
                    >
                      <Download size={13} />
                    </button>
                    {workspaces.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete workspace "${ws.name}"?`)) {
                            onDeleteWorkspace?.(ws.id);
                          }
                        }}
                        title="Delete workspace"
                        style={{ background: 'transparent', border: 0, color: '#ef4444', cursor: 'pointer', padding: '3px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '6px', display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                setCreateModalOpen(true);
              }}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '6px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 600,
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              <Plus size={13} />
              <span>New Workspace</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                setImportModalOpen(true);
              }}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '6px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 600,
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#38bdf8',
                cursor: 'pointer'
              }}
            >
              <UploadCloud size={13} />
              <span>Import Config</span>
            </button>
          </div>
        </div>
      )}

      {/* CREATE WORKSPACE MODAL */}
      {createModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '440px', background: '#0d1522', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <b style={{ fontSize: '14px', color: '#f8fafc' }}>Create New Isolated Workspace Environment</b>
              <button type="button" onClick={() => setCreateModalOpen(false)} style={{ background: 'transparent', border: 0, color: '#94a3b8', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Workspace Name *</label>
                <input
                  type="text"
                  required
                  value={newWsName}
                  onChange={e => setNewWsName(e.target.value)}
                  placeholder="e.g. ZYNTHEOR Security Testing"
                  style={{ width: '100%', padding: '8px 10px', background: '#090d16', border: '1px solid #1e293b', borderRadius: '6px', color: '#fff', fontSize: '11px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Description</label>
                <textarea
                  rows={2}
                  value={newWsDesc}
                  onChange={e => setNewWsDesc(e.target.value)}
                  placeholder="Purpose of this workspace..."
                  style={{ width: '100%', padding: '8px 10px', background: '#090d16', border: '1px solid #1e293b', borderRadius: '6px', color: '#fff', fontSize: '11px', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Target Root Path</label>
                <input
                  type="text"
                  value={newWsPath}
                  onChange={e => setNewWsPath(e.target.value)}
                  placeholder="e.g. src/ or lib/"
                  style={{ width: '100%', padding: '8px 10px', background: '#090d16', border: '1px solid #1e293b', borderRadius: '6px', color: '#fff', fontSize: '11px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setCreateModalOpen(false)} style={{ padding: '6px 12px', background: '#1e293b', border: 0, borderRadius: '6px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '6px 14px', background: 'linear-gradient(120deg, #14b8a6, #0d9488)', border: 0, borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT WORKSPACE MODAL */}
      {importModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '480px', background: '#0d1522', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <b style={{ fontSize: '14px', color: '#38bdf8' }}>Import Workspace Configuration & Metadata</b>
              <button type="button" onClick={() => setImportModalOpen(false)} style={{ background: 'transparent', border: 0, color: '#94a3b8', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            {importError && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', fontSize: '11px', marginBottom: '12px' }}>
                {importError}
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px dashed #38bdf8',
                  background: 'rgba(56, 189, 248, 0.08)',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <UploadCloud size={16} />
                <span>Upload `.json` Workspace Export File</span>
              </button>
              <input ref={fileInputRef} type="file" accept=".json" hidden onChange={handleFileImportPicked} />
            </div>

            <form onSubmit={handleImportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Or Paste JSON Bundle Text:</label>
                <textarea
                  rows={5}
                  value={importJson}
                  onChange={e => setImportJson(e.target.value)}
                  placeholder={`{\n  "version": "1.0",\n  "workspace": { "id": "ws-1", "name": "Imported Workspace" }\n}`}
                  style={{ width: '100%', padding: '10px', background: '#090d16', border: '1px solid #1e293b', borderRadius: '6px', color: '#38bdf8', fontSize: '10px', fontFamily: 'monospace', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button type="button" onClick={() => setImportModalOpen(false)} style={{ padding: '6px 12px', background: '#1e293b', border: 0, borderRadius: '6px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '6px 14px', background: 'linear-gradient(120deg, #38bdf8, #0284c7)', border: 0, borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                  Import & Switch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
