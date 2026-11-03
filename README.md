<p align="center">
  <img src="public/zyntheor-header.svg" alt="ZYNTHEOR AI ENGINE" width="840" />
</p><p align="center">
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/native-core-1.1.0.yml"><img src="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/native-core-1.1.0.yml/badge.svg" alt="Native CORE - Dataset &amp; Eval" /></a>
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/pages.yml"><img src="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/pages.yml/badge.svg" alt="Deploy ZYNTHEOR Pages" /></a>
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/dependabot/dependabot-updates"><img src="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/dependabot/dependabot-updates/badge.svg" alt="Dependabot Updates" /></a>
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/codeql.yml"><img src="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/codeql.yml/badge.svg" alt="CodeQL Advanced" /></a>
  <a href="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/audit-1.1.0.yml"><img src="https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/actions/workflows/audit-1.1.0.yml/badge.svg" alt="Buffalo 1.2.6 Audit" /></a>
</p><p align="center">
  <b>Status:</b> Active Development &amp; System Upgrades &nbsp;|&nbsp; Evidence-Based Engineering &nbsp;|&nbsp; Security-First Architecture
</p><p align="center">
  <img src="public/status-cards.svg" alt="Local check status cards. Values depend on the most recent status generation run; UNVERIFIED means no verified result is available." width="840" />
</p><p align="center">
  <img src="public/zyntheor-features.svg" alt="ZYNTHEOR AI ENGINE Core Engineering Pillars" width="840" />
</p><p align="center">
  <a href="#installation">🛠️ Installation</a> &nbsp;·&nbsp;
  <a href="#security">🔒 Security</a> &nbsp;·&nbsp;
  <a href="#architecture">🧭 Architecture</a> &nbsp;·&nbsp;
  <a href="#team-governance">👥 Team Governance</a> &nbsp;·&nbsp;
  <a href="#core-x-vision">🧠 CORE X Vision</a> &nbsp;·&nbsp;
  <a href="#contribution">🤝 Contribution</a>
</p>ZYNTHEOR AI ENGINE — Sovereign AI Workspace (Buffalo Edition)

ZYNTHEOR AI ENGINE คือแพลตฟอร์ม AI Engineering Workspace ที่มุ่งเน้นการพัฒนาซอฟต์แวร์ การวิเคราะห์โค้ด การประสานงานเครื่องมือ และการกำกับดูแลการทำงานของ AI ภายใต้แนวทาง Local-First และ Security-First

ระบบพัฒนาด้วย React 19, TypeScript, Vite และ Express 5 พร้อมองค์ประกอบด้าน Code Intelligence, Evidence Management, Model Gateway และ Team Governance

เป้าหมายระยะยาวคือการพัฒนาไปสู่ ZYNTHEOR CORE X — Sovereign AI Engineering Platform ซึ่งจะเพิ่มความเป็นอิสระด้านโมเดล AI และโครงสร้างพื้นฐานของตนเองอย่างเป็นขั้นตอน โดยแยกความสามารถที่ใช้งานได้จริงออกจากความสามารถที่ยังอยู่ระหว่างการพัฒนา

«Engineering Principle: Real Implementation · Zero-Mock · Security First · Fail Closed · Human-in-the-Loop · Evidence-Based Verification»

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>📊 Evidence-Based Project Status

«ข้อมูลสถานะนี้อ้างอิงรายงานการตรวจสอบที่ระบุวันที่ 3 พฤศจิกายน 2026 ผลการทดสอบเป็นข้อมูลที่รายงานไว้จากสภาพแวดล้อมการพัฒนาของโครงการ ไม่ใช่การรับรอง Production Readiness หรือการตรวจสอบอิสระจากบุคคลภายนอก»

