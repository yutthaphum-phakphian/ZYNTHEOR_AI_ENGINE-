export interface NearDuplicatePair {
  a: string;
  b: string;
  similarity: number;
}

export interface LeakageOverlapDetail {
  type: string;
  hashPrefix: string;
}

export interface DatasetVerificationReport {
  valid: boolean;
  timestamp: string;
  errors: string[];
  warnings: string[];
  stats: {
    totalSamples: number;
    splits: { train: number; validation: number; test: number };
    languages: Record<string, number>;
    domains: Record<string, number>;
    categories: Record<string, number>;
    licenses: Record<string, number>;
    sources: Record<string, number>;
    totalCharacters: number;
    estimatedTokens: number;
    manifestDigestSha256: string | null;
    samplesDigestSha256: string | null;
  };
  leakageCheck: {
    trainVsValOverlaps: number;
    trainVsTestOverlaps: number;
    valVsTestOverlaps: number;
    overlapDetails: LeakageOverlapDetail[];
    passed: boolean;
  };
  qualityCheck: {
    duplicates: number;
    nearDuplicates: number;
    emptyFields: number;
    shortInstructions: number;
    missingExpectedOutput: number;
    invalidLanguage: number;
    invalidSplit: number;
    nearDuplicatePairs: NearDuplicatePair[];
    passed: boolean;
  };
  provenance: {
    allLicensed: boolean;
    allHaveSource: boolean;
    licensesSeen: string[];
    sourcesSeen: string[];
  };
  humanReviewRequired: boolean;
  notes: string[];
}

export interface VerifyDatasetOptions {
  manifestPath?: string;
  samplesPath?: string;
  nearDupThreshold?: number;
}

export declare function verifyDataset(options?: VerifyDatasetOptions): DatasetVerificationReport;
