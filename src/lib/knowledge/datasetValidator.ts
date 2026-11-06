import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

/**
 * Hyperparameters and Training Configuration Schema
 */
export interface TrainingConfig {
  randomSeed?: number;
  random_seed?: number;
  seed?: number;
  batchSize?: number;
  batch_size?: number;
  learningRate?: number;
  learning_rate?: number;
  epochs?: number;
  baseModel?: string;
  base_model?: string;
  [key: string]: any;
}

/**
 * Training Manifest Schema definition
 */
export interface TrainingManifestSchema {
  manifest_version?: string;
  name?: string;
  description?: string;
  datasetHash?: string;
  dataset_hash?: string;
  hash?: string;
  config?: TrainingConfig;
  training_config?: TrainingConfig;
  randomSeed?: number;
  random_seed?: number;
  seed?: number;
  target_domains?: string[];
  schema?: {
    required_fields?: string[];
    optional_fields?: string[];
    allowed_splits?: string[];
    allowed_languages?: string[];
  };
  dataset_files?: Array<{
    file_path: string;
    format?: string;
    license?: string;
    sample_count?: number;
    split_distribution?: Record<string, number>;
  }>;
  provenance?: Record<string, any>;
  [key: string]: any;
}

export interface DatasetIntegrityResult {
  valid: boolean;
  expectedHash?: string;
  actualHash?: string;
  manifestPath: string;
  randomSeed?: number;
  error?: string;
  manifest?: TrainingManifestSchema;
}

/**
 * Computes SHA-256 hash of text content or buffer
 */
export function computeSHA256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Verifies the hash integrity of the dataset provided in a training manifest.
 * Defaults to 'native_data/manifest.json'.
 */
export function verifyDatasetHash(manifestPath: string = 'native_data/manifest.json'): DatasetIntegrityResult {
  const resolvedPath = path.isAbsolute(manifestPath)
    ? manifestPath
    : path.resolve(process.cwd(), manifestPath);

  let targetPath = resolvedPath;

  if (!fs.existsSync(targetPath)) {
    // Fallback search in training/dataset/manifest.json if native_data is unavailable
    const fallback = path.resolve(process.cwd(), 'training/dataset/manifest.json');
    if (fs.existsSync(fallback)) {
      targetPath = fallback;
    } else {
      return {
        valid: false,
        manifestPath: resolvedPath,
        error: `Manifest file not found at ${resolvedPath}`,
      };
    }
  }

  try {
    const rawContent = fs.readFileSync(targetPath, 'utf-8');
    const manifest: TrainingManifestSchema = JSON.parse(rawContent);

    const expectedHash = manifest.datasetHash || manifest.dataset_hash || manifest.hash;
    const randomSeed =
      manifest.randomSeed ??
      manifest.random_seed ??
      manifest.seed ??
      manifest.config?.randomSeed ??
      manifest.config?.random_seed ??
      manifest.config?.seed;

    // Check dataset files listed in manifest
    if (manifest.dataset_files && manifest.dataset_files.length > 0) {
      let combinedData = '';
      for (const item of manifest.dataset_files) {
        const filePath = path.resolve(process.cwd(), item.file_path);
        if (fs.existsSync(filePath)) {
          combinedData += fs.readFileSync(filePath, 'utf-8');
        }
      }

      if (combinedData) {
        const actualHash = computeSHA256(combinedData);
        if (expectedHash) {
          const valid = actualHash === expectedHash;
          return {
            valid,
            expectedHash,
            actualHash,
            manifestPath: targetPath,
            randomSeed,
            manifest,
            error: valid ? undefined : `Dataset content hash mismatch: expected ${expectedHash}, got ${actualHash}`,
          };
        }
        return {
          valid: true,
          expectedHash: actualHash,
          actualHash,
          manifestPath: targetPath,
          randomSeed,
          manifest,
        };
      }
    }

    const actualHash = computeSHA256(rawContent);
    const valid = !expectedHash || actualHash === expectedHash;

    return {
      valid,
      expectedHash: expectedHash || actualHash,
      actualHash,
      manifestPath: targetPath,
      randomSeed,
      manifest,
      error: valid ? undefined : `Manifest hash mismatch: expected ${expectedHash}, got ${actualHash}`,
    };
  } catch (err: any) {
    return {
      valid: false,
      manifestPath: targetPath,
      error: `Failed to read or parse manifest: ${err?.message || String(err)}`,
    };
  }
}

export function verifyTrainingManifest(manifestPath: string = 'native_data/manifest.json'): DatasetIntegrityResult {
  return verifyDatasetHash(manifestPath);
}

export const datasetValidator = {
  computeSHA256,
  verifyDatasetHash,
  verifyTrainingManifest,
};

export default datasetValidator;