Component| Reported Status| Verified Scope / Limitation
P11 Cognitive Reasoning| "NOT_VERIFIED"| มีฐานระบบเดิม แต่ยังไม่มี End-to-End Acceptance Evidence รอบนี้
P12 Persistent Memory| "PARTIAL / TESTED"| มี tenant boundary, corruption fail-closed, atomic write/lock และ legacy-path collision guard; PostgreSQL/Cloud SQL ยังไม่ยืนยัน
P13 Multi-Agent| "PARTIAL / TESTED"| มี bounded DAG coordinator, idempotency checks และ human approval gate; durable cross-restart adapter ยังไม่ยืนยัน
P14 Evaluation| "PARTIAL / TESTED"| มีการแก้ empty-history scoring; ยังไม่มีหลักฐานรับรอง benchmark ระดับโมเดล
P15 Governed Improvement| "NOT_VERIFIED"| มี proposal/approval foundations แต่ยังไม่ยืนยัน end-to-end rollback acceptance
P16 Native Training| "BLOCKED"| มี training loop และ dataset validation ที่รายงานไว้ 15 samples (8/3/4); provenance และ human review ยังไม่ได้รับอนุมัติ จึงยังไม่มี trained checkpoint ที่ผ่านการรับรอง
P17 Native Inference| "BLOCKED"| มี local runtime แต่ยังไม่มี checkpoint ที่ตรวจสอบและรับรองได้
P18 Model Lifecycle| "PARTIAL / TESTED"| มี hash-chained ledger และ promotion/rollback gates แต่ยังไม่มีหลักฐาน model promotion ที่เสร็จสมบูรณ์
P19 Sovereign Infrastructure| "PARTIAL / TESTED"| มี Local-Only policy และ backup/restore verification; network isolation และ air-gap ยังไม่ผ่านการยืนยัน
P20 Integrated Release Gate| "BLOCKED"| มี evidence-derived release gate แต่ release approval ยังไม่ผ่าน

Reported Test Results

ผลการทดสอบที่บันทึกไว้ในรายงานรอบดังกล่าว:

Test Group| Reported Result
Targeted Node Tests| 33/33 PASS
Memory / Evaluation / No-Simulation| 19/19 PASS
Agent / Lifecycle / Platform / Gateway| 14/14 PASS
Native CPU / Inference Python Tests| 12/12 PASS
Sovereign Backup / Restore Python Tests| 3/3 PASS
Full npm/Vite Build| "NOT_VERIFIED"
Project-Wide Test Suite| "NOT_VERIFIED"
Native Model Training| "BLOCKED"

ข้อจำกัดของผลทดสอบ

- Full npm/Vite build และ project-wide test suite ไม่ได้รับการยืนยันในสภาพแวดล้อมการตรวจสอบที่ไม่มี "node_modules"
- ไม่มีการติดตั้ง dependencies เพิ่มเพื่อสร้างผลทดสอบดังกล่าว
- ผล PASS ของ targeted tests ไม่ได้หมายความว่าทุกระบบผ่าน End-to-End Integration Test
- Native training ยังติด governance gate และไม่มี checkpoint ที่ผ่านการรับรอง
- ผลทดสอบในตารางเป็นผลที่รายงานไว้ ไม่ใช่ผลที่ README นี้รันซ้ำโดยอัตโนมัติ

ตรวจสอบสถานะ Release Gate ได้ด้วย:

npm run corex:p20:status

สถานะ "BLOCKED" ถือเป็นผลลัพธ์ที่ถูกต้องเมื่อหลักฐานหรือเงื่อนไขบังคับยังไม่ครบ

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>🧠 ZYNTHEOR CORE X — First-Party AI Independence

<a id="core-x-vision"></a>

CORE X คือวิสัยทัศน์ระยะยาวในการพัฒนา ZYNTHEOR จาก AI Engineering Workspace ไปสู่แพลตฟอร์ม AI ที่สามารถควบคุมและพัฒนาองค์ประกอบสำคัญของตนเองได้

เป้าหมายไม่ใช่เพียงการเชื่อมต่อโมเดลจากผู้ให้บริการภายนอก แต่เป็นการสร้างความสามารถพื้นฐานของระบบอย่างเป็นขั้นตอน

First-Party Technology Roadmap

Layer| Long-Term Objective
Tokenizer| พัฒนาและควบคุม Tokenizer สำหรับภาษาไทย อังกฤษ และ Source Code
Dataset| สร้าง Dataset ที่มี provenance, licensing และ validation
Model Architecture| พัฒนา Native Model Architecture ที่กำหนดเอง
Native Training| ฝึกโมเดลจาก Random Initialization ด้วยกระบวนการที่ตรวจสอบได้
Native Inference| สร้าง Runtime สำหรับโหลดและประมวลผล Native Checkpoints
Reasoning & Planning| พัฒนาความสามารถด้าน reasoning, planning และ task decomposition
Memory| สร้างระบบความจำที่มี tenant isolation และ lifecycle governance
Tool Execution| พัฒนาเครื่องมือและ Execution Gateway ที่มี permission boundaries
Agent Orchestration| ประสานงาน Multi-Agent ภายใต้ approval และ verification
Evaluation| วัดความสามารถและ regression ด้วย benchmark ที่ทำซ้ำได้
Model Lifecycle| จัดการ checkpoint, versioning, promotion และ rollback
Sovereign Infrastructure| ควบคุมการทำงานและขอบเขตเครือข่ายตามนโยบายของผู้ใช้

