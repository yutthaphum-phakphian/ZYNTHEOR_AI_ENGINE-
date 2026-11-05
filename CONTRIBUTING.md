# Contributing to ZYNTHEOR AI ENGINE

Thank you for your interest in contributing to **ZYNTHEOR AI ENGINE (Buffalo Edition v1.3.1 LTS)**!  
ZYNTHEOR is a sovereign universal intelligence workspace designed for high reliability, Thai-first accessibility, strict cryptographic auditability, and zero-mock engineering.

---

## 📜 Code of Conduct & Standards

We expect all contributors to adhere to the following quality standards:

1. **Design System & Palette Discipline**:
   - Signature Palette: **Midnight Teal, Sky Cyan & Deep Graphite** (`#050810`, `#0B1020`, `#00D9A3`, `#38BDF8`, `#10B981`, `#E6EDF3`).
   - Card Border-Radius: Standard **14–18px** across all UI cards (`rounded-[16px]` or `rounded-[18px]`).
   - Typography: **Space Grotesk** for brand headers/titles, **Noto Sans Thai** & **Inter** for readable body copy, and **JetBrains Mono** for code and cryptographic hashes.
2. **Thai-First & Anti-Clipping Typography**:
   - Preserve Thai language (`th-TH`) support as a first-class citizen.
   - Maintain generous line heights (`leading-relaxed` / `leading-[1.7]`) to prevent tone mark clipping (สระและวรรณยุกต์ลอย/ขาด).
3. **Cryptographic Evidence Integrity**:
   - Any modifications to task planning, reasoning, or code patching must integrate with the SHA-256 hash-chained audit ledger (`src/services/auditLedger.ts`).
   - Ensure the SSoT drift remains strictly at **Δ0.00%**.
4. **Strict TypeScript & Zero-Mock Policy**:
   - Code must pass `tsc --noEmit` cleanly with 0 type errors.
   - Do not commit mock placeholders, simulated random numbers, or fake benchmark results.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: v20.0.0 or higher (Node 22 LTS recommended)
- **Package Manager**: `npm` only (do not use yarn, pnpm, or bun)
- **Optional Local LLM**: Ollama running on `http://127.0.0.1:11434`

### Quickstart Workflow
```bash
# 1. Clone the repository
git clone https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-.git
cd ZYNTHEOR_AI_ENGINE-

# 2. Install dependencies via npm
npm install

# 3. Setup environment configuration
cp .env.example .env

# 4. Start development server (Port 3000, Host 0.0.0.0)
npm run dev
```

The application will be live at `http://localhost:3000`.

---

## 🧪 Verification & Quality Gates

Before opening a pull request, verify that your changes pass all local quality gates:

```bash
# 1. Static Type Check
npm run typecheck

# 2. Run Vitest Test Suite (18 test suites, 151+ tests)
npm run test:vitest

# 3. Operational Evaluation Lab
node --import tsx --test tests/operational-evaluation-lab.test.ts

# 4. Repository Intelligence & AST Test
node --import tsx --test tests/phase8-repository-intelligence.test.ts

# 5. Production Build
npm run build
```

---

## 📂 Project Architecture Overview

```
├── lib/                         # Sovereign AI Core & AST Engine
│   ├── code-intelligence.ts     # AST Complexity, Call Graph & Symbol Extraction
│   ├── intelligence-core.ts     # Task Classification & Autonomous Reasoning
│   ├── native-model-runtime.ts  # Native CPU & Model Runtime Probing
│   └── truth-kernel.ts          # Zero-Mock Truth & Security Boundary
├── src/
│   ├── App.tsx                  # Universal AI Workspace Shell & HomeExperience
│   ├── components/              # Modular UI Panels (ControlCenter, MainChat, etc.)
│   ├── db/                      # Schema & Drizzle ORM Database Definitions
│   ├── evaluation/              # 12-Category Unified Evaluation Engine & Regressions
│   ├── routes/                  # Express Sub-routers (Intelligence, Workspace, Auth, Tasks)
│   └── services/                # Audit Ledger, Patch Applier, Key Management, RBAC
├── server.ts                    # Express Server & Vite SSR Middleware Entrypoint
└── tests/                       # Integration, Security, and Evaluation Test Suites
```

---

## 🔄 Pull Request Guidelines

1. **Focused PR Scope**: Submit PRs targeting a single feature or bugfix. Keep commits logical and well-described.
2. **Server-Side Secret Isolation**: Always proxy external API key usage through server endpoints in `server.ts`. Never expose secret keys in React frontend components.
3. **Lockfile Hygiene**: Ensure only `package.json` / `package-lock.json` are maintained. Do not commit `yarn.lock`, `pnpm-lock.yaml`, or `bun.lock`.
4. **Documentation**: Keep `README.md`, `SECURITY.md`, and relevant architecture documents in `/docs` updated.

---

## 📄 License & Attribution

By contributing to ZYNTHEOR AI ENGINE, you agree that your contributions will be licensed under the **AGPL-3.0 License**.
