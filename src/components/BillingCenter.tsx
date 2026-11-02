import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  QrCode,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  ShieldCheck,
  Zap,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  FileText,
  Lock,
  ChevronRight,
  Receipt,
  HelpCircle,
} from 'lucide-react';
import { BillingDashboard } from './BillingDashboard';

interface BillingCenterProps {
  authHeaders: () => Record<string, string>;
  setToast: (msg: string) => void;
}

export function BillingCenter({ authHeaders, setToast }: BillingCenterProps) {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [auditLedger, setAuditLedger] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('PRO');
  const [paymentProvider, setPaymentProvider] = useState<'stripe' | 'promptpay' | 'bank_transfer'>('promptpay');
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  async function fetchBillingData() {
    setLoading(true);
    try {
      const [subRes, invRes, auditRes] = await Promise.all([
        fetch('/api/billing/subscription', { headers: authHeaders() }),
        fetch('/api/billing/invoices', { headers: authHeaders() }),
        fetch('/api/billing/audit', { headers: authHeaders() }),
      ]);

      const subJson = await subRes.json();
      if (subRes.ok && subJson.ok) {
        setSubscription(subJson.subscription);
        setPlan(subJson.plan);
        setUsage(subJson.usage);
      }

      const invJson = await invRes.json();
      if (invRes.ok && invJson.ok) {
        setInvoices(invJson.invoices || []);
      }

      const auditJson = await auditRes.json();
      if (auditRes.ok && auditJson.ok) {
        setAuditLedger(auditJson.auditLedger || []);
      }
    } catch (err: any) {
      setToast(`Failed to load billing data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleInitiateCheckout(planId: string) {
    setSelectedPlanId(planId);
    setSubmitting(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          planId,
          provider: paymentProvider,
          email: 'billing@zyntheor.local',
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setCheckoutData(data.checkout);
        setToast(`สร้างคำขอชำระเงินสำหรับแพ็กเกจ ${planId} เรียบร้อยแล้ว`);
      } else {
        setToast(`Checkout failed: ${data.message || 'Error'}`);
      }
    } catch (err: any) {
      setToast(`Network error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyPayment() {
    if (!checkoutData?.transaction?.id) return;
    setVerifying(true);
    try {
      const res = await fetch('/api/billing/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          transactionId: checkoutData.transaction.id,
          provider: paymentProvider,
          providerRef: checkoutData.bankReference || checkoutData.checkoutId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setToast('ยืนยันการชำระเงินและอัปเกรดสิทธิ์การใช้งานเรียบร้อยแล้ว!');
        setCheckoutData(null);
        fetchBillingData();
      } else {
        setToast(`Verification failed: ${data.message}`);
      }
    } catch (err: any) {
      setToast(`Error verifying payment: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  }

  async function handleCancelSubscription() {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการต่ออายุแพ็กเกจเมื่อสิ้นสุดรอบบิลปัจจุบัน?')) return;
    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setToast('ยกเลิกการต่ออายุอัตโนมัติแล้ว สิทธิ์จะคงอยู่จนถึงวันสิ้นสุดรอบบิล');
        fetchBillingData();
      } else {
        setToast(`Cancel failed: ${data.message}`);
      }
    } catch (err: any) {
      setToast(`Error: ${err.message}`);
    }
  }

  return (
    <section className="subpage" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SYSTEM / BILLING & SUBSCRIPTIONS</div>
          <h1>P5 — Subscription & Billing Platform</h1>
          <p>จัดการการสมัครสมาชิก ชำระเงินผ่าน Stripe, PromptPay หรือโอนเงินผ่านธนาคาร พร้อมระบบตรวจสอบธุรกรรมและสิทธิ์ย้อนหลัง</p>
        </div>
        <button type="button" className="secondary-button" onClick={fetchBillingData} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> รีเฟรชข้อมูล
        </button>
      </div>

      {/* Integrated BillingDashboard with State Tracker & Cards */}
      <BillingDashboard
        subscription={subscription}
        plan={plan}
        usage={usage}
        invoices={invoices}
        auditLedger={auditLedger}
        onUpgradeClick={() => {
          const el = document.getElementById('plans-comparison-grid');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
        onCancelClick={handleCancelSubscription}
        setToast={setToast}
      />

      {/* Subscription Status Overview Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          border: '1px solid #334155',
          borderRadius: '14px',
          padding: '20px 24px',
          marginBottom: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: subscription?.status === 'ACTIVE' ? '#064e3b' : '#334155',
                  color: subscription?.status === 'ACTIVE' ? '#34d399' : '#94a3b8',
                  border: `1px solid ${subscription?.status === 'ACTIVE' ? '#059669' : '#475569'}`,
                  letterSpacing: '0.05em',
                }}
              >
                สถานะ: {subscription?.status || 'FREE'}
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                ผู้ให้บริการ: <strong style={{ color: '#f1f5f9', textTransform: 'capitalize' }}>{subscription?.provider || 'Stripe/PromptPay'}</strong>
              </span>
            </div>
            <h2 style={{ fontSize: '22px', color: '#f8fafc', margin: '10px 0 4px', fontWeight: 700 }}>
              {plan?.name || 'ZYNTHEOR Starter (Free)'}
            </h2>
            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
              รอบบิลปัจจุบัน: {subscription?.currentPeriodStart ? new Date(subscription.currentPeriodStart).toLocaleDateString('th-TH') : '—'} ถึง{' '}
              <strong style={{ color: '#38bdf8' }}>
                {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString('th-TH') : 'ไม่จำกัด'}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {subscription?.status === 'ACTIVE' && (
              <button
                type="button"
                className="secondary-button"
                onClick={handleCancelSubscription}
                style={{ color: '#f87171', border: '1px solid #7f1d1d' }}
              >
                ยกเลิกการต่ออายุ
              </button>
            )}
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                const el = document.getElementById('plans-comparison-grid');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Zap size={15} /> อัปเกรดแพ็กเกจ
            </button>
          </div>
        </div>

        {/* Quota & Usage Meter Bar */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #334155', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>AI Requests (ต่อเดือน)</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginTop: '2px' }}>
              {usage?.aiRequests || 0} / {plan?.monthlyAiRequests || 500}
            </div>
            <div style={{ height: '6px', width: '100%', background: '#1e293b', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, ((usage?.aiRequests || 0) / (plan?.monthlyAiRequests || 500)) * 100)}%`,
                  background: '#10b981',
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Max Workspaces</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginTop: '2px' }}>
              3 / {plan?.maxWorkspaces || 3}
            </div>
            <div style={{ height: '6px', width: '100%', background: '#1e293b', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '100%', background: '#38bdf8' }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Execution Sandbox</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: plan?.toolsSandboxEnabled ? '#34d399' : '#f59e0b', marginTop: '2px' }}>
              {plan?.toolsSandboxEnabled ? 'ปลดล็อกแล้ว (Enabled)' : 'จำกัดเฉพาะ PRO'}
            </div>
          </div>
        </div>
      </div>

      {/* Plan Comparison Grid */}
      <div id="plans-comparison-grid" style={{ marginBottom: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', color: '#f8fafc', fontWeight: 700 }}>เลือกแพ็กเกจที่เหมาะกับวิศวกรและทีมของคุณ</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>ชำระเงินปลอดภัย รองรับ PromptPay QR, บัตรเครดิตผ่าน Stripe และการโอนผ่านธนาคาร</p>
        </div>

        {/* Payment Method Selector */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`secondary-button ${paymentProvider === 'promptpay' ? 'active' : ''}`}
            onClick={() => setPaymentProvider('promptpay')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: paymentProvider === 'promptpay' ? '#1e293b' : 'transparent',
              borderColor: paymentProvider === 'promptpay' ? '#38bdf8' : '#334155',
              color: paymentProvider === 'promptpay' ? '#38bdf8' : '#94a3b8',
            }}
          >
            <QrCode size={16} /> PromptPay QR
          </button>
          <button
            type="button"
            className={`secondary-button ${paymentProvider === 'stripe' ? 'active' : ''}`}
            onClick={() => setPaymentProvider('stripe')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: paymentProvider === 'stripe' ? '#1e293b' : 'transparent',
              borderColor: paymentProvider === 'stripe' ? '#6366f1' : '#334155',
              color: paymentProvider === 'stripe' ? '#818cf8' : '#94a3b8',
            }}
          >
            <CreditCard size={16} /> Stripe / Credit Card
          </button>
          <button
            type="button"
            className={`secondary-button ${paymentProvider === 'bank_transfer' ? 'active' : ''}`}
            onClick={() => setPaymentProvider('bank_transfer')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: paymentProvider === 'bank_transfer' ? '#1e293b' : 'transparent',
              borderColor: paymentProvider === 'bank_transfer' ? '#10b981' : '#334155',
              color: paymentProvider === 'bank_transfer' ? '#34d399' : '#94a3b8',
            }}
          >
            <Building2 size={16} /> Bank Transfer (โอนเงิน)
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          {/* FREE */}
          <div style={{ background: '#111f32', border: '1px solid #1e2d42', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '16px', color: '#f1f5f9' }}>Free Starter</h3>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', margin: '12px 0 4px' }}>฿0 <span style={{ fontSize: '12px', color: '#64748b' }}>/เดือน</span></div>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>สำหรับการทดลองใช้งาน ZYNTHEOR Local Engine</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0', fontSize: '12px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li><CheckCircle2 size={14} style={{ color: '#10b981', display: 'inline', marginRight: '6px' }} /> 500 AI requests / เดือน</li>
              <li><CheckCircle2 size={14} style={{ color: '#10b981', display: 'inline', marginRight: '6px' }} /> Local LLM & Ollama router</li>
              <li><CheckCircle2 size={14} style={{ color: '#10b981', display: 'inline', marginRight: '6px' }} /> 3 Workspaces</li>
            </ul>
            <button type="button" className="secondary-button" style={{ marginTop: 'auto' }} disabled>แพ็กเกจเริ่มต้น</button>
          </div>

          {/* PRO */}
          <div style={{ background: 'linear-gradient(145deg, #172a40, #0f1c2e)', border: '2px solid #14b8a6', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-12px', right: '16px', background: '#14b8a6', color: '#000', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>RECOMMENDED</div>
            <h3 style={{ fontSize: '16px', color: '#f1f5f9' }}>Pro Engineer</h3>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#2dd4bf', margin: '12px 0 4px' }}>฿990 <span style={{ fontSize: '12px', color: '#94a3b8' }}>/เดือน</span></div>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>สำหรับวิศวกรซอฟต์แวร์เดี่ยวที่ต้องการพลังปัญญาประดิษฐ์ระดับสูง</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0', fontSize: '12px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li><CheckCircle2 size={14} style={{ color: '#14b8a6', display: 'inline', marginRight: '6px' }} /> 10,000 AI requests / เดือน</li>
              <li><CheckCircle2 size={14} style={{ color: '#14b8a6', display: 'inline', marginRight: '6px' }} /> ปลดล็อก Execution Sandbox</li>
              <li><CheckCircle2 size={14} style={{ color: '#14b8a6', display: 'inline', marginRight: '6px' }} /> 20 Workspaces & Code Analysis</li>
              <li><CheckCircle2 size={14} style={{ color: '#14b8a6', display: 'inline', marginRight: '6px' }} /> 5,000 MB Storage</li>
            </ul>
            <button
              type="button"
              className="primary-button"
              style={{ marginTop: 'auto' }}
              onClick={() => handleInitiateCheckout('PRO')}
              disabled={submitting}
            >
              {submitting && selectedPlanId === 'PRO' ? <RefreshCw size={14} className="spin" /> : <Zap size={14} />}
              <span>สมัคร Pro Engineer</span>
            </button>
          </div>

          {/* TEAM */}
          <div style={{ background: '#111f32', border: '1px solid #1e2d42', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '16px', color: '#f1f5f9' }}>Team Sovereign</h3>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#38bdf8', margin: '12px 0 4px' }}>฿3,900 <span style={{ fontSize: '12px', color: '#64748b' }}>/เดือน</span></div>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>สำหรับทีมพัฒนาซอฟต์แวร์ที่ต้องการการทำงานร่วมกันและ RBAC</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0', fontSize: '12px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li><CheckCircle2 size={14} style={{ color: '#38bdf8', display: 'inline', marginRight: '6px' }} /> 50,000 AI requests / เดือน</li>
              <li><CheckCircle2 size={14} style={{ color: '#38bdf8', display: 'inline', marginRight: '6px' }} /> รองรับสมาชิก 25 คน</li>
              <li><CheckCircle2 size={14} style={{ color: '#38bdf8', display: 'inline', marginRight: '6px' }} /> Multi-tenant & Organization RBAC</li>
            </ul>
            <button
              type="button"
              className="secondary-button"
              style={{ marginTop: 'auto' }}
              onClick={() => handleInitiateCheckout('TEAM')}
              disabled={submitting}
            >
              สมัคร Team Sovereign
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Modal with PromptPay / Bank / Stripe preview */}
      {checkoutData && (
        <div className="modal-backdrop" onClick={() => setCheckoutData(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-heading">
              <h2>ชำระเงินแพ็กเกจ {selectedPlanId} ({checkoutData.amountThb} THB)</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
              {paymentProvider === 'promptpay' && checkoutData.qrCodePayload && (
                <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', display: 'inline-block', margin: '0 auto' }}>
                  {/* PromptPay QR Code representation */}
                  <div style={{ width: '180px', height: '180px', background: '#0f172a', borderRadius: '8px', display: 'grid', placeItems: 'center', color: '#38bdf8', fontWeight: 700, margin: '0 auto' }}>
                    <QrCode size={120} />
                  </div>
                  <div style={{ fontSize: '10px', color: '#0f172a', fontWeight: 700, marginTop: '8px' }}>PROMPTPAY QR PAYMENT</div>
                </div>
              )}

              {paymentProvider === 'bank_transfer' && (
                <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b', textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>เลขที่อ้างอิงการโอนเงิน (Reference Code):</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#34d399', fontFamily: 'monospace', margin: '4px 0 10px' }}>
                    {checkoutData.bankReference}
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>ธนาคารกสิกรไทย (KBANK) • บัญชี: 123-4-56789-0 • บจก. แซดวายเอ็นเธียร AI</div>
                </div>
              )}

              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
                เมื่อชำระเงินเรียบร้อยแล้ว กดปุ่มด้านล่างเพื่อตรวจสอบผลการชำระเงินผ่านระบบเซิร์ฟเวอร์ และเปิดใช้งานสิทธิ์โดยทันที
              </div>

              <div className="modal-actions" style={{ justifyContent: 'space-between', marginTop: '10px' }}>
                <button type="button" className="secondary-button" onClick={() => setCheckoutData(null)}>
                  ปิดหน้าต่าง
                </button>
                <button type="button" className="primary-button" onClick={handleVerifyPayment} disabled={verifying}>
                  {verifying ? <RefreshCw size={14} className="spin" /> : <CheckCircle2 size={14} />}
                  <span>ยืนยันการชำระเงิน</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoices & Receipts History */}
      <div style={{ background: '#111f32', border: '1px solid #1e2d42', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', color: '#f1f5f9', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Receipt size={18} style={{ color: '#14b8a6' }} /> ประวัติใบเสร็จรับเงิน & Invoices
        </h3>

        {invoices.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#64748b', padding: '16px', textAlign: 'center' }}>
            ยังไม่มีประวัติการชำระเงิน ใบเสร็จจะแสดงที่นี่หลังจากยืนยันการชำระเงิน
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {invoices.map(inv => (
              <div
                key={inv.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#172a40',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              >
                <div>
                  <b style={{ color: '#f8fafc' }}>{inv.invoiceNumber}</b>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                    {new Date(inv.createdAt).toLocaleDateString('th-TH')} · {inv.amount} THB
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#064e3b', color: '#34d399', fontWeight: 700 }}>
                    {inv.status.toUpperCase()}
                  </span>
                  <a
                    href={inv.receiptUrl || '#'}
                    onClick={e => {
                      e.preventDefault();
                      setToast(`ดาวน์โหลดใบเสร็จ ${inv.invoiceNumber} สำเร็จ`);
                    }}
                    style={{ color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                  >
                    <Download size={12} /> ใบเสร็จ
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
