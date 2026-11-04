ZYNTHEOR AI ENGINE 0.3

IMPLEMENTATION PLAN & BASELINE AUDIT

ชื่อโครงการ: Cross-Layer Root Cause Intelligence & Trust/Safety Systems
แนวทาง: Thai-First · Evidence-Based · Zero-Mock · Security-First
ขอบเขต: Baseline Audit, Audit Ledger Integrity, Intelligent Debugging และ Cross-Layer Root Cause Intelligence

---

1. MISSION & OBJECTIVES

เป้าหมายของ ZYNTHEOR AI ENGINE 0.3 คือยกระดับความสามารถด้านการตรวจสอบความถูกต้องของระบบ การวิเคราะห์สาเหตุของปัญหา และการรักษาความน่าเชื่อถือของหลักฐานทางวิศวกรรม

ระบบต้องสามารถ:

1. ตรวจสอบสถานะ Repository และระบบที่มีอยู่จริง
2. วิเคราะห์ความสัมพันธ์ระหว่าง Frontend, Backend, Services และ Storage
3. เชื่อมโยง Test Failures กับ Source Code และ Dependencies
4. ติดตาม Request Flow เมื่อมี Instrumentation รองรับ
5. ตรวจสอบความถูกต้องของ Audit Ledger
6. ระบุ Root Cause โดยอ้างอิงหลักฐาน
7. แยกข้อเท็จจริง สมมติฐาน และข้อมูลที่ยังไม่ทราบ
8. เสนอแนวทางแก้ไขโดยไม่เปลี่ยนแปลงข้อมูลหรือประวัติหลักฐานโดยไม่ได้รับอนุมัติ

หลักการสำคัญ: ระบบต้องไม่สร้างผลตรวจสอบ PASS, Hash, Dependency, Execution Trace หรือ Root Cause ขึ้นมาเองเพื่อทำให้รายงานดูสมบูรณ์

---

2. USER REVIEW & IMPLEMENTATION STATUS

2.1 LocalStorage Diagnostic Tool

ตำแหน่งที่ระบุ:

"src/components/LocalStorageAuditTool.tsx"

ตำแหน่ง UI:

Diagnostics → Storage Schema Audit

สถานะตามรายงานที่ได้รับ:

"COMPLETED_REPORTED"

ความสามารถที่รายงานว่ามี:

- ตรวจสอบ LocalStorage Schema
- ตรวจสอบ JSON Syntax
- ตรวจสอบโครงสร้างข้อมูล
- แสดงรายการ Storage Keys
- Export ข้อมูล
- Reset หรือ Purge ข้อมูล

ข้อกำหนดการตรวจสอบเพิ่มเติม:

- ตรวจสอบว่าแต่ละ Schema มี Validator จริง
- แยก Invalid JSON ออกจาก Invalid Schema
- ตรวจสอบ Version Compatibility
- ตรวจสอบการจัดการข้อมูลที่ไม่รู้จัก
- ตรวจสอบ Export และ Import Integrity
- แสดงจำนวนรายการที่ตรวจสอบจริง
- ห้าม Reset หรือ Purge โดยไม่มีการยืนยันจากผู้ใช้
- ต้องมีคำเตือนและทางเลือกสำรองข้อมูลก่อนการลบ
- ต้องไม่ลบข้อมูลของ Workspace หรือ Tenant อื่น
- ต้องมีหลักฐานว่าการดำเนินการสำเร็จจริง

การตรวจสอบ Tool นี้ต้องไม่ถือว่าผ่านเพียงเพราะ Component แสดงผลได้

2.2 Audit Ledger Integrity Dashboard

ไฟล์เป้าหมาย:

- "src/components/AuditChainVisualizer.tsx"
- "src/services/auditLedger.ts"

สถานะ:

"PROPOSED — NOT YET VERIFIED"

เป้าหมายคือสร้างหน้าตรวจสอบสุขภาพ Audit Ledger โดยไม่ทำลายหลักฐานเดิม

2.3 Intelligent Debugging Test-to-Dependency Mapping

ไฟล์เป้าหมาย:

"src/components/IntelligentDebugging.tsx"

ระบบต้องเชื่อมโยงผลทดสอบกับ Dependencies ของ Source Code จริง โดยอาศัย Repository Intelligence ที่มีอยู่

สถานะ:

