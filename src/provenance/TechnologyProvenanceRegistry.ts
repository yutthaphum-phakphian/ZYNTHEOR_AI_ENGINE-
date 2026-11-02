export enum Ownership {
  ZYNTHEOR_OWNED = 'ZYNTHEOR_OWNED',
  OPEN_SOURCE = 'OPEN_SOURCE',
  EXTERNAL_OPTIONAL = 'EXTERNAL_OPTIONAL',
}

export enum ModelIdentity {
  CORE_ADAPTED = 'ZYNTHEOR CORE ADAPTED',
  CORE_NATIVE = 'ZYNTHEOR CORE NATIVE',
  CORE_DISTILLED = 'ZYNTHEOR CORE DISTILLED',
}

export interface ProvenanceRecord {
  component: string;
  creator: string;
  license: string;
  source: string;
  ownership: Ownership;
  modelIdentity?: ModelIdentity;
  sha256: string;
  version: string;
  distributionRestrictions: string;
}

export const PROVENANCE_REGISTRY: ProvenanceRecord[] = [
  {
    component: 'ZYNTHEOR Runtime',
    creator: 'ZYNTHEOR',
    license: 'Proprietary',
    source: 'src/core/',
    ownership: Ownership.ZYNTHEOR_OWNED,
    sha256: 'runtime-v0.2',
    version: '0.2.0',
    distributionRestrictions: 'Internal',
  },
  {
    component: 'Agent Framework',
    creator: 'ZYNTHEOR',
    license: 'Proprietary',
    source: 'src/agents/',
    ownership: Ownership.ZYNTHEOR_OWNED,
    sha256: 'agents-v0.2',
    version: '0.2.0',
    distributionRestrictions: 'Internal',
  },
  {
    component: 'Memory Engine 2.0',
    creator: 'ZYNTHEOR',
    license: 'Proprietary',
    source: 'src/intelligence/',
    ownership: Ownership.ZYNTHEOR_OWNED,
    sha256: 'memory-v2',
    version: '0.2.0',
    distributionRestrictions: 'Internal',
  },
  {
    component: 'Tool Gateway',
    creator: 'ZYNTHEOR',
    license: 'Proprietary',
    source: 'src/security/',
    ownership: Ownership.ZYNTHEOR_OWNED,
    sha256: 'gateway-v0.2',
    version: '0.2.0',
    distributionRestrictions: 'Internal',
  },
  {
    component: 'Qwen2.5-Coder-7B-Instruct',
    creator: 'Alibaba Cloud',
    license: 'Qwen License',
    source: 'ollama:qwen2.5-coder:7b',
    ownership: Ownership.OPEN_SOURCE,
    modelIdentity: ModelIdentity.CORE_ADAPTED,
    sha256: 'qwen-7b-4.6GB',
    version: '7B-Instruct',
    distributionRestrictions: 'Follow Qwen license',
  },
  {
    component: 'PyTorch',
    creator: 'Meta',
    license: 'BSD-3',
    source: 'pytorch.org',
    ownership: Ownership.OPEN_SOURCE,
    sha256: 'torch-2.2',
    version: '2.2',
    distributionRestrictions: 'BSD',
  },
  {
    component: 'Ollama Runtime',
    creator: 'Ollama Inc',
    license: 'MIT',
    source: 'ollama.com',
    ownership: Ownership.OPEN_SOURCE,
    sha256: 'ollama-0.1.31',
    version: '0.1.31',
    distributionRestrictions: 'MIT',
  },
  {
    component: 'Xenova/all-MiniLM-L6-v2',
    creator: 'Xenova',
    license: 'Apache-2.0',
    source: 'huggingface.co/Xenova/all-MiniLM-L6-v2',
    ownership: Ownership.OPEN_SOURCE,
    sha256: 'minilm-22MB',
    version: 'L6-v2',
    distributionRestrictions: 'Apache-2.0',
  },
];

export function isNativeModel(component: string): boolean {
  return PROVENANCE_REGISTRY.find((r) => r.component === component)?.modelIdentity === ModelIdentity.CORE_NATIVE;
}
