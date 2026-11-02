import React, { useState, useEffect } from 'react';
import {
  User,
  Key,
  ShieldCheck,
  Building2,
  Users,
  Gauge,
  LogOut,
  X,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Zap,
  CreditCard,
  RefreshCw,
  Sliders,
  ShieldAlert,
} from 'lucide-react';

export interface AccountCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionUpdated?: () => void;
}

export function AccountCenterModal({ isOpen, onClose, onSessionUpdated }: AccountCenterModalProps) {
  const [activeTab, setActiveTab] = useState<'auth' | 'profile' | 'members' | 'plan'>('auth');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Authenticated State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [entitlementsData, setEntitlementsData] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentAccount();
    }
  }, [isOpen]);

  async function fetchCurrentAccount() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = sessionStorage.getItem('zyntheor.access.v1') || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/auth/me', { headers });
      const data = await res.json();

      if (res.ok && data.ok) {
        setCurrentUser(data);
        setActiveTab('profile');
        fetchMembers(token);
        fetchEntitlements(token);
      } else {
        setCurrentUser(null);
        setActiveTab('auth');
      }
    } catch {
      setCurrentUser(null);
      setActiveTab('auth');
    } finally {
      setLoading(false);
    }
  }

  async function fetchMembers(token: string) {
    try {
      const res = await fetch('/api/auth/members', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMembers(data.members || []);
      }
    } catch {}
  }

  async function fetchEntitlements(token: string) {
    try {
      const res = await fetch('/api/auth/entitlements', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setEntitlementsData(data);
      }
    } catch {}
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const body = mode === 'register' ? { email, password, name } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.ok && data.token) {
        sessionStorage.setItem('zyntheor.access.v1', data.token);
        setSuccessMsg(mode === 'register' ? 'ลงทะเบียนและเข้าสู่ระบบสำเร็จแล้ว' : 'เข้าสู่ระบบสำเร็จเรียบร้อยแล้ว');
        if (onSessionUpdated) onSessionUpdated();
        setTimeout(() => fetchCurrentAccount(), 600);
      } else {
        setErrorMsg(data.message || 'เกิดข้อผิดพลาดในการยืนยันตัวตน');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถเชื่อมต่อกับระบบยืนยันตัวตน');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      const token = sessionStorage.getItem('zyntheor.access.v1') || '';
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}

    sessionStorage.removeItem('zyntheor.access.v1');
    setCurrentUser(null);
    setActiveTab('auth');
    if (onSessionUpdated) onSessionUpdated();
  }

  async function handleRoleChange(userId: number, newRole: string) {
    try {
      const token = sessionStorage.getItem('zyntheor.access.v1') || '';
      const res = await fetch(`/api/auth/members/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        fetchMembers(token);
      } else {
        alert(data.message || 'ไม่สามารถเปลี่ยนสิทธิ์สมาชิกได้');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการอัปเดตสิทธิ์');
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(7, 12, 21, 0.8)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          background: '#0d131f',
          border: '1px solid #283754',
          borderRadius: '14px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #131c2e, #0e1422)',
            borderBottom: '1px solid #233149',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={20} style={{ color: '#14b8a6' }} />
            <div>
              <b style={{ fontSize: '15px', color: '#f1f5f9' }}>
                {currentUser ? `บัญชีผู้ใช้: ${currentUser.user?.email}` : 'ระบบบัญชีผู้ใช้และการเข้าถึง (Identity & Entitlements)'}
              </b>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                {currentUser ? `องค์กร: ${currentUser.tenant?.name} (${currentUser.tenant?.role})` : 'จัดการเข้าสู่ระบบ สิทธิ์ และโควตาการใช้งาน'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            style={{ color: '#94a3b8' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs Bar */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '10px 20px 0',
            background: '#0a0f18',
            borderBottom: '1px solid #1f2c42',
            overflowX: 'auto',
          }}
        >
          {currentUser ? (
            <>
              <button
                type="button"
                className={`forge-tab ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <User size={14} /> โปรไฟล์และบทบาท
              </button>
              <button
                type="button"
                className={`forge-tab ${activeTab === 'members' ? 'active' : ''}`}
                onClick={() => setActiveTab('members')}
              >
                <Users size={14} /> สมาชิกองค์กร ({members.length})
              </button>
              <button
                type="button"
                className={`forge-tab ${activeTab === 'plan' ? 'active' : ''}`}
                onClick={() => setActiveTab('plan')}
              >
                <Gauge size={14} /> สิทธิ์และโควตา (Entitlements)
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`forge-tab ${activeTab === 'auth' ? 'active' : ''}`}
              onClick={() => setActiveTab('auth')}
            >
              <Key size={14} /> เข้าสู่ระบบ / สมัครสมาชิก
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: AUTH (Login & Register) */}
          {activeTab === 'auth' && (
            <div style={{ maxWidth: '420px', margin: '10px auto' }}>
              <div style={{ display: 'flex', background: '#131c2e', padding: '4px', borderRadius: '8px', marginBottom: '18px', border: '1px solid #24344d' }}>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    background: mode === 'login' ? '#14b8a6' : 'transparent',
                    color: mode === 'login' ? '#080f1b' : '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  เข้าสู่ระบบ (Login)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    background: mode === 'register' ? '#14b8a6' : 'transparent',
                    color: mode === 'register' ? '#080f1b' : '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  สมัครสมาชิก (Register)
                </button>
              </div>

              {errorMsg && (
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#3b171c', border: '1px solid #85222b', color: '#fca5a5', fontSize: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={15} /> {errorMsg}
                </div>
              )}

              {successMsg && (
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#0e3328', border: '1px solid #14b8a6', color: '#6ee7b7', fontSize: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={15} /> {successMsg}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {mode === 'register' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>ชื่อ-นามสกุล / ชื่อผู้ใช้</label>
                    <input
                      type="text"
                      required
                      placeholder="สมชาย ใจดี"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', background: '#131c2e', border: '1px solid #283954', borderRadius: '8px', color: '#f1f5f9', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>อีเมล (Email)</label>
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', background: '#131c2e', border: '1px solid #283954', borderRadius: '8px', color: '#f1f5f9', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>รหัสผ่าน (Password)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', background: '#131c2e', border: '1px solid #283954', borderRadius: '8px', color: '#f1f5f9', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: '6px',
                    padding: '10px',
                    borderRadius: '8px',
                    background: '#14b8a6',
                    color: '#080f1b',
                    fontWeight: 700,
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {loading ? <RefreshCw size={15} className="spin" /> : <Lock size={15} />}
                  {mode === 'register' ? 'ยืนยันการสมัครสมาชิก' : 'เข้าสู่ระบบ'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: PROFILE & SESSIONS */}
          {activeTab === 'profile' && currentUser && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '14px', borderRadius: '10px', background: '#131b2c', border: '1px solid #233149' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>User ID & Email</span>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginTop: '2px' }}>{currentUser.user?.email}</div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>ID: {currentUser.user?.id} · Name: {currentUser.user?.name}</div>
                </div>

                <div style={{ padding: '14px', borderRadius: '10px', background: '#131b2c', border: '1px solid #233149' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Organization & Role</span>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#14b8a6', marginTop: '2px' }}>{currentUser.tenant?.name}</div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Role: <strong>{currentUser.tenant?.role}</strong> · Plan: <strong>{currentUser.tenant?.planName}</strong></div>
                </div>
              </div>

              <div style={{ padding: '14px', borderRadius: '10px', background: '#131b2c', border: '1px solid #233149' }}>
                <b style={{ fontSize: '12px', color: '#cbd5e1' }}>สิทธิ์ตามบทบาท (RBAC Authorization Status):</b>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: '#0e2b24', color: '#34d399', border: '1px solid #10b981' }}>Workspace Management</span>
                  <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: '#0e2b24', color: '#34d399', border: '1px solid #10b981' }}>AI Inference</span>
                  <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: '#0e2b24', color: '#34d399', border: '1px solid #10b981' }}>Tool Execution</span>
                  <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: '#0e2b24', color: '#34d399', border: '1px solid #10b981' }}>Audit Log Access</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#3b171c',
                    border: '1px solid #85222b',
                    color: '#fca5a5',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <LogOut size={14} /> ออกจากระบบ (Logout Session)
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: MEMBERS */}
          {activeTab === 'members' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: '12px', color: '#cbd5e1' }}>สมาชิกในองค์กร ({members.length} ท่าน)</b>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {members.map(m => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#131b2c',
                      border: '1px solid #233149',
                    }}
                  >
                    <div>
                      <b style={{ fontSize: '13px', color: '#f1f5f9' }}>{m.name}</b>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{m.email}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <select
                        value={m.role}
                        onChange={e => handleRoleChange(m.userId, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          background: '#0d131f',
                          border: '1px solid #283754',
                          borderRadius: '6px',
                          color: '#34d399',
                          fontSize: '11px',
                          fontWeight: 700,
                          outline: 'none',
                        }}
                      >
                        <option value="OWNER">OWNER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="DEVELOPER">DEVELOPER</option>
                        <option value="MEMBER">MEMBER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PLAN & ENTITLEMENTS */}
          {activeTab === 'plan' && entitlementsData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', borderRadius: '10px', background: 'linear-gradient(135deg, #122033, #0c1624)', border: '1px solid #243854' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>แพ็กเกจปัจจุบัน</span>
                    <h3 style={{ margin: '2px 0 0', fontSize: '18px', color: '#f1f5f9' }}>{entitlementsData.plan?.name}</h3>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', background: '#14b8a6', color: '#080f1b' }}>ACTIVE PLAN</span>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                    <span>โควตาคำขอ AI รายเดือน (AI Requests):</span>
                    <b>{entitlementsData.usage?.monthlyAiRequests} / {entitlementsData.plan?.monthlyAiRequests} คำขอ</b>
                  </div>
                  <div style={{ height: '8px', background: '#0e1726', borderRadius: '99px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, (entitlementsData.usage?.monthlyAiRequests / entitlementsData.plan?.monthlyAiRequests) * 100)}%`,
                        height: '100%',
                        background: '#14b8a6',
                        borderRadius: '99px',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', background: '#131b2c', border: '1px solid #233149' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Max Tokens / Request</span>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginTop: '2px' }}>{entitlementsData.plan?.maxTokensPerRequest} tokens</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', background: '#131b2c', border: '1px solid #233149' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Max Workspaces</span>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginTop: '2px' }}>{entitlementsData.plan?.maxWorkspaces} workspaces</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', background: '#131b2c', border: '1px solid #233149' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Execution Sandbox</span>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: entitlementsData.entitlements?.toolsSandbox ? '#34d399' : '#94a3b8', marginTop: '2px' }}>
                    {entitlementsData.entitlements?.toolsSandbox ? 'Enabled' : 'PRO Required'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