"PROPOSED — NOT YET VERIFIED"

---

3. PHASE 0 — READ-ONLY BASELINE AUDIT

3.1 Repository Baseline

ก่อนแก้ไข Source Code ให้ตรวจสอบ:

- Git Root
- Current Branch
- HEAD Commit
- Git Status
- Staged Changes
- Unstaged Changes
- Untracked Files
- Existing Audit Reports
- Existing Test Reports
- Existing Local Modifications

ห้ามสันนิษฐานว่าไฟล์ที่ Modified เป็นส่วนหนึ่งของงาน 0.3 ทั้งหมด

ห้ามใช้คำสั่งที่อาจทำลายหรือย้อนกลับข้อมูลเดิม:

- "git reset"
- "git clean"
- "git restore"
- "git checkout"
- "git stash"

ห้าม Commit หรือ Push โดยไม่ได้รับอนุมัติ

3.2 Baseline Test Results

ตัวเลขต่อไปนี้เป็นข้อมูลจากรายงานที่ได้รับ ไม่ใช่ผลทดสอบที่ยืนยันโดยการตรวจสอบอิสระ:

Test Suite| รายงานผล| สถานะ
Node Test Runner| 384 passed, 1 skipped| NOT_INDEPENDENTLY_VERIFIED
Vitest| 32 test files, 252 tests passed| NOT_INDEPENDENTLY_VERIFIED
TypeScript| 0 errors| NOT_INDEPENDENTLY_VERIFIED
LocalStorage Audit| 14 schemas| NOT_INDEPENDENTLY_VERIFIED

ก่อนประกาศ PASS ต้องบันทึก:

- คำสั่งที่ใช้
- วันและเวลาทดสอบ
- Exit Code
- จำนวน Tests ที่ผ่าน
- จำนวน Tests ที่ล้มเหลว
- จำนวน Tests ที่ถูก Skip
- Test Files ที่เกี่ยวข้อง
- ข้อผิดพลาดและคำเตือน

ห้ามรวมจำนวน Tests จากคนละ Test Runner โดยไม่แสดงที่มา

3.3 Existing Architecture Discovery

ตรวจสอบระบบจริงก่อนพัฒนา:

FRONTEND
  ├── App.tsx
  ├── Diagnostics
  ├── LocalStorageAuditTool
  ├── AuditChainVisualizer
  └── IntelligentDebugging

BACKEND
  ├── server.ts
  ├── Authentication
  ├── Authorization
  ├── RBAC
  ├── Tenant Isolation
  └── API Routes

SERVICES
  ├── auditLedger
  ├── authorizationService
  ├── tenantScopedStorage
  ├── repositoryIntelligence
  ├── safeExecutor
  └── projectAwareDebugger

แผนภาพนี้เป็น Architecture ที่ต้องนำไปตรวจสอบ ไม่ใช่หลักฐานว่าทุก Module มีอยู่หรือเชื่อมต่อกันแล้ว

ต้องบันทึกไฟล์จริงและความสัมพันธ์ที่ตรวจพบ

---

4. FEATURE A — AUDIT LEDGER INTEGRITY & FORENSIC DASHBOARD

4.1 Mission

พัฒนาหน้าตรวจสอบความสมบูรณ์ของ Audit Ledger เพื่อให้ผู้ใช้สามารถตรวจพบ:

- Hash Mismatch
- Broken Chain
- Missing Events
- Invalid Previous Hash
- Invalid Event Signature
- Duplicate Event Identifier
- Invalid Timestamp
- Unauthorized Ledger Modification

4.2 Integrity Monitor

แสดงข้อมูลจาก Ledger จริง:

- Chain Length
- Genesis Hash
- Latest Event Hash
- Latest Verified Position
- Verification Timestamp
- Integrity Status
- Broken Block Position
- Verification Error

สถานะที่รองรับ:

- "INTACT"
- "TAMPERED"
- "INCOMPLETE"
- "UNVERIFIED"
- "BLOCKED"
- "ERROR"

ห้ามแสดง "INTACT" หากตรวจสอบเพียงบางส่วน

4.3 Forensic Block Inspection

เมื่อเลือก Event ต้องสามารถตรวจสอบ:

- Event ID
- Event Type
- Timestamp
- Previous Hash
- Current Hash
- Payload Digest
- Signature
- Key ID
- Verification Result
- Source Information

