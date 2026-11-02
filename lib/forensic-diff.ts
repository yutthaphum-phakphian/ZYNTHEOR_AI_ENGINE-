export interface DiffRow {
  leftNum?: number;
  leftText?: string;
  leftType: 'unchanged' | 'removed' | 'empty';
  rightNum?: number;
  rightText?: string;
  rightType: 'unchanged' | 'added' | 'empty';
}

export interface DiffResult {
  rows: DiffRow[];
  added: number;
  removed: number;
  unchanged: number;
  drift: number;
}

/**
 * Computes a side-by-side line diff between a baseline and a current string.
 * Uses bounded dynamic programming LCS for high performance and deterministic output.
 */
export function computeSideBySideDiff(baseline: string, current: string): DiffResult {
  const a = baseline ? baseline.split(/\r?\n/) : [];
  const b = current ? current.split(/\r?\n/) : [];

  // Cap lines to prevent excessive memory allocation
  const maxLines = 1500;
  const aTrim = a.slice(0, maxLines);
  const bTrim = b.slice(0, maxLines);

  const n = aTrim.length;
  const m = bTrim.length;

  // LCS Dynamic Programming
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (aTrim[i] === bTrim[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  let i = n;
  let j = m;
  const alignedA: (string | null)[] = [];
  const alignedB: (string | null)[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aTrim[i - 1] === bTrim[j - 1]) {
      alignedA.unshift(aTrim[i - 1]);
      alignedB.unshift(bTrim[j - 1]);
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      alignedA.unshift(null);
      alignedB.unshift(bTrim[j - 1]);
      j--;
    } else {
      alignedA.unshift(aTrim[i - 1]);
      alignedB.unshift(null);
      i--;
    }
  }

  let leftLine = 1;
  let rightLine = 1;
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  const rows: DiffRow[] = [];
  for (let k = 0; k < alignedA.length; k++) {
    const left = alignedA[k];
    const right = alignedB[k];

    if (left !== null && right !== null) {
      unchanged++;
      rows.push({
        leftNum: leftLine++,
        leftText: left,
        leftType: 'unchanged',
        rightNum: rightLine++,
        rightText: right,
        rightType: 'unchanged',
      });
    } else if (left !== null && right === null) {
      removed++;
      rows.push({
        leftNum: leftLine++,
        leftText: left,
        leftType: 'removed',
        rightType: 'empty',
      });
    } else if (left === null && right !== null) {
      added++;
      rows.push({
        leftType: 'empty',
        rightNum: rightLine++,
        rightText: right,
        rightType: 'added',
      });
    }
  }

  const total = added + removed + unchanged;
  const drift = total > 0 ? parseFloat((((added + removed) / total) * 100).toFixed(2)) : 0;

  return { rows, added, removed, unchanged, drift };
}
