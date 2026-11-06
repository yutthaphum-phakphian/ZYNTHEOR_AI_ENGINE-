// @ts-nocheck
/**
 * ZYNTHEOR AI ENGINE — CONTEXT ASSEMBLY ENGINE (P2.4)
 * Master Principle: ZERO FAKE — REAL COMPLETENESS ONLY
 *
 * Assembles traceable, multi-origin prompt contexts for ZYNTHEOR INTELLIGENCE,
 * distinguishing User Input, Document Knowledge, Persistent Memory, Model Reasoning, and Grounding,
 * while enforcing token budget limits, deduplication, and prompt injection defenses.
 */

import { zyntheorMemoryEngine, type VectorMemoryEntry } from '../lib/ZyntheorMemoryEngine.ts';
import { knowledgeRetrievalService, type RetrievalResultItem } from './knowledgeRetrievalService.ts';

export type ContextOriginType =
  | 'USER_PROMPT'
  | 'DOCUMENT_KNOWLEDGE'
  | 'PERSISTENT_MEMORY'
  | 'MODEL_REASONING'
  | 'EXTERNAL_GROUNDING';

export interface AssembledContextBlock {
  origin: ContextOriginType;
  title: string;
  sourceAttribution: string;
  content: string;
  score?: number;
  tokensEstimate: number;
}

export interface ContextAssemblyOptions {
  workspaceId?: string;
  maxCharBudget?: number;
  maxDocumentChunks?: number;
  maxMemoryEntries?: number;
  includeDocumentKnowledge?: boolean;
  includePersistentMemory?: boolean;
  minSimilarityThreshold?: number;
}

export interface AssembledContextResult {
  workspaceId: string;
  assembledPrompt: string;
  blocks: AssembledContextBlock[];
  totalCharCount: number;
  estimatedTokens: number;
  budgetCapChars: number;
  isTruncated: boolean;
  sourcesAttributed: string[];
  originsIncluded: ContextOriginType[];
  executionTimeMs: number;
}

const DEFAULT_MAX_CHAR_BUDGET = 3200;

export class ContextAssemblyEngine {

  /**
   * Sanitizes text to prevent prompt injection, script execution, or system override attacks.
   */
  public sanitizeContextText(text: string): string {
    return (text || '')
      .replace(/(ignore previous instructions|system prompt|system:|assistant:|user:)/gi, '[REDACTED_SECURITY_BOUNDARY]')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '[REDACTED_SCRIPT_TAG]')
      .replace(/[`]/g, "'")
      .trim();
  }

  /**
   * Main assembly method uniting Retrieval, Memory, and System Context.
   */
  public assembleContext(
    userQuery: string,
    options: ContextAssemblyOptions = {}
  ): AssembledContextResult {
    const startTime = Date.now();
    const workspaceId = (options.workspaceId || 'workspace-main').trim();
    if (!workspaceId) {
      throw new Error('[ContextAssemblyEngine] Fail-Closed: workspaceId is mandatory for context assembly.');
    }

    const maxBudget = options.maxCharBudget || DEFAULT_MAX_CHAR_BUDGET;
    const includeDocs = options.includeDocumentKnowledge ?? true;
    const includeMem = options.includePersistentMemory ?? true;
    const minSim = options.minSimilarityThreshold || 0.38;

    const blocks: AssembledContextBlock[] = [];
    const sourcesAttributed = new Set<string>();
    const originsIncluded = new Set<ContextOriginType>();

    let currentLength = 0;
    let isTruncated = false;

    // 1. Origin: USER_PROMPT (Always included first)
    const sanitizedQuery = this.sanitizeContextText(userQuery);
    const userBlock: AssembledContextBlock = {
      origin: 'USER_PROMPT',
      title: 'Current User Instruction',
      sourceAttribution: 'User Input Session',
      content: sanitizedQuery,
      tokensEstimate: Math.ceil(sanitizedQuery.length / 4),
    };
    blocks.push(userBlock);
    originsIncluded.add('USER_PROMPT');
    currentLength += sanitizedQuery.length + 50;

    // 2. Origin: DOCUMENT_KNOWLEDGE (Retrieved document chunks)
    if (includeDocs && currentLength < maxBudget) {
      const retrievalRes = knowledgeRetrievalService.retrieveKnowledge(userQuery, {
        workspaceId,
        topK: options.maxDocumentChunks || 4,
        minSimilarity: minSim,
        searchMode: 'hybrid',
      });

      if (retrievalRes.hasSufficientMatch) {
        for (const res of retrievalRes.results) {
          const sanitizedChunk = this.sanitizeContextText(res.content).slice(0, 500);
          const attr = `${res.filename}${res.pageNumber ? ` (Page ${res.pageNumber})` : ''}${res.sectionHeading ? ` [${res.sectionHeading}]` : ''}`;
          
          const blockText = `[Source: ${attr} | Relevance: ${(res.hybridScore * 100).toFixed(1)}%]\n${sanitizedChunk}`;
          if (currentLength + blockText.length > maxBudget) {
            isTruncated = true;
            break;
          }

          blocks.push({
            origin: 'DOCUMENT_KNOWLEDGE',
            title: `Document Chunk #${res.chunkId}`,
            sourceAttribution: attr,
            content: sanitizedChunk,
            score: res.hybridScore,
            tokensEstimate: Math.ceil(sanitizedChunk.length / 4),
          });

