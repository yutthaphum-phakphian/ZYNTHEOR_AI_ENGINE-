# Contributing to ZYNTHEOR AI ENGINE

Thank you for your interest in contributing to **ZYNTHEOR AI ENGINE (Buffalo Edition)**!  
ZYNTHEOR is a local-first engineering intelligence workspace designed for high reliability, zero-purple design discipline, Thai-first accessibility, and cryptographic auditability.

---

## 📜 Code of Conduct & Standards

We expect all contributors to adhere to the following quality standards:
- **Zero-Purple Discipline**: Never use purple/violet colors (`purple-`, `violet-`, `#8B5CF6`, etc.) in UI elements, buttons, badges, or graphs. Use our signature **Midnight Teal & Cyan** palette (`#080F1B`, `#0D1828`, `#14B8A6`, `#38BDF8`, `#10B981`).
- **Thai-First & Anti-Clipping Typography**: Preserve Thai language (`th-TH`) support as the default interface language. Ensure text containers have adequate line height (`line-height: 1.75 - 1.8`) to prevent tone mark clipping (สระและวรรณยุกต์ลอย/ขาด).
- **Cryptographic Evidence Integrity**: Any changes to model routing, reasoning steps, or automated tools must preserve and integrate with `EvidenceManager` and SHA-256 hash chaining.
- **Strict TypeScript**: Code must pass `tsc --noEmit` cleanly without type assertions (`any`) unless strictly justified.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: v20.0.0 or higher (Node 22 supported)
- **Package Manager**: `npm` only (do not use yarn, pnpm, or bun)
- **Local AI Provider** *(Optional)*: Ollama running on `http://127.0.0.1:11434`

### Quickstart Workflow
```bash
# 1. Clone the repository
git clone https://github.com/zxsvzv00-cmyk/zyntheor-ai.git
cd zyntheor-ai

# 2. Install dependencies via npm
npm install

# 3. Setup environment configuration
cp .env.example .env

# 4. Start development server (Port 3000, Host 0.0.0.0)
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

## 🧪 Verification & Quality Gates

Before submitting a pull request, verify that your changes pass all quality gates:

```bash
# 1. Static Type Check
npm run typecheck

# 2. Run Test Suite (Vitest & Native Integration Tests)
npm run test

# 3. Verify Production Build
npm run build
```

---

## 📂 Project Architecture Overview

```
├── lib/                         # Sovereign AI Core & Intelligence Engine
│   ├── chat-core.mjs            # Adaptive Chat Modes & Server Event Stream
│   ├── code-intelligence.ts     # AST Complexity & Dependency Graph Builder
│   ├── evidence-manager.ts      # Cryptographic SHA-256 Evidence Hashing
│   ├── governance-registry.ts   # Governance Rules & Audit Consensus
│   └── prompt-engine.ts         # Prompt Forge Optimization Engine
├── src/
│   ├── App.tsx                  # Main Workspace Layout & Navigation Shell
│   ├── components/              # Modular UI Panels (Prompt Forge, Audit, Models, etc.)
│   ├── db/                      # Schema & Drizzle ORM Database Definitions
│   ├── routes/                  # Express Sub-routers (Workspace, Editing, Billing, Auth)
│   └── services/                # Workspace Memory, Task Continuity, Security Guards
├── server.ts                    # Express Server & Vite SSR Middleware Entrypoint
└── tests/                       # Integration & Unit Test Suites
```

---

## 🔄 Pull Request Guidelines

1. **Focused PR Scope**: Submit PRs targeting a single feature or bugfix. Keep commits logical and well-described.
2. **Environment Safeguards**: Always proxy external API key usage through server endpoints in `server.ts`. Never expose secret keys in React frontend components.
3. **No Lockfile Conflicts**: Ensure only `package-lock.json` is modified. Do not commit `yarn.lock` or `bun.lock`.
4. **Documentation**: Update relevant documentation files in `/docs` if modifying engine behavior or governance rules.

---

## 📄 License & Attribution

By contributing to ZYNTHEOR AI ENGINE, you agree that your contributions will be licensed under the **AGPL-3.0 License**.
