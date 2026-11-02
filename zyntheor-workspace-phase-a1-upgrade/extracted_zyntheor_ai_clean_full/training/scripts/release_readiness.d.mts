export interface ReleaseReadinessReport {
  text: string;
  sections: unknown;
  gates: unknown;
  native: { status: string; trainedWeightsExist: boolean; inferenceTested: boolean };
  packageVersion: string;
  timestamp: string;
}
export function buildReleaseReadinessReport(options?: Record<string, unknown>): ReleaseReadinessReport;
