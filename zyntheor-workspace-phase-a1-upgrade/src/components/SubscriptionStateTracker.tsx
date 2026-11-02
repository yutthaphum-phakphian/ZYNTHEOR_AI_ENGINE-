import React from 'react';
import { Activity, CheckCircle2, Clock } from 'lucide-react';

export type SubscriptionState =
  | 'FREE'
  | 'PENDING'
  | 'ACTIVE'
  | 'CANCEL_AT_PERIOD_END'
  | 'PAST_DUE'
  | 'GRACE_PERIOD'
  | 'SUSPENDED'
  | 'EXPIRED';

interface SubscriptionStateTrackerProps {
  currentState: SubscriptionState;
}

const STATE_FLOW: Array<{ state: SubscriptionState; label: string; desc: string }> = [
  { state: 'FREE', label: '1. Free Starter', desc: 'เริ่มต้นใช้งานฟรี 500 requests/เดือน' },
  { state: 'PENDING', label: '2. Pending Payment', desc: 'รอยืนยันการชำระเงิน' },
  { state: 'ACTIVE', label: '3. Active Plan', desc: 'เปิดใช้งานสิทธิ์ Pro / Team เรียบร้อย' },
  { state: 'CANCEL_AT_PERIOD_END', label: '4. Cancel Pending', desc: 'ยกเลิกการต่ออายุ (ใช้งานได้จนจบวันหมดอายุ)' },
  { state: 'PAST_DUE', label: '5. Past Due', desc: 'การตัดเงินล้มเหลว (รอการชำระซ้ำ)' },
  { state: 'GRACE_PERIOD', label: '6. Grace Period', desc: 'ระยะเวลาผ่อนผัน 7 วัน' },
  { state: 'SUSPENDED', label: '7. Suspended', desc: 'ระงับสิทธิ์การใช้งานชั่วคราว' },
  { state: 'EXPIRED', label: '8. Expired', desc: 'หมดอายุ — ปรับกลับเป็น Free Plan' },
];

export function SubscriptionStateTracker({ currentState }: SubscriptionStateTrackerProps) {
  const currentStatus = currentState || 'FREE';

  return (
    <div
      style={{
        background: '#0d131f',
        border: '1px solid #233148',
        borderRadius: '14px',
        padding: '20px 24px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <b style={{ fontSize: '14px', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} style={{ color: '#38bdf8' }} /> Visual Subscription Lifecycle State Tracker
          </b>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
            ติดตามสถานะความคืบหน้าของบัญชีตาม Server-Side Subscription State Machine
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>สถานะปัจจุบัน:</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '6px',
              background:
                currentStatus === 'ACTIVE'
                  ? '#064e3b'
                  : currentStatus === 'CANCEL_AT_PERIOD_END'
                  ? '#78350f'
                  : ['PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED'].includes(currentStatus)
                  ? '#7f1d1d'
                  : '#1e293b',
              color:
                currentStatus === 'ACTIVE'
                  ? '#34d399'
                  : currentStatus === 'CANCEL_AT_PERIOD_END'
                  ? '#fde047'
                  : ['PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED'].includes(currentStatus)
                  ? '#fca5a5'
                  : '#94a3b8',
              border: `1px solid ${currentStatus === 'ACTIVE' ? '#059669' : '#475569'}`,
            }}
          >
            {currentStatus}
          </span>
        </div>
      </div>

      {/* State Machine Step Nodes */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
          position: 'relative',
        }}
      >
        {STATE_FLOW.map((node) => {
          const isCurrent = currentStatus === node.state;
          const isWarningState = ['PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED'].includes(node.state);

          return (
            <div
              key={node.state}
              style={{
                background: isCurrent
                  ? isWarningState
                    ? 'linear-gradient(135deg, #451a03, #290e02)'
                    : 'linear-gradient(135deg, #064e3b, #032e23)'
                  : '#121824',
                border: `1px solid ${isCurrent ? (isWarningState ? '#f59e0b' : '#10b981') : '#232d3f'}`,
                borderRadius: '10px',
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'all 0.2s ease',
                boxShadow: isCurrent ? '0 0 16px rgba(16, 185, 129, 0.2)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    color: isCurrent ? '#ffffff' : '#64748b',
                    textTransform: 'uppercase',
                  }}
                >
                  {node.state}
                </span>
                {isCurrent ? (
                  <CheckCircle2 size={14} style={{ color: isWarningState ? '#f59e0b' : '#34d399' }} />
                ) : (
                  <Clock size={12} style={{ color: '#475569' }} />
                )}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: isCurrent ? '#f8fafc' : '#cbd5e1' }}>
                {node.label}
              </div>
              <div style={{ fontSize: '9px', color: isCurrent ? '#d1fae5' : '#64748b', lineHeight: '1.3' }}>
                {node.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SubscriptionStateTracker;