Model Identity and Provenance

ZYNTHEOR ต้องแยกประเภทโมเดลให้ชัดเจน:

- "CORE_ADAPTED" — โมเดลที่พัฒนาต่อยอดจาก pretrained base model
- "CORE_NATIVE" — โมเดลที่เริ่มต้นจาก Random Initialization และฝึกด้วยกระบวนการของ ZYNTHEOR
- "CORE_DISTILLED" — โมเดลที่ผ่านกระบวนการ Knowledge Distillation

การใช้ชื่อ "CORE_NATIVE" ต้องมีหลักฐานด้าน initialization, training lineage, dataset provenance และ checkpoint integrity รองรับ

สถานะ: CORE X เป็นวิสัยทัศน์และ Roadmap ระยะยาว ไม่ใช่การยืนยันว่า Native AI Model หรือ First-Party AI Independence เสร็จสมบูรณ์แล้ว

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>🎨 UI Design System — Midnight Teal & Thai-First

<details>
<summary><b>แสดง/ซ่อนรายละเอียด UI & Typography</b></summary>1. Visual Identity

- Deep Navy: "#080F1B"
- Midnight Teal: "#0D1828", "#111F32"
- Emerald: "#10B981"
- Cyan: "#38BDF8"
- Teal Accent: "#14B8A6", "#2DD4BF"

Zero-Purple Discipline

แนวทางการออกแบบกำหนดให้หลีกเลี่ยงสีม่วงและไวโอเลตใน UI รวมถึง Headers, Cards, Buttons, Badges, Graphs และ Micro-Interactions

สีสำหรับบทบาท Developer ใช้ Teal เช่น "#0D9488" ตาม Design Specification นี้

«หมายเหตุ: Design Specification ไม่ใช่หลักฐานยืนยันว่า Source Code หรือทุกหน้าจอของแอปได้เปลี่ยนสีตามข้อกำหนดแล้ว»

2. Thai-First Localization

- Default Locale: "th-TH"
- รองรับภาษาไทยและภาษาอังกฤษ
- ใช้ Noto Sans Thai เป็นฟอนต์หลักตามความเหมาะสม
- แนวทาง Typography: "line-height: 1.75–1.8"
- แนวทาง Letter Spacing: "0.015em"
- รองรับ Dynamic Language Toggle โดยไม่ต้อง Reload หาก implementation ของหน้าจอนั้นรองรับ

</details><p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>🛡️ Evidence & Cryptographic Governance

1. Evidence Manager

องค์ประกอบด้าน Evidence ที่มีการระบุไว้ในโครงสร้างโครงการ:

- SHA-256 Hash Chaining: เชื่อมโยงหลักฐานเป็นลำดับเพื่อตรวจจับความเปลี่ยนแปลงของข้อมูล
- Automatic Rationale Tracker: บันทึกเหตุผลและบริบทของการเลือก Mode หรือ Tool ตามขอบเขตที่ implementation รองรับ
- Code Intelligence Evidence: บันทึกการวิเคราะห์โครงสร้างและผลกระทบของการเปลี่ยนแปลงโค้ด
- Tool Integrity Verification: ตรวจสอบ Schema และข้อกำหนดของ Tool ก่อนดำเนินการ

2. Governance Registry

ไฟล์และโมดูลที่ระบุในโครงการ:

- "lib/multi-provider-audit.ts"
- "lib/governance-ledger.ts"
- "lib/governance-registry.ts"

ระบบเหล่านี้มีเป้าหมายเพื่อสนับสนุนการตรวจสอบการทำงาน การตัดสินใจ และการเปลี่ยนแปลงของระบบ

