import os from 'node:os';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { SMALL_MODEL_CONFIG_P5_1, SMALL_MODEL_CONFIG } from './SmallScaleModel.ts';

export interface HardwareAuditResult {
  cpuLogical: number;
  cpuPhysical: number;
  ramTotalGb: number;
  ramAvailableGb: number;
  hasGpu: boolean;
  hasGPU: boolean;
  gpuName: string;
  gpuVramGb: number;
  cudaAvailable: boolean;
  canTrain5M: boolean;
  canTrain7B_QLoRA: boolean;
  recommendation: string;
}

export class NativeTrainingEngine {
  /**
   * Performs genuine hardware detection without hardcoded assumptions.
   */
  static checkHardware(): HardwareAuditResult {
    let cpuLogical = 1;
    let ramTotalGb = 1;
    let ramAvailableGb = 1;

    try {
      const cpus = os.cpus();
      cpuLogical = cpus ? cpus.length : 1;
      ramTotalGb = Number((os.totalmem() / (1024 ** 3)).toFixed(2));
      ramAvailableGb = Number((os.freemem() / (1024 ** 3)).toFixed(2));
    } catch {}

    const cpuPhysical = Math.max(1, Math.floor(cpuLogical / 2));

    // Dynamic GPU & CUDA Detection
    let hasGpu = false;
    let gpuName = 'None';
    let gpuVramGb = 0;
    let cudaAvailable = false;

    // Check 1: Environment flags
    if (process.env.CUDA_VISIBLE_DEVICES && process.env.CUDA_VISIBLE_DEVICES !== '-1') {
      cudaAvailable = true;
    }

    // Check 2: Linux device node or driver inspection
    try {
      if (fs.existsSync('/dev/nvidia0') || fs.existsSync('/proc/driver/nvidia/version')) {
        hasGpu = true;
        cudaAvailable = true;
      }
    } catch {}

    // Check 3: Query nvidia-smi if available
    try {
      const output = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits', {
        encoding: 'utf-8',
        timeout: 1500,
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();

      if (output) {
        const [name, memMb] = output.split(',').map((s) => s.trim());
        if (name) {
          hasGpu = true;
          gpuName = name;
          cudaAvailable = true;
          gpuVramGb = Number(((Number(memMb) || 0) / 1024).toFixed(1));
        }
      }
    } catch {
      // nvidia-smi not available or no NVIDIA GPU connected
    }

    const canTrain5M = cpuLogical >= 2 && ramTotalGb >= 2;
    const canTrain7B_QLoRA = hasGpu && cudaAvailable && ramTotalGb >= 20 && gpuVramGb >= 20;

    let recommendation = '';
    if (canTrain7B_QLoRA) {
      recommendation = `GPU detected (${gpuName}, ${gpuVramGb}GB VRAM). Ready for 7B QLoRA.`;
    } else if (canTrain5M) {
      recommendation = hasGpu
        ? `GPU detected (${gpuName}, ${gpuVramGb}GB) but VRAM < 20GB. Train 5M CPU experiment; rent RunPod A10G 24GB for 7B QLoRA.`
        : 'Host is CPU-only (no NVIDIA GPU). 5M CPU smoke-test experiment is feasible (10-15 mins). Rent 24GB VRAM GPU for 7B fine-tuning.';
    } else {
      recommendation = 'Host resources insufficient for local training. Minimum 2 cores and 2GB RAM required.';
    }

    return {
      cpuLogical,
      cpuPhysical,
      ramTotalGb,
      ramAvailableGb,
      hasGpu,
      hasGPU: hasGpu,
      gpuName,
      gpuVramGb,
      cudaAvailable,
      canTrain5M,
      canTrain7B_QLoRA,
      recommendation,
    };
  }

  static async trainSmallModel() {
    const hw = this.checkHardware();
    if (!hw.canTrain5M) {
      throw new Error(`Hardware insufficient for 5M training: ${hw.cpuLogical} cores, ${hw.ramTotalGb}GB RAM`);
    }

    console.log('🚀 Initializing ZYNTHEOR-NATIVE-5M-CPU-001 (P5.1 Hardened)...');
    return {
      status: 'READY_TO_TRAIN',
      experimentId: 'zyntheor-native-5m-cpu-001-p5.1',
      config: SMALL_MODEL_CONFIG_P5_1,
      legacyConfig: SMALL_MODEL_CONFIG,
      hardware: hw,
      timestamp: new Date().toISOString(),
    };
  }
}

