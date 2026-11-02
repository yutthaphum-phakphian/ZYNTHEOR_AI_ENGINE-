import fs from 'node:fs';
import path from 'node:path';

export type DiagnosisLevel = 'CONFIRMED_CAUSE' | 'LIKELY_CAUSE' | 'POSSIBLE_CAUSE' | 'UNKNOWN';

export interface ProblemAnalysis {
  rootCause: string;
  diagnosisLevel: DiagnosisLevel;
  category: 'COMPILER_ERROR' | 'TYPESCRIPT_ERROR' | 'TEST_FAILURE' | 'RUNTIME_EXCEPTION' | 'MODEL_ENDPOINT_ERROR' | 'BUNDLE_SIZE_WARNING' | 'GENERAL_ERROR';
  impact: 'low' | 'medium' | 'high' | 'critical';
  file?: string;
  line?: number;
  column?: number;
  evidence: string;
  suggestedFix?: string;
  relevantTests?: string[];
}

const ROOT_DIR = process.cwd();

export function analyzeProblem(log: string): ProblemAnalysis {
  if (!log || typeof log !== 'string' || !log.trim()) {
    return {
      rootCause: 'No log output or error details provided',
      diagnosisLevel: 'UNKNOWN',
      category: 'GENERAL_ERROR',
      impact: 'low',
      evidence: 'Empty input log',
    };
  }

  const cleanLog = log.trim();

  // 1. Parse TypeScript / Compiler Errors (e.g., "src/App.tsx(45,12): error TS2322: Type 'string' is not assignable...")
  const tsErrorMatch = cleanLog.match(/([a-zA-Z0-9_\-\/]+\.(?:tsx?|jsx?|mjs|mts))\s*\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.*)/i)
    || cleanLog.match(/([a-zA-Z0-9_\-\/]+\.(?:tsx?|jsx?|mjs|mts)):(\d+):(\d+)\s*-\s*error\s+(TS\d+):\s*(.*)/i);

  if (tsErrorMatch) {
    const relFile = tsErrorMatch[1].replace(/\\/g, '/');
    const line = parseInt(tsErrorMatch[2], 10);
    const col = parseInt(tsErrorMatch[3], 10);
    const code = tsErrorMatch[4];
    const message = tsErrorMatch[5];
    const exists = fs.existsSync(path.resolve(ROOT_DIR, relFile));

    return {
      rootCause: `TypeScript Error ${code}: ${message}`,
      diagnosisLevel: exists ? 'CONFIRMED_CAUSE' : 'LIKELY_CAUSE',
      category: 'TYPESCRIPT_ERROR',
      impact: 'high',
      file: relFile,
      line,
      column: col,
      evidence: `TypeScript compiler output references ${relFile}:${line}:${col} (File exists: ${exists})`,
      suggestedFix: `Inspect type definitions in ${relFile} around line ${line}.`,
      relevantTests: ['npm run typecheck', 'npm test'],
    };
  }

  // 2. Parse Stack Traces (e.g. "Error: Something failed\n  at functionName (src/services/auth.ts:42:15)")
  const stackMatch = cleanLog.match(/at\s+(?:(.*?)\s+\()?([a-zA-Z0-9_\-\.\/]+\.(?:ts|tsx|js|jsx|mjs|mts)):(\d+):(\d+)\)?/);
  if (stackMatch) {
    const fnName = stackMatch[1] || 'anonymous';
    const relFile = stackMatch[2].replace(process.cwd(), '').replace(/^\/+/, '').replace(/\\/g, '/');
    const line = parseInt(stackMatch[3], 10);
    const col = parseInt(stackMatch[4], 10);
    const exists = fs.existsSync(path.resolve(ROOT_DIR, relFile));

    const firstLine = cleanLog.split('\n')[0] || 'Runtime exception';

    return {
      rootCause: `${firstLine} in ${fnName}`,
      diagnosisLevel: exists ? 'CONFIRMED_CAUSE' : 'LIKELY_CAUSE',
      category: 'RUNTIME_EXCEPTION',
      impact: 'high',
      file: relFile,
      line,
      column: col,
      evidence: `Parsed stack frame: ${relFile}:${line}:${col} in function '${fnName}' (File exists: ${exists})`,
      suggestedFix: `Check function '${fnName}' in ${relFile} at line ${line}.`,
      relevantTests: ['npm test'],
    };
  }

  // 3. Known Patterns
  if (cleanLog.includes('MODEL_NOT_FOUND')) {
    return {
      rootCause: 'Configured AI model name is not recognized or available on the current endpoint',
      diagnosisLevel: 'CONFIRMED_CAUSE',
      category: 'MODEL_ENDPOINT_ERROR',
      impact: 'high',
      evidence: 'Matched error pattern "MODEL_NOT_FOUND" in log output',
      suggestedFix: 'Switch to a valid model alias (e.g., gemini-1.5-flash or gemini-2.5-flash) or ensure local Ollama model is pulled.',
    };
  }

  if (cleanLog.includes('larger than 500') || cleanLog.includes('chunkSizeWarningLimit')) {
    return {
      rootCause: 'Vite build warning: Monolithic bundle chunk exceeds 500kB',
      diagnosisLevel: 'CONFIRMED_CAUSE',
      category: 'BUNDLE_SIZE_WARNING',
      impact: 'medium',
      evidence: 'Matched Vite chunk size limit warning in build log',
      suggestedFix: 'Configure manualChunks in vite.config.ts or use dynamic import() splitting.',
    };
  }

  if (cleanLog.includes('rate_limit_exceeded') || cleanLog.includes('429')) {
    return {
      rootCause: 'Rate limit exceeded for endpoint or model provider',
      diagnosisLevel: 'CONFIRMED_CAUSE',
      category: 'MODEL_ENDPOINT_ERROR',
      impact: 'medium',
      evidence: 'Matched rate limit error code 429 in log output',
      suggestedFix: 'Wait for rate limit window reset or reduce concurrent request frequency.',
    };
  }

  // Fallback for unclassified error log: DO NOT invent a root cause
  return {
    rootCause: `Unclassified error: ${cleanLog.slice(0, 120)}`,
    diagnosisLevel: 'UNKNOWN',
    category: 'GENERAL_ERROR',
    impact: 'low',
    evidence: `Log output did not match known compiler, stack trace, or model error signatures`,
    suggestedFix: 'Review complete raw log output and execution environment.',
  };
}