«Hash Chaining ช่วยให้ตรวจจับการแก้ไขข้อมูลย้อนหลังได้ แต่ไม่ได้ทำให้ข้อมูล Immutable โดยอัตโนมัติ การรับรองความไม่สามารถแก้ไขย้อนหลังต้องพิจารณาสิทธิ์การเขียน การจัดเก็บ การควบคุมกุญแจ และการตรวจสอบภายนอกเพิ่มเติม»

3. Observability

ระบบมีแนวทางสำหรับการแสดงข้อมูลสถานะและ Telemetry เช่น:

- GPU / VRAM หากมีแหล่งข้อมูลรองรับ
- Network Latency
- Tokens per Second
- Request / Trace Logs
- Evidence Records

การแสดงผลแต่ละรายการขึ้นอยู่กับ Runtime, Provider และ Telemetry Source ที่เชื่อมต่ออยู่ ไม่ควรถือว่าทุกค่าใช้งานได้ในทุกสภาพแวดล้อม

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p><a id="architecture"></a>

🧭 System Architecture

<p align="center">
  <img src="public/zyntheor-architecture.svg" alt="ZYNTHEOR AI ENGINE Architecture" width="840" />
</p>4-Tier Engineering Architecture

Tier 1 — Client Workspace UI

Technology: React 19, Vite, TypeScript, Tailwind CSS, Recharts และ D3.js ตามองค์ประกอบที่ใช้งานในโครงการ

ความสามารถหลัก:

- Workspace และ Chat
- Team Governance
- Code Intelligence
- AST Dependency Visualization
- Prompt Forge
- Diff View และ Code Review
- Diagnostics และ Settings

Tier 2 — Backend Security Gateway

Technology: Express 5 และ Node.js

ขอบเขตความรับผิดชอบ:

- API Gateway และ Request Validation
- Authentication และ Session Management
- Authorization และ Role Enforcement
- CSRF Protection
- Secret Isolation
- Human Approval Gate
- Workspace และ Tenant Boundary
- Execution Policy Enforcement

Network Binding

ตัวอย่างค่า Local Development:

HOST=127.0.0.1
ZYNTHEOR_LOCAL_ONLY=true

การ Bind กับ Loopback ช่วยจำกัดการเข้าถึงผ่าน Network Interface แต่ไม่ใช่สิ่งเดียวกับ Air-Gapped Isolation

Tier 3 — AI Inference & Tool Gateway

ระบบรองรับแนวทางการเชื่อมต่อ AI Provider ตาม configuration และ consent policy:

- Local Ollama: เชื่อมต่อ Local Model Runtime เมื่อมีการติดตั้งและเปิดใช้งาน
- Google Gemini: Remote Provider ที่ต้องผ่าน Consent Gate
- Code Intelligence: วิเคราะห์โครงสร้าง Source Code และ AST
- Tool Verification: ตรวจสอบคำขอ Tool ก่อนดำเนินการ
- Human Approval: บังคับใช้การอนุมัติในงานที่มีผลกระทบสูง

Important Network Distinction

Mode| Meaning
Local Inference| ประมวลผลโมเดลบนเครื่องหรือ Runtime ภายใน
Local-First| ให้ความสำคัญกับการประมวลผลภายในก่อน
Local-Only| จำกัดการใช้งานให้เป็นไปตามนโยบาย Local-Only
Network-Isolated| มีมาตรการจำกัดหรือแยก Network ที่ตรวจสอบได้
Air-Gapped| ไม่มีการเชื่อมต่อเครือข่ายภายนอกตามขอบเขตที่กำหนดและผ่านการตรวจสอบ

การใช้ Ollama หรือ Local Model ไม่ได้พิสูจน์ว่าแอปทั้งหมดทำงานแบบ Offline 100% หรือเป็น Air-Gapped

Tier 4 — Evidence & Storage Layer

องค์ประกอบที่เกี่ยวข้อง:

- SHA-256 Evidence Records
- Hash-Chained Audit Data
- "FILE_MANIFEST.sha256"
- Tenant-Segregated Storage
- Atomic Write และ File Lock ตาม implementation
- Backup / Restore Verification

การแยก Tenant และการป้องกัน Race Condition ต้องผ่านการทดสอบกับ Storage Backend จริงก่อนอ้างว่าได้รับการรับรองในระดับ Production

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>🧩 System Modules & Workspace Features

