# P17 — Native Inference Runtime Specification v1.0

**Status:** PROPOSED — not an implementation certificate  
**Phase:** P17

## 1. Objective

Provide a first-party runtime for loading and serving verified native model artifacts with predictable resource use and honest readiness.

## 2. Existing components to reuse

Reuse `lib/native-model-runtime.ts`, native model registry, tokenizer research, and existing provider/model routing. Do not label a model native-ready unless actual weights and runtime probes pass.

## 3. Scope

- Model and tokenizer loader with manifest/provenance validation.
- Prefill/decode loop, sampling, streaming, cancellation, and context-window enforcement.
- KV cache lifecycle and bounded memory management.
- CPU baseline first; optional accelerator backends behind capability probes.
- Local API serving, health/readiness probes, and runtime telemetry.

## 4. Mandatory architecture and security contracts

- No cloud fallback when local-only is active.
- Runtime status distinguishes MODEL_NOT_FOUND, CHECKPOINT_UNVERIFIED, RUNTIME_UNAVAILABLE, and INFERENCE_READY.
- Inference-ready requires a real load and generation probe using the selected checkpoint.
- Model identity and tokenizer digest must match the registry.

## 5. Required verification

- Fresh process load and deterministic smoke generation.
- Corrupt/mismatched checkpoint and tokenizer rejection.
- Memory limits and context overflow.
- Cancellation and concurrent request isolation.
- Local-only no-network tests.

## 6. Exit criteria

- Native inference is reproducible on declared hardware.
- Readiness is based on real weights and live probes.
- Runtime cannot silently route to a third-party provider.

## 7. Release rule

The phase must remain `BLOCKED` or `NOT_VERIFIED` until its mandatory evidence is independently produced and checked. A source file, test name, static report, or manually entered status string is not sufficient evidence of runtime completion.
