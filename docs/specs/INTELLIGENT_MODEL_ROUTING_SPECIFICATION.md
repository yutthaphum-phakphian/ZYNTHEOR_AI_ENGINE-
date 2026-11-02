# Intelligent Model Routing Specification
**ZYNTHEOR AI ENGINE — Phase P8 Core Intelligence Advancement**

## 1. Model Routing Overview

The **Model Router** (`ModelRouter` in `lib/intelligence-orchestrator.ts` and `createProvider()` in `lib/providers.ts`) dynamically selects the appropriate model provider based on task classification, context window requirements, latency constraints, local-only policy (`ZYNTHEOR_LOCAL_ONLY`), and user consent (`onlineConsent`).

---

## 2. Model Selection Matrix

| Provider | Model ID | Default Context | Is Local | Selection Policy |
| :--- | :--- | :--- | :--- | :--- |
| **Ollama** | `qwen2.5-coder:7b` | 32,768 tokens | **Yes** | Primary local provider when `ZYNTHEOR_LOCAL_ONLY=true`. Zero network egress. |
| **Gemini** | `gemini-3.8-flash` | 1,000,000 tokens | No | Recommended cloud model when `onlineConsent=true` and `GEMINI_API_KEY` present. |
| **OpenAI** | `gpt-4o` / custom | 128,000 tokens | No | Used when `ZYNTHEOR_PROVIDER=openai` and user provides custom API credentials. |

---

## 3. Privacy & Policy Enforcement

1. **Local-Only Policy (`ZYNTHEOR_LOCAL_ONLY=true`)**:
   - Outbound network requests to external LLM APIs are restricted.
   - Defaults to local Ollama runtime.
2. **Online Provider Consent (`onlineConsent`)**:
   - Remote model routing requires explicit user opt-in (`onlineConsent=true`).
   - If consent is not provided, router falls back to local execution or flags policy note.
3. **Native Model Weight Guard**:
   - Native model (`probeNativeModelRuntime()`) reports `MODEL_NOT_FOUND` or `CHECKPOINT_UNVERIFIED` until real checkpoint weight files exist.
   - Model router strictly prevents advertising or claiming native checkpoint inference without verified evidence.
