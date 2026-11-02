export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
  oldLineNum?: number;
  newLineNum?: number;
}

export interface SideBySideRow {
  leftNum?: number;
  leftText?: string;
  leftType: 'unchanged' | 'removed' | 'empty';
  rightNum?: number;
  rightText?: string;
  rightType: 'unchanged' | 'added' | 'empty';
}

export interface DiffHunk {
  id: string;
  index: number;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  contextHeader?: string;
  lines: DiffLine[];
  sideBySideRows: SideBySideRow[];
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  raw: string;
}

export interface FileDiffProposal {
  id: string;
  filePath: string;
  oldPath?: string;
  newPath?: string;
  hunks: DiffHunk[];
  totalAdded: number;
  totalRemoved: number;
  totalUnchanged: number;
  rawDiff: string;
  sha256?: string;
}

/**
 * Parses raw unified diff text into structured file proposals with hunks and side-by-side alignments.
 */
export function parseUnifiedDiff(rawText: string): FileDiffProposal[] {
  if (!rawText || !rawText.trim()) return [];

  const proposals: FileDiffProposal[] = [];
  const lines = rawText.split(/\r?\n/);

  let currentFilePath = 'suggested_changes.patch';
  let currentOldPath: string | undefined;
  let currentNewPath: string | undefined;
  let currentHunk: DiffHunk | null = null;
  let currentHunks: DiffHunk[] = [];
  let fileRawLines: string[] = [];

  let oldCounter = 0;
  let newCounter = 0;

  function finalizeHunk() {
    if (!currentHunk) return;

    // Build side-by-side rows from hunk lines
    const sbsRows: SideBySideRow[] = [];
    const hunkLines = currentHunk.lines;
    let i = 0;

    while (i < hunkLines.length) {
      const line = hunkLines[i];
      if (line.type === 'unchanged') {
        sbsRows.push({
          leftNum: line.oldLineNum,
          leftText: line.text,
          leftType: 'unchanged',
          rightNum: line.newLineNum,
          rightText: line.text,
          rightType: 'unchanged',
        });
        i++;
      } else {
        // Collect consecutive deletions and additions
        const removedBlock: DiffLine[] = [];
        const addedBlock: DiffLine[] = [];

        while (i < hunkLines.length && hunkLines[i].type === 'removed') {
          removedBlock.push(hunkLines[i]);
          i++;
        }
        while (i < hunkLines.length && hunkLines[i].type === 'added') {
          addedBlock.push(hunkLines[i]);
          i++;
        }

        const maxLen = Math.max(removedBlock.length, addedBlock.length);
        for (let k = 0; k < maxLen; k++) {
          const rem = removedBlock[k];
          const add = addedBlock[k];
          sbsRows.push({
            leftNum: rem?.oldLineNum,
            leftText: rem?.text,
            leftType: rem ? 'removed' : 'empty',
            rightNum: add?.newLineNum,
            rightText: add?.text,
            rightType: add ? 'added' : 'empty',
          });
        }
      }
    }

    currentHunk.sideBySideRows = sbsRows;
    currentHunks.push(currentHunk);
    currentHunk = null;
  }

  function finalizeFile() {
    finalizeHunk();
    if (currentHunks.length > 0) {
      let totalAdded = 0;
      let totalRemoved = 0;
      let totalUnchanged = 0;

      for (const h of currentHunks) {
        totalAdded += h.addedCount;
        totalRemoved += h.removedCount;
        totalUnchanged += h.unchangedCount;
      }

      proposals.push({
        id: `proposal-${proposals.length}-${Date.now().toString(36)}`,
        filePath: currentFilePath,
        oldPath: currentOldPath,
        newPath: currentNewPath,
        hunks: currentHunks,
        totalAdded,
        totalRemoved,
        totalUnchanged,
        rawDiff: fileRawLines.join('\n'),
      });
    }
    currentHunks = [];
    fileRawLines = [];
    currentFilePath = 'suggested_changes.patch';
    currentOldPath = undefined;
    currentNewPath = undefined;
  }

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // Detect file header: diff --git a/... b/... or --- a/... +++ b/...
    const gitDiffMatch = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
    if (gitDiffMatch) {
      finalizeFile();
      currentOldPath = gitDiffMatch[1];
      currentNewPath = gitDiffMatch[2];
      currentFilePath = gitDiffMatch[2] || gitDiffMatch[1];
      fileRawLines.push(line);
      continue;
    }

    const oldFileMatch = line.match(/^--- (?:a\/)?([^\s\t]+)/);
    if (oldFileMatch) {
      currentOldPath = oldFileMatch[1].replace(/^[ab]\//, '');
      if (currentFilePath === 'suggested_changes.patch' && currentOldPath !== '/dev/null') {
        currentFilePath = currentOldPath;
      }
      fileRawLines.push(line);
      continue;
    }

    const newFileMatch = line.match(/^\+\+\+ (?:b\/)?([^\s\t]+)/);
    if (newFileMatch) {
      currentNewPath = newFileMatch[1].replace(/^[ab]\//, '');
      if (currentNewPath !== '/dev/null') {
        currentFilePath = currentNewPath;
      }
      fileRawLines.push(line);
      continue;
    }

    // Detect Hunk Header: @@ -1,7 +1,8 @@ function or context
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
    if (hunkMatch) {
      finalizeHunk();
      const oldStart = parseInt(hunkMatch[1], 10);
      const oldLines = hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1;
      const newStart = parseInt(hunkMatch[3], 10);
      const newLines = hunkMatch[4] ? parseInt(hunkMatch[4], 10) : 1;
      const contextHeader = (hunkMatch[5] || '').trim();

      oldCounter = oldStart;
      newCounter = newStart;

      currentHunk = {
        id: `hunk-${currentHunks.length}`,
        index: currentHunks.length + 1,
        oldStart,
        oldLines,
        newStart,
        newLines,
        header: line,
        contextHeader,
        lines: [],
        sideBySideRows: [],
        addedCount: 0,
        removedCount: 0,
        unchangedCount: 0,
        raw: line,
      };
      fileRawLines.push(line);
      continue;
    }

    if (currentHunk) {
      fileRawLines.push(line);
      currentHunk.raw += '\n' + line;

      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentHunk.addedCount++;
        currentHunk.lines.push({
          type: 'added',
          text: line.slice(1),
          newLineNum: newCounter++,
        });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentHunk.removedCount++;
        currentHunk.lines.push({
          type: 'removed',
          text: line.slice(1),
          oldLineNum: oldCounter++,
        });
      } else if (line.startsWith(' ') || line === '') {
        currentHunk.unchangedCount++;
        const content = line.startsWith(' ') ? line.slice(1) : line;
        currentHunk.lines.push({
          type: 'unchanged',
          text: content,
          oldLineNum: oldCounter++,
          newLineNum: newCounter++,
        });
      }
    }
  }

  finalizeFile();
  return proposals;
}

