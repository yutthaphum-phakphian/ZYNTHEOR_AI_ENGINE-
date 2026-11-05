# ZYNTHEOR MODEL COMPETITION MATRIX
**Architecture:** Multi-Tier Model Topology & Provider Governance  
**Contract Authority:** `src/contracts/modelIdentityContract.ts`  
**Platform Version:** 1.4.0 LTS  
**Evaluation Standard:** Zero-Mock Sovereign Intelligence

---

## 1. Model Classification & Transparency Constitution

In adherence to Rule 6 of the ZYNTHEOR Product Constitution (*Model Transparency: Disclose model family and operational status without deception*), all models in the ZYNTHEOR ecosystem are classified into 4 distinct categories:

1. **CORE_NATIVE:** Models architected, tokenized, and trained end-to-end by ZYNTHEOR.
2. **CORE_ADAPTED:** Open-weight foundation models (e.g. LLaMA-3, Mistral, Qwen) fine-tuned with ZYNTHEOR sovereign datasets and system architectures.
3. **CORE_DISTILLED:** Compact, high-efficiency models produced via knowledge distillation from larger frontier reasoning traces.
4. **EXTERNAL_MODEL_PROVIDER:** Third-party cloud models (e.g. Google Gemini 1.5/2.0, OpenAI GPT-4o, Anthropic Claude 3.5) accessed via authenticated API gateways.

> **CRITICAL ARCHITECTURAL RULE:** External cloud models are strictly labeled as `EXTERNAL_MODEL_PROVIDER`. The system will NEVER relabel, rebadge, or disguise an external API call as a `CORE_NATIVE` or `CORE_ADAPTED` model. Doing so is an immediate breach of platform integrity.

---

## 2. Multi-Arena Model Competition Matrix

| Model Tier / Provider | General Intelligence | Knowledge & Live Web | Advanced Reasoning | Multimodal (Vision/Doc/Voice) | Agentic & Multi-Step | Coding & Technical Systems | Sovereignty & Privacy Level | Operating Cost / Token | Latency Profile |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **CORE_NATIVE** *(Target: v2.0 Roadmap)* | Medium (Specialized) | High (Internal Index) | High (Domain CoT) | Basic | High (Deterministic) | High (Clean AST) | **MAXIMUM (100% On-Prem / Air-Gap)** | Zero API fees (Infra only) | < 250ms (Local Inference) |
| **CORE_ADAPTED** *(e.g. Qwen/Llama fine-tuned)* | High (MMLU ~78%) | Medium (RAG Augmented) | High (AIME ~65%) | Medium | High (Tool Call Optimized) | Very High (SWE-bench ~35%) | **HIGH (Self-Hosted GPU Cloud)** | Low GPU hosting cost | 300ms - 800ms |
| **CORE_DISTILLED** *(Edge / Low-Power)* | Medium (MMLU ~65%) | Dependent on Gateway | Medium | Low | Medium | High (Task Specific) | **VERY HIGH (Runs on Device)** | Near Zero | < 150ms |
| **EXTERNAL: Gemini Cloud** *(Default Cloud Gateway)* | Frontier (MMLU-Pro >85%) | Frontier (Google Search Grounded) | Frontier (o3-class via thinking budget) | Frontier (Native Native Audio/Vision) | Frontier (Complex Function Calls) | Frontier (High SWE-bench) | **GOVERNED (Encrypted API Gateway)** | Cloud API Tier | 500ms - 2000ms |

---

## 3. Dynamic Model Routing Strategy

The `IntelligenceOrchestrationEngine` dynamically routes queries according to the user's active **Operating Mode** and task complexity:

```
                               USER QUERY
                                   │
                                   ▼
                       OPERATING MODE EVALUATION
            ┌──────────────────────┼──────────────────────┐
            ▼                      ▼                      ▼
    [ONLINE_INTELLIGENCE]  [HYBRID_INTELLIGENCE]      [LOCAL_ONLY]
     (Default Enterprise)   (Balanced Efficiency)   (Air-Gapped Privacy)
            │                      │                      │
     Route to Frontier      Route routine to        Route ONLY to
     Cloud Providers +      CORE_ADAPTED /         CORE_NATIVE or
     Live Web Grounding     DISTILLED; escalate    Local Deterministic
            │               heavy reasoning        Engines. Cloud calls
            │               to Cloud.              strictly blocked.
            ▼                      ▼                      ▼
      Gemini 2.5/Flash        Hybrid Mesh             Local Core
```

### Routing Rules by Complexity Tier
1. **TIER 1 (DIRECT):** Greetings and simple requests are routed to `CORE_DISTILLED` or fast cloud models with `temperature: 0.70`, `reasoningBudget: 0`.
2. **TIER 2 (BALANCED):** Content drafting, summarization, and routine Q&A are routed to `CORE_ADAPTED` or standard cloud models with `temperature: 0.40`, `reasoningBudget: 512`.
3. **TIER 3 (DEEP):** Architectural reasoning, cross-file impact analysis, and multi-file coding are routed with deep thinking budgets (`temperature: 0.15`, `reasoningBudget: 2048`, `cotDepth: 5`).
4. **TIER 4 (CRITICAL):** Destructive mutations, production deployments, and security policies require deterministic inference (`temperature: 0.05`, `verificationBudget: 3`) and **Human Approval Gate** prior to execution.

---

## 4. Competitive Differentiation vs. Global Competitors

1. **Unified Orchestration Brain:** Unlike competitors where chat, voice, document processing, and coding are distinct siloed products, ZYNTHEOR executes all modalities through the single `ZyntheorIntelligenceRuntime`.
2. **Sovereign Vector Memory:** User preferences and workspace knowledge are stored in a local-first 128-dimensional vector memory store, never transmitted to external providers for advertising or retraining.
3. **Multi-Model Sovereignty:** Organizations can switch between Cloud-Frontier performance and 100% Local Air-Gapped privacy with a single toggle, without changing client code or workflows.