ต้องแสดงข้อมูลที่มีอยู่จริงเท่านั้น

ห้ามสร้าง "nanoAt" หรือ Timestamp ความละเอียดสูงขึ้นมาใหม่ หากระบบเดิมไม่มีข้อมูลดังกล่าว

4.4 Critical Security Rule — No Silent Re-Signing

ห้ามใช้ Re-sign หรือ Rebuild เพื่อเขียนทับ Audit History ที่ตรวจพบว่าถูกแก้ไข

การคำนวณ Hash ใหม่จาก Event ที่ไม่ผ่านการตรวจสอบอาจทำให้หลักฐานการดัดแปลงสูญหาย

เมื่อพบ Ledger ที่ผิดปกติ:

1. หยุดการเขียนข้อมูลลง Chain ที่ได้รับผลกระทบ
2. เก็บ Original Ledger ไว้ในรูปแบบ Read-Only
3. คำนวณ Integrity Report โดยไม่แก้ไขข้อมูล
4. ระบุตำแหน่งและประเภทความผิดปกติ
5. สร้าง Incident Record แยกจาก Original Ledger
6. ขออนุมัติจากผู้ใช้หรือผู้ดูแลที่มีสิทธิ์
7. หากต้องกู้คืน ให้ใช้ Trusted Backup หรือ Verified Snapshot
8. บันทึก Recovery Operation เป็น Event ใหม่
9. ตรวจสอบ Ledger หลังการกู้คืน
10. เก็บความเชื่อมโยงกับ Original Evidence ไว้

หากจำเป็นต้องเริ่ม Chain ใหม่ ต้องสร้าง Genesis ใหม่พร้อม Recovery Manifest ที่อ้างอิง Original Ledger และหลักฐานที่ตรวจสอบได้

ห้ามอ้างว่าประวัติเดิมกลับมาน่าเชื่อถือเพียงเพราะ Hash ถูกคำนวณใหม่

4.5 Repair Workflow

Ledger Integrity Check
        ↓
Tampering Detection
        ↓
Read-Only Evidence Preservation
        ↓
Forensic Analysis
        ↓
Recovery Proposal
        ↓
Human Approval
        ↓
Verified Backup / Snapshot Recovery
        ↓
New Recovery Event
        ↓
Post-Recovery Verification
        ↓
Audit Report

ทุกขั้นตอนต้องมีหลักฐานและ Audit Trail

---

5. FEATURE B — INTELLIGENT DEBUGGING & TEST-TO-DEPENDENCY MAPPING

5.1 Mission

เชื่อมโยง Test Results กับโครงสร้าง Source Code เพื่อช่วยวิเคราะห์ว่าความผิดพลาดเกิดจากส่วนใดของระบบ

5.2 Test Status Integration

รับผลทดสอบจาก Test Runner จริง เช่น:

- Vitest
- Node Test Runner
- TypeScript Compiler
- Build Process

แสดง:

- Test Suite
- Test File
- Test Name
- Passed
- Failed
- Skipped
- Error Message
- Stack Trace
- Execution Time
- Test Run Identifier

ต้องแยกผลจากคนละ Test Session

ห้ามนำผลทดสอบเก่ามาแสดงเป็นสถานะปัจจุบัน

5.3 Source Dependency Mapping

เชื่อมโยง Test Files กับ Source Files ผ่านข้อมูลที่ตรวจพบจริง:

- Import / Export Graph
- Symbol References
- Module Dependencies
- Test Imports
- Static Dependency Analysis
- Runtime Trace เมื่อมี Instrumentation

ตัวอย่าง:

Test File
  ├── tenantScopedStorage.test.ts
  │      └── tenantScopedStorage.ts
  │
  ├── authorizationService.test.ts
  │      └── authorizationService.ts
  │
  └── repositoryIntelligence.test.ts
         └── repositoryIntelligence.ts

ตัวอย่างนี้เป็นรูปแบบการนำเสนอเท่านั้น ต้องตรวจสอบชื่อไฟล์และความสัมพันธ์จาก Repository จริงก่อนแสดง

5.4 Failure Correlation

ระบบต้องวิเคราะห์ความสัมพันธ์ระหว่าง:

- Test Failure
- Source File
- Function
- Class
- Import
- Export
- Interface
- API Contract
- Dependency Change

