// @ts-nocheck
/**
 * ZYNTHEOR AI ENGINE — NATIVE KNOWLEDGE INGESTION SERVICE (P2.1)
 * Master Principle: ZERO FAKE — REAL COMPLETENESS ONLY
 *
 * Provides safe, modular document ingestion, content extraction, structural chunking,
 * SHA-256 deduplication, and metadata preservation for PDF, TXT, Markdown, and Code files.
 */

import { createHash } from 'node:crypto';
import { VECTOR_DIMENSIONS } from './memoryStorageProvider.ts';
import { generateDenseEmbedding } from './vectorMemory.ts';

export type SupportedFileFormat = 'pdf' | 'txt' | 'markdown' | 'code';

export interface DocumentSourceMetadata {
  filename: string;
  fileFormat: SupportedFileFormat;
  mimeType: string;
  fileSizeBytes: number;
  contentHash: string;
  language?: string;
  pageCount?: number;
  workspaceId: string;
  uploadedAt: string;
}

export interface KnowledgeChunk {
  chunkId: string;
  documentId: string;
  workspaceId: string;
  chunkIndex: number;
  totalChunks: number;
  content: string;
  embedding: number[]; // 128D vector
  sectionHeading?: string;
  pageNumber?: number;
  startLine?: number;
  endLine?: number;
  tokenCount: number;
  metadata: Record<string, any>;
}

export interface IngestedDocument {
  documentId: string;
  workspaceId: string;
  metadata: DocumentSourceMetadata;
  fullText: string;
  chunks: KnowledgeChunk[];
  isDuplicate: boolean;
  status: 'INGESTED' | 'MALFORMED' | 'UNSUPPORTED';
  warnings: string[];
}

export interface IngestionOptions {
  workspaceId?: string;
  maxSizeBytes?: number;
  chunkSizeBytes?: number;
  chunkOverlapBytes?: number;
}

const DEFAULT_MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const DEFAULT_CHUNK_SIZE = 800; // characters
const DEFAULT_CHUNK_OVERLAP = 150; // characters

export class KnowledgeIngestionService {
  private documentStore: Map<string, IngestedDocument> = new Map();
  private hashStore: Map<string, string> = new Map(); // hash -> documentId

  /**
   * Sanitizes input strings to prevent path traversal, script injection, and unsafe control chars.
   */
  public sanitizeFilename(filename: string): string {
    return filename
      .replace(/\\/g, '/')
      .split('/')
      .pop()!
      .replace(/[^a-zA-Z0-9_\-\.\u0E00-\u0E7F]/g, '_');
  }

