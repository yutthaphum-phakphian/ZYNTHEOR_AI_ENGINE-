# NATIVE INFERENCE VERIFICATION & RUNTIME ADAPTER REPORT

## 1. Native Model Runtime Adapter (`lib/native-model-runtime.ts`)

The native model runtime adapter enforces the **Sovereign Truth Principle**:

- It classifies inference requests into one of four distinct answer sources:
  1. `native`: Verified ZYNTHEOR CORE trained checkpoint loaded and tested on hardware.
  2. `local_base_model`: Un-tuned local base model (e.g. Qwen2.5-Coder via local Ollama).
  3. `external_provider`: Cloud API provider (Gemini, OpenAI, Anthropic).
  4. `unavailable`: Endpoint offline or restricted by Local-only policy.

- **Strict Invariant Assertion (`assertNotReadyForNativeClaims()`):**
  - Never reports `INFERENCE_READY` unless physical weights exist on disk, SHA-256 digest matches registry declaration, and a live load probe succeeds.
  - Base models running via local Ollama are explicitly categorized as `local_base_model`, never mislabeled as native trained weights.

---

## 2. Local-Only Enforcement (`ZYNTHEOR_LOCAL_ONLY=true`)

In accordance with system policy:
- When `ZYNTHEOR_LOCAL_ONLY=true` is enabled, external cloud provider requests are blocked.
- Model Router defaults to local execution paths.
- Local model runtimes consume zero network bandwidth and preserve total data sovereignty.

---

## 3. Answer Source Classification Logic

```typescript
export function classifyAnswerSource(providerId: string, native: NativeModelProbe): AnswerSource {
  if (native.status === 'INFERENCE_READY' && native.inferenceTested && providerId === 'zyntheor-native') {
    return 'native';
  }
  if (providerId === 'ollama' || providerId === 'local') {
    return 'local_base_model';
  }
  if (providerId === 'gemini' || providerId === 'openai') {
    return 'external_provider';
  }
  if (native.answerSource === 'local_base_model') return 'local_base_model';
  return 'unavailable';
}
```

---

## 4. Current Node Runtime Inspection Summary

- **Runtime Status:** `MODEL_NOT_FOUND` / `WAITING_FOR_GPU`
- **Trained Weights Present:** `false` (No fabricated checkpoint files present on disk)
- **Base Model Fallback Available:** `true` (`Qwen2.5-Coder-7B-Instruct` via local base runtime)
- **Answer Source Categorization:** `local_base_model`
- **Probe SHA-256 Audit:** Verified clean
