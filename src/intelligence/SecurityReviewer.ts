import fs from 'node:fs';
import path from 'node:path';

export type FindingClassification =
  | 'CONFIRMED_FINDING'
  | 'POTENTIAL_RISK'
  | 'UNVERIFIED_HYPOTHESIS';

export type SecurityCategory =
  | 'SECRETS_LEAK'
  | 'COMMAND_INJECTION'
  | 'CODE_EVALUATION'
  | 'PATH_TRAVERSAL'
  | 'SQL_INJECTION'
  | 'INSECURE_CONFIGURATION'
  | 'SUSPICIOUS_HEURISTIC';

export interface SecurityFinding {
  id: string;
  category: SecurityCategory;
  classification: FindingClassification;
  ruleId: string;
  message: string;
  file?: string;
  line: number;
  column: number;
  snippet: string;
  remediation: string;
}

export interface SecurityScanResult {
  file: string;
  scannedAt: string;
  totalFindings: number;
  confirmedCount: number;
  potentialRiskCount: number;
  unverifiedCount: number;
  findings: SecurityFinding[];
}

export class SecurityReviewer {
  private static rules = [
    // -------------------------------------------------------------------------
    // CONFIRMED FINDINGS: High confidence patterns
    // -------------------------------------------------------------------------
    {
      ruleId: 'SEC-001',
      category: 'SECRETS_LEAK' as SecurityCategory,
      classification: 'CONFIRMED_FINDING' as FindingClassification,
      regex: /(['"])(ghp_[A-Za-z0-9_]{36}|github_pat_[A-Za-z0-9_]{22,}|AKIA[0-9A-Z]{16}|sk-[a-zA-Z0-9]{32,}|AIza[0-9A-Za-z-_]{35})\1/g,
      message: 'Hardcoded API key or private secret credential detected in source code.',
      remediation: 'Extract credentials into server-side environment variables or secret manager.',
    },
    {
      ruleId: 'SEC-002',
      category: 'SECRETS_LEAK' as SecurityCategory,
      classification: 'CONFIRMED_FINDING' as FindingClassification,
      regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
      message: 'Hardcoded private key certificate detected in source.',
      remediation: 'Never commit cryptographic private keys into repository files.',
    },
    {
      ruleId: 'SEC-003',
      category: 'CODE_EVALUATION' as SecurityCategory,
      classification: 'CONFIRMED_FINDING' as FindingClassification,
      regex: /\beval\s*\([^)]*\)/g,
      message: 'Direct invocation of eval() detected, allowing arbitrary code execution.',
      remediation: 'Use structured parsers (e.g. JSON.parse) or isolated sandboxes instead of eval.',
    },
    {
      ruleId: 'SEC-004',
      category: 'COMMAND_INJECTION' as SecurityCategory,
      classification: 'CONFIRMED_FINDING' as FindingClassification,
      regex: /(?:exec|execSync)\s*\(\s*`[^`]*\${[^}]+}[^`]*`\s*\)/g,
      message: 'Command execution with string interpolation in child_process.exec detected, vulnerable to shell injection.',
      remediation: 'Use child_process.execFile or spawn with explicit argument array, without shell invocation.',
    },

    // -------------------------------------------------------------------------
    // POTENTIAL RISKS: Moderate confidence patterns
    // -------------------------------------------------------------------------
    {
      ruleId: 'SEC-005',
      category: 'PATH_TRAVERSAL' as SecurityCategory,
      classification: 'POTENTIAL_RISK' as FindingClassification,
      regex: /(?:readFileSync|writeFileSync|unlinkSync|readdirSync|createReadStream|createWriteStream)\s*\([^)]*(?:\.\.\/|\.\.\\)/g,
      message: 'File system operation contains relative directory traversal sequence (../).',
      remediation: 'Sanitize path using path.resolve and verify it stays inside intended root directory.',
    },
    {
      ruleId: 'SEC-006',
      category: 'INSECURE_CONFIGURATION' as SecurityCategory,
      classification: 'POTENTIAL_RISK' as FindingClassification,
      regex: /rejectUnauthorized\s*:\s*false/g,
      message: 'TLS certificate validation disabled (rejectUnauthorized: false). Vulnerable to MitM.',
      remediation: 'Keep TLS certificate validation enabled in production.',
    },
    {
      ruleId: 'SEC-007',
      category: 'SQL_INJECTION' as SecurityCategory,
      classification: 'POTENTIAL_RISK' as FindingClassification,
      regex: /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\s+(?:WHERE|SET).*?\+\s*[a-zA-Z0-9_]+/gi,
      message: 'Raw SQL query string concatenation detected.',
      remediation: 'Use parameterized queries, prepared statements, or ORM parameter binding.',
    },

    // -------------------------------------------------------------------------
    // UNVERIFIED HYPOTHESES: Heuristic warnings
    // -------------------------------------------------------------------------
    {
      ruleId: 'SEC-008',
      category: 'SUSPICIOUS_HEURISTIC' as SecurityCategory,
      classification: 'UNVERIFIED_HYPOTHESIS' as FindingClassification,
      regex: /https?:\/\/(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?::[0-9]+)?/g,
      message: 'Hardcoded raw IPv4 endpoint detected.',
      remediation: 'Use configured domain names or environment variables.',
    },
    {
      ruleId: 'SEC-009',
      category: 'SUSPICIOUS_HEURISTIC' as SecurityCategory,
      classification: 'UNVERIFIED_HYPOTHESIS' as FindingClassification,
      regex: /(?<=\s)==(?=\s)/g,
      message: 'Loose equality operator (==) detected. May result in type coercion bugs.',
      remediation: 'Prefer strict equality operator (===).',
    },
  ];

