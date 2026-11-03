import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { csrfHeaders } from '../services/authClient';
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react';

type AuthMode = 'login' | 'register';
type AuthResponse = { ok?: boolean; token?: string; message?: string; error?: string; user?: { id: number; email: string; name: string }; tenant?: { name: string; role: string } };

export function AuthGate({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function validateSession() {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.ok && data.user) setAuthenticated(true);
      else setAuthenticated(false);
    } catch {
      // A network failure is not proof that a valid cookie session is invalid.
      setAuthenticated(false);
    }
    finally { setChecking(false); }
  }
  useEffect(() => { void validateSession(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST', credentials: 'same-origin', headers: await csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: email.trim(), password, ...(mode === 'register' ? { name: name.trim() } : {}) }),
      });
      const data = await response.json() as AuthResponse;
      if (!response.ok || !data.ok) throw new Error(data.message || 'ไม่สามารถยืนยันตัวตนได้');
      setAuthenticated(true); setPassword('');
    } catch (err) { setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'); }
    finally { setBusy(false); }
  }

  if (checking) return <div className="auth-loading"><div className="auth-loading-mark"><Sparkles size={25}/></div><span>กำลังตรวจสอบ Session ของ ZYNTHEOR…</span></div>;
  if (authenticated) return <>{children}<button className="auth-logout-fab" type="button" onClick={async () => { try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: await csrfHeaders() }); } catch {} setAuthenticated(false); }}>ออกจากระบบ</button></>;

  return <main className="auth-screen">
    <div className="auth-glow auth-glow-a"/><div className="auth-glow auth-glow-b"/>
    <section className="auth-card">
      <div className="auth-brand"><div className="auth-brand-mark"><Sparkles size={24}/></div><div><b>ZYNTHEOR</b><span>AI ENGINE · CORE X</span></div></div>
      <div className="auth-eyebrow"><ShieldCheck size={14}/> SOVEREIGN WORKSPACE ACCESS</div>
      <h1>{mode === 'login' ? 'ยินดีต้อนรับกลับ' : 'สร้างบัญชีผู้ใช้'}</h1>
      <p className="auth-subtitle">{mode === 'login' ? 'เข้าสู่ระบบเพื่อทำงานในพื้นที่ AI Engineering ของคุณ' : 'สร้างบัญชีเพื่อเริ่มต้น Workspace ส่วนตัวของคุณ'}</p>
      <form onSubmit={submit} className="auth-form">
        {mode === 'register' && <label><span>ชื่อที่แสดง</span><div className="auth-input-wrap"><UserRound size={17}/><input value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="ชื่อของคุณ" maxLength={80} required/></div></label>}
        <label><span>อีเมล</span><div className="auth-input-wrap"><Mail size={17}/><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="name@example.com" maxLength={254} required/></div></label>
        <label><span>รหัสผ่าน</span><div className="auth-input-wrap"><KeyRound size={17}/><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="อย่างน้อย 8 ตัวอักษร" minLength={8} maxLength={128} required/><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="auth-submit" disabled={busy}>{busy ? 'กำลังดำเนินการ…' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชี'}<ArrowRight size={17}/></button>
      </form>
      <div className="auth-switch">{mode === 'login' ? 'ยังไม่มีบัญชี?' : 'มีบัญชีอยู่แล้ว?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}> {mode === 'login' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</button></div>
      <div className="auth-security-note"><LockKeyhole size={14}/><span>Session ใช้คุกกี้ HttpOnly ที่ตรวจสอบโดยเซิร์ฟเวอร์ และไม่เปิดเผยโทเค็นให้ JavaScript</span></div>
    </section>
    <div className="auth-footer">ZYNTHEOR CORE X <span>·</span> LOCAL-FIRST <span>·</span> HUMAN-CONTROLLED</div>
  </main>;
}