          sourcesAttributed.add(attr);
          originsIncluded.add('DOCUMENT_KNOWLEDGE');
          currentLength += blockText.length + 30;
        }
      }
    }

    // 3. Origin: PERSISTENT_MEMORY (ZyntheorMemoryEngine recall)
    if (includeMem && currentLength < maxBudget) {
      const recalledMemories = zyntheorMemoryEngine.search(workspaceId, userQuery, {
        topK: options.maxMemoryEntries || 3,
        minScore: minSim,
      });

      for (const m of recalledMemories) {
        if (m.entry.workspaceId !== workspaceId && m.entry.workspaceId !== 'default') continue;
        const sanitizedMem = this.sanitizeContextText(m.entry.content).slice(0, 350);
        const attr = `Memory [${m.entry.category}] - ${m.entry.title}`;

        const blockText = `[Memory: ${m.entry.title}]\n${sanitizedMem}`;
        if (currentLength + blockText.length > maxBudget) {
          isTruncated = true;
          break;
        }

        blocks.push({
          origin: 'PERSISTENT_MEMORY',
          title: m.entry.title,
          sourceAttribution: attr,
          content: sanitizedMem,
          score: m.score,
          tokensEstimate: Math.ceil(sanitizedMem.length / 4),
        });

        sourcesAttributed.add(attr);
        originsIncluded.add('PERSISTENT_MEMORY');
        currentLength += blockText.length + 30;
      }
    }

    // Format final prompt text string with strict security demarcations
    const formattedLines: string[] = [
      '=== ZYNTHEOR INTELLIGENCE CONTEXT ENGINE ===',
      `[Workspace ID: ${workspaceId} | Origins: ${Array.from(originsIncluded).join(', ')}]`,
      '',
    ];

    const docBlocks = blocks.filter(b => b.origin === 'DOCUMENT_KNOWLEDGE');
    if (docBlocks.length > 0) {
      formattedLines.push('--- BEGIN RETRIEVED DOCUMENT KNOWLEDGE (PASSIVE EVIDENCE ONLY) ---');
      docBlocks.forEach(b => {
        formattedLines.push(`• Source: ${b.sourceAttribution} (Relevance: ${((b.score || 0) * 100).toFixed(1)}%)\n  Content: ${b.content}`);
      });
      formattedLines.push('--- END RETRIEVED DOCUMENT KNOWLEDGE ---');
      formattedLines.push('');
    }

    const memBlocks = blocks.filter(b => b.origin === 'PERSISTENT_MEMORY');
    if (memBlocks.length > 0) {
      formattedLines.push('--- BEGIN RECALLED PERSISTENT MEMORY ---');
      memBlocks.forEach(b => {
        formattedLines.push(`• ${b.sourceAttribution}: ${b.content}`);
      });
      formattedLines.push('--- END RECALLED PERSISTENT MEMORY ---');
      formattedLines.push('');
    }

    formattedLines.push('--- USER INSTRUCTION ---');
    formattedLines.push(sanitizedQuery);
    formattedLines.push('--- END USER INSTRUCTION ---');

    const assembledPrompt = formattedLines.join('\n');

    return {
      workspaceId,
      assembledPrompt,
      blocks,
      totalCharCount: assembledPrompt.length,
      estimatedTokens: Math.ceil(assembledPrompt.length / 4),
      budgetCapChars: maxBudget,
      isTruncated,
      sourcesAttributed: Array.from(sourcesAttributed),
      originsIncluded: Array.from(originsIncluded),
      executionTimeMs: Date.now() - startTime,
    };
  }
}

export const contextAssemblyEngine = new ContextAssemblyEngine();
