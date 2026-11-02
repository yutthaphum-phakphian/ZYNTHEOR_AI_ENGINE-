// Decoder-only Transformer 5M params: d_model=256, n_layers=6, n_heads=4
// Trainable on CPU 8 cores in ~30 mins for 10K tokens
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
    norm: 'RMSNorm',
    activation: 'SwiGLU',
    pos_encoding: 'RoPE',
    attention: 'GQA',
  },
  params: '~5.2M',
  flopsPerToken: '~10M',
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
