# ZYNTHEOR CORE 0.1 — NATIVE MODEL ARCHITECTURE

## 1. Architecture Overview & Model Routing

The ZYNTHEOR CORE 0.1 first-party AI model architecture is engineered with a strict hierarchy separating native first-party intelligence, local open-weight base runtimes, and external fallback providers.

```
                  ZYNTHEOR AI ENGINE
                          │
                  Intelligence Core
                          │
                    Model Router
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
   ZYNTHEOR            Local               Cloud
 CORE (Native)      Models (Ollama)      Providers
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                    Model Registry
                          │
                  Evaluation Engine
                          │
                  Governance System
```

## 2. Base Model Specification
- **Proposed Base Model:** `Qwen/Qwen2.5-Coder-7B-Instruct`
- **Parameters:** 7.61 Billion
- **License:** Apache-2.0 (Open-source commercial attribution)
- **Tokenizer:** `Qwen2Tokenizer` (Vocabulary: 151,646 tokens)
- **Context Length:** Up to 32,768 tokens (bounded to 4,000 for local workspace context)
- **Weight Quantization Targets:** GGUF (`Q4_K_M`, `Q8_0`) & HuggingFace `safetensors`

## 3. Honest Runtime State Machine & Answer Source Probing

The native model runtime (`lib/native-model-runtime.ts`) classifies every inference request into one of four answer sources:
1. `native`: ZYNTHEOR CORE trained weight checkpoint loaded and tested on hardware.
2. `local_base_model`: Un-tuned local base model (e.g. Qwen2.5-Coder via local Ollama).
3. `external_provider`: Cloud API provider (Gemini, OpenAI, Anthropic).
4. `unavailable`: Endpoint offline or blocked by Local-only policy.

Under the **Sovereign Truth Principle**, the system strictly forbids reporting `INFERENCE_READY` unless:
- A physical checkpoint file exists on disk (`training/checkpoints/` or `models/`).
- Cryptographic SHA-256 digest matches the Model Registry entry.
- A live load probe and sample generation cycle succeeds without error.

## 4. Hardware Acceleration & Pre-Flight Standards
- **Minimum VRAM for QLoRA Training:** 8.0 GB (16.0 GB recommended for BF16 execution).
- **CPU Execution Mode:** If no physical CUDA GPU accelerator is detected, the runtime defaults to `WAITING_FOR_GPU`. Dataset verification, token length analysis, and benchmark evaluation continue on CPU without fabricating fake training progress.
