<p align="center">
  <img src="public/zyntheor-header.svg" alt="ZYNTHEOR AI ENGINE" width="840" />
</p>

<p align="center">
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-"><img src="https://img.shields.io/badge/Buffalo-Active%20Governance-10B981?style=for-the-badge&logo=shield&logoColor=white" alt="Buffalo Audit" /></a>
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-"><img src="https://img.shields.io/badge/Integrity%20Manifest-SHA--256%20Verified-38BDF8?style=for-the-badge&logo=fingerprint&logoColor=white" alt="Manifest Integrity" /></a>
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-"><img src="https://img.shields.io/badge/Tests-Continuous%20PASS-10B981?style=for-the-badge&logo=checkmarx&logoColor=white" alt="Test Verification" /></a>
</p>

<p align="center">
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions"><img src="https://img.shields.io/badge/Build-Passing-10B981?style=flat-square&logo=githubactions&logoColor=white" alt="Build Status" /></a>
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions"><img src="https://img.shields.io/badge/Native%20Core-Verified-38BDF8?style=flat-square&logo=githubactions&logoColor=white" alt="Native Core" /></a>
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions"><img src="https://img.shields.io/badge/CodeQL-Passed-10B981?style=flat-square&logo=github&logoColor=white" alt="CodeQL" /></a>
</p>

<p align="center">
  <b>Status:</b> Active Development &amp; System Upgrades &nbsp;|&nbsp; Cryptographic Integrity Baseline &nbsp;|&nbsp; Sovereign Seal Active
</p>

<p align="center">
  <img src="public/status-cards.svg" alt="Local check status cards: tests, type errors, build, manifest. Values come from the last local run of scripts/gen-status-cards.mjs; UNVERIFIED means it has not been run." width="840" />
</p>

<p align="center">
  <a href="#installation">🛠️ Installation</a> &nbsp;·&nbsp;
  <a href="#security">🔒 Security</a> &nbsp;·&nbsp;
  <a href="#contribution">🤝 Contribution</a> &nbsp;·&nbsp;
  <a href="#architecture">🧭 Architecture</a>
</p>

# ZYNTHEOR AI ENGINE — Sovereign AI Workspace (Buffalo Edition)

ZYNTHEOR AI ENGINE คือระบบพื้นที่ทำงานปัญญาประดิษฐ์วิศวกรรมซอฟต์แวร์แบบประมวลผลภายในเครื่อง (Local-First AI Engineering Intelligence Workspace) ที่ออกแบบมาเพื่อความปลอดภัย ปริมาณงานสูง และตรวจสอบความถูกต้องได้ในระดับการกำกับดูแลขั้นสูง (Cryptographic Governance Baseline) ขับเคลื่อนด้วย React, TypeScript, Vite, Express, D3.js และ AI Gateway สองโหมด (Local Ollama & Google Gemini API)

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>

## 📊 สรุปผลการตรวจสอบความถูกต้องของระบบ (System Quality & Integrity Baseline)

> ⚠️ ตารางนี้เป็นสถานะที่ผู้ดูแลบันทึกไว้เอง **ไม่ได้อ่านจากการรันอัตโนมัติ** — ค่าที่มาจากการรันจริงดูที่การ์ดสถานะด้านบน (รันด้วย `node scripts/gen-status-cards.mjs`)

| หมวดการตรวจสอบ | รายละเอียดและดรรชนีวัดผล | ผลลัพธ์ |
|---|---|---|
| **Code Integrity Manifest** | SHA-256 Fingerprint Baseline (`FILE_MANIFEST.sha256`) | ✅ **Verified (Active Manifest)** |
| **Vitest Unit & Integration** | Evidence Manager, Governance Registry, Multi-Provider Audit, Ledger | ✅ **All Suite Tests PASS** |
| **Native Node Test Suite** | Adaptive Modes, Code Intelligence, Routing, Telemetry & Orchestrator | ✅ **All Integration Tests PASS** |
| **TypeScript TypeCheck** | Static Type Analysis (`tsc --noEmit`) | ✅ **0 Errors (Passed Cleanly)** |
| **Production Build** | Vite + React + Express Server Bundle Validation | ✅ **Build Succeeded** |
| **Overall Status** | Buffalo System Governance & Active Upgrade Cycle | 🦾 **READY & ACTIVELY UPGRADING** |

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>

## 🎨 สถาปัตยกรรม UI & ระบบการแสดงผล (Midnight Teal & Thai-First)

