/**
 * ZYNTHEOR AI ENGINE
 * Voice Intelligence Input 1.1 — React Hook
 *
 * Provides a clean reactive interface for Omni Composer with:
 * - Lifecycle management
 * - Language selection (th-TH / en-US)
 * - Live interim transcript preview
 * - Privacy disclosure awareness
 * - Safe unmount cleanup
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  VoiceLifecycleState,
  VoiceLanguage,
  VoiceErrorDetails,
  VoiceIntelligenceSessionManager,
  isSpeechRecognitionSupported,
  appendTranscriptWithSmartSpacing,
  getVoicePrivacyDisclosure,
} from '../lib/voiceIntelligenceEngine';

export interface UseVoiceIntelligenceOptions {
  initialLanguage?: VoiceLanguage;
  onFinalTranscript?: (finalText: string) => void;
}

export function useVoiceIntelligenceInput(options: UseVoiceIntelligenceOptions = {}) {
  const { initialLanguage = 'th-TH', onFinalTranscript } = options;

  const [lifecycle, setLifecycle] = useState<VoiceLifecycleState>('idle');
  const [language, setLanguageState] = useState<VoiceLanguage>(initialLanguage);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState<boolean>(false);

  const errorTimeoutRef = useRef<any>(null);
  const managerRef = useRef<VoiceIntelligenceSessionManager | null>(null);

  // Initialize session manager
  if (!managerRef.current) {
    managerRef.current = new VoiceIntelligenceSessionManager(initialLanguage, {
      onLifecycleChange: (newState) => {
        setLifecycle(newState);
      },
      onInterimTranscript: (interim) => {
        setInterimTranscript(interim);
      },
      onFinalTranscript: (final) => {
        setInterimTranscript('');
        onFinalTranscript?.(final);
      },
      onError: (err: VoiceErrorDetails) => {
        setErrorMessage(err.message);
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = setTimeout(() => {
          setErrorMessage(null);
        }, 5000);
      },
    });
  }

  // Update callbacks when onFinalTranscript prop changes
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.setCallbacks({
        onFinalTranscript: (final) => {
          setInterimTranscript('');
          onFinalTranscript?.(final);
        },
      });
    }
  }, [onFinalTranscript]);

  // Check browser support on client mount
  useEffect(() => {
    const supported = isSpeechRecognitionSupported();
    setIsSupported(supported);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (managerRef.current) {
        managerRef.current.abortSession();
      }
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (!managerRef.current) return;

    if (lifecycle === 'listening' || lifecycle === 'starting') {
      managerRef.current.stopSession();
    } else {
      setErrorMessage(null);
      setInterimTranscript('');
      const res = managerRef.current.startSession();
      if (!res.success && res.reason === 'UNSUPPORTED_BROWSER') {
        setIsSupported(false);
      }
    }
  }, [lifecycle]);

  const setLanguage = useCallback((newLang: VoiceLanguage) => {
    if (!managerRef.current) return;
    setLanguageState(newLang);
    const { requiresRestart } = managerRef.current.setLanguage(newLang);
    if (requiresRestart) {
      managerRef.current.stopSession();
      setTimeout(() => {
        managerRef.current?.startSession();
      }, 300);
    }
  }, []);

  const dismissError = useCallback(() => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    setErrorMessage(null);
  }, []);

  const togglePrivacyNotice = useCallback(() => {
    setShowPrivacyNotice((prev) => !prev);
  }, []);

  const isListening = lifecycle === 'listening' || lifecycle === 'starting';

  return {
    lifecycle,
    isListening,
    isSupported,
    language,
    interimTranscript,
    errorMessage,
    showPrivacyNotice,
    privacyDisclosure: getVoicePrivacyDisclosure(),
    toggleListening,
    setLanguage,
    dismissError,
    togglePrivacyNotice,
  };
}

export { appendTranscriptWithSmartSpacing };
