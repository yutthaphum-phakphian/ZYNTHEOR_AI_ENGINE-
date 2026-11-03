# TRAINING PIPELINE & CONFIGURATION SPECIFICATION REPORT

## 1. QLoRA Fine-Tuning Architecture

The ZYNTHEOR CORE fine-tuning pipeline is built on PyTorch, Hugging Face Transformers, BitsAndBytes 4-bit quantization, and PEFT (Parameter-Efficient Fine-Tuning).

```
  ┌─────────────────────────────────────────────────────────┐
  │         Base Model: Qwen2.5-Coder-7B-Instruct           │
  │                   (7.61B Parameters)                    │
  └────────────────────────────┬────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            │   BitsAndBytes 4-bit Quantization   │
            │          (NF4 / Double Quant)       │
            └──────────────────┬──────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            │       PEFT LoRA Adapters (r=32)      │
            │  Target: q, k, v, o, gate, up, down │
            └──────────────────┬──────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            │    BF16 Gradient Backpropagation    │
            │          Paged AdamW 32-bit         │
            └─────────────────────────────────────┘
```

---

## 2. Locked Hyperparameter Configuration (`training/config/training_config.json`)

| Parameter | Value | Rationale |
| :--- | :--- | :--- |
| **Base Model** | `Qwen/Qwen2.5-Coder-7B-Instruct` | Optimal open-weight 7B coding model |
| **LoRA Rank (`r`)** | `32` | High adapter capacity for dual-language instruction learning |
| **LoRA Alpha (`alpha`)** | `64` | Standard 2x scaling multiplier |
| **Target Modules** | `q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj` | Full-attention & MLP projection adapter coverage |
| **LoRA Dropout** | `0.05` | Prevents adapter overfitting on instruction datasets |
| **Precision** | `bf16` | BFloat16 computation precision for numerical stability |
| **Learning Rate** | `2e-4` | Optimal AdamW learning rate for QLoRA |
| **Optimizer** | `paged_adamw_32bit` | Memory-efficient paged memory optimizer |
| **Batch Size per Device** | `1` | Fits within 8GB–16GB VRAM bounds |
| **Gradient Accumulation** | `4` | Effective batch size = 16 |
| **Max Sequence Length** | `2,048` tokens | Covers multi-file workspace reasoning prompts |
| **Random Seed Anchor** | `849202` | Guarantees deterministic training reproducibility |

---

## 3. Remote GPU Preflight & Hardware Guard

The preflight routine (`src/services/trainingGateStateMachine.ts`) evaluates system capabilities prior to backpropagation:

1. **CUDA Presence Check:** Inspects `process.env.CUDA_VISIBLE_DEVICES` and PyTorch CUDA driver status.
2. **VRAM Threshold Enforcement:**
   - Minimum `8.0 GB VRAM` required for 4-bit QLoRA.
   - Recommended `16.0 GB VRAM` for full BF16 execution.
3. **CPU Fallback Directive:** When running on CPU host environments without CUDA hardware:
   - Training status transitions to `WAITING_FOR_GPU`.
   - Dataset verification, schema auditing, token analysis, and evaluation harness run cleanly.
   - **Zero Fabricated Progress:** Backpropagation halts gracefully without emitting fake checkpoints or artificial loss logs.

---

## 4. Checkpoint Artifact Standards & Provenance

When executed on CUDA GPU, the pipeline produces the following verified artifacts under `training/checkpoints/`:

- `adapter_model.safetensors` (LoRA weights, ~160 MB)
- `adapter_config.json` (LoRA configuration parameters)
- `training_loss.json` (Per-step loss logs and validation perplexity)
- `checkpoint_digest.sha256` (Cryptographic hash for Model Registry matching)
