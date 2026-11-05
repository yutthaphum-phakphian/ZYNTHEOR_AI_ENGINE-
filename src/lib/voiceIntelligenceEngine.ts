/**
 * ZYNTHEOR AI ENGINE
 * Voice Intelligence Input 1.1 — Core Engine & Session Governance
 *
 * Principles:
 * - Sovereign Transparency: Web Speech API is host/browser dependent, NOT local-only.
 * - Robust Lifecycle: idle -> starting -> listening -> stopping -> idle (or error).
 * - Transcript Integrity: Differentiates interim preview vs final commit; prevents duplicate insertion.
 * - Language Support: Defaults to th-TH, supports en-US with hot switching.
 * - Stale Callback Guard: Token-based invalidation prevents orphaned callbacks after cancellation.
 */

export type VoiceLifecycleState = 'idle' | 'starting' | 'listening' | 'stopping' | 'error';
export type VoiceLanguage = 'th-TH' | 'en-US';

export interface VoiceErrorDetails {
  code: string;
  message: string;
  retryable: boolean;
}

export interface VoicePrivacyDisclosure {
  isLocalOnly: false;
  providerDisclosure: string;
  dataRetention: string;
}

export interface VoiceSessionCallbacks {
  onLifecycleChange?: (state: VoiceLifecycleState) => void;
  onInterimTranscript?: (interim: string) => void;
  onFinalTranscript?: (final: string) => void;
  onError?: (error: VoiceErrorDetails) => void;
}

/**
 * Check if the host browser supports the Web Speech API.
 */
export function isSpeechRecognitionSupported(win?: any): boolean {
  if (typeof win === 'undefined') {
    if (typeof window === 'undefined') return false;
    win = window;
  }
  return Boolean(
    win &&
    (typeof win.SpeechRecognition === 'function' ||
     typeof win.webkitSpeechRecognition === 'function')
  );
}

/**
 * Normalizes speech recognition error codes into human-readable messages (Thai-first).
 */
export function normalizeRecognitionError(errorCode: string): VoiceErrorDetails {
  switch (errorCode) {
    case 'not-allowed':
      return {
        code: 'not-allowed',
        message: 'กรุณาอนุญาตการเข้าถึงไมโครโฟนเพื่อใช้งานพิมพ์ด้วยเสียง (Microphone Permission Denied)',
        retryable: false,
      };
    case 'audio-capture':
      return {
        code: 'audio-capture',
        message: 'ไม่พบอุปกรณ์ไมโครโฟน หรืออุปกรณ์ถูกใช้งานโดยโปรแกรมอื่น',
        retryable: false,
      };
    case 'no-speech':
      return {
        code: 'no-speech',
        message: 'ไม่พบเสียงพูด กรุณาลองพูดใหม่อีกครั้ง',
        retryable: true,
      };
    case 'network':
      return {
        code: 'network',
        message: 'เกิดข้อผิดพลาดการเชื่อมต่อเครือข่ายของบริการประมวลผลเสียงของเบราว์เซอร์',
        retryable: true,
      };
    case 'aborted':
      return {
        code: 'aborted',
        message: 'การรับเสียงถูกยกเลิก',
        retryable: true,
      };
    default:
      return {
        code: errorCode || 'unknown',
        message: `ข้อผิดพลาดการรับเสียง: ${errorCode || 'ไม่ทราบสาเหตุ'}`,
        retryable: true,
      };
  }
}

/**
 * Appends a new voice transcript to existing text with smart spacing.
 * Ensures proper spacing between Thai and English utterances without awkward concatenation.
 */
export function appendTranscriptWithSmartSpacing(existingText: string, newTranscript: string): string {
  const trimmedNew = (newTranscript || '').trim();
  if (!trimmedNew) return existingText || '';

  const trimmedExisting = (existingText || '').trim();
  if (!trimmedExisting) return trimmedNew;

  // If existing ends with space, preserve boundary
  if (existingText.endsWith(' ') || existingText.endsWith('\n')) {
    return `${existingText}${trimmedNew}`;
  }

  // Check punctuation or whitespace separation
  return `${trimmedExisting} ${trimmedNew}`;
}

/**
 * Returns the transparent privacy disclosure for Voice-to-Text input.
 */
export function getVoicePrivacyDisclosure(): VoicePrivacyDisclosure {
  return {
    isLocalOnly: false,
    providerDisclosure:
      'ระบบพิมพ์ด้วยเสียงใช้ Web Speech API ของเบราว์เซอร์ ซึ่งอาจส่งสัญญาณเสียงไปประมวลผลผ่านบริการ Cloud ของผู้พัฒนาเบราว์เซอร์ (เช่น Google หรือ Apple) ไม่ถือเป็น Local-Only Inference ของ ZYNTHEOR CORE ข้อมูลเสียงจะไม่ถูกบันทึกลง Audit Ledger หรือส่งต่อให้ LLM ภายนอกโดยไม่ได้รับคำสั่ง',
    dataRetention: 'ไม่มีการเก็บสำรองไฟล์เสียงบนเซิร์ฟเวอร์ของ ZYNTHEOR',
  };
}

/**
 * Governed Session Manager for Speech Recognition
 */
