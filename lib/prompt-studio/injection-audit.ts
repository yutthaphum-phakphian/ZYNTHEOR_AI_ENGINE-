export type Severity = 'high' | 'medium' | 'low';
export type PatternClassification = 'SUSPICIOUS_PATTERN' | 'PROVEN_EXPLOIT' | 'BENIGN';

export interface InjectionRisk {
  pattern: string;
  description: string;
  severity: Severity;
  classification: PatternClassification;
  found: string;
  index: number;
  provenExploitation: boolean;
}

export interface AuditResult {
  isInjection: boolean;
  hasProvenExploit: boolean;
  riskScore: number;
  risks: InjectionRisk[];
  summary: 'SAFE' | 'SUSPICIOUS_PATTERNS' | 'CRITICAL_EXPLOIT';
}

export class PromptInjectionAudit {
  private rules = [
    { regex: /ignore\s+(all\s+)?previous\s+instructions/i, desc: 'Ignore previous instructions', severity: 'high' as Severity, pattern: 'ignore previous', proven: true },
    { regex: /system\s*:/i, desc: 'System tag misuse', severity: 'high' as Severity, pattern: 'system:', proven: false },
    { regex: /\[INST\]|\[\/INST\]|\[SYS\]|\[\/SYS\]/i, desc: 'Instruction tag injection', severity: 'high' as Severity, pattern: '[INST]/[SYS]', proven: false },
    { regex: /DAN\s+mode|do\s+anything\s+now|jailbreak/i, desc: 'Jailbreak / DAN mode', severity: 'high' as Severity, pattern: 'jailbreak/DAN', proven: true },
    { regex: /You are now|Act as if you are/i, desc: 'Role override', severity: 'medium' as Severity, pattern: 'role override', proven: false },
    { regex: /reveal\s+.*prompt|show\s+.*system\s+prompt/i, desc: 'Prompt exfiltration attempt', severity: 'medium' as Severity, pattern: 'reveal prompt', proven: false },
    { regex: /<\|im_start\|>|<\|im_end\|>/i, desc: 'ChatML injection', severity: 'medium' as Severity, pattern: 'ChatML', proven: false },
    { regex: /base64\s*decode|eval\s*\(|exec\s*\(/i, desc: 'Code execution pattern', severity: 'low' as Severity, pattern: 'code exec', proven: false },
  ];

  audit(prompt: string): AuditResult {
    const risks: InjectionRisk[] = [];
    let hasProvenExploit = false;

    for (const rule of this.rules) {
      const match = prompt.match(rule.regex);
      if (match && match.index !== undefined) {
        if (rule.proven) {
          hasProvenExploit = true;
        }
        risks.push({
          pattern: rule.pattern,
          description: rule.desc,
          severity: rule.severity,
          classification: rule.proven ? 'PROVEN_EXPLOIT' : 'SUSPICIOUS_PATTERN',
          found: match[0].slice(0, 80),
          index: match.index,
          provenExploitation: rule.proven,
        });
      }
    }

    const high = risks.filter(r => r.severity === 'high').length;
    const medium = risks.filter(r => r.severity === 'medium').length;
    const low = risks.filter(r => r.severity === 'low').length;
    const riskScore = Math.min(100, high * 40 + medium * 20 + low * 10);

    let summary: AuditResult['summary'] = 'SAFE';
    if (hasProvenExploit || high > 0) summary = 'CRITICAL_EXPLOIT';
    else if (medium > 0 || riskScore > 20) summary = 'SUSPICIOUS_PATTERNS';

    return {
      isInjection: risks.length > 0,
      hasProvenExploit,
      riskScore,
      risks,
      summary,
    };
  }
}