  /**
   * Scans a string of source code for security findings
   */
  public static scanCode(code: string, fileName = 'code_snippet.ts'): SecurityScanResult {
    const findings: SecurityFinding[] = [];
    const lines = code.split(/\r?\n/);

    for (const rule of this.rules) {
      // Reset regex state
      rule.regex.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = rule.regex.exec(code)) !== null) {
        const offset = match.index;
        let runningLength = 0;
        let lineNumber = 1;
        let colNumber = 1;

        for (let i = 0; i < lines.length; i++) {
          const lineLen = lines[i].length + 1; // +1 for newline
          if (runningLength + lineLen > offset) {
            lineNumber = i + 1;
            colNumber = offset - runningLength + 1;
            break;
          }
          runningLength += lineLen;
        }

        const snippet = lines[lineNumber - 1]?.trim().slice(0, 100) || match[0].slice(0, 50);

        findings.push({
          id: `finding-${rule.ruleId}-${lineNumber}-${colNumber}`,
          category: rule.category,
          classification: rule.classification,
          ruleId: rule.ruleId,
          message: rule.message,
          file: fileName,
          line: lineNumber,
          column: colNumber,
          snippet,
          remediation: rule.remediation,
        });

        // Prevent infinite loops on zero-length matches
        if (match.index === rule.regex.lastIndex) {
          rule.regex.lastIndex++;
        }
      }
    }

    const confirmedCount = findings.filter((f) => f.classification === 'CONFIRMED_FINDING').length;
    const potentialRiskCount = findings.filter((f) => f.classification === 'POTENTIAL_RISK').length;
    const unverifiedCount = findings.filter((f) => f.classification === 'UNVERIFIED_HYPOTHESIS').length;

    return {
      file: fileName,
      scannedAt: new Date().toISOString(),
      totalFindings: findings.length,
      confirmedCount,
      potentialRiskCount,
      unverifiedCount,
      findings,
    };
  }

  /**
   * Scans a file from disk
   */
  public static scanFile(filePath: string): SecurityScanResult {
    const resolved = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found for security scan: ${filePath}`);
    }
    const content = fs.readFileSync(resolved, 'utf8');
    return this.scanCode(content, filePath);
  }
}