<details>
<summary><b>แสดง/ซ่อนรายละเอียด UI & Typography</b></summary>

### 1. Visual Identity — Midnight Teal System
- **Primary Color Palette**: Deep Navy (`#080F1B`), Midnight Teal (`#0D1828` / `#111F32`), Emerald Glow (`#10B981`), Cyan Highlights (`#38BDF8`), และ Teal Accent (`#14B8A6` / `#2DD4BF`)
- **Zero-Purple Discipline**: กำจัดสีม่วง/ไวโอเลตออกจาก UI ทุกจุดอย่างเด็ดขาด (Headers, Cards, Buttons, Badges, Graphs, Micro-Interactions)
- **Glassmorphic Surface**: พื้นผิวแบบกระจกโปร่งแสง ระดับความคมชัดของขอบสม่ำเสมอ พร้อมองค์ประกอบระดับมืออาชีพ

### 2. Thai-First Localization & Typography
- **Default Language**: ภาษาไทย (`th-TH`) เป็นภาษาหลักในการสื่อสารและแสดงผลระบบ
- **Typography Anti-Clipping**: ใช้ฟอนต์ **Noto Sans Thai** พร้อมกำหนด `line-height: 1.75 - 1.8` และ `letter-spacing: 0.015em` เพื่อป้องกันปัญหาวรรณยุกต์และสระภาษาไทยลอยหรือถูกตัดขอบ
- **Dynamic Language Toggle**: สลับภาษาไทย (TH) และอังกฤษ (EN) ได้แบบเรียลไทม์โดยไม่ต้อง Reload หน้าเว็บ พร้อมบันทึกการตั้งค่าใน `localStorage`

</details>

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>

## 🛡️ แกนหลักของระบบ Evidence & Cryptographic Governance (Buffalo Edition)

### 1. Evidence Manager Engine
- **SHA-256 Hash Chaining**: เชื่อมโยงทุกเหตุการณ์ Rationale, AST Analysis และ Tool Execution เข้าด้วยกันในสาย Hash Matrix เพื่อตรวจจับการดัดแปลง (Tamper Detection)
- **Automatic Rationale Tracker (`autorationale`)**: บันทึกเหตุผลของ AI ในการเลือก Mode และเลือกใช้ Tool อย่างเป็นระบบ
- **Code Intelligence Evidence (`codeimpact`)**: บันทึกโครงสร้างการเปลี่ยนแปลงข้ามไฟล์ และประเมินความซับซ้อน AST แบบ Real-Time
- **Tool Integrity Verification (`tool_verification`)**: ตรวจสอบ Schema และคำสั่งของเครื่องมือก่อนรันจริง

### 2. Cryptographic Governance Registry
- **Multi-Provider Audit Linkage (`lib/multi-provider-audit.ts`)**: บันทึกการสลับผู้ให้บริการโมเดล AI (Ollama <-> Gemini) พร้อมตรวจสอบลายเซ็น SHA-256 เพื่อความโปร่งใส
- **Governance Ledger (`lib/governance-ledger.ts`)**: สมุดบัญชีการกำกับดูแลที่ไม่สามารถแก้ไขย้อนหลังได้ (Immutable Audit Trail)
- **Governance Registry Gate (`lib/governance-registry.ts`)**: ตรวจสอบระดับความพร้อมของระบบและการตัดสินใจระดับนโยบายความปลอดภัย

### 3. Real-Time Observability Center
- เปิดใช้งาน endpoint `/api/evidence` สำหรับส่งออกรายการหลักฐาน (Evidence Records) และสถานะ Hash Chain แบบ Streaming Real-Time
- หน้าจอแสดงผล Telemetry Monitor สำหรับ GPU/VRAM, Network Latency, Tokens per Second และ Trace Log

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>

<a id="architecture"></a>
## 🧭 สถาปัตยกรรมภาพรวม (Architecture)

```mermaid
flowchart LR
  U[User] --> E[Express Server]
  E --> M["Model Provider<br/>Ollama local / Gemini remote (consent-gated)"]
  M --> V[Evidence Manager]
  V --> H[("SHA-256 Hash Chain")]
```

**เส้นทาง (ข้อความทดแทนหาก Mermaid ไม่แสดงผล):** User → Express → Model Provider → Evidence Manager → Hash Chain

> หมายเหตุ: แผนภาพเรียบเรียงจากคำอธิบายใน README นี้ ยังไม่ได้ตรวจเทียบกับโค้ดจริง และแสดงเฉพาะองค์ประกอบที่ README ระบุว่ามีอยู่แล้ว

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>

