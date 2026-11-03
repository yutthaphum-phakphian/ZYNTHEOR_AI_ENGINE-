import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSideBySideDiff } from '../lib/forensic-diff.ts';

test('Forensic Diff: identical content produces 0.00% drift and zero modifications', () => {
  const content = 'import express from "express";\nconst app = express();\nexport default app;';
  const res = computeSideBySideDiff(content, content);

  assert.equal(res.added, 0, 'added must be 0 for identical content');
  assert.equal(res.removed, 0, 'removed must be 0 for identical content');
  assert.equal(res.unchanged, 3, 'unchanged must equal line count');
  assert.equal(res.drift, 0, 'drift must be 0.00%');
  assert.equal(res.rows.length, 3);

  // Each row has continuous line numbers on both sides
  for (let idx = 0; idx < res.rows.length; idx++) {
    const row = res.rows[idx];
    assert.equal(row.leftNum, idx + 1);
    assert.equal(row.rightNum, idx + 1);
    assert.equal(row.leftType, 'unchanged');
    assert.equal(row.rightType, 'unchanged');
  }
});

test('Forensic Diff: detects single line addition on right working copy', () => {
  const baseline = 'line 1\nline 2';
  const current = 'line 1\nline 1.5 (inserted)\nline 2';
  const res = computeSideBySideDiff(baseline, current);

  assert.equal(res.added, 1, 'must detect 1 addition');
  assert.equal(res.removed, 0, 'must detect 0 deletions');
  assert.equal(res.unchanged, 2, 'must preserve 2 unchanged lines');
  assert.ok(res.drift > 0, 'drift must be positive');

  // Verify the added row has rightType=added and leftType=empty
  const addedRow = res.rows.find(r => r.rightText === 'line 1.5 (inserted)');
  assert.ok(addedRow, 'added row must exist');
  assert.equal(addedRow.rightType, 'added');
  assert.equal(addedRow.leftType, 'empty');
  assert.equal(addedRow.leftNum, undefined);
  assert.equal(addedRow.rightNum, 2);
});

test('Forensic Diff: detects deletion on left baseline', () => {
  const baseline = 'keep 1\ndelete me\nkeep 2';
  const current = 'keep 1\nkeep 2';
  const res = computeSideBySideDiff(baseline, current);

  assert.equal(res.added, 0, 'must detect 0 additions');
  assert.equal(res.removed, 1, 'must detect 1 removal');
  assert.equal(res.unchanged, 2, 'must preserve 2 unchanged lines');

  const removedRow = res.rows.find(r => r.leftText === 'delete me');
  assert.ok(removedRow, 'removed row must exist');
  assert.equal(removedRow.leftType, 'removed');
  assert.equal(removedRow.rightType, 'empty');
  assert.equal(removedRow.leftNum, 2);
  assert.equal(removedRow.rightNum, undefined);
});

test('Forensic Diff: handles multi-line replacement and interleaved edits', () => {
  const baseline = 'func A() {\n  return 1;\n}\n\nfunc B() {\n  return 2;\n}';
  const current = 'func A() {\n  // optimized\n  return 10;\n}\n\nfunc B() {\n  return 2;\n}';
  const res = computeSideBySideDiff(baseline, current);

  assert.ok(res.added >= 1, 'must count added lines');
  assert.ok(res.removed >= 1, 'must count removed lines');
  assert.ok(res.unchanged >= 4, 'must preserve unchanged context');
  assert.ok(res.drift > 0, 'must compute positive drift %');
});

test('Forensic Diff: edge cases empty strings and single lines', () => {
  const emptyRes = computeSideBySideDiff('', '');
  assert.equal(emptyRes.drift, 0);
  assert.equal(emptyRes.added, 0);
  assert.equal(emptyRes.removed, 0);

  const newFileRes = computeSideBySideDiff('', 'const x = 1;');
  assert.equal(newFileRes.added, 1);
  assert.equal(newFileRes.removed, 0);
  assert.equal(newFileRes.drift, 100);
});