export class VoiceIntelligenceSessionManager {
  private lifecycle: VoiceLifecycleState = 'idle';
  private language: VoiceLanguage = 'th-TH';
  private sessionToken: number = 0;
  private activeRecognitionInstance: any = null;
  private lastCommittedTranscript: string = '';
  private callbacks: VoiceSessionCallbacks = {};

  constructor(initialLanguage: VoiceLanguage = 'th-TH', callbacks: VoiceSessionCallbacks = {}) {
    this.language = initialLanguage;
    this.callbacks = callbacks;
  }

  public getLifecycle(): VoiceLifecycleState {
    return this.lifecycle;
  }

  public getLanguage(): VoiceLanguage {
    return this.language;
  }

  public setLanguage(lang: VoiceLanguage): { requiresRestart: boolean } {
    const wasActive = this.lifecycle === 'listening' || this.lifecycle === 'starting';
    this.language = lang;
    return { requiresRestart: wasActive };
  }

  public setCallbacks(callbacks: VoiceSessionCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private updateLifecycle(newState: VoiceLifecycleState): void {
    this.lifecycle = newState;
    this.callbacks.onLifecycleChange?.(newState);
  }

  /**
   * Start a new speech recognition session.
   * Prevents concurrent instances and manages instance lifecycle.
   */
  public startSession(winObj?: any): { success: boolean; reason?: string } {
    // 1. Session concurrency guard
    if (this.lifecycle === 'starting' || this.lifecycle === 'listening') {
      return { success: false, reason: 'CONCURRENT_SESSION_BLOCKED' };
    }

    const win = winObj || (typeof window !== 'undefined' ? window : null);
    if (!win) {
      this.updateLifecycle('error');
      this.callbacks.onError?.({
        code: 'window-undefined',
        message: 'ไม่พบหน้าต่างเบราว์เซอร์สำหรับการรับเสียง',
        retryable: false,
      });
      return { success: false, reason: 'WINDOW_UNDEFINED' };
    }

    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      this.updateLifecycle('error');
      this.callbacks.onError?.({
        code: 'unsupported',
        message: 'เบราว์เซอร์นี้ยังไม่รองรับ Web Speech API (แนะนำ Chromium, Chrome หรือ Safari)',
        retryable: false,
      });
      return { success: false, reason: 'UNSUPPORTED_BROWSER' };
    }

    // 2. Increment session token to invalidate past callbacks
    this.sessionToken += 1;
    const currentToken = this.sessionToken;
    this.lastCommittedTranscript = '';

    this.updateLifecycle('starting');

    try {
      const recognition = new SpeechRec();
      recognition.lang = this.language;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        if (this.sessionToken !== currentToken) return;
        this.updateLifecycle('listening');
      };

      recognition.onresult = (event: any) => {
        if (this.sessionToken !== currentToken) return;
        this.handleRecognitionResult(event);
      };

      recognition.onerror = (event: any) => {
        if (this.sessionToken !== currentToken) return;
        const errDetails = normalizeRecognitionError(event.error);
        this.updateLifecycle('error');
        this.callbacks.onError?.(errDetails);
      };

      recognition.onend = () => {
        if (this.sessionToken !== currentToken) return;
        // Natural transition to idle
        this.activeRecognitionInstance = null;
        this.updateLifecycle('idle');
      };

      this.activeRecognitionInstance = recognition;
      recognition.start();
      return { success: true };
    } catch (err: any) {
      this.updateLifecycle('error');
      const errDetails = normalizeRecognitionError(err?.message || 'init_failed');
      this.callbacks.onError?.(errDetails);
      return { success: false, reason: err?.message || 'INIT_FAILED' };
    }
  }

  /**
   * Process incoming speech recognition events with interim/final separation and deduplication.
   */
  public handleRecognitionResult(event: any): void {
    if (!event || !event.results) return;

    let interimText = '';
    let finalText = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const res = event.results[i];
      const text = res[0]?.transcript || '';
      if (res.isFinal) {
        finalText += text;
      } else {
        interimText += text;
      }
    }

    // Emit interim preview without committing
    if (interimText) {
      this.callbacks.onInterimTranscript?.(interimText);
    }

    // Handle final transcript with deduplication
    const trimmedFinal = finalText.trim();
    if (trimmedFinal && trimmedFinal !== this.lastCommittedTranscript) {
      this.lastCommittedTranscript = trimmedFinal;
      this.callbacks.onInterimTranscript?.(''); // Clear interim
      this.callbacks.onFinalTranscript?.(trimmedFinal);
    }
  }

  /**
   * Gracefully stop the current speech recognition session.
   */
  public stopSession(): void {
    if (this.lifecycle !== 'listening' && this.lifecycle !== 'starting') {
      return;
    }

    this.updateLifecycle('stopping');

    if (this.activeRecognitionInstance) {
      try {
        this.activeRecognitionInstance.stop();
      } catch {
        // If stop fails, force abort
        try {
          this.activeRecognitionInstance.abort();
        } catch {}
      }
    }
  }

  /**
   * Immediately abort the session and invalidate all pending callbacks.
   */
  public abortSession(): void {
    this.sessionToken += 1; // Invalidate any incoming callbacks
    if (this.activeRecognitionInstance) {
      try {
        this.activeRecognitionInstance.abort();
      } catch {}
      this.activeRecognitionInstance = null;
    }
    this.updateLifecycle('idle');
    this.callbacks.onInterimTranscript?.('');
  }
}
