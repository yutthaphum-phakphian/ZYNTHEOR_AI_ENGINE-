import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseUnifiedDiff, extractFileDiffProposals, buildAcceptedUnifiedDiff } from '../lib/diff-parser.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(root, '..');

test('Chat Code Diff: ChatCodeDiffViewer component exists and exports properly', () => {
  const compPath = path.join(appRoot, 'src/components/ChatCodeDiffViewer.tsx');
  assert.ok(existsSync(compPath), 'ChatCodeDiffViewer.tsx must exist');

  const content = readFileSync(compPath, 'utf8');
  assert.ok(content.includes('export function ChatCodeDiffViewer'), 'Must export ChatCodeDiffViewer function');
  assert.ok(content.includes('data-testid="chat-code-diff-viewer"'), 'Must have root testid');
  assert.ok(content.includes('side-by-side'), 'Must support side-by-side view mode');
  assert.ok(content.includes('hunkStates'), 'Must manage individual hunk states');
  assert.ok(content.includes('handleSetHunk'), 'Must provide per-hunk state updater');
  assert.ok(content.includes('handleAcceptAll'), 'Must provide accept-all batch action');
  assert.ok(content.includes('handleDiscardAll'), 'Must provide discard-all batch action');
  assert.ok(content.includes('data-testid="apply-hunks-btn"'), 'Must provide apply hunks button');
  assert.ok(content.includes('Original (Baseline)'), 'Must render Original column header');
  assert.ok(content.includes('Proposed (Suggested)'), 'Must render Proposed column header');
});

test('Chat Code Diff: HighlightedMessage embeds ChatCodeDiffViewer automatically on diff suggestions', () => {
  const msgPath = path.join(appRoot, 'src/components/HighlightedMessage.tsx');
  assert.ok(existsSync(msgPath));

  const content = readFileSync(msgPath, 'utf8');
  assert.ok(content.includes("import { ChatCodeDiffViewer } from './ChatCodeDiffViewer'"), 'Must import ChatCodeDiffViewer');
  assert.ok(content.includes('<ChatCodeDiffViewer'), 'Must render ChatCodeDiffViewer inside HighlightedMessage');
  assert.ok(content.includes('parseUnifiedDiff'), 'Must invoke diff parser on candidate blocks');
  assert.ok(content.includes('onApplyDiff'), 'Must accept onApplyDiff callback prop');
});

test('Chat Code Diff: App.tsx connects onApplyDiff and recordAudit to HighlightedMessage in Chat view', () => {
  const appPath = path.join(appRoot, 'src/App.tsx');
  const content = readFileSync(appPath, 'utf8');

  assert.ok(content.includes('onApplyDiff='), 'App.tsx must pass onApplyDiff to HighlightedMessage');
  assert.ok(content.includes('CHAT_DIFF_HUNKS_APPLIED'), 'App.tsx must log CHAT_DIFF_HUNKS_APPLIED audit event');
  assert.ok(content.includes('recordAudit={recordAudit}'), 'App.tsx must pass recordAudit');
});

test('Chat Code Diff: Side-by-Side alignment maintains dual-column lines and line numbers', () => {
  const rawDiff = `--- a/lib/test.ts
+++ b/lib/test.ts
@@ -10,3 +10,4 @@
 const x = 1;
-const y = 2;
+const y = 20;
+const z = 30;
 const end = true;`;

  const proposals = parseUnifiedDiff(rawDiff);
  assert.equal(proposals.length, 1);
  const hunk = proposals[0].hunks[0];
  assert.ok(hunk);

  // Side-by-side rows
  const rows = hunk.sideBySideRows;
  assert.ok(rows.length >= 4);

  // Check replacement row alignment: deleted 'y = 2' on left, added 'y = 20' on right
  const replacementRow = rows.find(r => r.leftText === 'const y = 2;' && r.rightText === 'const y = 20;');
  assert.ok(replacementRow, 'Replacement lines must align side-by-side in same row');
  assert.equal(replacementRow.leftType, 'removed');
  assert.equal(replacementRow.rightType, 'added');
  assert.equal(replacementRow.leftNum, 11);
  assert.equal(replacementRow.rightNum, 11);

  // Check subsequent insertion: left is empty, right has 'const z = 30;'
  const insertRow = rows.find(r => r.rightText === 'const z = 30;');
  assert.ok(insertRow, 'Insertion row must exist');
  assert.equal(insertRow.leftType, 'empty');
  assert.equal(insertRow.rightType, 'added');
  assert.equal(insertRow.leftNum, undefined);
  assert.equal(insertRow.rightNum, 12);
});

test('Chat Code Diff: Hunk acceptance filters unified patch deterministically', () => {
  const rawDiff = `--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,3 @@
-let a = 1;
+let a = 100;
@@ -10,3 +10,3 @@
-let b = 2;
+let b = 200;
`;

  const proposals = parseUnifiedDiff(rawDiff);
  const p = proposals[0];

  // Case 1: Accept only Hunk #1
  const patchHunk1 = buildAcceptedUnifiedDiff(p, {
    [p.hunks[0].id]: 'accepted',
    [p.hunks[1].id]: 'discarded',
  });
  assert.ok(patchHunk1.includes('let a = 100;'));
  assert.ok(!patchHunk1.includes('let b = 200;'));

  // Case 2: Accept only Hunk #2
  const patchHunk2 = buildAcceptedUnifiedDiff(p, {
    [p.hunks[0].id]: 'discarded',
    [p.hunks[1].id]: 'accepted',
  });
  assert.ok(!patchHunk2.includes('let a = 100;'));
  assert.ok(patchHunk2.includes('let b = 200;'));

  // Case 3: Discard all
  const patchNone = buildAcceptedUnifiedDiff(p, {
    [p.hunks[0].id]: 'discarded',
    [p.hunks[1].id]: 'discarded',
  });
  assert.equal(patchNone, '', 'Empty string when all hunks are discarded');
});
