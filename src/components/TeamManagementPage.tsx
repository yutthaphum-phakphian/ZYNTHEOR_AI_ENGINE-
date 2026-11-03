import { useCallback, useEffect, useState } from 'react';
import { csrfHeaders } from '../services/authClient';
import { RefreshCw, ShieldCheck, Users, UserCog, AlertTriangle } from 'lucide-react';

type Member = { id: string; userId: number; role: 'OWNER'|'ADMIN'|'DEVELOPER'|'MEMBER'|'VIEWER'; createdAt: string; name?: string; email?: string };
type Props = { authHeaders: () => Record<string,string>; currentRole?: string; setToast: (message: string) => void };
const ROLES = ['ADMIN','DEVELOPER','MEMBER','VIEWER'] as const;
export function TeamManagementPage({ authHeaders, currentRole, setToast }: Props) {
  const [members, setMembers] = useState<Member[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState<number|null>(null); const [error, setError] = useState('');
  const canManage = ['OWNER','ADMIN'].includes(String(currentRole || '').toUpperCase());
  const load = useCallback(async () => { setLoading(true); setError(''); try { const r = await fetch('/api/auth/members', { credentials: 'same-origin', cache: 'no-store' }); const d = await r.json(); if (!r.ok || !d.ok) throw new Error(d.message || d.error || `HTTP ${r.status}`); setMembers(Array.isArray(d.members) ? d.members : []); } catch (e) { setError(e instanceof Error ? e.message : 'โหลดสมาชิกไม่สำเร็จ'); } finally { setLoading(false); } }, [authHeaders]);
  useEffect(() => { void load(); }, [load]);
  async function changeRole(member: Member, role: string) { if (!canManage || role === member.role || saving !== null) return; if (!confirm(`ยืนยันเปลี่ยนสิทธิ์สมาชิก #${member.userId} เป็น ${role}?`)) return; setSaving(member.userId); try { const r = await fetch(`/api/auth/members/${member.userId}/role`, { method: 'PATCH', credentials: 'same-origin', headers: await csrfHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ role }) }); const d = await r.json(); if (!r.ok || !d.ok) throw new Error(d.message || d.error || `HTTP ${r.status}`); setToast('ปรับสิทธิ์สมาชิกแล้ว'); await load(); } catch (e) { setToast(e instanceof Error ? e.message : 'ปรับสิทธิ์ไม่สำเร็จ'); } finally { setSaving(null); } }
  return <section className="team-page">
    <div className="page-heading"><div><div className="eyebrow">SYSTEM / ACCESS CONTROL</div><h1>จัดการสมาชิกและสิทธิ์</h1><p>ควบคุมผู้ใช้ภายใน Tenant ปัจจุบันด้วย Role-Based Access Control</p></div><button className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/> รีเฟรช</button></div>
    <div className="team-summary"><div className="team-summary-icon"><Users size={22}/></div><div><b>{members.length} สมาชิก</b><span>สมาชิกใน Workspace ปัจจุบัน</span></div><div className="team-role-pill"><ShieldCheck size={14}/> บทบาทของคุณ: {currentRole || 'ไม่ทราบ'}</div></div>
    {!canManage && <div className="info-note"><AlertTriangle size={16}/><span>บัญชีนี้ดูรายชื่อสมาชิกได้ แต่ไม่มีสิทธิ์เปลี่ยนบทบาท ต้องใช้ OWNER หรือ ADMIN</span></div>}
    {error && <div className="team-error"><AlertTriangle size={16}/>{error}</div>}
    <div className="team-table-wrap"><div className="team-table-head"><span>สมาชิก</span><span>รหัสผู้ใช้</span><span>บทบาท</span><span>การจัดการ</span></div>
      {loading ? <div className="team-empty">กำลังโหลดข้อมูลสมาชิก…</div> : members.length === 0 ? <div className="team-empty">ยังไม่มีข้อมูลสมาชิกใน Tenant นี้</div> : members.map(m => <div className="team-row" key={m.id}><div className="team-member"><div className="team-avatar"><UserCog size={17}/></div><div><b>{m.name || `User ${m.userId}`}</b><small>{m.email || 'บัญชีสมาชิก'}</small></div></div><code>#{m.userId}</code><span className={`role-badge role-${m.role.toLowerCase()}`}>{m.role}</span><div>{m.role === 'OWNER' ? <span className="owner-lock">Owner protected</span> : <select aria-label={`เปลี่ยนบทบาทสมาชิก ${m.userId}`} value={m.role} disabled={!canManage || saving === m.userId} onChange={e => void changeRole(m, e.target.value)}>{ROLES.map(role => <option key={role} value={role}>{role}</option>)}</select>}</div></div>)}
    </div>
    <div className="info-note"><ShieldCheck size={16}/><span>การเปลี่ยน Role จะถูกตรวจสอบจาก Session ฝั่งเซิร์ฟเวอร์ ไม่เชื่อถือ Role ที่ส่งมาจากเบราว์เซอร์</span></div>
  </section>;
}
