// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isSpeechRecognitionSupported,
  normalizeRecognitionError,
  appendTranscriptWithSmartSpacing,
  getVoicePrivacyDisclosure,
  VoiceIntelligenceSessionManager,
} from '../lib/voiceIntelligenceEngine';

describe('Voice Intelligence Input 1.1 — Automated Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. API Unsupported Check
  it('1. API Unsupported: correctly identifies when Web Speech API is absent', () => {
    expect(isSpeechRecognitionSupported({})).toBe(false);
    expect(isSpeechRecognitionSupported(null)).toBe(false);

    const mockWinWithSpeech = {
      SpeechRecognition: vi.fn(),
    };
    expect(isSpeechRecognitionSupported(mockWinWithSpeech)).toBe(true);

    const mockWinWithWebkit = {
      webkitSpeechRecognition: vi.fn(),
    };
    expect(isSpeechRecognitionSupported(mockWinWithWebkit)).toBe(true);

    // Session manager failure on unsupported browser
    const manager = new VoiceIntelligenceSessionManager('th-TH');
    const result = manager.startSession({});
    expect(result.success).toBe(false);
    expect(result.reason).toBe('UNSUPPORTED_BROWSER');
    expect(manager.getLifecycle()).toBe('error');
  });

  // 2. Permission Denied Handling
  it('2. Permission Denied: normalizes not-allowed error without retry', () => {
    const errorDetails = normalizeRecognitionError('not-allowed');
    expect(errorDetails.code).toBe('not-allowed');
    expect(errorDetails.retryable).toBe(false);
    expect(errorDetails.message).toContain('ไมโครโฟน');

    const onError = vi.fn();
    const manager = new VoiceIntelligenceSessionManager('th-TH', { onError });

    let triggerError: any;
    const MockSpeech = vi.fn().mockImplementation(function () {
      this.start = vi.fn();
      this.stop = vi.fn();
      triggerError = (err: string) => {
        if (this.onerror) this.onerror({ error: err });
      };
    });

    manager.startSession({ SpeechRecognition: MockSpeech });
    triggerError('not-allowed');

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'not-allowed',
        retryable: false,
      })
    );
    expect(manager.getLifecycle()).toBe('error');
  });

  // 3. No Speech Handling
  it('3. No Speech: normalizes no-speech error with retry allowed', () => {
    const errorDetails = normalizeRecognitionError('no-speech');
    expect(errorDetails.code).toBe('no-speech');
    expect(errorDetails.retryable).toBe(true);
    expect(errorDetails.message).toContain('ไม่พบเสียงพูด');
  });

  // 4. Recognition Error (Audio Capture / Network)
  it('4. Recognition Error: handles audio-capture and network failures', () => {
    const audioErr = normalizeRecognitionError('audio-capture');
    expect(audioErr.code).toBe('audio-capture');
    expect(audioErr.retryable).toBe(false);

    const networkErr = normalizeRecognitionError('network');
    expect(networkErr.code).toBe('network');
    expect(networkErr.retryable).toBe(true);
  });

  // 5. Interim Transcript (Isolation from Final)
  it('5. Interim Transcript: emits preview without committing to final text', () => {
    const onInterim = vi.fn();
    const onFinal = vi.fn();
    const manager = new VoiceIntelligenceSessionManager('th-TH', {
      onInterimTranscript: onInterim,
      onFinalTranscript: onFinal,
    });

    // Simulate interim result
    const interimEvent = {
      resultIndex: 0,
      results: [
        {
          isFinal: false,
          0: { transcript: 'กำลังพูดประโยค...' },
        },
      ],
    };

    manager.handleRecognitionResult(interimEvent);

    expect(onInterim).toHaveBeenCalledWith('กำลังพูดประโยค...');
    expect(onFinal).not.toHaveBeenCalled();
  });

  // 6. Final Transcript Emission
  it('6. Final Transcript: emits finalized transcript and clears interim state', () => {
    const onInterim = vi.fn();
    const onFinal = vi.fn();
    const manager = new VoiceIntelligenceSessionManager('th-TH', {
      onInterimTranscript: onInterim,
      onFinalTranscript: onFinal,
    });

    const finalEvent = {
      resultIndex: 0,
      results: [
        {
          isFinal: true,
          0: { transcript: 'สวัสดี ZYNTHEOR' },
        },
      ],
    };

    manager.handleRecognitionResult(finalEvent);

    expect(onFinal).toHaveBeenCalledWith('สวัสดี ZYNTHEOR');
    expect(onInterim).toHaveBeenCalledWith('');
  });

  // 7. Duplicate Result Prevention
  it('7. Duplicate Result Prevention: ignores repeated identical final transcripts', () => {
    const onFinal = vi.fn();
    const manager = new VoiceIntelligenceSessionManager('th-TH', {
      onFinalTranscript: onFinal,
    });

    const finalEvent = {
      resultIndex: 0,
      results: [
        {
          isFinal: true,
          0: { transcript: 'คำสั่งเดียวกัน' },
        },
      ],
    };

    // First call commits
    manager.handleRecognitionResult(finalEvent);
    expect(onFinal).toHaveBeenCalledTimes(1);

    // Repeated call with same transcript is rejected
    manager.handleRecognitionResult(finalEvent);
    expect(onFinal).toHaveBeenCalledTimes(1);
  });

  // 8. Append Existing Text with Smart Spacing
  it('8. Append Existing Text: joins text cleanly with smart spacing', () => {
    // Empty existing
    expect(appendTranscriptWithSmartSpacing('', 'ค้นคว้าเรื่องควอนตัม')).toBe('ค้นคว้าเรื่องควอนตัม');

    // Existing text without trailing space
    expect(appendTranscriptWithSmartSpacing('คำถามแรก', 'คำถามที่สอง')).toBe('คำถามแรก คำถามที่สอง');

    // Existing text with trailing space
    expect(appendTranscriptWithSmartSpacing('คำถามแรก ', 'คำถามที่สอง')).toBe('คำถามแรก คำถามที่สอง');

    // Empty new transcript
    expect(appendTranscriptWithSmartSpacing('คำถามแรก', '')).toBe('คำถามแรก');

    // Mixed English and Thai
    expect(appendTranscriptWithSmartSpacing('Research on', 'ปัญญาประดิษฐ์')).toBe('Research on ปัญญาประดิษฐ์');
  });

  // 9. Multiple Start Prevention (Concurrency Lock)
  it('9. Multiple Start Prevention: blocks duplicate concurrent recognition sessions', () => {
    const manager = new VoiceIntelligenceSessionManager('th-TH');

    const MockSpeech = vi.fn().mockImplementation(function () {
      this.start = vi.fn();
      this.stop = vi.fn();
    });

    const win = { SpeechRecognition: MockSpeech };

    const firstStart = manager.startSession(win);
    expect(firstStart.success).toBe(true);
    expect(manager.getLifecycle()).toBe('starting');

    // Attempting to start again while starting or listening
    const secondStart = manager.startSession(win);
    expect(secondStart.success).toBe(false);
    expect(secondStart.reason).toBe('CONCURRENT_SESSION_BLOCKED');
  });

  // 10. Stop During Listening
  it('10. Stop During Listening: gracefully stops and transitions through stopping to idle', () => {
    let instanceStop: any;
    let instanceOnEnd: any;

    const MockSpeech = vi.fn().mockImplementation(function () {
      this.start = vi.fn();
      this.stop = vi.fn(() => {
        instanceStop = true;
      });
      instanceOnEnd = () => {
        if (this.onend) this.onend();
      };
    });

    const manager = new VoiceIntelligenceSessionManager('th-TH');
    manager.startSession({ SpeechRecognition: MockSpeech });

    // Transition to listening
    manager['updateLifecycle']('listening');
    expect(manager.getLifecycle()).toBe('listening');

    // Request stop
    manager.stopSession();
    expect(manager.getLifecycle()).toBe('stopping');
    expect(instanceStop).toBe(true);

    // Natural end event
    instanceOnEnd();
    expect(manager.getLifecycle()).toBe('idle');
  });

  // 11. Component Unmount Cleanup & Stale Callback Invalidation
  it('11. Cleanup & Stale Callbacks: abortSession cancels instance and ignores orphaned events', () => {
    let instanceAbort = false;
    let capturedOnResult: any;

    const MockSpeech = vi.fn().mockImplementation(function () {
      this.start = vi.fn();
      this.abort = vi.fn(() => {
        instanceAbort = true;
      });
      capturedOnResult = (evt: any) => {
        if (this.onresult) this.onresult(evt);
      };
    });

    const onFinal = vi.fn();
    const manager = new VoiceIntelligenceSessionManager('th-TH', {
      onFinalTranscript: onFinal,
    });

    manager.startSession({ SpeechRecognition: MockSpeech });
    expect(manager.getLifecycle()).toBe('starting');

    // Unmount / Abort
    manager.abortSession();
    expect(instanceAbort).toBe(true);
    expect(manager.getLifecycle()).toBe('idle');

    // Simulate stale callback arriving after abort
    capturedOnResult({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: 'ข้อความที่มาสาย' } }],
    });

    // Should NOT trigger callback because sessionToken was incremented
    expect(onFinal).not.toHaveBeenCalled();
  });

  // 12. Language Switching (th-TH / en-US)
  it('12. Language Switching: supports hot switching between th-TH and en-US', () => {
    const manager = new VoiceIntelligenceSessionManager('th-TH');
    expect(manager.getLanguage()).toBe('th-TH');

    const res = manager.setLanguage('en-US');
    expect(manager.getLanguage()).toBe('en-US');
    expect(res.requiresRestart).toBe(false);

    // If active, reports that restart is required
    manager['updateLifecycle']('listening');
    const res2 = manager.setLanguage('th-TH');
    expect(manager.getLanguage()).toBe('th-TH');
    expect(res2.requiresRestart).toBe(true);
  });

  // 13. Privacy & Sovereign Transparency Verification
  it('13. Privacy Transparency: strictly declares Web Speech is not Local-Only', () => {
    const privacy = getVoicePrivacyDisclosure();
    expect(privacy.isLocalOnly).toBe(false);
    expect(privacy.providerDisclosure).toContain('ไม่ถือเป็น Local-Only Inference');
    expect(privacy.dataRetention).toContain('ไม่มีการเก็บสำรองไฟล์เสียง');
  });
});
