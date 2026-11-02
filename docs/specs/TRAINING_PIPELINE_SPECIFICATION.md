# ZYNTHEOR CORE 0.1 — TRAINING PIPELINE SPECIFICATION

## 1. QLoRA Fine-Tuning Pipeline

The training pipeline supports 4-bit / 16-bit QLoRA fine-tuning for `Qwen2.5-Coder-7B-Instruct` using PyTorch, Hugging Face Transformers, and PEFT.

### Hyperparameter Lock (`training/config/training_config.json`)
- **Base Model:** `Qwen/Qwen2.5-Coder-7B-Instruct`
- **Method:** QLoRA 4-bit / LoRA 16-bit
- **LoRA Parameters:** `r = 32`, `alpha = 64`, Target Modules: `q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj`
- **Precision:** `bf16`
- **Learning Rate:** `2e-5`
- **Batch Size:** 1 per device, Effective Batch Size: 16 (via gradient accumulation steps = 4)
- **Sequence Length:** 2,048 tokens
- **Random Seed Anchor:** `849202`

## 2. Hardware Pre-Flight Audit & GPU Runtime Connector

The training gate connector (`src/services/trainingGateStateMachine.ts`) checks hardware prior to initiating backpropagation:
- **CUDA Detection:** Checks `CUDA_VISIBLE_DEVICES` and PyTorch CUDA availability.
- **VRAM Threshold:** Minimum 8.0 GB VRAM required for 4-bit QLoRA; 16.0 GB for full BF16 backprop.
- **CPU Fallback Behavior:** On CPU-only nodes, the training pipeline sets status to `WAITING_FOR_GPU`. It strictly prevents fake training runs while allowing dataset validation, token analysis, and baseline evaluation.

## 3. Checkpoint Artifacts & Provenance Tracking
Every trained checkpoint must output:
- `adapter_model.safetensors` or GGUF quantization (`Q4_K_M`).
- `checkpoint_digest.sha256` matching the Model Registry manifest.
- Training step loss logs and evaluation metrics.
