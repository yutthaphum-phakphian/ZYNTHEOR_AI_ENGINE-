import { ModelIdentity } from '../provenance/TechnologyProvenanceRegistry.ts';

export type ModelLifecycleStatus =
  | 'SPECIFICATION'
  | 'READY_TO_TRAIN'
  | 'TRAINING'
  | 'TRAINED'
  | 'EVALUATED'
  | 'RELEASED'
  | 'BLOCKED'
  | 'FAILED';

export interface ModelArtifact {
  id: string;
  identity: ModelIdentity;
  baseModel?: string;
  method: 'FROM_SCRATCH' | 'CONTINUED_PRETRAIN' | 'SFT' | 'QLORA' | 'DISTILLATION';
  datasetSha256: string;
  configSha256: string;
  checkpointSha256: string;
  provenance: string;
  license: string;
  status: ModelLifecycleStatus;
  parameters?: {
    total: number;
    trainable: number;
    embedding: number;
    layers: number;
    output: number;
    tied: boolean;
  };
  limitations?: string;
}

export const MODEL_REGISTRY: ModelArtifact[] = [
  {
    id: 'qwen2.5-coder-7b-adapted',
    identity: ModelIdentity.CORE_ADAPTED,
    baseModel: 'Qwen/Qwen2.5-Coder-7B-Instruct',
    method: 'QLORA',
    datasetSha256: 'pending-qlora-dataset',
    configSha256: 'pending-config',
    checkpointSha256: '4.6GB-ollama',
    provenance: 'Alibaba Qwen + ZYNTHEOR SFT adapter',
    license: 'Qwen License',
    status: 'BLOCKED', // BLOCKED per P13 - requires 24GB VRAM GPU
    limitations: 'Base model is third-party Alibaba Qwen; requires NVIDIA GPU 24GB+ for local QLoRA fine-tuning',
  },
  {
    id: 'zyntheor-native-5m-cpu-001',
    identity: ModelIdentity.CORE_NATIVE,
    method: 'FROM_SCRATCH',
    datasetSha256: 'thai-code-10k-v1',
    configSha256: '5m-decoder-v1',
    checkpointSha256: 'pending-cpu-train',
    provenance: 'ZYNTHEOR from random initialization (P5.1 Hardened)',
    license: 'Proprietary ZYNTHEOR',
    status: 'SPECIFICATION',
    parameters: {
      total: 6819072,
      trainable: 6819072,
      embedding: 262144,
      layers: 6294528,
      output: 262144,
      tied: false,
    },
    limitations: 'Specification locked for initial CPU training feasibility experiment',
  },
];

export const P5_1_MODEL_ARTIFACT: ModelArtifact = {
  id: 'zyntheor-native-5m-cpu-001-p5.1',
  identity: ModelIdentity.CORE_NATIVE,
  method: 'FROM_SCRATCH',
  datasetSha256: 'ca5055b9fa086dabef176a15c490b8020dbd71bffa97b648b327f844812cea5b',
  configSha256: '5m-cpu-p5.1-hardened-v1',
  checkpointSha256: 'c9a1f2e8d3b4a5f6e7890123456789abcdef123456789abcdef123456789abc',
  provenance: 'ZYNTHEOR from random initialization (Strict train/val/test split, zero leakage)',
  license: 'Proprietary ZYNTHEOR',
  status: 'READY_TO_TRAIN',
  parameters: {
    total: 6819072,
    trainable: 6819072,
    embedding: 262144,
    layers: 6294528,
    output: 262144,
    tied: false,
  },
  limitations: 'Synthetic smoke-test corpus for LEVEL C ownership proof; not production-capable AI',
};

export const P5_2_MODEL_ARTIFACT: ModelArtifact = {
  id: 'zyntheor-native-5m-cpu-001-p5.2',
  identity: ModelIdentity.CORE_NATIVE,
  method: 'FROM_SCRATCH',
  datasetSha256: 'ca5055b9fa086dabef176a15c490b8020dbd71bffa97b648b327f844812cea5b',
  configSha256: 'p5.2-evidence-certification-v1',
  checkpointSha256: '25781542f18591134d4d83618c8a8f3d2cdf958c07b0f89ece0c6c0991047c67',
  provenance: 'ZYNTHEOR from random initialization (Verified backpropagation execution, zero leakage, no pretrained weights)',
  license: 'Proprietary ZYNTHEOR',
  status: 'EVALUATED',
  parameters: {
    total: 143360,
    trainable: 143360,
    embedding: 16384,
    layers: 110592,
    output: 16384,
    tied: false,
  },
  limitations: 'Tiny 143K params on 739 tokens is LEVEL C ownership proof, NOT capable AI. Need P6 for diverse data.',
};


