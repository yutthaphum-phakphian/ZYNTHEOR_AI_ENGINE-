import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { csrfHeaders } from '../services/authClient';
import {
  RefreshCw,
  ShieldCheck,
  Users,
  UserCog,
  AlertTriangle,
  Crown,
  Shield,
  Code,
  Eye,
  Download,
  UserPlus,
  Search,
  X,
  Mail,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { TeamRoleDistributionChart } from './TeamRoleDistributionChart';
import { MemberActivityModal } from './MemberActivityModal';

export type Member = {
  id: string;
  userId: number;
  role: 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'MEMBER' | 'VIEWER';
  createdAt: string;
  name?: string;
  email?: string;
};

type Props = {
  authHeaders: () => Record<string, string>;
  currentRole?: string;
  setToast: (message: string) => void;
};

const ROLES = ['ADMIN', 'DEVELOPER', 'MEMBER', 'VIEWER'] as const;

// Short role descriptions shown in the badge tooltip. Wording mirrors the invite form and the
// server-enforced rules in routes/auth.ts (only OWNER/ADMIN invite or change roles; ownership moves via transfer only).
export const ROLE_DESCRIPTIONS: Record<string, { title: string; text: string }> = {
  OWNER: { title: 'Owner — เจ้าของ Workspace', text: 'ควบคุมได้ทั้งหมด เชิญสมาชิก เปลี่ยนบทบาท และเป็นผู้เดียวที่โอนความเป็นเจ้าของได้ บทบาทนี้ถูกป้องกันไม่ให้ถูกเปลี่ยนจากหน้านี้' },
  ADMIN: { title: 'Admin — ผู้ดูแลระบบ', text: 'ดูแลระบบและจัดการสมาชิก: เชิญสมาชิกใหม่และปรับบทบาทของสมาชิกอื่นได้ (ยกเว้น Owner)' },
  DEVELOPER: { title: 'Developer — นักพัฒนา', text: 'เข้าถึงโมเดลและเครื่องมือพัฒนาใน Workspace แต่ไม่สามารถเชิญสมาชิกหรือเปลี่ยนบทบาทได้' },
  MEMBER: { title: 'Member — สมาชิกทั่วไป', text: 'สมาชิกทั่วไปใน Workspace ไม่มีสิทธิ์จัดการสมาชิกหรือบทบาท' },
  VIEWER: { title: 'Viewer — ผู้ชม', text: 'สิทธิ์อ่านอย่างเดียว (Read-only) ไม่สามารถแก้ไขหรือจัดการสมาชิกได้' },
};

export function TeamManagementPage({ authHeaders, currentRole, setToast }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [activityMember, setActivityMember] = useState<Member | null>(null);
  const activityTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Member Invitation Form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'DEVELOPER' | 'MEMBER' | 'VIEWER'>('DEVELOPER');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const canManage = ['OWNER', 'ADMIN'].includes(String(currentRole || '').toUpperCase());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/auth/members', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.message || d.error || `HTTP ${r.status}`);
      setMembers(Array.isArray(d.members) ? d.members : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดสมาชิกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  // Total count of members per role within current workspace
  const roleCounts = useMemo(() => {
    const counts = { OWNER: 0, ADMIN: 0, DEVELOPER: 0, VIEWER: 0 };
    members.forEach((m) => {
      const r = (m.role || '').toUpperCase();
      if (r === 'OWNER') counts.OWNER++;
      else if (r === 'ADMIN') counts.ADMIN++;
      else if (r === 'DEVELOPER' || r === 'MEMBER') counts.DEVELOPER++;
      else if (r === 'VIEWER') counts.VIEWER++;
    });
    return counts;
  }, [members]);

  // Filtered members by search query (name, email, or role)
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = (m.name || `User ${m.userId}`).toLowerCase();
      const email = (m.email || '').toLowerCase();
      const role = (m.role || '').toLowerCase();
      const idStr = String(m.userId);
      return name.includes(q) || email.includes(q) || role.includes(q) || idStr.includes(q);
    });
  }, [members, searchQuery]);

  // Changes only when the set of visible rows changes, so the fade-in replays on load/filter
  // without re-animating on keystrokes that leave the visible rows unchanged.
  const visibleSetKey = useMemo(() => filteredMembers.map((m) => m.id).join('|'), [filteredMembers]);

  const closeActivity = useCallback(() => {
    setActivityMember(null);
    activityTriggerRef.current?.focus();
  }, []);

  async function changeRole(member: Member, role: string) {
    if (!canManage || role === member.role || saving !== null) return;
    if (!confirm(`ยืนยันเปลี่ยนสิทธิ์สมาชิก #${member.userId} เป็น ${role}?`)) return;
    setSaving(member.userId);
    try {
      const r = await fetch(`/api/auth/members/${member.userId}/role`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: await csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ role }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.message || d.error || `HTTP ${r.status}`);
      setToast('ปรับสิทธิ์สมาชิกแล้ว');
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'ปรับสิทธิ์ไม่สำเร็จ');
    } finally {
      setSaving(null);
    }
  }

  // Browser-side CSV export implementation with UTF-8 BOM
  function exportMembersCsv() {
    if (members.length === 0) {
      setToast('ไม่มีข้อมูลสมาชิกสำหรับส่งออก');
      return;
    }
    const headers = ['Member ID', 'User ID', 'Name', 'Email', 'Role', 'Workspace Status', 'Joined Date'];
    const rows = members.map((m) => {
      const status = m.role === 'OWNER' ? 'Active (Owner Protected)' : 'Active';
      return [
        m.id,
        m.userId,
        m.name || `User ${m.userId}`,
        m.email || 'N/A',
        m.role,
        status,
        m.createdAt || 'N/A',
      ];
    });

    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '');
      return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const csvContent =
      '\uFEFF' +
      [headers.map(escapeCsv).join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `zyntheor-team-members-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToast(`ส่งออกข้อมูล ${members.length} สมาชิกเป็นไฟล์ CSV สำเร็จแล้ว`);
  }

  // Member invitation form submission with client-side validation
  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) {
      setInviteError('เฉพาะ OWNER หรือ ADMIN เท่านั้นที่สามารถเชิญสมาชิกได้');
      return;
    }

    const emailTrimmed = inviteEmail.trim().toLowerCase();
    setInviteError('');
    setInviteSuccess('');

    // Format validation
    if (!emailTrimmed) {
      setInviteError('กรุณากรอกที่อยู่อีเมลที่ต้องการเชิญ');
      return;
    }

    const emailRegex = /^[^\s@]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(emailTrimmed) || emailTrimmed.length > 254) {
      setInviteError('รูปแบบอีเมลไม่ถูกต้อง กรุณาใช้อีเมลที่สมบูรณ์ เช่น user@example.com');
      return;
    }

    // Check duplicate membership
    const isAlreadyMember = members.some((m) => (m.email || '').toLowerCase() === emailTrimmed);
    if (isAlreadyMember) {
      setInviteError(`อีเมล ${emailTrimmed} เป็นสมาชิกใน Workspace นี้อยู่แล้ว`);
      return;
    }

    setInviting(true);
    try {
      const res = await fetch('/api/auth/members/invite', {
        method: 'POST',
        credentials: 'same-origin',
        headers: await csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: emailTrimmed, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }

      setInviteSuccess(data.message || `ส่งคำเชิญไปยัง ${emailTrimmed} สำเร็จแล้ว`);
      setToast(`เชิญ ${emailTrimmed} ในบทบาท ${inviteRole} สำเร็จ`);
      setInviteEmail('');
      await load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการส่งคำเชิญ');
    } finally {
      setInviting(false);
    }
  }

  return (
    <section className="team-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">SYSTEM / ACCESS CONTROL</div>
          <h1>จัดการสมาชิกและสิทธิ์</h1>
          <p>ควบคุมผู้ใช้ภายใน Tenant ปัจจุบันด้วย Role-Based Access Control</p>
        </div>
        <div className="team-header-actions">
          <button
            className="secondary-button"
            onClick={exportMembersCsv}
            disabled={loading || members.length === 0}
            title="ส่งออกรายชื่อสมาชิกเป็นไฟล์ CSV"
          >
            <Download size={15} /> ส่งออก CSV
          </button>
          {canManage && (
            <button
              className={`secondary-button ${showInviteForm ? 'active-toggle' : ''}`}
              onClick={() => {
                setShowInviteForm(!showInviteForm);
                setInviteError('');
                setInviteSuccess('');
              }}
              title="เปิดฟอร์มเชิญสมาชิกใหม่"
            >
              <UserPlus size={15} /> {showInviteForm ? 'ปิดฟอร์มเชิญ' : 'เชิญสมาชิก'}
            </button>
          )}
          <button className="secondary-button" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> รีเฟรช
          </button>
        </div>
      </div>

      {/* Enhanced Team Overview & Role Counts Summary */}
      <div className="team-overview-card">
        <div className="team-overview-top">
          <div className="team-overview-meta">
            <div className="team-summary-icon">
              <Users size={22} />
            </div>
            <div>
              <div className="team-overview-count">{members.length} สมาชิก</div>
              <span className="team-overview-sub">สมาชิกทั้งหมดใน Workspace ปัจจุบัน</span>
            </div>
          </div>
          <div className="team-role-pill">
            <ShieldCheck size={14} /> บทบาทของคุณ: {currentRole || 'ไม่ทราบ'}
          </div>
        </div>

        {/* Role breakdown chips */}
        <div className="team-role-summary-grid">
          <div className="role-summary-item role-item-owner">
            <div className="role-summary-icon">
              <Crown size={15} />
            </div>
            <div className="role-summary-info">
              <span className="role-summary-label">Owner</span>
              <b className="role-summary-val">{roleCounts.OWNER} คน</b>
            </div>
          </div>

          <div className="role-summary-item role-item-admin">
            <div className="role-summary-icon">
              <Shield size={15} />
            </div>
            <div className="role-summary-info">
              <span className="role-summary-label">Admin</span>
              <b className="role-summary-val">{roleCounts.ADMIN} คน</b>
            </div>
          </div>

          <div className="role-summary-item role-item-developer">
            <div className="role-summary-icon">
              <Code size={15} />
            </div>
            <div className="role-summary-info">
              <span className="role-summary-label">Developer</span>
              <b className="role-summary-val">{roleCounts.DEVELOPER} คน</b>
            </div>
          </div>

          <div className="role-summary-item role-item-viewer">
            <div className="role-summary-icon">
              <Eye size={15} />
            </div>
            <div className="role-summary-info">
              <span className="role-summary-label">Viewer</span>
              <b className="role-summary-val">{roleCounts.VIEWER} คน</b>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Role Distribution Chart (Owner, Admin, Developer, Viewer via Recharts) */}
      <TeamRoleDistributionChart members={members} />

      {/* Member Invitation Form Section */}
      {showInviteForm && (
        <div className="team-invite-card">
          <div className="team-invite-header">
            <div className="team-invite-title">
              <div className="team-invite-badge">
                <UserPlus size={16} />
              </div>
              <div>
                <h3>เชิญสมาชิกใหม่เข้าร่วม Workspace</h3>
                <p>กำหนดสิทธิ์และส่งคำเชิญเข้าร่วมองค์กรด้วย Role-Based Access Control</p>
              </div>
            </div>
            <button
              className="icon-button-subtle"
              onClick={() => setShowInviteForm(false)}
              aria-label="ปิดฟอร์ม"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleInviteSubmit} className="team-invite-form">
            <div className="team-invite-grid">
              <div className="team-field-group">
                <label htmlFor="invite-email">อีเมลสมาชิก (Email Address)</label>
                <div className="team-input-wrap">
                  <Mail size={16} className="team-input-icon" />
                  <input
                    id="invite-email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      if (inviteError) setInviteError('');
                    }}
                    disabled={inviting}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="team-field-group">
                <label htmlFor="invite-role">บทบาทในระบบ (Role)</label>
                <div className="team-select-wrap">
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    disabled={inviting}
                  >
                    <option value="DEVELOPER">Developer — เข้าถึงโมเดลและเครื่องมือพัฒนา</option>
                    <option value="ADMIN">Admin — ดูแลระบบและจัดการสมาชิก</option>
                    <option value="MEMBER">Member — สมาชิกทั่วไปใน Workspace</option>
                    <option value="VIEWER">Viewer — สิทธิ์อ่านอย่างเดียว (Read-only)</option>
                  </select>
                </div>
              </div>

              <div className="team-invite-btn-wrap">
                <button
                  type="submit"
                  className="primary-button team-invite-submit"
                  disabled={inviting || !inviteEmail.trim()}
                >
                  {inviting ? (
                    <>
                      <RefreshCw size={14} className="spin" /> กำลังส่งคำเชิญ…
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} /> ส่งคำเชิญ
                    </>
                  )}
                </button>
              </div>
            </div>

            {inviteError && (
              <div className="team-form-error" role="alert">
                <AlertTriangle size={15} />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteSuccess && (
              <div className="team-form-success" role="status">
                <CheckCircle2 size={15} />
                <span>{inviteSuccess}</span>
              </div>
            )}
          </form>
        </div>
      )}

      {!canManage && (
        <div className="info-note">
          <AlertTriangle size={16} />
          <span>บัญชีนี้ดูรายชื่อสมาชิกได้ แต่ไม่มีสิทธิ์เปลี่ยนบทบาทหรือเชิญสมาชิก ต้องใช้ OWNER หรือ ADMIN</span>
        </div>
      )}

      {error && (
        <div className="team-error">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="team-filter-bar">
        <div className="team-search-box">
          <Search size={16} className="team-search-icon" />
          <input
            type="text"
            placeholder="ค้นหาสมาชิกด้วยชื่อ, อีเมล หรือบทบาท..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="ค้นหาสมาชิก"
          />
          {searchQuery && (
            <button
              className="team-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="ล้างคำค้นหา"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="team-search-stats">
          {searchQuery ? (
            <span>
              พบ <b>{filteredMembers.length}</b> จาก {members.length} สมาชิก
            </span>
          ) : (
            <span>ทั้งหมด {members.length} สมาชิก</span>
          )}
        </div>
      </div>

      <div className="team-table-wrap">
        <div className="team-table-head">
          <span>สมาชิก</span>
          <span>รหัสผู้ใช้</span>
          <span>บทบาท</span>
          <span>การจัดการ</span>
        </div>
        {loading ? (
          <div className="team-empty">กำลังโหลดข้อมูลสมาชิก…</div>
        ) : members.length === 0 ? (
          <div className="team-empty">ยังไม่มีข้อมูลสมาชิกใน Tenant นี้</div>
        ) : filteredMembers.length === 0 ? (
          <div className="team-empty-search">
            <Search size={24} className="team-empty-search-icon" />
            <div className="team-empty-search-title">ไม่พบสมาชิกที่ตรงกับคำค้นหา</div>
            <div className="team-empty-search-sub">
              ไม่พบผลลัพธ์สำหรับ &quot;{searchQuery}&quot; ลองตรวจสอบการสะกดหรือค้นหาคำอื่น
            </div>
            <button className="secondary-button" onClick={() => setSearchQuery('')}>
              ล้างคำค้นหา
            </button>
          </div>
        ) : (
          <div className="team-rows" key={visibleSetKey}>
            {filteredMembers.map((m, i) => {
              const roleKey = String(m.role || '').toUpperCase();
              const desc = ROLE_DESCRIPTIONS[roleKey];
              const tipId = `role-tip-${m.id}`;
              return (
                <div className="team-row" key={m.id} style={{ ['--row-i' as string]: Math.min(i, 8) }}>
                  <div className="team-member">
                    <div className="team-avatar">
                      <UserCog size={17} />
                    </div>
                    <div>
                      <b>{m.name || `User ${m.userId}`}</b>
                      <small>{m.email || 'บัญชีสมาชิก'}</small>
                    </div>
                  </div>
                  <code>#{m.userId}</code>
                  <span className="role-tip-wrap">
                    <span
                      className={`role-badge role-${roleKey.toLowerCase()}`}
                      tabIndex={desc ? 0 : undefined}
                      aria-describedby={desc ? tipId : undefined}
                    >
                      {m.role}
                    </span>
                    {desc && (
                      <span role="tooltip" id={tipId} className="role-tip">
                        <b>{desc.title}</b>
                        {desc.text}
                      </span>
                    )}
                  </span>
                  <div className="team-row-actions">
                    {m.role === 'OWNER' ? (
                      <span className="owner-lock">Owner protected</span>
                    ) : (
                      <select
                        aria-label={`เปลี่ยนบทบาทสมาชิก ${m.userId}`}
                        value={m.role}
                        disabled={!canManage || saving === m.userId}
                        onChange={(e) => void changeRole(m, e.target.value)}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        className="team-activity-btn"
                        onClick={(e) => {
                          activityTriggerRef.current = e.currentTarget;
                          setActivityMember(m);
                        }}
                        aria-label={`ดูกิจกรรมของสมาชิก ${m.name || m.userId}`}
                      >
                        <Activity size={12} /> ดูกิจกรรม
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="info-note">
        <ShieldCheck size={16} />
        <span>การเปลี่ยน Role และคำเชิญจะถูกตรวจสอบจาก Session ฝั่งเซิร์ฟเวอร์ ไม่เชื่อถือ Role ที่ส่งมาจากเบราว์เซอร์</span>
      </div>
      {activityMember && <MemberActivityModal member={activityMember} onClose={closeActivity} />}
    </section>
  );
}
