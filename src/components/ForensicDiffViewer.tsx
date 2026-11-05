// @ts-nocheck
import { computeSideBySideDiff } from '../../lib/forensic-diff';

export interface PatchModification {
  id: string;
  file: string;
  originalCode: string;
  proposedCode: string;
  rationale: string;
}

interface Props {
  currentFileName: string;
  currentContent: string;
  fileType?: string;
  fileSize?: number;
  fileModified?: number;
  proposedPatches?: PatchModification[];
}

export function ForensicDiffViewer({
  currentFileName,
  currentContent,
  fileType,
  fileSize,
  fileModified,
  proposedPatches = [],
}: Props) {
  return (
    <section>
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
        <strong>{currentFileName}</strong>
        {fileType && <span>Type: {fileType}</span>}
        {fileSize !== undefined && <span>Size: {fileSize} bytes</span>}
        {fileModified !== undefined && <span>Modified: {new Date(fileModified).toLocaleString()}</span>}
      </header>
      {proposedPatches.length > 0 ? proposedPatches.map(patch => {
        const diff = computeSideBySideDiff(patch.originalCode, patch.proposedCode);
        return (
          <section key={patch.id} style={{ marginBottom: '16px' }}>
            <h4>{patch.file}</h4>
            <p>{patch.rationale}</p>
            <div style={{ overflowX: 'auto', fontFamily: 'monospace', fontSize: '12px' }}>
              {diff.rows.map((row, index) => (
                <div key={`${patch.id}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: row.leftType === 'removed' ? '#fca5a5' : '#cbd5e1' }}>
                    {row.leftText ?? ''}
                  </pre>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: row.rightType === 'added' ? '#86efac' : '#cbd5e1' }}>
                    {row.rightText ?? ''}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        );
      }) : (
        <pre style={{ overflow: 'auto', whiteSpace: 'pre-wrap' }}>{currentContent || '(empty file)'}</pre>
      )}
      <p style={{ fontSize: '12px', opacity: 0.7 }}>Read-only preview. Applying changes requires the server-side approval workflow.</p>
    </section>
  );
}

export default ForensicDiffViewer;