<details>
<summary><b>แสดง/ซ่อนรายละเอียดโมดูล</b></summary>1. Workspace

- Chat: สนทนาสำหรับงานวิศวกรรมซอฟต์แวร์ รองรับโหมด Auto, Plan และ Code ตาม implementation
- Projects: จัดการโครงการและติดตามความคืบหน้า
- Plans: จัดลำดับงานและแยก Facts ออกจาก Hypotheses
- Files: สำรวจโครงสร้างไฟล์ตามสิทธิ์และขอบเขต Workspace

2. Intelligence & Models

Prompt Forge 0.9 PRO

องค์ประกอบที่ระบุไว้:

- Prompt Optimizer
- Rubrics Analyzer
- Few-Shot Builder
- Variable Simulator
- Test Bench

Models & Architecture

- ตรวจสอบ Model Endpoint
- เชื่อมต่อ Local Ollama
- ตั้งค่า Google Gemini API
- แสดง Dependency Graph ด้วย D3.js ตามข้อมูลที่ระบบวิเคราะห์ได้

Interactive Module Exploration

ข้อมูลที่อาจแสดงเมื่อเลือกโมดูล:

- Direct Internal Imports
- External Dependencies
- Reverse Imports (Imported By)

ข้อมูลดังกล่าวขึ้นอยู่กับความสามารถของ Code Intelligence และความสมบูรณ์ของการวิเคราะห์ Source Code

3. Trust & Diagnostics

- Audit Ledger
- Evidence Inspection
- Server Diagnostics
- Runtime Health
- GPU / VRAM เมื่อมี Telemetry Source
- HTTP Latency
- Local Inference Diagnostics

4. System Settings

- Local-First / Local-Only Policy
- Online Consent
- API Key Configuration
- Session และ Access Control
- Runtime Configuration

</details><p align="center"><img src="public/divider.svg" alt="" width="100%" /></p><a id="team-governance"></a>

👥 Team Governance & Access Control

ระบบ Team Management มีเป้าหมายเพื่อจัดการสมาชิก บทบาท และขอบเขตสิทธิ์ภายใน Workspace หรือ Tenant

1. Role Model

Role| Responsibility| Design Color
OWNER| เจ้าของ Workspace และผู้กำกับดูแลระดับสูงสุด| "#14B8A6"
ADMIN| จัดการสมาชิกและการตั้งค่าที่ได้รับอนุญาต| "#38BDF8"
DEVELOPER| ทำงานด้านพัฒนาและวิศวกรรมตาม Permission| "#0D9488"
MEMBER| สมาชิกทั่วไปตาม Permission ที่กำหนด| "#2DD4BF"
VIEWER| อ่านและตรวจสอบข้อมูลตามสิทธิ์| "#94A3B8"

«Role ในตารางเป็นคำอธิบายเชิงผลิตภัณฑ์ ไม่ได้ยืนยันว่า Database Role, API Role และ UI Display Role ใช้ชื่อหรือสิทธิ์ตรงกันทั้งหมด ต้องอ้างอิง Server-Side Authorization เป็นหลัก»

2. Role Distribution

องค์ประกอบ UI ที่ระบุไว้:

- Donut Chart
- Bar Chart
- Role Summary Cards
- Interactive Tooltips
- Zero-State Handling
- Tenant-Scoped Member Summary

จำนวนสมาชิกและสัดส่วนต้องมาจากข้อมูลสมาชิกจริงของ Tenant ปัจจุบัน ไม่ใช้ข้อมูลจำลองแทนผลจริง

3. Member Management & Server-Side Authorization

API ที่ระบุในโครงการ:

GET   /api/auth/members
PATCH /api/auth/members/:id/role
POST  /api/auth/members/invite

ข้อกำหนดด้านความปลอดภัย:

- ตรวจสอบ Session ฝั่ง Server
- บังคับใช้ Role-Based Authorization
- ป้องกันการปลอมแปลง Role จาก Client
- ตรวจสอบ CSRF
- ป้องกันการจัดการสมาชิกข้าม Tenant
- บันทึกเหตุการณ์สำคัญลง Audit Ledger

