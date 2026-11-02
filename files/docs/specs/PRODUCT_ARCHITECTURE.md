# ZYNTHEOR AI ENGINE — Unified Product Architecture

**Document Version**: 1.0.0  
**Target Platform**: Sovereign Engineering Intelligence Workspace  
**Core Principle**: Product-first, intelligence-first, security-first, evidence-driven engineering.

---

## 1. Architectural Principles

ZYNTHEOR is architected as a local-first, production-grade engineering intelligence platform. It prioritizes deterministic behavior, cryptographic auditability, and local data sovereignty over opaque cloud dependencies.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          A. ZYNTHEOR EXPERIENCE                             │
│     (Chat Workspace | Projects | Plans | Prompt Forge | Settings Center)   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                         B. ZYNTHEOR INTELLIGENCE                            │
│   (Intent Analysis | CoT Reasoning | Context Management | Agent Engine)     │
└───────────────────┬─────────────────────────────────────────┬───────────────┘
                    │                                         │
┌───────────────────▼─────────────┐         ┌─────────────────▼───────────────┐
│        C. MODEL PLATFORM        │         │      D. EXECUTION PLATFORM      │
│ (ZYNTHEOR CORE | Ollama (external) |│         │  (Tool Gateway | Forensic Diff |│
│  Gemini / OpenAI / Anthropic)   │         │ Sandbox Exec | Human Approval)  │
└───────────────────┬─────────────┘         └─────────────────┬───────────────┘
                    │                                         │
┌───────────────────▼─────────────────────────────────────────▼───────────────┐
│                    E. BUSINESS & F. TRUST PLATFORM                          │
│  (Local-Only Policy | SHA-256 Audit Chain | Session RBAC | Entitlements)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Product Layers Specification

### Layer A: ZYNTHEOR EXPERIENCE
- **User Onboarding & Interface**: Thai-first Sovereign Midnight Teal UI with zero glare and dark density optimization.
- **AI Workspace**: Unified tab navigation including Chat Workspace, Project Manager, Plans & Milestones, File Gateway, Prompt Forge, Model Control Center, Audit Ledger, Diagnostics, and Settings Center.
- **Settings Center (10 Categories)**:
  1. *General*: Language (TH/EN), theme palette, interface display density, startup landing page.
  2. *AI & Intelligence*: Global system instructions, response style, chain-of-thought reasoning depth, task memory policy.
  3. *Models*: Default model selection, live endpoint status, routing and fallback policy.
  4. *Providers*: Real-time probe for Local Ollama (external, user-run) (`127.0.0.1:11434`), Gemini, OpenAI, Anthropic proxies.
  5. *Privacy*: Local-only mode toggle, explicit online consent review, browser storage cache clear.
  6. *Security*: Active server session role (`admin`, `engineer`, `viewer`), master token verification, human approval gate toggles.
  7. *Tools*: Workspace file inspection gateway, Forensic Diff viewer, execution sandbox isolator.
  8. *Notifications*: Event category toggles (System, Model, Training, Security Alerts), toast display duration, quiet mode.
  9. *System Diagnostics*: Hardware telemetry (CPU, RAM, GPU, VRAM, disk space), process uptime, server health.
  10. *Advanced Configuration*: Error log inspector, JSON backup export/import, configuration reset with confirmation modal.

### Layer B: ZYNTHEOR INTELLIGENCE
- **Intent Understanding**: Deterministic query analysis classifying user intent into auto, plan, code, or execute modes.
- **Planning & Reasoning**: Multi-step chain-of-thought problem decomposition generating execution steps.
- **Context Management**: Persistent Task Memory (`saveTaskMemory`) retaining project context across chat sessions.
- **Agent Orchestrator**: `AgentOrchestrator` handling goal decomposition, dry-run simulation, and multi-tool execution.
- **Result Verification**: Verification engine validating output against syntax rules and test expectations.

### Layer C: MODEL PLATFORM
- **ZYNTHEOR CORE**: First-party model direction targeting Qwen2.5-Coder-7B-Instruct fine-tuned via QLoRA.
- **Local Model Runtime**: Loopback bridge connecting to Local Ollama at `http://127.0.0.1:11434/v1`.
- **External Provider Proxies**: Server-side proxy wrappers for Google Gemini, OpenAI API, and Anthropic API.
- **Model Registry & Routing**: Dynamic model discovery and fallback router routing requests based on policy and availability.
- **Evaluation & Benchmarking**: Standardized 8-category benchmark suite evaluating model capability against baseline fixtures.

### Layer D: EXECUTION PLATFORM
- **Tool Gateway**: Central registry exposing file reading, directory listing, diff parsing, and execution simulation.
- **Workspace Inspection**: Path-traversal protected file gateway serving project source snippets.
- **Forensic Code Diff**: Visual side-by-side and unified diff viewer highlighting exact line mutations.
- **Patch Applier**: Safe patch application engine ensuring code edits apply cleanly without corrupting target files.
- **Human Approval Gate**: Intercepting modal requiring explicit user confirmation before applying file modifications or executing commands.

### Layer E: BUSINESS PLATFORM
- **User Accounts & Session RBAC**: Server-side session middleware (`serverSessionMiddleware`) injecting verified roles (`admin`, `engineer`, `viewer`).
- **Subscription Entitlements**: Architecture stubs defining feature entitlements (Free, Pro, Team, Enterprise).
- **Usage Metering**: Request window rate limiters (`rateLimit`) protecting inference routes against burst abuse.
- **Organization & Team Support**: Workspace isolation grouping projects and tasks by `workspaceId`.

### Layer F: TRUST PLATFORM
- **Local-Only Policy**: Strict backend enforcement (`ZYNTHEOR_LOCAL_ONLY=true`) blocking remote outbound requests with HTTP 403.
- **Explicit Consent Record**: Requiring explicit user confirmation before permitting external API calls.
- **Secret Isolation**: Server-side `.env` secret management; zero API keys exposed to browser client code.
- **Cryptographic Audit Ledger**: Sequential SHA-256 hash-chained audit ledger (`verifyAuditHashChain`) providing tamper-proof evidence logs.
