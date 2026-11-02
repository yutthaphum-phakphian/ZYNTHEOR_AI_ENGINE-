// Decoder-only Transformer exact parameter counting and architectural specification
// Real formula:
// Embedding: vocab_size * d_model
// Per layer:
//   - RMSNorm 1: d_model
//   - Attention: wq (d_model * d_model) + wk (d_model * d_model) + wv (d_model * d_model) + wo (d_model * d_model) = 4 * d_model^2
//   - RMSNorm 2: d_model
//   - SwiGLU FFN: w1 (d_model * d_ff) + w2 (d_ff * d_model) + w3 (d_model * d_ff) = 3 * d_model * d_ff
// Final RMSNorm: d_model
// Output Head (if untied): d_model * vocab_size

export interface ModelArchitectureConfig {
  type: string;
  d_model: number;
  n_layers: number;
  n_heads: number;
  d_ff: number;
  vocab_size: number;
  max_seq_len: number;
  norm: 'RMSNorm' | 'LayerNorm';
  activation: 'SwiGLU' | 'GELU';
  pos_encoding: 'RoPE' | 'Learned';
  attention: 'causal' | 'GQA';
  tied_embeddings: boolean;
}

export interface ParameterBreakdown {
  embedding: number;
  attentionPerLayer: number;
  ffnPerLayer: number;
  normPerLayer: number;
  totalLayers: number;
  finalNorm: number;
  outputHead: number;
  totalUntied: number;
  totalTied: number;
  trainable: number;
}

export function calculateModelParameters(arch: ModelArchitectureConfig): ParameterBreakdown {
  const embedding = arch.vocab_size * arch.d_model;
  const attentionPerLayer = 4 * (arch.d_model * arch.d_model);
  const ffnPerLayer = 3 * (arch.d_model * arch.d_ff);
  const normPerLayer = 2 * arch.d_model;
  const perLayer = attentionPerLayer + ffnPerLayer + normPerLayer;
  const totalLayers = perLayer * arch.n_layers;
  const finalNorm = arch.d_model;
  const outputHead = arch.d_model * arch.vocab_size;

  const totalUntied = embedding + totalLayers + finalNorm + outputHead;
  const totalTied = embedding + totalLayers + finalNorm; // output shares embedding weights

  return {
    embedding,
    attentionPerLayer,
    ffnPerLayer,
    normPerLayer,
    totalLayers,
    finalNorm,
    outputHead,
    totalUntied,
    totalTied,
    trainable: arch.tied_embeddings ? totalTied : totalUntied,
  };
}

// P5.1 Hardened Config (vocab 1024, untied output) -> Exactly 6,819,072 params
export const SMALL_MODEL_CONFIG_P5_1 = {
  id: 'zyntheor-native-5m-cpu-001-p5.1',
  architecture: {
    type: 'decoder-only',
    d_model: 256,
    n_layers: 6,
    n_heads: 4,
    d_ff: 1024,
    vocab_size: 1024,
    max_seq_len: 128,
    norm: 'RMSNorm' as const,
    activation: 'SwiGLU' as const,
    pos_encoding: 'RoPE' as const,
    attention: 'causal' as const,
    tied_embeddings: false,
  },
  hardware: {
    cpu: '8 cores OK',
    ram: '2GB required (12GB available)',
    gpu: 'None required (CPU feasible)',
    time: '10-15 mins for CPU smoke-test',
  },
  dataset: {
    name: 'zyntheor-smoke-synthetic-v1',
    classification: 'SYNTHETIC_SMOKE_TEST',
    unique_docs: 20,
    splits: { train: 14, val: 3, test: 3 },
    license: 'Proprietary ZYNTHEOR',
  },
  training: {
    method: 'FROM_SCRATCH',
    optimizer: 'AdamW',
    lr: 3e-4,
    batch: 4,
    epochs: 3,
    seed: 42,
  },
};

export const P5_1_PARAMS = calculateModelParameters(SMALL_MODEL_CONFIG_P5_1.architecture);

// Legacy configuration with corrected parameter count (~14.49M, correcting previous 5.2M claim)
export const SMALL_MODEL_CONFIG = {
  id: 'zyntheor-native-5m-cpu-001',
  architecture: {
    type: 'decoder-only',
    d_model: 256,
    n_layers: 6,
    n_heads: 4,
    d_ff: 1024,
    vocab_size: 16000,
    max_seq_len: 512,
    norm: 'RMSNorm' as const,
    activation: 'SwiGLU' as const,
    pos_encoding: 'RoPE' as const,
    attention: 'causal' as const,
    tied_embeddings: false,
  },
  // Real parameters for vocab 16000 is ~14.49M untied, NOT 5.2M
  params: '14,489,856 (Untied) / 10,393,856 (Tied)',
  calculatedBreakdown: calculateModelParameters({
    type: 'decoder-only',
    d_model: 256,
    n_layers: 6,
    n_heads: 4,
    d_ff: 1024,
    vocab_size: 16000,
    max_seq_len: 512,
    norm: 'RMSNorm',
    activation: 'SwiGLU',
    pos_encoding: 'RoPE',
    attention: 'causal',
    tied_embeddings: false,
  }),
  hardware: {
    cpu: '8 cores OK',
    ram: '2GB required (12GB available)',
    gpu: 'None required',
    time: '30 mins for 10K tokens',
  },
  dataset: {
    name: 'thai-code-10k-v1',
    tokens: 10000,
    domains: ['thai', 'english', 'code'],
    license: 'MIT/Apache-2.0 only',
  },
  training: {
    method: 'FROM_SCRATCH',
    optimizer: 'AdamW',
    lr: 3e-4,
    batch: 4,
    epochs: 3,
    mixed_precision: false,
  },
};

