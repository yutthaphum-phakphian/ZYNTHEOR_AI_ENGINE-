export interface CoreXReadinessReport { schemaVersion: string; phase: 'P20'; product: 'ZYNTHEOR CORE X'; generatedAt: string; status: string; phases: Record<string, { status: string; evidence: string[]; note: string }>; releaseApproved: false; [key: string]: unknown; }
export function inspectCoreX(root?: string): CoreXReadinessReport;
