/**
 * ZYNTHEOR NATIVE INTELLIGENCE — Phase 6 Multimodal Intelligence Test Suite
 * ZERO FAKE — REAL COMPLETENESS ONLY
 * 
 * Tests:
 * - Unified Multimodal Input Registration & Security Rules
 * - Image Intelligence & OCR Text Extraction
 * - Audio Intelligence & Speech-to-Text Transcription
 * - Text-to-Speech Synthesis Contract
 * - Unified Multimodal Context Assembly
 */

import { describe, it, expect } from 'vitest';
import { multimodalIntelligenceService } from '../src/services/multimodalIntelligence.ts';

describe('ZYNTHEOR Native Intelligence — Phase 6 Multimodal Test Suite', () => {
  const testWs = 'ws-phase6-multimodal-test';

  // --- MULTIMODAL INPUT & SECURITY ---
  describe('P6.1: Unified Multimodal Input Pipeline', () => {
    it('registers text, image, audio, and document inputs with content hashes', () => {
      const textItem = multimodalIntelligenceService.registerInput('TEXT', 'Sample text prompt', 'prompt.txt', 'text/plain', testWs);
      expect(textItem.id).toBeDefined();
      expect(textItem.modality).toBe('TEXT');
      expect(textItem.contentHash).toHaveLength(64);

      const imageItem = multimodalIntelligenceService.registerInput('IMAGE', 'Sample Image Content', 'architecture.png', 'image/png', testWs);
      expect(imageItem.modality).toBe('IMAGE');
    });

    it('rejects path traversal attempts securely', () => {
      expect(() => multimodalIntelligenceService.registerInput('DOCUMENT', 'data', '../../../etc/passwd', 'text/plain', testWs))
        .toThrow('[Multimodal Security] Path traversal attempt detected.');
    });
  });

  // --- IMAGE INTELLIGENCE & OCR ---
  describe('P6.2: Image Intelligence & OCR Parsing', () => {
    it('extracts OCR text from uploaded image modality', async () => {
      const imgItem = multimodalIntelligenceService.registerInput('IMAGE', 'ภาพถ่ายโครงสร้างสถาปัตยกรรม ZYNTHEOR AI ENGINE', 'diagram.png', 'image/png', testWs);
      const ocrResult = await multimodalIntelligenceService.extractImageOcr(imgItem);

      expect(ocrResult.imageId).toBe(imgItem.id);
      expect(ocrResult.extractedText).toContain('ZYNTHEOR');
      expect(ocrResult.detectedLanguage).toBe('th');
      expect(ocrResult.confidenceScore).toBeGreaterThan(0.90);
    });
  });

  // --- AUDIO & SPEECH INTELLIGENCE ---
  describe('P6.3: Audio & Speech Intelligence (STT / TTS)', () => {
    it('transcribes audio input into text transcript with word count', async () => {
      const audioItem = multimodalIntelligenceService.registerInput('AUDIO', 'ZYNTHEOR AI ENGINE Audio Transcription Test', 'recording.wav', 'audio/wav', testWs);
      const transcript = await multimodalIntelligenceService.transcribeAudio(audioItem);

      expect(transcript.audioId).toBe(audioItem.id);
      expect(transcript.transcript).toContain('ZYNTHEOR');
      expect(transcript.wordCount).toBeGreaterThan(0);
    });

    it('generates speech audio payload contract for Text-to-Speech requests', async () => {
      const speechRes = await multimodalIntelligenceService.generateSpeech({
        text: 'สวัสดีครับ ZYNTHEOR AI ENGINE ยินดีให้บริการ',
        language: 'th'
      });

      expect(speechRes.status).toBe('COMPLETED');
      expect(speechRes.mimeType).toBe('audio/mpeg');
      expect(speechRes.durationSeconds).toBeGreaterThan(0);
    });
  });

  // --- MULTIMODAL CONTEXT ASSEMBLY ---
  describe('P6.4: Unified Multimodal Context Engine', () => {
    it('assembles unified context block combining visual, audio, and document inputs', () => {
      const context = multimodalIntelligenceService.assembleMultimodalContext(testWs);

      expect(context.formattedPrompt).toContain('--- UNIFIED MULTIMODAL CONTEXT BLOCK ---');
      expect(context.totalTokensApprox).toBeGreaterThan(0);
    });
  });
});
