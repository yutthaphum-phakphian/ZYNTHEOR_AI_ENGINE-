import { useState, useMemo, type ReactNode } from 'react';
import { Check, Clipboard, Code2, Split, Eye } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-diff';
import { ChatCodeDiffViewer } from './ChatCodeDiffViewer';
import { parseUnifiedDiff, type FileDiffProposal } from '../../lib/diff-parser';

interface Segment {
  type: 'text' | 'code';
  language?: string;
  content: string;
}

const LANG_MAP: Record<string, string> = {
  js: 'javascript',
  javascript: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  py: 'python',
  python: 'python',
  sh: 'bash',
  shell: 'bash',
  bash: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  md: 'markdown',
  markdown: 'markdown',
  diff: 'diff',
  patch: 'diff',
  go: 'go',
  golang: 'go',
  rs: 'rust',
  rust: 'rust',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  docker: 'docker',
  dockerfile: 'docker',
  sql: 'sql',
  json: 'json',
  css: 'css',
  html: 'markup',
  xml: 'markup',
};

function normalizeLang(raw?: string): string {
  if (!raw) return 'text';
  const clean = raw.trim().toLowerCase().split(/\s+/)[0];
  return LANG_MAP[clean] || clean;
}

/**
 * Splits message text into text and code segments.
 * Correctly handles both complete and streaming (unclosed) code blocks.
 */
function parseMessageSegments(text: string): Segment[] {
  if (!text) return [];
  const segments: Segment[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_.-]*)\r?\n([\s\S]*?)(?:```|$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    const language = normalizeLang(match[1]);
    const codeContent = match[2].replace(/\n$/, '');

    segments.push({
      type: 'code',
      language,
      content: codeContent,
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

interface CodeBlockProps {
  code: string;
  language: string;
  onApplyDiff?: (proposal: FileDiffProposal, acceptedHunksCount: number, patch: string) => Promise<void> | void;
  recordAudit?: (action: string, detail: string) => Promise<void> | void;
  setToast?: (msg: string) => void;
}

function CodeBlock({ code, language, onApplyDiff, recordAudit, setToast }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [forceRawView, setForceRawView] = useState(false);

  // Check if this code block represents a suggested file change / diff
  const isDiffCandidate = useMemo(() => {
    if (language === 'diff' || language === 'patch') return true;
    const hasHunk = /^@@ -\d+/m.test(code);
    const hasHeaders = /^--- (?:a\/)?/m.test(code) || /^diff --git/m.test(code);
    return hasHunk || hasHeaders;
  }, [language, code]);

  const diffProposals = useMemo(() => {
    if (!isDiffCandidate) return [];
    try {
      return parseUnifiedDiff(code);
    } catch {
      return [];
    }
  }, [isDiffCandidate, code]);

  const hasHunks = diffProposals.length > 0 && diffProposals.some(p => p.hunks.length > 0);

  const highlighted = useMemo(() => {
    const langKey = language === 'diff' ? 'plain' : language;
    const grammar = Prism.languages[langKey] || Prism.languages.plain;
    try {
      return Prism.highlight(code, grammar, language);
    } catch {
      return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (setToast) setToast('Code copied to clipboard');
    } catch {
      /* ignore copy errors */
    }
  };

  // If valid diff proposals with hunks were parsed, render side-by-side 'Code Diff' by default!
  if (hasHunks && !forceRawView) {
    return (
      <div className="diff-suggestion-wrapper" style={{ margin: '8px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '3px 8px',
            background: '#131b29',
            border: '1px solid #233148',
            borderRadius: '6px 6px 0 0',
            fontSize: '9px',
            color: '#94a3b8',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#38bdf8', fontWeight: 600 }}>
            <Split size={12} /> AI Suggested Code Changes (Side-by-Side Diff)
          </span>
          <button
            type="button"
            onClick={() => setForceRawView(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38bdf8',
              cursor: 'pointer',
              fontSize: '9px',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '2px 4px',
            }}
            title="View raw unified text"
          >
            <Eye size={11} /> Raw Code
          </button>
        </div>

        {diffProposals.map(proposal => (
          <ChatCodeDiffViewer
            key={proposal.id}
            proposal={proposal}
            onApplyProposal={onApplyDiff}
            recordAudit={recordAudit}
            setToast={setToast}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <div className="code-block-lang">
          <Code2 size={13} />
          <span>{language.toUpperCase()}</span>
          {hasHunks && forceRawView && (
            <button
              type="button"
              onClick={() => setForceRawView(false)}
              style={{
                marginLeft: '8px',
                background: '#1e293b',
                border: '1px solid #3b82f6',
                color: '#60a5fa',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Split size={10} /> Switch to Side-by-Side Diff
            </button>
          )}
        </div>
        <button
          type="button"
          className="code-block-copy"
          onClick={handleCopy}
          aria-label={copied ? 'Code copied' : 'Copy code to clipboard'}
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} className="copy-check" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Clipboard size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="code-block-pre">
        <code
          className={`language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
}

function renderTextWithInlineCode(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={i} className="inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

import { TruthVerificationBadge } from './TruthVerificationBadge';

export interface HighlightedMessageProps {
  content: string;
  isStreaming?: boolean;
  isAssistant?: boolean;
  onApplyDiff?: (proposal: FileDiffProposal, acceptedHunksCount: number, patch: string) => Promise<void> | void;
  recordAudit?: (action: string, detail: string) => Promise<void> | void;
  setToast?: (msg: string) => void;
}

export function HighlightedMessage({
  content,
  isStreaming,
  isAssistant,
  onApplyDiff,
  recordAudit,
  setToast,
}: HighlightedMessageProps) {
  const segments = useMemo(() => parseMessageSegments(content), [content]);

  if (!content) return null;

  return (
    <div className={`message-highlighted${isStreaming ? ' is-streaming' : ''}`}>
      {isAssistant && !isStreaming && (
        <TruthVerificationBadge
          content={content}
          isAssistant={isAssistant}
          recordAudit={recordAudit}
          setToast={setToast}
        />
      )}
      {segments.map((seg, idx) => {
        if (seg.type === 'code') {
          return (
            <CodeBlock
              key={idx}
              code={seg.content}
              language={seg.language || 'text'}
              onApplyDiff={onApplyDiff}
              recordAudit={recordAudit}
              setToast={setToast}
            />
          );
        }
        return (
          <div key={idx} className="message-text-segment">
            {renderTextWithInlineCode(seg.content)}
          </div>
        );
      })}
    </div>
  );
}
