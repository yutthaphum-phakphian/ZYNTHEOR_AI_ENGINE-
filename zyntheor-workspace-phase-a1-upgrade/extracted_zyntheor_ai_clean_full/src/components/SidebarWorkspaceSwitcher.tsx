import { useState, useRef, useEffect } from 'react';
import { Boxes, ChevronDown, Check, Plus } from 'lucide-react';
import type { WorkspaceEnvironment } from '../hooks/useMultiWorkspace';
import { useTranslation } from '../../lib/i18n';

export interface SidebarWorkspaceSwitcherProps {
  workspaces: WorkspaceEnvironment[];
  activeWorkspace?: WorkspaceEnvironment | null;
  activeWorkspaceId?: string;
  onSwitchWorkspace: (id: string) => void;
  onCreateWorkspace?: (name: string, desc?: string, targetPath?: string) => void;
  onExportBundle?: (id?: string) => any;
  onImportBundle?: (jsonStr: string) => any;
  collapsed?: boolean;
  setToast?: (msg: string) => void;
}

export function SidebarWorkspaceSwitcher({
  workspaces,
  activeWorkspace: activeWsProp,
  activeWorkspaceId,
  onSwitchWorkspace,
  collapsed = false,
  setToast,
}: SidebarWorkspaceSwitcherProps) {
  const { lang } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeWorkspace = activeWsProp || workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', marginBottom: '12px' }}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: collapsed ? '8px 4px' : '8px 10px',
          borderRadius: '8px',
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          color: '#f1f5f9',
          cursor: 'pointer',
          justifyContent: collapsed ? 'center' : 'space-between',
          transition: 'all 0.15s ease'
        }}
        title={`Active Workspace: ${activeWorkspace?.name}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              flexShrink: 0,
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
              display: 'grid',
              placeItems: 'center',
              color: '#fff'
            }}
          >
            <Boxes size={14} />
          </div>
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>
                {activeWorkspace?.name}
              </span>
              <span style={{ fontSize: '8px', color: '#64748b' }}>
                {activeWorkspace?.targetPath || 'src/'}
              </span>
            </div>
          )}
        </div>
        {!collapsed && <ChevronDown size={14} style={{ color: '#64748b', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }} />}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: collapsed ? '220px' : '100%',
            background: '#0d1522',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '6px',
            boxShadow: '0 12px 28px rgba(0,0,0,0.6)',
            zIndex: 150,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', padding: '4px 6px' }}>
            Switch Workspace ({workspaces.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '180px', overflowY: 'auto' }}>
            {workspaces.map(ws => {
              const isActive = ws.id === activeWorkspace.id;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    onSwitchWorkspace(ws.id);
                    setOpen(false);
                    if (setToast) setToast(lang === 'th' ? `สลับสภาวะการทำงานไปที่ "${ws.name}"` : `Switched workspace to "${ws.name}"`);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    background: isActive ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                    border: 0,
                    color: isActive ? '#f8fafc' : '#cbd5e1',
                    fontSize: '11px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px', fontWeight: isActive ? 700 : 400 }}>
                    {ws.name}
                  </span>
                  {isActive && <Check size={13} style={{ color: '#2dd4bf' }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