จัดประเภทผลการวิเคราะห์:

- "DIRECT_DEPENDENCY"
- "TRANSITIVE_DEPENDENCY"
- "CONTRACT_MISMATCH"
- "MISSING_EXPORT"
- "MISSING_MODULE"
- "RUNTIME_FAILURE"
- "UNKNOWN"

ห้ามสรุปว่าไฟล์ใดเป็น Root Cause เพียงเพราะมี Dependency เชื่อมโยงกับ Test ที่ล้มเหลว

---

6. CROSS-LAYER ROOT CAUSE INTELLIGENCE

6.1 Architecture

พัฒนาระบบวิเคราะห์ความสัมพันธ์ข้าม Layer:

Frontend Component
        ↓
Frontend Service
        ↓
API Client
        ↓
Backend Route
        ↓
Middleware
        ↓
Authorization Service
        ↓
Application Service
        ↓
Storage / Database
        ↓
External Adapter

ตรวจสอบเฉพาะ Layer ที่มีอยู่จริง

หากไม่มี Layer หรือไม่มีหลักฐานการเชื่อมต่อ ให้ระบุ "UNKNOWN" หรือ "NOT_INSTRUMENTED"

6.2 Phase 1 — Cross-Layer Dependency Graph

ความสามารถ:

- Component-to-Service Mapping
- Service-to-API Mapping
- API-to-Route Mapping
- Route-to-Middleware Mapping
- Middleware-to-Authorization Mapping
- Service-to-Storage Mapping
- External Adapter Mapping

ต้องแยก Static Dependency ออกจาก Runtime Dependency

Static Import ไม่ได้ยืนยันว่ามีการเรียกใช้งานจริงใน Runtime

6.3 Phase 2 — Request Flow Tracing

ติดตาม Request ตั้งแต่ UI ไปจนถึง Backend และ Storage เมื่อระบบมี Instrumentation รองรับ

ข้อมูลที่ควรรองรับ:

- Trace ID
- Request ID
- Parent Span ID
- Timestamp
- Route
- Service
- Execution Status
- Error
- Duration

หากไม่มี Runtime Trace ให้แสดง:

"NOT_INSTRUMENTED"

ห้ามสร้าง Trace จำลองเพื่อแสดงว่า Request ผ่านทุก Layer แล้ว

6.4 Phase 3 — Contract Mismatch Detection

ตรวจสอบความสอดคล้องระหว่าง:

- TypeScript Interfaces
- API Request Types
- API Response Types
- Express Route Handlers
- Runtime Validation Schemas
- Database Contracts

ตรวจจับ:

- Missing Fields
- Incorrect Types
- Optional / Required Mismatch
- Invalid Response Shape
- Missing Runtime Validation
- Inconsistent Error Contracts

ทุก Finding ต้องมี File Path และ Line Reference เมื่อหาได้

6.5 Phase 4 — Root Cause Correlation

จัดระดับหลักฐาน:

Classification| ความหมาย
"VERIFIED_FINDING"| มีหลักฐานโดยตรงจาก Source, AST หรือ Test Execution
"CONFIRMED_CAUSE"| ตรวจสอบ Source และยืนยันความสัมพันธ์กับความผิดพลาดแล้ว
"HYPOTHESIS"| เป็นข้อสันนิษฐานที่ยังต้องทดสอบ
"SAMPLE_ONLY"| ข้อมูลตัวอย่างสำหรับ Isolated Test เท่านั้น
"UNKNOWN"| หลักฐานไม่เพียงพอ

การจัดอันดับ Root Cause ต้องอธิบายหลักฐานที่ใช้ประกอบการตัดสินใจ

ห้ามใช้คะแนนความน่าจะเป็นแทนหลักฐานโดยไม่มีวิธีคำนวณและการประเมินความแม่นยำรองรับ

---

7. SECURITY & ISOLATION REQUIREMENTS

ทุก Feature ต้องปฏิบัติตาม:

7.1 Data Protection

- Tenant Isolation
- Workspace Isolation
- Access Control
- Sensitive Data Protection
- Secret Redaction
- Safe Export
- Controlled Data Purge

7.2 Cryptographic Integrity

- SHA-256 สำหรับ Hash Integrity
- HMAC เมื่อมี Key Management ที่เหมาะสม
- Digital Signature เมื่อมี Trusted Signing Key
- Key Rotation
- Key Revocation
- Signature Verification
- Trusted Genesis Anchor