/**
 * Inspects assistant message content to automatically identify code diff proposals.
 * Handles both explicit diff code blocks (```diff) and text diffs with hunk markers.
 */
export function extractFileDiffProposals(messageText: string): FileDiffProposal[] {
  if (!messageText) return [];

  const proposals: FileDiffProposal[] = [];

  // 1. Look for code blocks tagged as diff or patch or containing @@
  const codeBlockRegex = /```(?:diff|patch)?\s*(?:filepath="?([^"\n]+)"?|file:?\s*([^\n]+))?\r?\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(messageText)) !== null) {
    const explicitFile = (match[1] || match[2] || '').trim();
    const codeContent = match[3];

    // Check if block contains diff markers
    const hasHunk = /^@@ -\d+/m.test(codeContent);
    const hasDiffHeader = /^--- (?:a\/)?/m.test(codeContent) || /^diff --git/m.test(codeContent);

    if (hasHunk || hasDiffHeader) {
      const parsed = parseUnifiedDiff(codeContent);
      for (const p of parsed) {
        if (explicitFile && (p.filePath === 'suggested_changes.patch' || !p.filePath)) {
          p.filePath = explicitFile;
        }
        proposals.push(p);
      }
    }
  }

  // 2. If no code blocks matched, check if the raw text contains unescaped unified diff
  if (proposals.length === 0) {
    if (/^@@ -\d+/m.test(messageText) && (/^--- /m.test(messageText) || /^[+-]/m.test(messageText))) {
      const parsed = parseUnifiedDiff(messageText);
      if (parsed.length > 0) {
        proposals.push(...parsed);
      }
    }
  }

  return proposals;
}

/**
 * Reconstructs a clean unified diff containing only the hunks accepted by the user.
 */
export function buildAcceptedUnifiedDiff(
  proposal: FileDiffProposal,
  hunkDecisions: Record<string, 'accepted' | 'discarded' | 'pending'>
): string {
  const acceptedHunks = proposal.hunks.filter(h => hunkDecisions[h.id] === 'accepted');
  if (acceptedHunks.length === 0) return '';

  const header = [
    `--- a/${proposal.filePath}`,
    `+++ b/${proposal.filePath}`,
  ].join('\n');

  const hunksText = acceptedHunks.map(h => h.raw).join('\n');
  return `${header}\n${hunksText}`;
}
