// @ts-nocheck
import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ZYNTHEOR ErrorBoundary caught an error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#050810] text-white p-6 font-sans">
          <div className="max-w-md w-full rounded-3xl border border-white/10 bg-[#0b1020] p-7 text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 grid place-items-center">
              <AlertTriangle className="text-amber-400" size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">
                ระบบกำลังกู้คืนการทำงาน (System Recovery)
              </h2>
              <p className="text-xs text-white/50 leading-relaxed">
                ตรวจพบข้อผิดพลาดขณะแสดงผล ระบบป้องกันจอดำ (Fail-Safe) ทำงานอัตโนมัติ
              </p>
              {this.state.error?.message && (
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-left text-xs font-mono text-red-300 break-words mt-3 max-h-32 overflow-y-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={this.handleReload}
                className="h-10 px-5 rounded-full bg-[#00D9A3] text-black font-bold text-xs flex items-center gap-2 hover:bg-white transition"
              >
                <RefreshCw size={14} />
                รีเฟรชหน้าเว็บ
              </button>
              <button
                onClick={this.handleHome}
                className="h-10 px-5 rounded-full bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center gap-2 hover:bg-white/20 transition"
              >
                <Home size={14} />
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
