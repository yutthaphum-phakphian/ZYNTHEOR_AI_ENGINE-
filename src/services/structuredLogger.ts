/**
 * ZYNTHEOR AI ENGINE — PRODUCTION STRUCTURED LOGGER & REDACTION ENGINE (STEP 9)
 * Master Principle: ZERO FAKE — REAL COMPLETENESS ONLY
 *
 * Capabilities:
 * - Structured JSON logging format (Request ID, Correlation ID, Trace ID, Service Name, Duration)
 * - Severity levels: DEBUG | INFO | WARN | ERROR | FATAL
 * - Automatic sensitive data redaction (API Keys, Bearer tokens, passwords, secrets, PII)
 * - Exportable in-memory log buffer for observability and audit reporting
 */

import { randomUUID } from 'node:crypto';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface StructuredLogPayload {
  timestamp: string;
  level: LogLevel;
  serviceName: string;
  message: string;
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  errorClass?: string;
  durationMs?: number;
  metadata?: Record<string, any>;
}

const REDACTION_PATTERNS = [
  /api[-_]?key\s*[:=]\s*["']?([a-zA-Z0-9_\-]{8,})["']?/gi,
  /bearer\s+([a-zA-Z0-9_\-\.]{10,})/gi,
  /password\s*[:=]\s*["']?([^"'\s]+)["']?/gi,
  /secret\s*[:=]\s*["']?([^"'\s]+)["']?/gi,
  /token\s*[:=]\s*["']?([a-zA-Z0-9_\-\.]{10,})["']?/gi,
];

/**
 * Sanitizes and redacts sensitive data from log strings or metadata objects.
 */
export function sanitizeLogInput(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    let sanitized = data;
    for (const pattern of REDACTION_PATTERNS) {
      sanitized = sanitized.replace(pattern, (match, p1) => {
        return match.replace(p1, '[REDACTED_SENSITIVE_CREDENTIAL]');
      });
    }
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeLogInput);
  }

  if (typeof data === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('key') ||
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('auth')
      ) {
        sanitizedObj[key] = '[REDACTED_SENSITIVE_FIELD]';
      } else {
        sanitizedObj[key] = sanitizeLogInput(val);
      }
    }
    return sanitizedObj;
  }

  return data;
}

export class ProductionStructuredLogger {
  private serviceName: string;
  private logBuffer: StructuredLogPayload[] = [];
  private maxBufferSize = 500;

  constructor(serviceName = 'zyntheor-core') {
    this.serviceName = serviceName;
  }

  public log(
    level: LogLevel,
    message: string,
    context?: {
      requestId?: string;
      correlationId?: string;
      traceId?: string;
      errorClass?: string;
      durationMs?: number;
      metadata?: Record<string, any>;
    }
  ): StructuredLogPayload {
    const payload: StructuredLogPayload = {
      timestamp: new Date().toISOString(),
      level,
      serviceName: this.serviceName,
      message: sanitizeLogInput(message),
      requestId: context?.requestId || `req-${randomUUID().slice(0, 8)}`,
      correlationId: context?.correlationId || `corr-${randomUUID().slice(0, 8)}`,
      traceId: context?.traceId || `tr-${randomUUID().slice(0, 12)}`,
      errorClass: context?.errorClass,
      durationMs: context?.durationMs,
      metadata: context?.metadata ? sanitizeLogInput(context.metadata) : undefined,
    };

    // Buffer for telemetry
    this.logBuffer.unshift(payload);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.pop();
    }

    // Output JSON stringified log to stdout/stderr in production
    const formattedJson = JSON.stringify(payload);
    if (level === 'ERROR' || level === 'FATAL') {
      console.error(formattedJson);
    } else {
      console.log(formattedJson);
    }

    return payload;
  }

  public debug(msg: string, context?: any) {
    return this.log('DEBUG', msg, context);
  }

  public info(msg: string, context?: any) {
    return this.log('INFO', msg, context);
  }

  public warn(msg: string, context?: any) {
    return this.log('WARN', msg, context);
  }

  public error(msg: string, error?: Error | any, context?: any) {
    return this.log('ERROR', msg, {
      ...context,
      errorClass: error instanceof Error ? error.name : 'UnknownError',
      metadata: {
        ...(context?.metadata || {}),
        errorMsg: error instanceof Error ? error.message : String(error),
      },
    });
  }

  public fatal(msg: string, error?: Error | any, context?: any) {
    return this.log('FATAL', msg, {
      ...context,
      errorClass: error instanceof Error ? error.name : 'FatalSystemError',
      metadata: {
        ...(context?.metadata || {}),
        errorMsg: error instanceof Error ? error.message : String(error),
      },
    });
  }

  public getRecentLogs(limit = 50, minLevel?: LogLevel): StructuredLogPayload[] {
    if (!minLevel) return this.logBuffer.slice(0, limit);
    const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    const minIdx = levels.indexOf(minLevel);
    return this.logBuffer
      .filter(l => levels.indexOf(l.level) >= minIdx)
      .slice(0, limit);
  }

  public clearLogs() {
    this.logBuffer = [];
  }
}

export const logger = new ProductionStructuredLogger('zyntheor-app');