## 🧩 โครงสร้างโมดูลและหน้าการทำงาน (System Pages & Components)

<details>
<summary><b>แสดง/ซ่อนรายการโมดูลและหน้าการทำงาน</b></summary>

### 1. พื้นที่ทำงาน (Workspace)
- **แชต (Chat)**: ระบบสนทนาวิศวกรรมระดับสูง รองรับโหมด Auto, Chat, Reasoning, Coding, Research และ Agent พร้อมสตรีมมิ่งคำตอบ แสดง Diff, การวิเคราะห์เหตุผล (Reasoning Steps), ตรวจจับความซับซ้อนของโค้ด และการอนุมัติก่อนแก้ไขไฟล์จริง (Approval Gate)
- **โครงการ (Projects)**: บริหารจัดการ Workspace และโปรเจกต์ซอฟต์แวร์หลายโฟลเดอร์ พร้อมระบบ Multi-Workspace Switcher และ Workspace Import/Export
- **แผนงาน (Plans)**: จัดลำดับการพัฒนาซอฟต์แวร์ Dynamic Replanning และ Dependency-Aware Planning เพื่อแยกข้อเท็จจริง (Facts) ออกจากสมมติฐาน (Hypotheses)
- **ไฟล์ (Files)**: เครื่องมือสำรวจ ตรวจสอบ และพรีวิวโค้ดใน Workspace ภายใต้ระบบความปลอดภัย Sandbox ป้องกัน Path Traversal

### 2. ระบบอัจฉริยะ (Intelligence & Models Architecture)
- **Repository Intelligence**: เครื่องมือทำแผนที่โครงสร้างโปรเจกต์ สกัด Symbol, Class, Function, Interface และ Export วิเคราะห์ความสัมพันธ์ระหว่างไฟล์เป็น JSON Context Hierarchy สำหรับ AI
- **Intelligent Debugging**: ระบบวิเคราะห์และสืบสวนข้อผิดพลาด จับ Stack Traces, ดึงไฟล์ที่เกี่ยวข้อง และจัดลำดับสมมติฐานสาเหตุที่แท้จริง (Root Cause Hypotheses) พร้อมคำแนะนำแนวทางแก้ไข
- **Prompt Forge 0.9 PRO**: เครื่องมือออกแบบและพัฒนาพรอมป์ต์ ประกอบด้วย Prompt Optimizer, Rubrics Analyzer, Few-Shot Builder, Variable Simulator และ Test Lab
- **โมเดลและตัวชี้วัด (Models & Architecture)**:
  - **Overview**: ตรวจสอบและตั้งค่า AI Model Endpoint ทั้ง Local Ollama และ Google Gemini API (gemini-3.8-flash)
  - **Model Metrics Rolling Chart**: แผนภูมิแสดงผล Real-Time Rolling 60 นาที ติดตามเวลาแฝง (P50/P95/P99 latency), จำนวน Token (Prompt/Completion) และอัตราความสำเร็จ
  - **Architecture Sub-Tab**: แผนผังความเชื่อมโยงเชิงสถาปัตยกรรมแบบโต้ตอบ (Interactive D3.js Codebase Dependency Map) สร้างขึ้นด้วย `CodeIntelligence.buildDependencyGraph`
  - **Interactive Module Exploration**: คลิกเลือก node บนกราฟเพื่อเน้นความสัมพันธ์ Direct Internal Imports, External Dependencies และ Reverse Imports

### 3. ความเชื่อมั่นและความปลอดภัย (Trust & Safety)
- **สมุดบัญชีตรวจสอบ (Audit Ledger)**: แสดงผล Cryptographic Hash Chain ตรวจสอบความถูกต้อง (Tamper Detection), แสดงกราฟสัดส่วน Event/Action, ตรวจสอบความถูกต้องของ Storage, ส่งออก JSON/CSV และรองรับการ Re-sign ซ่อมแซมสายโซ่
- **การวินิจฉัยระบบ (Diagnostics)**: ตรวจสอบสุขภาพของเซิร์ฟเวอร์, GPU Memory, HTTP Latency, สถานะระบบข้อผิดพลาด และทดสอบการประมวลผล Local/API Inference

### 4. ระบบและการตั้งค่า (System)
- **ระบบการชำระเงินและสิทธิ์ (Billing & Plans)**: บริหารจัดการแผนบริการ (Free / Pro / Enterprise), สิทธิ์การใช้งาน (Entitlements), ข้อมูลการเรียกเก็บเงิน ประวัติ Invoice และสถานะสมาชิก
- **ตั้งค่า (Settings)**: ควบคุม Local-First Isolation Mode, การยินยอมออนไลน์, API Key Security Proxy, การจัดการสิทธิ์การใช้งาน และ Session Management

