# BASE MODEL PROVENANCE & ATTRIBUTION REPORT

## 1. Foundation Model Identity

- **Model ID:** `Qwen/Qwen2.5-Coder-7B-Instruct`
- **Revision / Tag:** `main` (Git Commit ID anchor)
- **Developer / Creator:** Qwen Team, Alibaba Cloud
- **Architecture:** Transformer Decoder-Only with Grouped Query Attention (GQA), RoPE (Rotary Position Embeddings), SwiGLU activations, and RMSNorm.
- **Parameters:** 7.61 Billion
- **Context Window:** 32,768 tokens (bounded to 4,000 for local project workspace reasoning)
- **Vocabulary Size:** 151,646 tokens (`Qwen2Tokenizer`)

---

## 2. Licensing & Commercial Compliance

- **Base License:** Apache License 2.0 (Open-Source Commercial Use Permitted)
- **Attribution Requirement:** "Contains base model weights from Qwen2.5-Coder-7B-Instruct developed by Alibaba Cloud / Qwen Team."
- **ZYNTHEOR Compliance Verification:**
  - Commercial redistribution permitted without royalty fees.
  - Derivative model fine-tuning (QLoRA adapters) permitted.
  - Zero telemetry or forced cloud callback mechanisms present in base weights.

---

## 3. Weight Format & Artifact Integrity

| Format | File Pattern | Target Use Case |
| :--- | :--- | :--- |
| **Hugging Face Safetensors** | `model-00001-of-00004.safetensors` | QLoRA Fine-tuning backpropagation via PyTorch / PEFT |
| **GGUF Q4_K_M** | `zyntheor-core-q4_k_m.gguf` | Efficient CPU / Low-VRAM local inference |
| **GGUF Q8_0** | `zyntheor-core-q8_0.gguf` | High-fidelity local desktop inference |

---

## 4. Hardware Requirements Matrix

| Deployment Profile | Minimum VRAM / RAM | Recommended VRAM / RAM | Execution Mode |
| :--- | :--- | :--- | :--- |
| **QLoRA 4-bit Training** | 8.0 GB VRAM | 16.0 GB VRAM (BF16) | NVIDIA CUDA GPU (Ampere+) |
| **FP16 / BF16 Inference** | 16.0 GB VRAM | 24.0 GB VRAM | CUDA / Apple Silicon MPS |
| **GGUF Q4_K_M Local Inference** | 6.0 GB RAM | 8.0 GB RAM | CPU / Ollama / llama.cpp |

---

## 5. Provenance Audit Hash Digest

- **Model Registry Manifest Digest SHA-256:** `46b94720a7bdc7408add785e108e8cc4e43ab16b089d6ddd09ff19f3ae376d41`
- **Verification Status:** `PROVENANCE_VERIFIED`
