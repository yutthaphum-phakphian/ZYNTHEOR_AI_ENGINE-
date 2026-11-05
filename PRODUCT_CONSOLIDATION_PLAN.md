# ZYNTHEOR PRODUCT CONSOLIDATION PLAN
**Design Philosophy:** One Workspace, One Intelligence, Many Capabilities  
**Target:** Clean, Focused, Frontier-Grade User Experience  
**Platform Version:** 1.4.0 LTS

---

## 1. Problem Statement & Anti-Slop Discipline

Prior iterations of developer platforms frequently degraded into technical dashboards crowded with vanity widgets, raw status telemetry, redundant system meters, and fragmented feature screens. This violated core user experience principles:

- Users do not come to an AI engine to stare at a cluster of system monitoring cards.
- Users come to solve problems, write code, research complex topics, draft documents, and plan execution.
- Dispersing features across separate "Voice Mode", "Doc Mode", "Code Mode", and "Research Mode" screens created artificial silos that broke cognitive momentum.

---

## 2. The Golden Ratio: Home Page Architecture

The ZYNTHEOR Home Page is consolidated into **5 Essential Elements Only**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ZYNTHEOR WORKSPACE HEADER                       │
│       [Online-First Indicator]   [Current Mode]   [Active Model]       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                       ① OMNI COMPOSER (Hero)                           │
│     ┌────────────────────────────────────────────────────────────┐     │
│     │ Ask anything, paste code, drop documents, attach images... │     │
│     │                                                            │     │
│     │ [🎤 Voice v1.1]  [📎 Attach Doc]  [🖼️ Attach Image]  [➤ Send] │     │
│     └────────────────────────────────────────────────────────────┘     │
│                                                                        │
│               ② INTELLIGENCE STATUS & PROFILE BADGES                   │
│      [⚡ TIER 2: BALANCED]  [🧠 CoT: 3 steps]  [🛡️ Fail-Closed Active]   │
│                                                                        │
│               ③ CANONICAL CAPABILITY ACCESS (10 Domains)               │
│   [💬 General] [🔍 Research] [🧠 Reasoning] [✍️ Writing] [🎓 Learn]      │
│   [📄 Docs]    [📊 Data]     [🎨 Creative]  [📅 Plan]    [💻 Code]      │
│                                                                        │
│               ④ RECENT WORK & CONVERSATION THREADS                     │
│      • Architectural Audit Ledger verification                         │
│      • Long-Term Vector Memory deployment                              │
│                                                                        │
│               ⑤ KNOWLEDGE & WORKSPACE MEMORY DRAWER                    │
│      [Recalled Preferences: 3]  [Project Invariants: 8] [Manage]       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### The 5 Essential Roles
1. **Omni Composer (Primary Starting Point):** The single entry point for all workflows. Accepts natural text, speech dictation (Voice v1.1), documents, and visual assets without requiring mode pre-selection.
2. **Intelligence Status:** Subtle, elegant pill indicators displaying the current reasoning tier (`TIER_1` to `TIER_4`), active model family, and operating mode (`ONLINE_INTELLIGENCE`).
3. **Capability Access:** Quick-filter chips for the 10 canonical domains to prime intent without fragmenting the canvas.
4. **Recent Work:** Direct resumption of active workspaces, tasks, and historical session context.
5. **Knowledge & Memory:** Immediate visibility into what the AI recalls about user preferences and workspace invariants, with full user sovereignty to inspect or delete.

---

## 3. Strict Separation: Work Area vs. Control Center

| Feature Group | Home / Workspace Screen | Control Center (Dedicated Settings Screen) |
| :--- | :--- | :--- |
| **Input & Interaction** | **PRIMARY:** Omni Composer, conversation stream, tool execution feedback | None (Read-only logs and configs) |
| **Telemetry & Metrics** | Minimal, non-intrusive status pills | **PRIMARY:** Full CPU/RAM gauges, token counters, latency graphs |
| **Model Configuration** | Active model badge + quick mode toggle | Model API key provisioning, provider failover, temperature slider defaults |
| **Memory Governance** | Memory recall badges on answers | Vector memory raw viewer, embedding export, workspace wipe tool |
| **Audit & Ledger** | SHA-256 evidence link on answers | Full Merkle cryptographic tree inspector and tamper forensic verification |

---

## 4. Purge & Consolidation Checklist

- [x] **Consolidated Omni Input:** Merged Voice 1.1 Web Speech, Document Ingestion, and Image Vision into `MainChat.tsx` composer bar.
- [x] **Eliminated Fake Dashboard Cards:** Removed static placeholder cards that mimicked server monitors on the front page.
- [x] **Integrated Adaptive Reasoning Inspector:** Replaced multi-screen reasoning views with an on-demand collapsible inspection drawer directly under model answers.
- [x] **Centralized Operating Mode:** Replaced scattered offline/online switches with a single 3-state selector (`ONLINE_INTELLIGENCE`, `HYBRID_INTELLIGENCE`, `LOCAL_ONLY`) synced with `server.ts`.
- [x] **Zero Mock Enforcement:** Removed mock simulation data in favor of genuine live runtime telemetry.