ตามข้อกำหนดการจัดการสมาชิกที่รายงานไว้ การเชิญสมาชิกจำกัดสิทธิ์ผู้ดำเนินการเป็น OWNER หรือ ADMIN และบทบาทที่กำหนดให้เชิญได้คือ ADMIN, DEVELOPER, MEMBER และ VIEWER ส่วน OWNER ต้องผ่านกระบวนการ Ownership Transfer แยกต่างหาก

4. Search & Export

ความสามารถที่รายงานไว้:

- ค้นหาสมาชิกด้วยชื่อ อีเมล ID และ Role
- ค้นหาแบบไม่แยกตัวพิมพ์เล็ก/ใหญ่
- Export CSV
- UTF-8 BOM
- RFC 4180-compatible escaping

การ Export ต้องรักษาขอบเขต Tenant และควรมีมาตรการป้องกัน CSV Formula Injection ก่อนนำข้อมูลไปเปิดใน Spreadsheet

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>📱 Screenshots

«ยังไม่มีภาพหน้าจอจริงที่แนบไว้ในเอกสารฉบับนี้ กรุณาเพิ่มภาพจากแอปที่ทำงานจริงใน "docs/screenshots/" ก่อนเปิดใช้งานส่วนนี้ ห้ามใช้ Mockup หรือภาพจำลองเป็นหลักฐานของ UI จริง»

<!--
<p align="center">
  <img src="docs/screenshots/chat.png" alt="ZYNTHEOR Chat Workspace" width="260" />
  <img src="docs/screenshots/architecture.png" alt="Architecture Dependency Graph" width="260" />
  <img src="docs/screenshots/audit-ledger.png" alt="Evidence Audit Ledger" width="260" />
</p>
--><p align="center"><img src="public/divider.svg" alt="" width="100%" /></p><a id="installation"></a>

🛠️ Installation & Local Operations

Prerequisites

- Node.js: 22.x
- Package Manager: npm 10+
- Local AI Provider: Ollama (Optional; required only for the corresponding Local Inference workflow)
- Operating System: ระบบปฏิบัติการที่รองรับ Node.js 22 และ dependencies ของโครงการ

ตรวจสอบเวอร์ชันก่อนเริ่ม:

node --version
npm --version

Development Setup

# 1. Install dependencies
npm install

# 2. Create local environment configuration
cp .env.example .env

# 3. Review environment variables before starting
# Do not commit secrets or API keys.

# 4. Start development server
npm run dev

หาก Development Server ใช้ Port 3000 สามารถเปิดผ่าน:

http://localhost:3000

ตรวจสอบ Port และ Host จาก Runtime Configuration ของสภาพแวดล้อมที่ใช้งานจริง

Quality Gates

# TypeScript validation
npm run typecheck

# Verify SHA-256 manifest
node scripts/check-manifest.js

# Run project tests
npm run test

# Build production bundle
npm run build

«คำสั่งเหล่านี้เป็นคำสั่งสำหรับตรวจสอบระบบ ไม่ใช่ผลยืนยันล่วงหน้าว่าทุกคำสั่งจะผ่านในทุกสภาพแวดล้อม»

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p><a id="security"></a>

🔒 Security & Governance Policy

ZYNTHEOR ใช้แนวทาง Security-First และ Fail-Closed โดยให้ความสำคัญกับการจำกัดสิทธิ์ การป้องกันข้อมูลสำคัญ และการตรวจสอบการทำงาน

Core Security Principles

- Local-First: ให้ความสำคัญกับการประมวลผลภายในตาม Runtime Configuration
- Consent-Gated Remote Calls: การเรียก Remote Provider ต้องผ่าน Consent Policy
- Secret Isolation: API Keys และ Secrets ต้องไม่ถูกส่งไปยัง Browser Client
- Human Approval: การกระทำที่มีผลกระทบสูงต้องผ่าน Human Approval ตาม Policy
- Tenant Isolation: ข้อมูลและการดำเนินการต้องอยู่ภายใน Tenant Boundary
- Fail Closed: เมื่อไม่สามารถตรวจสอบเงื่อนไขด้านความปลอดภัยได้ ระบบควรปฏิเสธการดำเนินการ
- Auditability: เหตุการณ์สำคัญควรมีหลักฐานสำหรับตรวจสอบย้อนหลัง

Local-Only Configuration

ตัวอย่างการตั้งค่า:

HOST=127.0.0.1
ZYNTHEOR_LOCAL_ONLY=true

