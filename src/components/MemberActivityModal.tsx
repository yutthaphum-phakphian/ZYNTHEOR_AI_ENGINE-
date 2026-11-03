import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, AlertTriangle, LogIn, LogOut, Crown, RefreshCw, X } from 'lucide-react';

export type ActivityEvent = {
  id: string;
  type: 'SESSION_STARTED' | 'SESSION_REVOKED' | 'OWNERSHIP_TRANSFERRED' | 'OWNERSHIP_RECEIVED' | 'OWNERSHIP_INITIATED';
  occurredAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  detail: string | null;
};

type Props = {
  member: { userId: number; name?: string; email?: string };
  onClose: () => void;
};

const EVENT_META: Record<ActivityEvent['type'], { label: string; Icon: typeof LogIn }> = {
  SESSION_STARTED: { label: 'เข้าสู่ระบบ (เริ่มเซสชัน)', Icon: LogIn },
  SESSION_REVOKED: { label: 'ออกจากระบบ / เพิกถอนเซสชัน', Icon: LogOut },
  OWNERSHIP_TRANSFERRED: { label: 'โอนความเป็นเจ้าของให้ผู้อื่น', Icon: Crown },
  OWNERSHIP_RECEIVED: { label: 'ได้รับความเป็นเจ้าของ', Icon: Crown },
  OWNERSHIP_INITIATED: { label: 'ดำเนินการโอนความเป็นเจ้าของ', Icon: Crown },
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'medium' });
}

export function MemberActivityModal({ member, onClose }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/auth/members/${member.userId}/activity?limit=50`, {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.message || d.error || `HTTP ${r.status}`);
      setEvents(Array.isArray(d.events) ? d.events : []);
      setTruncated(Boolean(d.truncated));
    } catch (e) {
      if (controller.signal.aborted) return;
      setEvents([]);
      setError(e instanceof Error ? e.message : 'โหลดกิจกรรมไม่สำเร็จ');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [member.userId]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  // Focus management + Esc to close + lock background scroll while open.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const title = member.name || `User ${member.userId}`;

  return createPortal(
    <div className="activity-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="activity-modal" role="dialog" aria-modal="true" aria-labelledby="activity-title">
        <div className="activity-head">
          <div className="activity-head-title">
            <div className="activity-head-icon"><Activity size={16} /></div>
            <div>
              <h3 id="activity-title">กิจกรรมของ {title}</h3>
              <small>{member.email || `#${member.userId}`}</small>
            </div>
          </div>
          <button ref={closeRef} className="icon-button-subtle" onClick={onClose} aria-label="ปิดหน้าต่างกิจกรรม">
            <X size={16} />
          </button>
        </div>

        <div className="activity-body" aria-busy={loading}>
          {loading ? (
            <div className="activity-state"><RefreshCw size={16} className="spin" /> กำลังโหลดกิจกรรม…</div>
          ) : error ? (
            <div className="activity-state activity-error" role="alert">
              <AlertTriangle size={16} />
              <span>{error}</span>
              <button className="secondary-button" onClick={() => void load()}>ลองอีกครั้ง</button>
            </div>
          ) : events.length === 0 ? (
            <div className="activity-state">ไม่พบกิจกรรมที่บันทึกไว้สำหรับสมาชิกนี้ใน Workspace ปัจจุบัน</div>
          ) : (
            <ul className="activity-list">
              {events.map((ev) => {
                const meta = EVENT_META[ev.type] ?? { label: ev.type, Icon: Activity };
                return (
                  <li className="activity-item" key={ev.id}>
                    <div className="activity-item-icon"><meta.Icon size={14} /></div>
                    <div className="activity-item-main">
                      <b>{meta.label}</b>
                      <time dateTime={ev.occurredAt}>{formatWhen(ev.occurredAt)}</time>
                      {ev.detail && <p>เหตุผล: {ev.detail}</p>}
                      {(ev.ipAddress || ev.userAgent) && (
                        <small>{[ev.ipAddress, ev.userAgent].filter(Boolean).join(' · ')}</small>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="activity-foot">
          {truncated ? 'แสดง 50 รายการล่าสุด · ' : ''}
          แหล่งข้อมูล: การเข้าสู่ระบบ/เซสชัน และการโอนความเป็นเจ้าของ เท่านั้น — การเปลี่ยนบทบาทและการเชิญสมาชิกยังไม่ถูกบันทึกเป็น audit record
        </div>
      </div>
    </div>,
    document.body,
  );
}
