// @ts-nocheck
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, Search, Info, ZoomIn, ZoomOut, RotateCcw, Box, ArrowRight, Lock, Download, Camera, X, Hash, Clock, FileText, Key, Copy, Check
} from 'lucide-react';
import { type AuditEntry, verifyAuditHashChain, sha256Sync, canonicalAuditPayload, repairAndResignAuditLedger } from '../services/auditLedger';
import { RepairPreviewModal } from './RepairPreviewModal';

interface AuditChainVisualizerProps {
  records?: AuditEntry[];
  entries?: AuditEntry[];
  onClose?: () => void;
  onSelectRecord?: (record: AuditEntry) => void;
  onRepairChain?: (repairedRecords: AuditEntry[], reason: string) => void;
  currentUser?: any;
}

export function AuditChainVisualizer({ records, entries, onClose, onSelectRecord, onRepairChain, currentUser }: AuditChainVisualizerProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<AuditEntry | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<{ entry: AuditEntry; index: number; x: number; y: number; isValid: boolean } | null>(null);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [showRepairModal, setShowRepairModal] = useState<boolean>(false);

  const activeRecords = useMemo(() => records || entries || [], [records, entries]);

  // Chronological order (Oldest -> Newest)
  const chronological = useMemo(() => [...activeRecords].reverse(), [activeRecords]);

  // Per-block verification state
  const blockStatuses = useMemo(() => {
    const statuses: Array<{
      entry: AuditEntry;
      chronoIndex: number;
      originalIndex: number;
      isValid: boolean;
      calculatedHash: string;
      isPrevHashValid: boolean;
      tamperReason?: string;
    }> = [];

    for (let i = 0; i < chronological.length; i++) {
      const entry = chronological[i];
      const originalIndex = activeRecords.length - 1 - i;
      const prevRec = i > 0 ? chronological[i - 1] : null;
      const expectedPrevHash = prevRec ? prevRec.hash : 'GENESIS';

      const isPrevHashValid = i === 0
        ? (!entry.prevHash || entry.prevHash === 'GENESIS')
        : entry.prevHash === expectedPrevHash;

      const payload = canonicalAuditPayload({
        id: entry.id,
        at: entry.at,
        nanoAt: entry.nanoAt,
        action: entry.action,
        detail: entry.detail,
        prevHash: entry.prevHash || 'GENESIS',
      });
      const calculatedHash = sha256Sync(payload);
      const isHashValid = !entry.hash || entry.hash === calculatedHash;

      const isValid = isPrevHashValid && isHashValid;
      let tamperReason: string | undefined;

      if (!isPrevHashValid) {
        tamperReason = `PrevHash pointer mismatch! Expected ${expectedPrevHash.slice(0, 10)}... but found ${entry.prevHash ? entry.prevHash.slice(0, 10) : 'none'}...`;
      } else if (!isHashValid) {
        tamperReason = `Content signature mismatch! Payload altered after hash computation. Calculated: ${calculatedHash.slice(0, 10)}... vs Stored: ${entry.hash.slice(0, 10)}...`;
      }

      statuses.push({
        entry,
        chronoIndex: i,
        originalIndex,
        isValid,
        calculatedHash,
        isPrevHashValid,
        tamperReason,
      });
    }

    return statuses;
  }, [chronological, activeRecords.length]);

  const hasTamperedBlock = blockStatuses.some(b => !b.isValid);

  // Filter matching count
  const matchingIndices = useMemo(() => {
    if (!filterQuery.trim()) {
      return new Set(chronological.map((_, idx) => idx));
    }
    const q = filterQuery.trim().toLowerCase();
    const set = new Set<number>();
    chronological.forEach((entry, idx) => {
      const matches =
        entry.id.toLowerCase().includes(q) ||
        entry.action.toLowerCase().includes(q) ||
        entry.detail.toLowerCase().includes(q) ||
        (entry.hash && entry.hash.toLowerCase().includes(q)) ||
        (entry.prevHash && entry.prevHash.toLowerCase().includes(q)) ||
        (entry.nanoAt && entry.nanoAt.includes(q)) ||
        `block #${idx}`.includes(q);
      if (matches) set.add(idx);
    });
    return set;
  }, [chronological, filterQuery]);

  const exportSvgAsFile = useCallback(() => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgEl);

    if (!source.includes('xmlns="http://www.w3.org/2000/svg"')) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.includes('xmlns:xlink="http://www.w3.org/1999/xlink"')) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n';
    const svgBlob = new Blob([xmlHeader + source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `zyntheor-audit-hash-chain-${new Date().toISOString().slice(0, 10)}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  }, []);

  const downloadSnapshotPng = useCallback(() => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgEl);

    if (!source.includes('xmlns="http://www.w3.org/2000/svg"')) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.includes('xmlns:xlink="http://www.w3.org/1999/xlink"')) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = 2; // Supersample for crisp 2x resolution PNG
      const width = svgEl.clientWidth || parseInt(svgEl.getAttribute('width') || '800', 10);
      const height = svgEl.clientHeight || parseInt(svgEl.getAttribute('height') || '260', 10);

      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `zyntheor-audit-snapshot-${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    if (chronological.length === 0) return;

    const nodeWidth = 210;
    const nodeHeight = 110;
    const nodeGap = 65;
    const startX = 60;
    const startY = 80;

    const totalWidth = Math.max(containerRef.current.clientWidth || 800, startX + chronological.length * (nodeWidth + nodeGap) + 100);
    const totalHeight = 260;

    svg.attr('width', totalWidth).attr('height', totalHeight);

    // Filter definitions for D3 SVG Glow effects
    const defs = svg.append('defs');

    // Red Glow Filter for Tampered Blocks
    const redGlow = defs.append('filter')
      .attr('id', 'tamper-red-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    redGlow.append('feGaussianBlur')
      .attr('stdDeviation', '8')
      .attr('result', 'coloredBlur');

    const redMerge = redGlow.append('feMerge');
    redMerge.append('feMergeNode').attr('in', 'coloredBlur');
    redMerge.append('feMergeNode').attr('in', 'coloredBlur');
    redMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Green Glow Filter for Valid Blocks
    const greenGlow = defs.append('filter')
      .attr('id', 'valid-green-glow')
      .attr('x', '-30%')
      .attr('y', '-30%')
      .attr('width', '160%')
      .attr('height', '160%');

    greenGlow.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');

    const greenMerge = greenGlow.append('feMerge');
    greenMerge.append('feMergeNode').attr('in', 'coloredBlur');
    greenMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Cyan Glow Filter for Filter Highlighted Blocks
    const cyanGlow = defs.append('filter')
      .attr('id', 'highlight-cyan-glow')
      .attr('x', '-40%')
      .attr('y', '-40%')
      .attr('width', '180%')
      .attr('height', '180%');

    cyanGlow.append('feGaussianBlur')
      .attr('stdDeviation', '6')
      .attr('result', 'coloredBlur');

    const cyanMerge = cyanGlow.append('feMerge');
    cyanMerge.append('feMergeNode').attr('in', 'coloredBlur');
    cyanMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow Markers for Hash Chain links
    defs.append('marker')
      .attr('id', 'arrow-valid')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#10b981');

    defs.append('marker')
      .attr('id', 'arrow-tampered')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#ef4444');

    // Main Group Container
    const g = svg.append('g').attr('class', 'chain-group');

    // Canvas Background Rect for Standalone SVG Export
    g.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', totalWidth)
      .attr('height', totalHeight)
      .attr('fill', '#0b0f19')
      .attr('rx', 12);

    const isFilteringActive = Boolean(filterQuery.trim());

    // Draw Links (Connectors between consecutive blocks)
    for (let i = 0; i < blockStatuses.length - 1; i++) {
      const sourceX = startX + i * (nodeWidth + nodeGap) + nodeWidth;
      const sourceY = startY + nodeHeight / 2;
      const targetX = startX + (i + 1) * (nodeWidth + nodeGap);
      const targetY = startY + nodeHeight / 2;

      const nextBlockValid = blockStatuses[i + 1].isValid;
      const isLinkHighlighted = !isFilteringActive || matchingIndices.has(i) || matchingIndices.has(i + 1);

      // Curved link line
      const linkPath = d3.path();
      linkPath.moveTo(sourceX, sourceY);
      linkPath.bezierCurveTo(
        sourceX + nodeGap / 2, sourceY,
        targetX - nodeGap / 2, targetY,
        targetX, targetY
      );

      g.append('path')
        .attr('d', linkPath.toString())
        .attr('fill', 'none')
        .attr('stroke', nextBlockValid ? '#059669' : '#ef4444')
        .attr('stroke-width', nextBlockValid ? 2 : 3)
        .attr('stroke-dasharray', nextBlockValid ? 'none' : '5,5')
        .attr('opacity', isLinkHighlighted ? 1.0 : 0.15)
        .attr('marker-end', nextBlockValid ? 'url(#arrow-valid)' : 'url(#arrow-tampered)');

      // Link Label (PrevHash)
      g.append('text')
        .attr('x', sourceX + nodeGap / 2)
        .attr('y', sourceY - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', nextBlockValid ? '#6ee7b7' : '#fca5a5')
        .attr('font-size', '8px')
        .attr('font-family', 'monospace')
        .attr('opacity', isLinkHighlighted ? 1.0 : 0.2)
        .text(nextBlockValid ? 'hash-link ▸' : 'BROKEN LINK ⚡');
    }

    // Draw Nodes (Audit Blocks)
    blockStatuses.forEach((status, i) => {
      const x = startX + i * (nodeWidth + nodeGap);
      const y = startY;
      const { entry, isValid, chronoIndex } = status;

      const matchesFilter = matchingIndices.has(i);
      const nodeOpacity = !isFilteringActive || matchesFilter ? 1.0 : 0.25;

      const nodeGroup = g.append('g')
        .attr('class', `block-node block-${i}`)
        .attr('cursor', 'pointer')
        .attr('opacity', nodeOpacity)
        .on('click', () => {
          setSelectedBlock(entry);
          onSelectRecord?.(entry);
        })
        .on('mouseenter', (event) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            setHoveredBlock({
              entry,
              index: chronoIndex,
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              isValid,
            });
          }
        })
        .on('mouseleave', () => setHoveredBlock(null));

      // Outer Box (Glow Effect on Tampered or Highlighted Blocks)
      const strokeColor = isFilteringActive && matchesFilter
        ? '#38bdf8'
        : (isValid ? '#10b981' : '#ff0055');
      const strokeWidth = isFilteringActive && matchesFilter ? 3.0 : (isValid ? 1.5 : 2.5);

      const rect = nodeGroup.append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', 12)
        .attr('ry', 12)
        .attr('fill', isValid ? '#111827' : '#2a0a0f')
        .attr('stroke', strokeColor)
        .attr('stroke-width', strokeWidth);

      if (!isValid) {
        rect.attr('filter', 'url(#tamper-red-glow)');
      } else if (isFilteringActive && matchesFilter) {
        rect.attr('filter', 'url(#highlight-cyan-glow)');
      } else {
        rect.attr('filter', 'url(#valid-green-glow)');
      }

      // Header Bar inside Block
      const headerFill = isValid ? (isFilteringActive && matchesFilter ? '#0c4a6e' : '#064e3b') : '#7f1d1d';
      nodeGroup.append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', nodeWidth)
        .attr('height', 28)
        .attr('rx', 12)
        .attr('ry', 12)
        .attr('fill', headerFill);

      // Fill lower sharp corners of header
      nodeGroup.append('rect')
        .attr('x', x)
        .attr('y', y + 16)
        .attr('width', nodeWidth)
        .attr('height', 12)
        .attr('fill', headerFill);

      // Block Header Title
      nodeGroup.append('text')
        .attr('x', x + 10)
        .attr('y', y + 18)
        .attr('fill', isValid ? '#a7f3d0' : '#fecdd3')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'sans-serif')
        .text(i === 0 ? `Block #0` : `Block #${i}`);

      // Dual Status Indicators: Structural Hash Integrity vs. Cryptographic Authenticity
      const effectiveKeyId = entry.keyId || (entry as any).provenance?.keyId || entry.metadata?.provenance?.keyId;
      const effectiveAlg = entry.algorithm || (entry as any).provenance?.signingAlg || entry.metadata?.provenance?.signingAlg;
      const hasProvenance = Boolean(effectiveKeyId || (entry as any).provenance || entry.metadata?.provenance);
      const isSigned = hasProvenance && ((entry as any).provenance?.isSignatureValid !== false);

      // 1. Structural Hash Indicator
      nodeGroup.append('text')
        .attr('x', x + nodeWidth - 58)
        .attr('y', y + 18)
        .attr('text-anchor', 'end')
        .attr('fill', isValid ? '#34d399' : '#f87171')
        .attr('font-size', '8px')
        .attr('font-weight', 'bold')
        .text(isValid ? '✓ SHA-256' : '⚠ BROKEN');

      // 2. Cryptographic Authenticity Indicator
      nodeGroup.append('text')
        .attr('x', x + nodeWidth - 8)
        .attr('y', y + 18)
        .attr('text-anchor', 'end')
        .attr('fill', isSigned ? '#38bdf8' : (hasProvenance ? '#f87171' : '#94a3b8'))
        .attr('font-size', '8px')
        .attr('font-weight', 'bold')
        .text(isSigned ? `🔏 ${effectiveKeyId || 'SIGNED'}` : (hasProvenance ? '⚠ FORGED' : '⚪ UNKEYED'));

      // Action Title Line
      const actionText = entry.action.length > 24 ? entry.action.slice(0, 22) + '…' : entry.action;
      nodeGroup.append('text')
        .attr('x', x + 10)
        .attr('y', y + 48)
        .attr('fill', '#f3f4f6')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text(actionText);

      // PrevHash Row
      const prevHashShort = entry.prevHash ? `${entry.prevHash.slice(0, 8)}…${entry.prevHash.slice(-6)}` : 'GENESIS';
      nodeGroup.append('text')
        .attr('x', x + 10)
        .attr('y', y + 68)
        .attr('fill', '#9ca3af')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text(`Prev: ${prevHashShort}`);

      // Hash Row
      const hashShort = entry.hash ? `${entry.hash.slice(0, 8)}…${entry.hash.slice(-6)}` : 'UNHASHED';
      nodeGroup.append('text')
        .attr('x', x + 10)
        .attr('y', y + 84)
        .attr('fill', isValid ? '#60a5fa' : '#ff6b81')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .attr('font-weight', isValid ? 'normal' : 'bold')
        .text(`Hash: ${hashShort}`);

      // Timestamp Row
      const timeStr = new Date(entry.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      nodeGroup.append('text')
        .attr('x', x + 10)
        .attr('y', y + 100)
        .attr('fill', '#6b7280')
        .attr('font-size', '8px')
        .text(`At: ${timeStr}`);
    });

  }, [chronological, blockStatuses, onSelectRecord, filterQuery, matchingIndices]);

  // Selected Block Canonical Data Calculation
  const selectedCanonicalPayload = useMemo(() => {
    if (!selectedBlock) return '';
    return canonicalAuditPayload({
      id: selectedBlock.id,
      at: selectedBlock.at,
      nanoAt: selectedBlock.nanoAt,
      action: selectedBlock.action,
      detail: selectedBlock.detail,
      prevHash: selectedBlock.prevHash || 'GENESIS',
    });
  }, [selectedBlock]);

  const selectedCalculatedHash = useMemo(() => {
    if (!selectedCanonicalPayload) return '';
    return sha256Sync(selectedCanonicalPayload);
  }, [selectedCanonicalPayload]);

  const copySelectedJson = () => {
    if (!selectedBlock) return;
    const jsonStr = JSON.stringify({
      ...selectedBlock,
      canonicalPayload: selectedCanonicalPayload,
      calculatedHash: selectedCalculatedHash,
      isSignatureValid: selectedBlock.hash === selectedCalculatedHash,
    }, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="d3-audit-visualizer" style={{ marginBottom: '20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Box size={16} style={{ color: '#a78bfa' }} />
          <b style={{ fontSize: '12px', color: '#f3f4f6' }}>Sequential Hash Chain Sequence (D3 Visualizer)</b>
          <span
            style={{
              fontSize: '9px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: hasTamperedBlock ? '#7f1d1d' : '#064e3b',
              color: hasTamperedBlock ? '#fca5a5' : '#6ee7b7',
              border: `1px solid ${hasTamperedBlock ? '#ef4444' : '#10b981'}`,
              fontWeight: 700,
            }}
          >
            {hasTamperedBlock ? 'TAMPER GLOW ACTIVE 🔴' : 'CHAIN SECURE 🟢'}
          </span>
          {filterQuery.trim() && (
            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#0c4a6e', color: '#7dd3fc', border: '1px solid #0284c7' }}>
              Matching {matchingIndices.size} of {chronological.length} blocks
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Search/Filter Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '3px 8px',
            }}
          >
            <Search size={13} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              placeholder="Highlight node by keyword, action or ID..."
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f8fafc',
                fontSize: '10px',
                outline: 'none',
                width: '180px',
              }}
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }}
                title="Clear filter"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Download Snapshot (PNG) button */}
          <button
            type="button"
            className="secondary-button"
            style={{
              fontSize: '10px',
              padding: '4px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              borderColor: '#10b981',
              color: '#6ee7b7',
              background: 'rgba(16, 185, 129, 0.12)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={downloadSnapshotPng}
            title="Download high-resolution PNG snapshot of the current D3 graph"
          >
            <Camera size={13} />
            <span>Download Snapshot (PNG)</span>
          </button>

          {/* Repair Chain Button (OWNER Authorization Gate) */}
          {hasTamperedBlock && (
            <button
              type="button"
              className="primary-button"
              style={{
                fontSize: '10px',
                padding: '4px 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'linear-gradient(120deg, #ef4444, #dc2626)',
                borderColor: '#f87171',
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              onClick={() => setShowRepairModal(true)}
              title="Open Repair Preview Modal to verify root hash shift and authorize server-side repair"
            >
              <RotateCcw size={13} />
              <span>Repair Chain (OWNER Verification)</span>
            </button>
          )}

          {/* Export Graph (SVG) button */}
          <button
            type="button"
            className="secondary-button"
            style={{
              fontSize: '10px',
              padding: '4px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              borderColor: '#3b82f6',
              color: '#93c5fd',
              background: 'rgba(59, 130, 246, 0.12)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={exportSvgAsFile}
            title="Export current D3 Hash Chain graph as SVG vector graphic"
          >
            <Download size={13} />
            <span>Export Graph (SVG)</span>
          </button>
        </div>
      </div>

      {/* Interactive D3 Canvas Container */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          overflowX: 'auto',
          background: 'linear-gradient(180deg, #0b0f19 0%, #060911 100%)',
          border: `1px solid ${hasTamperedBlock ? '#7f1d1d' : '#1e293b'}`,
          borderRadius: '12px',
          padding: '10px',
          boxShadow: hasTamperedBlock
            ? 'inset 0 0 30px rgba(239, 68, 68, 0.15), 0 0 20px rgba(239, 68, 68, 0.2)'
            : '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        {/* CSS Red Glow Pulse Animation for SVG Elements */}
        <style>{`
          @keyframes tamperPulse {
            0% { filter: drop-shadow(0 0 6px #ff0055) drop-shadow(0 0 12px #ff0055); }
            50% { filter: drop-shadow(0 0 16px #ff0055) drop-shadow(0 0 28px #ff0055); }
            100% { filter: drop-shadow(0 0 6px #ff0055) drop-shadow(0 0 12px #ff0055); }
          }
          .block-node rect[fill="#2a0a0f"] {
            animation: tamperPulse 1.8s infinite ease-in-out;
          }
        `}</style>

        {chronological.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '11px' }}>
            No audit records to render in hash sequence.
          </div>
        ) : (
          <svg ref={svgRef} style={{ display: 'block', minWidth: '100%' }} />
        )}

        {/* Hover Tooltip overlay */}
        {hoveredBlock && (
          <div
            style={{
              position: 'absolute',
              top: Math.max(10, hoveredBlock.y - 150),
              left: Math.min(hoveredBlock.x + 10, (containerRef.current?.clientWidth || 800) - 300),
              width: '290px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: '#0f172a',
              border: `1px solid ${hoveredBlock.isValid ? '#10b981' : '#ef4444'}`,
              color: '#e2e8f0',
              fontSize: '10px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
              zIndex: 50,
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontWeight: 700, color: hoveredBlock.isValid ? '#34d399' : '#f87171', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '4px' }}>
              <span>Block #{hoveredBlock.index} ({hoveredBlock.entry.id.slice(0, 8)}…)</span>
              <span>{hoveredBlock.isValid ? '✓ VALID' : '⚠️ TAMPERED'}</span>
            </div>
            <div style={{ color: '#f3f4f6', fontWeight: 600, marginTop: '4px', marginBottom: '2px' }}>{hoveredBlock.entry.action}</div>
            <div style={{ color: '#94a3b8', fontSize: '9px', marginBottom: '6px', lineHeight: '1.4', overflowWrap: 'anywhere' }}>{hoveredBlock.entry.detail}</div>
            
            <div style={{ fontFamily: 'monospace', fontSize: '8px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '3px', background: '#020617', padding: '6px', borderRadius: '4px', border: '1px solid #1e293b' }}>
              <div style={{ color: '#93c5fd', wordBreak: 'break-all' }}><b>Hash:</b> {hoveredBlock.entry.hash}</div>
              <div style={{ color: '#a7f3d0', wordBreak: 'break-all' }}><b>Prev:</b> {hoveredBlock.entry.prevHash || 'GENESIS'}</div>
              <div style={{ color: '#e2e8f0' }}><b>At:</b> {new Date(hoveredBlock.entry.at).toLocaleString()}</div>
              {hoveredBlock.entry.nanoAt && <div style={{ color: '#a78bfa' }}><b>ns:</b> {hoveredBlock.entry.nanoAt}</div>}
            </div>

            <div style={{ marginTop: '6px', paddingTop: '4px', borderTop: '1px solid #1e293b', color: '#38bdf8', fontSize: '9px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Search size={10} /> Click node to open inspector panel
            </div>
          </div>
        )}
      </div>

      {/* Block Inspector Modal when clicking a block */}
      {selectedBlock && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 7, 18, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
            padding: '16px',
          }}
          onClick={() => setSelectedBlock(null)}
        >
          <div
            style={{
              width: 'min(640px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box size={18} style={{ color: '#818cf8' }} />
                <b style={{ fontSize: '14px', color: '#f8fafc' }}>Block Details & Cryptographic Inspector</b>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ padding: '3px 8px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  onClick={copySelectedJson}
                >
                  {copiedPayload ? <Check size={12} style={{ color: '#34d399' }} /> : <Copy size={12} />}
                  <span>{copiedPayload ? 'Copied JSON!' : 'Copy JSON'}</span>
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ padding: '3px 8px', fontSize: '10px' }}
                  onClick={() => setSelectedBlock(null)}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '11px' }}>
              {/* Dual Status Header Badges: Structural Hash vs Cryptographic Authenticity */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                {/* 1. Structural Hash Integrity Indicator */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: selectedBlock.hash === selectedCalculatedHash ? 'rgba(6, 78, 59, 0.6)' : 'rgba(127, 29, 29, 0.6)',
                    border: `1px solid ${selectedBlock.hash === selectedCalculatedHash ? '#10b981' : '#ef4444'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedBlock.hash === selectedCalculatedHash ? (
                      <CheckCircle2 size={16} style={{ color: '#34d399' }} />
                    ) : (
                      <AlertTriangle size={16} style={{ color: '#f87171' }} />
                    )}
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Structural Hash Integrity</div>
                      <b style={{ color: selectedBlock.hash === selectedCalculatedHash ? '#a7f3d0' : '#fecdd3', fontSize: '11px' }}>
                        {selectedBlock.hash === selectedCalculatedHash ? '✓ SHA-256 MATCH' : '⚠ HASH TAMPERED'}
                      </b>
                    </div>
                  </div>
                </div>

                {/* 2. Cryptographic Authenticity Indicator */}
                {(() => {
                  const keyId = selectedBlock.keyId || (selectedBlock as any).provenance?.keyId || selectedBlock.metadata?.provenance?.keyId;
                  const algorithm = selectedBlock.algorithm || (selectedBlock as any).provenance?.signingAlg || selectedBlock.metadata?.provenance?.signingAlg || 'Ed25519';
                  const provenance = (selectedBlock as any).provenance || selectedBlock.metadata?.provenance;
                  const isSigned = Boolean(keyId || provenance) && (provenance?.isSignatureValid !== false);

                  return (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: isSigned ? 'rgba(12, 74, 110, 0.6)' : provenance ? 'rgba(127, 29, 29, 0.6)' : 'rgba(30, 41, 59, 0.6)',
                        border: `1px solid ${isSigned ? '#38bdf8' : provenance ? '#ef4444' : '#475569'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Lock size={16} style={{ color: isSigned ? '#38bdf8' : provenance ? '#f87171' : '#94a3b8' }} />
                        <div>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Cryptographic Authenticity</div>
                          <b style={{ color: isSigned ? '#7dd3fc' : provenance ? '#fecdd3' : '#94a3b8', fontSize: '11px' }}>
                            {isSigned ? `🔏 ${algorithm} SIGNED (${keyId || 'key-v1'})` : provenance ? '⚠ FORGED SIGNATURE' : '⚪ UNKEYED RECORD'}
                          </b>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>Unique Event ID: </span>
                  <code style={{ display: 'block', padding: '4px 8px', background: '#020617', borderRadius: '4px', color: '#cbd5e1', fontFamily: 'monospace', fontSize: '10px', marginTop: '2px' }}>
                    {selectedBlock.id}
                  </code>
                </div>

                <div>
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>Event Action Category: </span>
                  <b style={{ display: 'block', padding: '4px 8px', background: '#020617', borderRadius: '4px', color: '#38bdf8', fontSize: '11px', marginTop: '2px' }}>
                    {selectedBlock.action}
                  </b>
                </div>
              </div>

              {/* Cryptographic Key Reference & Signing Algorithm */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>Signing Key Reference (`keyId`): </span>
                  <code style={{ display: 'block', padding: '4px 8px', background: '#020617', borderRadius: '4px', color: '#a78bfa', fontFamily: 'monospace', fontSize: '10px', marginTop: '2px' }}>
                    {selectedBlock.keyId || (selectedBlock as any).provenance?.keyId || selectedBlock.metadata?.provenance?.keyId || 'UNKEYED'}
                  </code>
                </div>

                <div>
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>Cryptographic Algorithm (`algorithm`): </span>
                  <code style={{ display: 'block', padding: '4px 8px', background: '#020617', borderRadius: '4px', color: '#38bdf8', fontFamily: 'monospace', fontSize: '10px', marginTop: '2px' }}>
                    {selectedBlock.algorithm || (selectedBlock as any).provenance?.signingAlg || selectedBlock.metadata?.provenance?.signingAlg || 'SHA-256 (Structural Hash)'}
                  </code>
                </div>
              </div>

              <div>
                <span style={{ color: '#94a3b8', fontSize: '10px' }}>Timestamps (ISO + Nanosecond High-Res): </span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '4px 8px', background: '#020617', borderRadius: '4px', color: '#f1f5f9', fontSize: '10px', fontFamily: 'monospace' }}>
                    ISO: {selectedBlock.at}
                  </span>
                  {selectedBlock.nanoAt && (
                    <span style={{ padding: '4px 8px', background: '#020617', borderRadius: '4px', color: '#a78bfa', fontSize: '10px', fontFamily: 'monospace' }}>
                      ns: {selectedBlock.nanoAt}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span style={{ color: '#94a3b8', fontSize: '10px' }}>Event Detail Payload: </span>
                <div style={{ padding: '10px', background: '#020617', border: '1px solid #1e293b', borderRadius: '6px', color: '#e2e8f0', marginTop: '4px', overflowWrap: 'anywhere', lineHeight: '1.5' }}>
                  {selectedBlock.detail}
                </div>
              </div>

              <div>
                <span style={{ color: '#94a3b8', fontSize: '10px' }}>Parent Hash Pointer (`prevHash`): </span>
                <code style={{ display: 'block', padding: '6px', background: '#020617', borderRadius: '4px', color: '#a7f3d0', fontFamily: 'monospace', fontSize: '10px', marginTop: '2px', overflowX: 'auto' }}>
                  {selectedBlock.prevHash || 'GENESIS'}
                </code>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>Recorded Block SHA-256 Hash: </span>
                  <code style={{ display: 'block', padding: '6px', background: '#020617', borderRadius: '4px', color: '#93c5fd', fontFamily: 'monospace', fontSize: '10px', marginTop: '2px', overflowX: 'auto' }}>
                    {selectedBlock.hash}
                  </code>
                </div>

                <div>
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>Live Re-calculated SHA-256 Hash: </span>
                  <code style={{ display: 'block', padding: '6px', background: '#020617', borderRadius: '4px', color: selectedBlock.hash === selectedCalculatedHash ? '#34d399' : '#f87171', fontFamily: 'monospace', fontSize: '10px', marginTop: '2px', overflowX: 'auto' }}>
                    {selectedCalculatedHash}
                  </code>
                </div>
              </div>

              <div>
                <span style={{ color: '#94a3b8', fontSize: '10px' }}>Canonical Hashed Payload String (`id|at|nanoAt|action|detail|prevHash`): </span>
                <code style={{ display: 'block', padding: '8px', background: '#020617', border: '1px solid #1e293b', borderRadius: '4px', color: '#fde047', fontFamily: 'monospace', fontSize: '9px', marginTop: '2px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {selectedCanonicalPayload}
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRepairModal && (
        <RepairPreviewModal
          records={activeRecords}
          currentUser={currentUser || { role: 'admin', id: 'owner-workspace', isTokenVerified: true }}
          onApprove={async (reason) => {
            const repaired = repairAndResignAuditLedger(activeRecords, { reason });
            onRepairChain?.(repaired, reason);
            setShowRepairModal(false);
          }}
          onClose={() => setShowRepairModal(false)}
        />
      )}
    </div>
  );
}

export default AuditChainVisualizer;