Hash เพียงอย่างเดียวไม่ใช่หลักฐานยืนยันตัวตนผู้สร้างข้อมูล

ห้ามเก็บ Private Signing Keys ใน Frontend หรือ LocalStorage

7.3 Execution Safety

- Read-Only Baseline Audit
- No Implicit Execution
- Human Approval
- Existing Execution Gateway
- Sandbox Isolation
- Fail-Closed Behavior
- Audit Logging

การวิเคราะห์ Repository ต้องไม่ทำให้เกิดการรันโค้ดโดยอัตโนมัติ

---

8. IMPLEMENTATION PLAN

ดำเนินงานตามลำดับ:

Step 1 — Baseline Audit

- ตรวจ Git Baseline
- ตรวจ Architecture
- ตรวจ Existing Services
- ตรวจ Test Runner
- ตรวจ Audit Ledger
- ตรวจ LocalStorage Tool

ผลลัพธ์:

"BASELINE_AUDIT_REPORT"

Step 2 — Audit Ledger Integrity

- ตรวจ Hash Chain
- ตรวจ Signature
- ตรวจ Genesis Anchor
- เพิ่ม Integrity Status
- เพิ่ม Forensic Inspection
- เพิ่ม Safe Recovery Workflow

ผลลัพธ์:

"AUDIT_LEDGER_INTEGRITY"

Step 3 — Test-to-Dependency Mapping

- เชื่อม Test Runner
- เชื่อม Repository Intelligence
- สร้าง Dependency Matrix
- เชื่อมโยง Failure Evidence
- เพิ่ม Root Cause Classification

ผลลัพธ์:

"INTELLIGENT_DEBUGGING_MAPPING"

Step 4 — Cross-Layer Root Cause Engine

- วิเคราะห์ Layer Relationships
- ตรวจ API Contracts
- เชื่อม Runtime Traces
- วิเคราะห์ Error Propagation
- จัดระดับหลักฐาน

ผลลัพธ์:

"CROSS_LAYER_ROOT_CAUSE_ENGINE"

Step 5 — Integration & Verification

- ตรวจสอบ Backend Integration
- ตรวจสอบ Security
- รัน Regression Tests
- ตรวจสอบ Build
- สร้าง Final Report

---

9. REGRESSION & SECURITY TEST PLAN

9.1 LocalStorage

- Valid Schema
- Invalid JSON
- Invalid Schema
- Unknown Key
- Version Mismatch
- Export Integrity
- Import Integrity
- Unauthorized Purge
- Tenant Isolation

9.2 Audit Ledger

- Valid Chain
- Modified Payload
- Invalid Previous Hash
- Missing Event
- Duplicate Event ID
- Invalid Signature
- Revoked Signing Key
- Unknown Signing Key
- Invalid Genesis
- Interrupted Recovery
- Recovery Without Approval
- Original Evidence Preservation

9.3 Intelligent Debugging

- Test Failure Parsing
- Missing Test File
- Missing Source Module
- Missing Export
- Incorrect Import
- Contract Mismatch
- Transitive Dependency
- Circular Dependency
- Incomplete Dependency Information

9.4 Cross-Layer Tracing

- Valid Static Dependency
- Missing Runtime Instrumentation
- Valid Trace Correlation
- Missing Parent Span
- Invalid Trace ID
- Request Failure
- Middleware Failure
- Authorization Failure
- Storage Failure
- Incomplete Trace

9.5 Security

- Path Traversal
- Symlink Protection
- Tenant Isolation
- Unauthorized Access
- Secret Exposure
- Approval Enforcement
- Audit Integrity

Synthetic Fixtures ใช้ได้เฉพาะ Isolated Tests

ห้ามนำ Test Fixtures มาแสดงเป็น Production Evidence

---

10. VERIFICATION COMMANDS

ตรวจสอบคำสั่งที่มีอยู่ใน "package.json" ก่อนใช้งาน

คำสั่งเป้าหมาย:

npx tsc --noEmit
npx vitest run
npm test

หากมีคำสั่ง Build ที่ถูกต้องใน Project ให้รันตาม Configuration จริง

ข้อกำหนด:

