// @ts-nocheck
import React from 'react';
import {
  CreditCard,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  ShieldCheck,
  Zap,
  RefreshCw,
  FileText,
  Receipt,
  Boxes,
  HardDrive,
  Activity,
  Lock,
  Hash,
  ShieldAlert,
  History,
} from 'lucide-react';
import { SubscriptionStateTracker, type SubscriptionState } from './SubscriptionStateTracker';

interface BillingDashboardProps {
  subscription: any;
  plan: any;
  usage: any;
  invoices: any[];
  auditLedger?: any[];
  onUpgradeClick: () => void;
  onCancelClick: () => void;
  setToast: (msg: string) => void;
}

export function BillingDashboard({
  subscription,
  plan,
  usage,
  invoices,
  auditLedger = [],
  onUpgradeClick,
  onCancelClick,
  setToast,
}: BillingDashboardProps) {
  const currentState: SubscriptionState = subscription?.status || 'FREE';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '28px' }}>
      {/* 1. VISUAL STATE TRACKER BAR */}
      <SubscriptionStateTracker currentState={currentState} />

      {/* 2. RESPONSIVE CARD DASHBOARD GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* CARD 1: ACTIVE SUBSCRIPTION & STATUS */}
        <div
          style={{
            background: 'linear-gradient(145deg, #111e30, #0c1524)',
            border: '1px solid #23344d',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Active Plan & Status
              </span>
              <ShieldCheck size={18} style={{ color: '#38bdf8' }} />
            </div>

            <h3 style={{ fontSize: '20px', color: '#f8fafc', margin: '0 0 6px', fontWeight: 700 }}>
              {plan?.name || 'ZYNTHEOR Starter (Free)'}
            </h3>

            <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '16px', lineHeight: '1.6' }}>
              <div>รอบบิลปัจจุบัน: {subscription?.currentPeriodStart ? new Date(subscription.currentPeriodStart).toLocaleDateString('th-TH') : '—'}</div>
              <div>วันสิ้นสุดรอบบิล: <strong style={{ color: '#34d399' }}>{subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString('th-TH') : 'ไม่จำกัด'}</strong></div>
              <div>ผู้ให้บริการ: <span style={{ textTransform: 'capitalize', color: '#cbd5e1' }}>{subscription?.provider || 'Stripe/PromptPay'}</span></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
            {subscription?.status === 'ACTIVE' && (
              <button
                type="button"
                className="secondary-button"
                onClick={onCancelClick}
                style={{ fontSize: '11px', color: '#f87171', border: '1px solid #7f1d1d' }}
              >
                ยกเลิกการต่ออายุ
              </button>
            )}
            <button type="button" className="primary-button" onClick={onUpgradeClick} style={{ fontSize: '11px' }}>
              <Zap size={14} /> เลือกแพ็กเกจเพิ่ม
            </button>
          </div>
        </div>

        {/* CARD 2: CURRENT QUOTA & USAGE METERS */}
        <div
          style={{
            background: 'linear-gradient(145deg, #111e30, #0c1524)',
            border: '1px solid #23344d',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#34d399', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Quota Usage & Metering
            </span>
            <Boxes size={18} style={{ color: '#34d399' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            {/* AI Requests Meter */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginBottom: '4px' }}>
                <span>AI Requests / เดือน:</span>
                <b>{usage?.aiRequests || 0} / {plan?.monthlyAiRequests || 500}</b>
              </div>
              <div style={{ height: '7px', background: '#1c2638', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, ((usage?.aiRequests || 0) / (plan?.monthlyAiRequests || 500)) * 100)}%`,
                    background: '#10b981',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>

            {/* Max Workspaces Meter */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginBottom: '4px' }}>
                <span>Max Workspaces:</span>
                <b>3 / {plan?.maxWorkspaces || 3}</b>
              </div>
              <div style={{ height: '7px', background: '#1c2638', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '100%', background: '#38bdf8', borderRadius: '4px' }} />
              </div>
            </div>

            {/* Storage Quota */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', padding: '8px 10px', background: '#162234', borderRadius: '8px', border: '1px solid #233146' }}>
              <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HardDrive size={13} style={{ color: '#a855f7' }} /> Storage Quota:
              </span>
              <b style={{ color: '#f1f5f9' }}>{plan?.storageMb || 100} MB</b>
            </div>

            {/* Execution Sandbox */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', padding: '8px 10px', background: '#162234', borderRadius: '8px', border: '1px solid #233146' }}>
              <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={13} style={{ color: '#f59e0b' }} /> Execution Sandbox:
              </span>
              <b style={{ color: plan?.toolsSandboxEnabled ? '#34d399' : '#f87171' }}>
                {plan?.toolsSandboxEnabled ? 'Enabled ✅' : 'PRO Required 🔒'}
              </b>
            </div>
          </div>
        </div>

        {/* CARD 3: RECENT INVOICES & RECEIPTS */}
        <div
          style={{
            background: 'linear-gradient(145deg, #111e30, #0c1524)',
            border: '1px solid #23344d',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#a855f7', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Recent Invoices & Receipts
            </span>
            <Receipt size={18} style={{ color: '#a855f7' }} />
          </div>

          {invoices.length === 0 ? (
            <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', padding: '24px 0', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={24} style={{ color: '#334155', marginBottom: '8px' }} />
              <div>ยังไม่มีใบเสร็จในระบบ</div>
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>ใบเสร็จจะเกิดขึ้นเมื่อยืนยันการชำระเงินแพ็กเกจเรียบร้อยแล้ว</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {invoices.slice(0, 3).map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: '#162234',
                    borderRadius: '8px',
                    fontSize: '11px',
                    border: '1px solid #233146',
                  }}
                >
                  <div>
                    <b style={{ color: '#f1f5f9' }}>{inv.invoiceNumber}</b>
                    <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '1px' }}>
                      {new Date(inv.createdAt).toLocaleDateString('th-TH')} · {inv.amount} THB
                    </div>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setToast(`ดาวน์โหลดใบเสร็จ ${inv.invoiceNumber} เรียบร้อยแล้ว`)}
                    style={{ fontSize: '10px', padding: '4px 8px' }}
                  >
                    <Download size={11} /> ใบเสร็จ
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. READ-ONLY FINANCIAL AUDIT LEDGER EVENT TRAIL */}
      <div
        style={{
          background: 'linear-gradient(145deg, #0d1522, #080d16)',
          border: '1px solid #1e2c40',
          borderRadius: '14px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={14} /> Financial Audit Ledger Event Trail (Read-Only)
            </span>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
              บันทึกประวัติการเปลี่ยนแปลงสิทธิ์ การชำระเงิน และการเปลี่ยนสถานะสมาชิก เชื่อมต่อ Cryptographic Hash Chain Audit Ledger
            </p>
          </div>
          <span style={{ fontSize: '10px', padding: '3px 8px', background: '#1c283d', color: '#38bdf8', borderRadius: '6px', border: '1px solid #233854', fontFamily: 'monospace' }}>
            SHA-256 SECURED
          </span>
        </div>

        {auditLedger.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', padding: '16px 0', background: '#111827', borderRadius: '8px' }}>
            ยังไม่มีบันทึกทางการเงินใน Audit Ledger
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
            {auditLedger.map((entry: any) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: '#111928',
                  border: '1px solid #1f2b3e',
                  borderRadius: '8px',
                  fontSize: '11px',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: '#38bdf8' }}>{entry.action}</span>
                    <span style={{ fontSize: '9px', color: '#64748b', fontFamily: 'monospace' }}>
                      ID: {entry.id.slice(0, 8)}…
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.detail}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '9px', color: '#94a3b8', fontFamily: 'monospace' }}>
                    {new Date(entry.at).toLocaleString('th-TH')}
                  </div>
                  <div style={{ fontSize: '9px', color: '#34d399', fontFamily: 'monospace', marginTop: '2px' }}>
                    Hash: {entry.hash ? `${entry.hash.slice(0, 8)}…` : 'GENESIS'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BillingDashboard;