</details>

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>

## 📱 ภาพหน้าจอ (Screenshots)

> 🚧 **ยังไม่มีภาพหน้าจอจริง** — วางไฟล์ภาพจริงจากแอปที่ `docs/screenshots/` แล้วเปิดคอมเมนต์ด้านล่าง ห้ามใช้ภาพจำลองแทน

<!--
<p align="center">
  <img src="docs/screenshots/chat.png" alt="หน้าแชต" width="260" />
  <img src="docs/screenshots/architecture.png" alt="แผนผังสถาปัตยกรรม" width="260" />
  <img src="docs/screenshots/audit-ledger.png" alt="สมุดบัญชีตรวจสอบ" width="260" />
</p>
-->

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>

<a id="installation"></a>
## 🛠️ วิธีการติดตั้งและใช้งาน (Local Operations Guide)

### ข้อกำหนดของระบบ (Prerequisites)
- **Node.js**: เวอร์ชัน 20.0.0 ขึ้นไป
- **Package Manager**: npm 10+
- **Local AI Provider**: Ollama (กรณีใช้งาน Local Inference)

### ขั้นตอนการรันระบบพัฒนา (Development Mode)
```bash
# 1. ติดตั้ง Dependencies ทั้งหมด
npm install

# 2. คัดลอกและตั้งค่า Environment Variable
cp .env.example .env

# 3. รัน Development Server (Port 3000)
npm run dev
```
เปิดใช้งานผ่านเบราว์เซอร์ที่: `http://localhost:3000`

### การตรวจสอบคุณภาพและทดสอบระบบ (Quality Gates & Testing)
```bash
# 1. ตรวจสอบความพร้อมของสภาพแวดล้อม (Environment Preflight)
npm run check:env

# 2. ตรวจสอบ Static Type Check (TypeScript)
npm run typecheck

# 3. รันชุดการทดสอบระบบ (Integration & Vitest Suite)
npm run test

# 4. ทดสอบสร้าง Production Bundle
npm run build
```

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>

<a id="security"></a>
## 🔒 นโยบายความปลอดภัยและการจำกัดขอบเขต (Security & Governance Policy)

- **Security Details**: อ่านรายละเอียดฉบับเต็มได้ที่ [`SECURITY.md`](./SECURITY.md)
- **Local-First Protection**: ระบบรันภายใต้แนวทาง Local-First โดยค่าเริ่มต้น ข้อมูลทั้งหมดจะถูกประมวลผลภายในเครื่องของผู้ใช้
- **Consent-Gated Remote Calls**: การเชื่อมต่อ API ภายนอก (Google Gemini API) จะทำงานเมื่อได้รับอนุมัติจากผู้ใช้ชัดเจนในระบบ
- **Secret Isolation Barrier**: API Keys ทั้งหมดจัดเก็บเฉพาะใน `.env` ฝั่ง Node Express Backend เท่านั้น ไม่มีการส่ง Key ออกไปยัง Client Browser
- **Human Approval Standard**: ปฏิบัติการที่มีผลกระทบต่อระบบซอฟต์แวร์ ต้องได้รับการยืนยันจากมนุษย์ก่อนเสมอ (Human-in-the-loop Gate)

### Security - Local Only
This server binds to loopback by default (127.0.0.1) and do not expose it directly to the internet.
Use ZYNTHEOR_LOCAL_ONLY=true and HOST=127.0.0.1 to enforce local-only mode.
For hosted-preview, override HOST=0.0.0.0 with explicit consent.

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>

<a id="contribution"></a>
## 🤝 การมีส่วนร่วมและการพัฒนาต่อยอด (Contributing Guidelines)

คำแนะนำขั้นตอนการพัฒนา, เกณฑ์คุณภาพ (Quality Gates), และระเบียบข้อบังคับ Zero-Purple Discipline สามารถอ่านได้ที่ [`CONTRIBUTING.md`](./CONTRIBUTING.md)

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>

## 📄 License & Attribution

Distributed under the **AGPL-3.0 License**. Built for sovereign, enterprise-grade local-first AI software engineering environments.

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>

<p align="center">
  <img src="public/zyntheor-footer.svg" alt="ZYNTHEOR AI ENGINE · Buffalo Edition" width="840" />
</p>