การ Bind กับ "127.0.0.1" จำกัดการรับการเชื่อมต่อผ่าน Loopback Interface ของเครื่องนั้น แต่ไม่ได้รับรองว่า Process อื่นหรือระบบปฏิบัติการจะไม่มี Network Access

สำหรับ Hosted Preview หรือ Remote Development Environment การใช้ "HOST=0.0.0.0" จะทำให้บริการรับการเชื่อมต่อผ่าน Network Interfaces เพิ่มขึ้น จึงต้องตรวจสอบ Authentication, Authorization, Firewall, TLS และ Network Policy ก่อนใช้งาน

ห้ามตีความ Local-Only Configuration ว่าเป็น Air-Gapped Security Certification

Security Documentation

- "Security Policy" (./SECURITY.md)
- "Contributing Guidelines" (./CONTRIBUTING.md)

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>📋 Engineering Roadmap & Audit References

P4–P10

เอกสารอ้างอิงหลักสำหรับการตรวจสอบและแผนงาน:

- P4–P10 Audit & Plan: ""docs/roadmap/ZYNTHEOR_CORE_X_P4_P10_AUDIT_AND_PLAN.md"" (./docs/roadmap/ZYNTHEOR_CORE_X_P4_P10_AUDIT_AND_PLAN.md)
- Identity Storage Hardening: ""docs/audit/IDENTITY_STORAGE_HARDENING_2026-11-03.md"" (./docs/audit/IDENTITY_STORAGE_HARDENING_2026-11-03.md)

P11–P20

Phase| Engineering Focus
P11| Cognitive Reasoning
P12| Persistent Memory
P13| Multi-Agent Orchestration
P14| Evaluation
P15| Governed Self-Improvement
P16| Native Training
P17| Native Inference
P18| Model Evolution
P19| Sovereign Infrastructure
P20| Integrated Release Gate

สถานะของแต่ละ Phase ต้องอ้างอิง Evidence และ Acceptance Criteria ของ Phase นั้น ห้ามอนุมานว่า Phase ก่อนหน้าที่ผ่านการทดสอบจะทำให้ Phase ถัดไปผ่านโดยอัตโนมัติ

Release Governance

การ Release ต้องผ่านเงื่อนไขที่เกี่ยวข้อง เช่น:

- Required Tests
- TypeScript Validation
- Production Build
- Security Checks
- Data Integrity
- Model Provenance (เมื่อมีการเปลี่ยนแปลงโมเดล)
- Human Approval
- Release Gate Verification

หากเงื่อนไขสำคัญไม่ครบ สถานะ Release ต้องคงเป็น "BLOCKED" หรือสถานะที่สะท้อนข้อจำกัดจริง

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p><a id="contribution"></a>

🤝 Contributing

ยินดีรับการมีส่วนร่วมในการพัฒนา ZYNTHEOR AI ENGINE ภายใต้แนวทาง:

- Security First
- Zero-Mock
- Evidence-Based Changes
- Least Privilege
- Human-in-the-Loop
- Regression Testing
- Zero-Purple Design Discipline

ก่อนส่ง Pull Request ควรตรวจสอบ:

1. ขอบเขตของการเปลี่ยนแปลง
2. ผลกระทบต่อระบบเดิม
3. TypeScript และ Build
4. Unit และ Integration Tests ที่เกี่ยวข้อง
5. Security และ Tenant Isolation
6. Documentation และ Evidence

อ่านรายละเอียดเพิ่มเติมที่ ""CONTRIBUTING.md"" (./CONTRIBUTING.md)

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p>📄 License & Attribution

Distributed under the GNU Affero General Public License v3.0 (AGPL-3.0)

Third-party libraries, pretrained model bases, datasets และ external components ต้องคง Attribution, License Notice และ Provenance ตามเงื่อนไขของเจ้าของผลงานแต่ละรายการ

การกล่าวถึง First-Party AI Independence ไม่ได้หมายความว่า Third-Party Components ที่ใช้อยู่ในปัจจุบันกลายเป็นเทคโนโลยีที่ ZYNTHEOR พัฒนาขึ้นเอง

<p align="center"><img src="public/divider.svg" alt="" width="100%" /></p><p align="center">
  <img src="public/zyntheor-footer.svg" alt="ZYNTHEOR AI ENGINE · Buffalo Edition" width="840" />
</p>
