import { ModelIdentity } from '../provenance/TechnologyProvenanceRegistry.ts';

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
  status: 'SPECIFICATION' | 'TRAINING' | 'EVALUATED' | 'RELEASED' | 'BLOCKED';
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
  },
  {
    id: 'zyntheor-native-5m-cpu-001',
    identity: ModelIdentity.CORE_NATIVE,
    method: 'FROM_SCRATCH',
    datasetSha256: 'thai-code-10k-v1',
    configSha256: '5m-decoder-v1',
    checkpointSha256: 'pending-cpu-train',
    provenance: 'ZYNTHEOR from random initialization',
    license: 'Proprietary ZYNTHEOR',
    status: 'SPECIFICATION', // Trainable on CPU 8 cores / 12GB RAM
  },
];
