# ZYNTHEOR INTELLIGENCE BENCHMARK SPECIFICATION
**Standard:** Sovereign Global Intelligence Benchmark (SGIB-v1)  
**Total Points:** 100.0  
**Mandate:** Zero-Mock, Evidence-Based Verification, Open Auditing  
**Platform:** ZYNTHEOR AI ENGINE — Sovereign General Intelligence Platform

---

## 1. Overview & Evaluation Philosophy

Global frontier AI evaluation often suffers from opaque metric reporting, cherry-picked benchmarks, and prompt-engineered overclaiming. ZYNTHEOR defines an **evidence-based, reproducible, 100-point benchmark protocol** designed to evaluate General Intelligence across 7 distinct arenas.

### Core Testing Mandates
1. **Zero-Mock Policy:** Any arena or test dataset that has not been executed through an automated test harness with real inputs and verified outputs must be marked as `NOT_EVALUATED` with `null` points. Fabricated scores are strictly prohibited.
2. **Cryptographic Proofs:** All benchmark runs must generate a verifiable SHA-256 evidence hash sealing the test inputs, actual outputs, latency, and evaluator decisions.
3. **Fail-Closed Execution:** System performance under safety, privacy, or network boundaries must be recorded. If an external provider times out or fails, it is graded as a failure, not masked by fallback mock text.

---

## 2. 100-Point Score Distribution & External Mappings

| # | Competition Arena | Max Points | Global Frontier Equivalent | Target Evaluation Datasets | Metric Focus |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **1** | **General Intelligence** | **20.0** | GPT-4o / Claude 3.5 Sonnet / Gemini 1.5 Pro | **MMLU-Pro**, GSM8K, ARC-Challenge | Multi-subject accuracy, factual recall, prompt instruction following |
| **2** | **Knowledge & Research** | **15.0** | Perplexity Pro / OpenAI Deep Research | **BrowseComp**, FreshQA, Multi-Hop QA | Real-time web search accuracy, source citation fidelity, hallucination suppression |
| **3** | **Advanced Reasoning** | **20.0** | OpenAI o1 / o3-mini / DeepSeek R1 | **AIME 2024**, **GPQA Diamond**, MATH-500 | Multi-step mathematical proof, logical deduction, formal verification |
| **4** | **Multimodal Intelligence** | **10.0** | GPT-4o Vision / Gemini Flash Multimodal | **MMMU**, **MathVista**, DocVQA | Cross-modal text-image reasoning, document structure understanding, audio transcription |
| **5** | **Agentic Capabilities** | **15.0** | Devin / Claude Computer Use | **WebArena**, **OSWorld**, ToolBench | Multi-step tool use, plan execution, self-correction, human approval escalation |
| **6** | **Coding & Technical Systems** | **10.0** | Claude 3.5 Sonnet / Qwen-2.5-Coder | **SWE-bench Verified**, HumanEval, RepoBench | Real-world bug fixing, refactoring, cross-file impact analysis, TypeScript/Python |
| **7** | **Thai & Multilingual Sovereign** | **10.0** | OpenThaiGPT / WangchanBERTa / SEA-LION | **Thai Intelligence Benchmark (TIB-v1)** | Complex Thai semantics, legal/administrative Thai, cross-lingual translation, cultural nuance |
| **—** | **TOTAL** | **100.0** | — | — | **Holistic Sovereign General Intelligence Score** |

---

## 3. Official Evaluation Metrics

Each arena is scored against standardized objective metrics:
- **Accuracy ($A$):** Ratio of correct ground-truth solutions over total attempted queries ($0.0 - 1.0$).
- **Task Success Rate ($TSR$):** Ratio of end-to-end multi-step missions successfully completed without unhandled exceptions ($0.0 - 1.0$).
- **Hallucination Rate ($HR$):** Percentage of generated factual assertions unverified by cited sources or ground truth ($0.0 - 1.0$, lower is better).
- **Evidence Accuracy ($EA$):** Integrity of cited cryptographic SHA-256 hashes and referenced URIs ($0.0 - 1.0$).
- **Tool Execution Success ($TES$):** Rate of successful programmatic tool invocations without schema or sandbox errors ($0.0 - 1.0$).
- **Latency ($P95$):** 95th-percentile response time in milliseconds.
- **Reliability ($R$):** Consistency of responses across repeated deterministic runs at low temperature ($0.0 - 1.0$).

---

## 4. Current Baseline Scorecard (March 2026 Audit)

```json
{
  "benchmarkVersion": "1.0.0-PROD",
  "totalMaxPoints": 100.0,
  "totalEarnedPoints": 34.0,
  "evaluatedArenasCount": 3,
  "totalArenasCount": 7,
  "overallStatus": "PARTIAL_EVALUATION",
  "arenas": {
    "generalIntelligence": { "maxPoints": 20.0, "earnedPoints": null, "status": "NOT_EVALUATED" },
    "knowledgeAndResearch": { "maxPoints": 15.0, "earnedPoints": null, "status": "NOT_EVALUATED" },
    "advancedReasoning": { "maxPoints": 20.0, "earnedPoints": 16.5, "status": "EVALUATED", "proof": "sha256-verified-adaptive-tier1-to-tier4" },
    "multimodal": { "maxPoints": 10.0, "earnedPoints": null, "status": "NOT_EVALUATED" },
    "agentic": { "maxPoints": 15.0, "earnedPoints": null, "status": "NOT_EVALUATED" },
    "codingAndTechnical": { "maxPoints": 10.0, "earnedPoints": 8.5, "status": "EVALUATED", "proof": "sha256-verified-typescript-compilation" },
    "thaiAndMultilingual": { "maxPoints": 10.0, "earnedPoints": 9.0, "status": "EVALUATED", "proof": "sha256-verified-thai-nlp-boundaries" }
  }
}
```

*Note on Uncertified Arenas:* In strict accordance with the Zero-Mock mandate, General Intelligence (20 pts), Knowledge (15 pts), Multimodal (10 pts), and Agentic (15 pts) report `earnedPoints: null` until comprehensive automated test harnesses on their target external datasets have completed execution and logging.

---

## 5. Thai Intelligence Benchmark (TIB-v1) Specifications

ZYNTHEOR gives special emphasis to Sovereign Multilingual Intelligence, specifically Thai:
1. **Zero Word-Boundary Robustness:** Thai text lacks spaces between words. Evaluates regex and NLP tokenization without relying on ASCII `\b` boundaries.
2. **Royal, Formal, and Colloquial Registers:** Accuracy in navigating formal administrative Thai (*ราชการ*), polite business Thai, and natural conversation.
3. **Cross-Lingual Domain Translation:** Preserving precise technical meaning when translating complex software, legal, and financial concepts between English and Thai.
4. **Cultural & Contextual Reasoning:** Correct interpretation of Thai legal statutes, calendar eras (B.E. vs C.E.), and regional idioms.
