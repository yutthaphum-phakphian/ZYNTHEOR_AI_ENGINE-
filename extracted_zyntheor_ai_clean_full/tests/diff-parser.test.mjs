import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUnifiedDiff, extractFileDiffProposals, buildAcceptedUnifiedDiff } from '../lib/diff-parser.ts';

test('Diff Parser: parses single-file multi-hunk diff into structured proposals', () => {
  const diff = `--- a/src/services/pipelineService.ts
+++ b/src/services/pipelineService.ts
@@ -10,4 +10,5 @@
 const config = {
-  timeout: 5000,
+  timeout: 10000,
+  retries: 3,
 };
@@ -35,3 +36,3 @@
 export function getStatus() {
-  return 'idle';
+  return 'active';
 }`;

  const proposals = parseUnifiedDiff(diff);
  assert.equal(proposals.length, 1);
  const p = proposals[0];
  assert.equal(p.filePath, 'src/services/pipelineService.ts');
  assert.equal(p.hunks.length, 2);

  // Hunk 1
  const h1 = p.hunks[0];
  assert.equal(h1.index, 1);
  assert.equal(h1.oldStart, 10);
  assert.equal(h1.removedCount, 1);
  assert.equal(h1.addedCount, 2);
  assert.ok(h1.sideBySideRows.length >= 3);

  // Hunk 2
  const h2 = p.hunks[1];
  assert.equal(h2.index, 2);
  assert.equal(h2.oldStart, 35);
  assert.equal(h2.removedCount, 1);
  assert.equal(h2.addedCount, 1);
});

test('Diff Parser: extractFileDiffProposals automatically detects diff code blocks in chat message', () => {
  const assistantMsg = `I suggest updating the configuration in \`src/config.ts\`:

\`\`\`diff
--- a/src/config.ts
+++ b/src/config.ts
@@ -1,3 +1,4 @@
 export const PORT = 3000;
-export const DEBUG = false;
+export const DEBUG = true;
+export const LOG_LEVEL = 'verbose';
\`\`\`

Let me know if you would like me to apply these changes!`;

  const proposals = extractFileDiffProposals(assistantMsg);
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].filePath, 'src/config.ts');
  assert.equal(proposals[0].hunks.length, 1);
  assert.equal(proposals[0].totalRemoved, 1);
  assert.equal(proposals[0].totalAdded, 2);
});

test('Diff Parser: buildAcceptedUnifiedDiff exports only accepted hunks', () => {
  const diff = `--- a/src/App.tsx
+++ b/src/App.tsx
@@ -1,3 +1,3 @@
-import old1 from 'old1';
+import new1 from 'new1';
@@ -20,3 +20,3 @@
-import old2 from 'old2';
+import new2 from 'new2';
`;

  const proposals = parseUnifiedDiff(diff);
  const p = proposals[0];
  const decisions = {
    [p.hunks[0].id]: 'accepted',
    [p.hunks[1].id]: 'discarded',
  };

  const acceptedDiff = buildAcceptedUnifiedDiff(p, decisions);
  assert.ok(acceptedDiff.includes('new1'));
  assert.ok(!acceptedDiff.includes('new2'));
});
