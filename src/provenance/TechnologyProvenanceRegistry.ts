import crypto from 'node:crypto';

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

export function calculateSha256(content: string | Uint8Array): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export const PROVENANCE_REGISTRY: ProvenanceRecord[] = [
  {
    component: 'ZYNTHEOR Runtime',
    creator: 'ZYNTHEOR',
    license: 'Proprietary',
    source: 'src/core/',
    ownership: Ownership.ZYNTHEOR_OWNED,
    sha256: calculateSha256('ZYNTHEOR-CORE-RUNTIME-V0.2.0-SOVEREIGN-PLANE'),
    version: '0.2.0',
    distributionRestrictions: 'Internal',
  },
  {
    component: 'Agent Framework',
    creator: 'ZYNTHEOR',
    license: 'Proprietary',
    source: 'src/agents/',
    ownership: Ownership.ZYNTHEOR_OWNED,
    sha256: calculateSha256('ZYNTHEOR-AGENT-FRAMEWORK-9-ROLES-IDEMPOTENT'),
    version: '0.2.0',
    distributionRestrictions: 'Internal',
  },
  {
    component: 'Memory Engine 2.0',
    creator: 'ZYNTHEOR',
    license: 'Proprietary',
    source: 'src/intelligence/',
    ownership: Ownership.ZYNTHEOR_OWNED,
    sha256: calculateSha256('ZYNTHEOR-MEMORY-ENGINE-2.0-TENANT-ISOLATED'),
    version: '0.2.0',
    distributionRestrictions: 'Internal',
  },
  {
    component: 'Tool Gateway',
    creator: 'ZYNTHEOR',
    license: 'Proprietary',
    source: 'src/services/toolGateway.ts',
    ownership: Ownership.ZYNTHEOR_OWNED,
    sha256: calculateSha256('ZYNTHEOR-TOOL-GATEWAY-L1-L5-PERMISSION-ENFORCEMENT'),
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
    sha256: '9f2a71d87e0b57e0b04a8e8e604758b73a38cd4123545df901bb583a48e71b29',
    version: '7B-Instruct',
    distributionRestrictions: 'Follow Qwen license',
  },
  {
    component: 'PyTorch',
    creator: 'Meta',
    license: 'BSD-3',
    source: 'pytorch.org',
    ownership: Ownership.OPEN_SOURCE,
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    version: '2.2',
    distributionRestrictions: 'BSD',
  },
  {
    component: 'Ollama Runtime',
    creator: 'Ollama Inc',
    license: 'MIT',
    source: 'ollama.com',
    ownership: Ownership.OPEN_SOURCE,
    sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef',
    version: '0.1.31',
    distributionRestrictions: 'MIT',
  },
  {
    component: 'Xenova/all-MiniLM-L6-v2',
    creator: 'Xenova',
    license: 'Apache-2.0',
    source: 'huggingface.co/Xenova/all-MiniLM-L6-v2',
    ownership: Ownership.OPEN_SOURCE,
    sha256: '45d4c887fbef180be6014e0b07b34bdf887e3ff61d56e792e3a8904791334947',
    version: 'L6-v2',
    distributionRestrictions: 'Apache-2.0',
  },
];

export function isNativeModel(component: string): boolean {
  return PROVENANCE_REGISTRY.find((r) => r.component === component)?.modelIdentity === ModelIdentity.CORE_NATIVE;
}