- ห้ามติดตั้ง Package ใหม่โดยไม่ได้รับอนุมัติ
- ห้ามรันคำสั่งที่มี Side Effects ต่อ Manifest หรือ Audit Data โดยไม่ตรวจสอบก่อน
- ห้ามอ้างว่าการ Build ผ่านหากไม่ได้รันจริง
- ห้ามอ้างว่า Tests ผ่านทั้งหมดหากมี Skipped หรือ Failed
- บันทึก Exit Code และ Command Output

---

11. FINAL ENGINEERING REPORT

สร้างรายงาน:

"docs/audit/ZYNTHEOR_0_3_IMPLEMENTATION_AND_BASELINE_AUDIT.md"

เนื้อหาที่ต้องมี:

1. Executive Summary
2. Git Baseline
3. Existing Architecture
4. LocalStorage Audit Results
5. Audit Ledger Integrity Results
6. Test-to-Dependency Mapping
7. Cross-Layer Dependency Analysis
8. Runtime Trace Coverage
9. Contract Mismatch Findings
10. Root Cause Evidence
11. Security Verification
12. Regression Test Results
13. Build Results
14. Files Changed
15. Known Limitations
16. Remaining Blockers
17. Overall Engineering Verdict

ใช้สถานะ:

- "COMPLETED_VERIFIED"
- "IMPLEMENTED_NOT_VERIFIED"
- "PARTIAL"
- "BLOCKED"
- "FAILED"
- "NOT_IMPLEMENTED"
- "NOT_VERIFIED"

ทุก Finding ต้องมีหลักฐาน:

- File Path
- Line Number
- Test Name
- Command Output
- Trace ID
- หรือ Missing Prerequisite

ห้ามใช้คำว่า PASS โดยไม่มีหลักฐานสนับสนุน

---

12. COMPLETION CRITERIA

ZYNTHEOR 0.3 จะถือว่าเสร็จเมื่อ:

1. Baseline Audit มีหลักฐานครบถ้วน
2. LocalStorage Diagnostic Tool ผ่านการตรวจสอบจริง
3. Audit Ledger สามารถตรวจพบ Integrity Violations ได้
4. Recovery ไม่ทำลาย Original Evidence
5. Test-to-Dependency Mapping ใช้ข้อมูล Repository จริง
6. Root Cause Findings อ้างอิงหลักฐานได้
7. Runtime Tracing แยก Instrumented กับ Not Instrumented
8. Security Controls ผ่าน Regression Tests
9. ไม่มี P0/P1 Defect ที่ยังไม่ได้จัดการ
10. Final Engineering Report ตรงกับผลการทำงานจริง

หากข้อใดไม่มีหลักฐาน ให้ระบุ "BLOCKED", "PARTIAL" หรือ "NOT_VERIFIED" ตามความเหมาะสม

---

13. SCOPE & APPROVAL CONTROL

- ทำงานบน Repository เดิม
- ไม่ต้อง zip
- ไม่สร้างโปรเจกต์ใหม่
- ไม่เขียนทับไฟล์โดยไม่ตรวจสอบ
- ไม่ลบข้อมูลหรือประวัติ Audit
- ไม่เปลี่ยน Model Identity
- ไม่ลบ External Provider Integration
- ไม่แก้ Sidebar หรือ CI/CD โดยไม่จำเป็น
- ไม่เริ่ม Model Training
- ไม่ Commit หรือ Push
- ไม่เริ่ม Phase ถัดไปโดยอัตโนมัติ

การเปลี่ยนแปลงที่มีผลต่อข้อมูลจริง การกู้คืน Audit Ledger หรือการแก้ไข Source Code ต้องอยู่ภายใต้ Permission และ Approval ที่เหมาะสม

สถานะ Phase ถัดไป: BLOCKED — AWAITING EXPLICIT USER APPROVAL

---

FINAL PRINCIPLE

ZYNTHEOR ต้องไม่เพียงตรวจพบว่าระบบมีปัญหา แต่ต้องอธิบายได้ว่าปัญหาอยู่ตรงไหน เกิดจากอะไร มีหลักฐานอะไรสนับสนุน และแนวทางแก้ไขมีผลกระทบอย่างไร

ตรวจสอบก่อนสรุป
เก็บหลักฐานก่อนซ่อม
ขออนุมัติก่อนเปลี่ยนแปลง
ยืนยันผลก่อนประกาศว่าสำเร็จ
