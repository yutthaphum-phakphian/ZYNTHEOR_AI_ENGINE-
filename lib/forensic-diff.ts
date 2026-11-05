// @ts-nocheck
export interface DiffRow {
  leftNum?: number;
  leftText?: string;
  leftType: 'unchanged' | 'removed' | 'empty';
  rightNum?: number;
  rightText?: string;
  rightType: 'unchanged' | 'added' | 'empty';
}

export interface DiffResult {
  added: number;
  removed: number;
  unchanged: number;
  drift: number;
  rows: DiffRow[];
}

export function computeSideBySideDiff(oldStr: string, newStr: string): DiffResult {
  if (oldStr === '' && newStr === '') {
    return { added: 0, removed: 0, unchanged: 0, drift: 0, rows: [] };
  }
  if (oldStr === '' && newStr !== '') {
    const lines = newStr.split('\n');
    return {
      added: lines.length,
      removed: 0,
      unchanged: 0,
      drift: 100,
      rows: lines.map((line, idx) => ({
        leftNum: undefined,
        leftText: undefined,
        leftType: 'empty',
        rightNum: idx + 1,
        rightText: line,
        rightType: 'added',
      })),
    };
  }
  if (oldStr !== '' && newStr === '') {
    const lines = oldStr.split('\n');
    return {
      added: 0,
      removed: lines.length,
      unchanged: 0,
      drift: 100,
      rows: lines.map((line, idx) => ({
        leftNum: idx + 1,
        leftText: line,
        leftType: 'removed',
        rightNum: undefined,
        rightText: undefined,
        rightType: 'empty',
      })),
    };
  }

  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');

  const m = oldLines.length;
  const n = newLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (oldLines[i] === newLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  let i = m;
  let j = n;
  const rawOps: Array<{
    type: 'same' | 'del' | 'add';
    oldLine?: string;
    newLine?: string;
    oldIdx?: number;
    newIdx?: number;
  }> = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      rawOps.push({ type: 'same', oldLine: oldLines[i - 1], newLine: newLines[j - 1], oldIdx: i, newIdx: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawOps.push({ type: 'add', newLine: newLines[j - 1], newIdx: j });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawOps.push({ type: 'del', oldLine: oldLines[i - 1], oldIdx: i });
      i--;
    }
  }
  rawOps.reverse();

  let added = 0;
  let removed = 0;
  let unchanged = 0;
  const rows: DiffRow[] = [];

  for (const op of rawOps) {
    if (op.type === 'same') {
      unchanged++;
      rows.push({
        leftNum: op.oldIdx,
        leftText: op.oldLine,
        leftType: 'unchanged',
        rightNum: op.newIdx,
        rightText: op.newLine,
        rightType: 'unchanged',
      });
    } else if (op.type === 'add') {
      added++;
      rows.push({
        leftNum: undefined,
        leftText: undefined,
        leftType: 'empty',
        rightNum: op.newIdx,
        rightText: op.newLine,
        rightType: 'added',
      });
    } else if (op.type === 'del') {
      removed++;
      rows.push({
        leftNum: op.oldIdx,
        leftText: op.oldLine,
        leftType: 'removed',
        rightNum: undefined,
        rightText: undefined,
        rightType: 'empty',
      });
    }
  }

  const drift = oldLines.length === 0 ? (newLines.length > 0 ? 100 : 0) : ((added + removed) / oldLines.length) * 100;

  return { added, removed, unchanged, drift, rows };
}