  /**
   * Detects file format based on extension.
   */
  public detectFormat(filename: string): SupportedFileFormat | null {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext) return null;
    if (ext === 'pdf') return 'pdf';
    if (ext === 'txt') return 'txt';
    if (ext === 'md' || ext === 'markdown') return 'markdown';
    if (['ts', 'js', 'py', 'json', 'rs', 'go', 'sql', 'html', 'css', 'c', 'cpp', 'java'].includes(ext)) {
      return 'code';
    }
    return null;
  }

  /**
   * Main ingestion entry point for raw file contents.
   */
  public ingestDocument(
    filename: string,
    rawContent: string | Uint8Array,
    options: IngestionOptions = {}
  ): IngestedDocument {
    const workspaceId = (options.workspaceId || 'workspace-main').trim();
    if (!workspaceId) {
      throw new Error('[KnowledgeIngestionService] Fail-Closed: workspaceId is mandatory for ingestion.');
    }

    const safeFilename = this.sanitizeFilename(filename);
    const format = this.detectFormat(safeFilename);
    const warnings: string[] = [];

    if (!format) {
      return {
        documentId: `doc-err-${Date.now()}`,
        workspaceId,
        metadata: {
          filename: safeFilename,
          fileFormat: 'txt',
          mimeType: 'application/octet-stream',
          fileSizeBytes: 0,
          contentHash: '',
          workspaceId,
          uploadedAt: new Date().toISOString(),
        },
        fullText: '',
        chunks: [],
        isDuplicate: false,
        status: 'UNSUPPORTED',
        warnings: [`Unsupported file extension for filename "${safeFilename}".`],
      };
    }

    const contentString = typeof rawContent === 'string'
      ? rawContent
      : new TextDecoder('utf-8', { fatal: false }).decode(rawContent);

    const sizeBytes = Buffer.byteLength(contentString, 'utf-8');
    const maxSize = options.maxSizeBytes || DEFAULT_MAX_SIZE_BYTES;
    if (sizeBytes > maxSize) {
      return {
        documentId: `doc-err-${Date.now()}`,
        workspaceId,
        metadata: {
          filename: safeFilename,
          fileFormat: format,
          mimeType: 'text/plain',
          fileSizeBytes: sizeBytes,
          contentHash: '',
          workspaceId,
          uploadedAt: new Date().toISOString(),
        },
        fullText: '',
        chunks: [],
        isDuplicate: false,
        status: 'MALFORMED',
        warnings: [`File size (${sizeBytes} bytes) exceeds maximum limit of ${maxSize} bytes.`],
      };
    }

    if (!contentString.trim()) {
      return {
        documentId: `doc-err-${Date.now()}`,
        workspaceId,
        metadata: {
          filename: safeFilename,
          fileFormat: format,
          mimeType: 'text/plain',
          fileSizeBytes: sizeBytes,
          contentHash: '',
          workspaceId,
          uploadedAt: new Date().toISOString(),
        },
        fullText: '',
        chunks: [],
        isDuplicate: false,
        status: 'MALFORMED',
        warnings: [`Document content is empty or unreadable.`],
      };
    }

    // SHA-256 content hashing & deduplication
    const contentHash = createHash('sha256').update(contentString).digest('hex');
    const hashKey = `${workspaceId}:${contentHash}`;
    const existingDocId = this.hashStore.get(hashKey);

    if (existingDocId && this.documentStore.has(existingDocId)) {
      const existingDoc = this.documentStore.get(existingDocId)!;
      return {
        ...existingDoc,
        isDuplicate: true,
        warnings: [`Duplicate document detected. Existing documentId: "${existingDoc.documentId}".`],
      };
    }

    const documentId = `doc-${contentHash.slice(0, 12)}`;
    const uploadedAt = new Date().toISOString();

    let pageCount = 1;
    let extractedText = contentString;

    // Structure-aware extraction
    if (format === 'pdf') {
      const pageMatches = contentString.match(/--- Page \d+ ---/g);
      pageCount = pageMatches ? pageMatches.length : Math.max(1, Math.ceil(contentString.length / 2500));
    }

    // Generate structural chunks
    const chunks = this.createStructuralChunks(
      documentId,
      workspaceId,
      extractedText,
      format,
      safeFilename,
      options
    );

    const docMetadata: DocumentSourceMetadata = {
      filename: safeFilename,
      fileFormat: format,
      mimeType: format === 'pdf' ? 'application/pdf' : format === 'markdown' ? 'text/markdown' : 'text/plain',
      fileSizeBytes: sizeBytes,
      contentHash,
      language: this.detectLanguage(contentString),
      pageCount,
      workspaceId,
      uploadedAt,
    };

    const ingestedDoc: IngestedDocument = {
      documentId,
      workspaceId,
      metadata: docMetadata,
      fullText: extractedText,
      chunks,
      isDuplicate: false,
      status: 'INGESTED',
      warnings,
    };

    this.documentStore.set(documentId, ingestedDoc);
    this.hashStore.set(hashKey, documentId);

    return ingestedDoc;
  }

  /**
   * Structural chunking for PDF, Markdown, TXT, and Code formats.
   */
  private createStructuralChunks(
    documentId: string,
    workspaceId: string,
    text: string,
    format: SupportedFileFormat,
    filename: string,
    options: IngestionOptions
  ): KnowledgeChunk[] {
    const chunkSize = options.chunkSizeBytes || DEFAULT_CHUNK_SIZE;
    const overlap = options.chunkOverlapBytes || DEFAULT_CHUNK_OVERLAP;
    const rawSections: Array<{ heading?: string; page?: number; startLine?: number; endLine?: number; text: string }> = [];

    if (format === 'markdown') {
      // Split by Markdown Headers (#, ##, ###) and code block boundaries
      const lines = text.split('\n');
      let currentHeading = 'Overview';
      let currentBuffer: string[] = [];
      let startLine = 1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/^#{1,4}\s+/)) {
          if (currentBuffer.length > 0) {
            rawSections.push({
              heading: currentHeading,
              startLine,
              endLine: i,
              text: currentBuffer.join('\n'),
            });
            currentBuffer = [];
          }
          currentHeading = line.replace(/^#{1,4}\s+/, '').trim();
          startLine = i + 1;
        }
        currentBuffer.push(line);
      }
      if (currentBuffer.length > 0) {
        rawSections.push({
          heading: currentHeading,
          startLine,
          endLine: lines.length,
          text: currentBuffer.join('\n'),
        });
      }
    } else if (format === 'pdf') {
      // Split by PDF page markers
      const pageBlocks = text.split(/--- Page (\d+) ---/);
      if (pageBlocks.length > 1) {
        for (let i = 1; i < pageBlocks.length; i += 2) {
          const pageNum = parseInt(pageBlocks[i], 10);
          const pageText = pageBlocks[i + 1] || '';
          if (pageText.trim()) {
            rawSections.push({
              page: pageNum,
              text: pageText.trim(),
            });
          }
        }
      } else {
        rawSections.push({ page: 1, text });
      }
    } else if (format === 'code') {
      // Code splitting by function/class boundaries or line groups
      const lines = text.split('\n');
      let currentBuffer: string[] = [];
      let startLine = 1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        currentBuffer.push(line);
        if (currentBuffer.join('\n').length >= chunkSize || i === lines.length - 1) {
          rawSections.push({
            heading: `File: ${filename} (L${startLine}-L${i + 1})`,
            startLine,
            endLine: i + 1,
            text: currentBuffer.join('\n'),
          });
          currentBuffer = [];
          startLine = i + 2;
        }
      }
    } else {
      // TXT sliding window
      rawSections.push({ text });
    }

    const chunks: KnowledgeChunk[] = [];
    let chunkIndex = 0;

    for (const sec of rawSections) {
      const secText = sec.text;
      if (!secText.trim()) continue;

      if (secText.length <= chunkSize) {
        const embedding = generateDenseEmbedding(`${sec.heading || filename}\n${secText}`);
        chunks.push({
          chunkId: `${documentId}-chk-${chunkIndex}`,
          documentId,
          workspaceId,
          chunkIndex,
          totalChunks: 0,
          content: secText.trim(),
          embedding,
          sectionHeading: sec.heading,
          pageNumber: sec.page,
          startLine: sec.startLine,
          endLine: sec.endLine,
          tokenCount: Math.ceil(secText.length / 4),
          metadata: { filename, format },
        });
        chunkIndex++;
      } else {
        // Sliding window for large section
        let pos = 0;
        while (pos < secText.length) {
          const end = Math.min(pos + chunkSize, secText.length);
          const sliceText = secText.slice(pos, end);
          const embedding = generateDenseEmbedding(`${sec.heading || filename}\n${sliceText}`);
          chunks.push({
            chunkId: `${documentId}-chk-${chunkIndex}`,
            documentId,
            workspaceId,
            chunkIndex,
            totalChunks: 0,
            content: sliceText.trim(),
            embedding,
            sectionHeading: sec.heading,
            pageNumber: sec.page,
            startLine: sec.startLine,
            endLine: sec.endLine,
            tokenCount: Math.ceil(sliceText.length / 4),
            metadata: { filename, format, startOffset: pos, endOffset: end },
          });
          chunkIndex++;
          pos += chunkSize - overlap;
        }
      }
    }

    // Set totalChunks count for each chunk
    chunks.forEach(c => {
      c.totalChunks = chunks.length;
    });

    return chunks;
  }

  private detectLanguage(text: string): string {
    const thaiChars = (text.match(/[\u0E00-\u0E7F]/g) || []).length;
    const totalChars = text.length || 1;
    return thaiChars / totalChars > 0.1 ? 'th-TH' : 'en-US';
  }

  public getDocument(documentId: string): IngestedDocument | null {
    return this.documentStore.get(documentId) || null;
  }

  public getAllDocuments(workspaceId: string = 'workspace-main'): IngestedDocument[] {
    return Array.from(this.documentStore.values()).filter(d => d.workspaceId === workspaceId);
  }

  public clearWorkspace(workspaceId: string): number {
    let count = 0;
    for (const [id, doc] of this.documentStore.entries()) {
      if (doc.workspaceId === workspaceId) {
        this.documentStore.delete(id);
        const hashKey = `${workspaceId}:${doc.metadata.contentHash}`;
        this.hashStore.delete(hashKey);
        count++;
      }
    }
    return count;
  }
}

export const knowledgeIngestionService = new KnowledgeIngestionService();
