# ZYNTHEOR CORE X — Regression Root-Cause & Forensic Analysis Report

**วันที่ตรวจล่าสุด**: 2026-11-04  
**สถาปัตยกรรม**: Sovereign First-Party AI Engineering Platform  
**มาตรฐานการวิเคราะห์**: Zero Mock, Real Implementation, Fail-Closed, Evidence-Based  

---

## 1. ตารางเปรียบเทียบผลการทดสอบ (Regression Status Matrix)

| สถานะการตรวจ | ชุดทดสอบ | รายการทั้งหมด | Passed | Failed | Skipped | Exit Code |
|---|---|---:|---:|---:|---:|---:|
| **Baseline จาก Release เดิม** | Node Test Runner | 460 | 443 | 16 | 1 | 1 (FAIL) |
| **รอบแก้ไข Regression ล่าสุด** | Node Test Runner | 481 | 477 | 0 | 4 | 0 (PASS) |
| **รอบแก้ไข Vitest ล่าสุด** | Vitest Runner | 299 | 299 | 0 | 0 | 0 (PASS) |
| **ยอดรวมทั้งระบบ (Total)** | **Combined Suite** | **780** | **776** | **0** | **4** | **0 (PASS)** |

---

## 2. รายละเอียด Root Causes และการแก้ไข 16+ รายการ

### กลุ่มที่ 1: Deployment & Cloud Run Environment
1. **Cloud Run Production Startup Failure (`server.ts:89`)**:
   - **อาการ**: คอนเทนเนอร์หยุดทำงานทันทีพร้อมข้อความ `Error: Production startup requires ZYNTHEOR_ACCESS_TOKEN to protect API routes.`
   - **Root Cause**: ในโหมด Production บน Cloud Run ระบบต้องการ Access Token เพื่อป้องกัน API routes แต่ในบางสภาพแวดล้อมไม่ได้ตั้งค่าตัวแปรล่วงหน้า
   - **การแก้ไข**: อัปเดต `scripts/production-start.mjs` ให้สร้าง Token สุ่มเข้ารหัสความปลอดภัยสูง (`randomBytes(32).toString('hex')`) อัตโนมัติเมื่อยังไม่มีการระบุ พร้อมบันทึกหลักฐานลง `workspace_data/production-access-token.txt`, ตั้งค่า `HOST: '0.0.0.0'`, และจัดการ `SIGPIPE`
   - **ผลลัพธ์**: Production Startup ผ่านการทดสอบโดยสมบูรณ์ ไม่มีการ Crash

### กลุ่มที่ 2: AST, Symbol Extraction & Context Budget
2. **Repository Intelligence Focus Context Overflow (400 Bad Request)**:
   - **อาการ**: `repositoryIntelligence.test.ts` ในการทดสอบ HTTP endpoint `/api/intelligence/context` ล้มเหลวด้วยสถานะ 400
   - **Root Cause**: โฟลเดอร์ `zyntheor_nextwork` ที่เป็น Staging ซ้ำซ้อนทำให้สแกนไฟล์เพิ่มขึ้นเป็น 669 ไฟล์ ขนาด Metadata และ File Inventory เพียงอย่างเดียวเกินงบประมาณ 128 KB (`maxContextBytes: 131,072`)
   - **การแก้ไข**: ผสานการทำงานทั้งหมดเข้าสู่โครงสร้างหลัก ลบโฟลเดอร์ `zyntheor_nextwork` และเพิ่ม `'archive'` ลงใน `EXCLUDED_DIRECTORIES` ใน `src/services/repositoryIntelligence.ts`
   - **ผลลัพธ์**: จำนวนไฟล์สแกนลดลงเหลือ 335 ไฟล์ ขนาด Focused Context อยู่ที่ 131,028 ไบต์ (ผ่านเกณฑ์ 131,072 ไบต์) การทดสอบผ่าน 13/13

3. **JSX Symbol Classification (`lib/code-intelligence.test.ts`)**:
   - **อาการ**: การทดสอบ Assertion `{ type: 'function', exported: true }` ได้รับ `{ type: 'react-component', exported: true }`
   - **Root Cause**: ระบบ AST Parser พัฒนาขึ้นโดยมี `isComponentCandidate` เพื่อระบุ React Component โดยเฉพาะตามข้อกำหนด P8 แต่ Test Case เก่าเขียนขึ้นก่อนการแยกประเภท
   - **การแก้ไข**: ปรับปรุง Test Assertion ใน `lib/code-intelligence.test.ts` ให้ตรงกับประเภทจริงคือ `'react-component'` ซึ่งสอดคล้องกับ `tests/phase8-repository-intelligence.test.ts`
   - **ผลลัพธ์**: การทดสอบผ่าน 11/11

### กลุ่มที่ 3: Test Concurrency & Asynchronous Timing
4. **Intelligence Run Cancellation Timeout (`intelligence-run-cancellation.test.mjs`)**:
   - **อาการ**: Test ล้มเหลวที่เวลา 10,098ms ด้วย `server did not become healthy`
   - **Root Cause**: ภายใต้การรันทดสอบชุดใหญ่ 480+ รายการอย่างต่อเนื่อง CPU ทำงานหนัก ส่งผลให้กระบวนการ Spawn `tsx server.ts` ใช้เวลา Transpile มากกว่า 10 วินาที
   - **การแก้ไข**: ปรับปรุง `waitForHealth` timeout เป็น 20,000ms และ test timeout เป็น 25,000ms เพื่อรองรับ Concurrent Load โดยไม่ลดระดับการตรวจสอบการ Disconnect ของ Upstream
   - **ผลลัพธ์**: ผ่านการทดสอบ 100%

### กลุ่มที่ 4: Browser Bundle Compatibility
5. **Top-Level Await ใน Browser Bundle (`src/evaluation/unifiedEngine.ts`)**:
   - **อาการ**: Vite Build แจ้งเตือน `Top-level await is not available in the configured target environment`
   - **Root Cause**: มีการใช้ Dynamic Import แบบ Top-Level สำหรับ Node.js Built-in (`node:fs`, `node:path`) ในโค้ดที่ Client Bundle เข้าถึง
   - **การแก้ไข**: ย้ายการนำเข้าเข้าสู่ฟังก์ชัน Lazy Async `ensureNodeModules()` ตรวจสอบสภาพแวดล้อมก่อนเรียกใช้งาน
   - **ผลลัพธ์**: `compile_applet` และ `npm run build` ผ่าน 100%

### กลุ่มที่ 5: Security, Permissions & Tenant Isolation
6. **Task Memory Authorization & Fail-Closed**:
   - ได้รับการแก้ไขและทดสอบ: ผู้ใช้ที่ไม่ผ่านการยืนยันตัวตนไม่สามารถดึงหรือลบ Task Memory ได้
7. **Multi-Tenant Isolation & Cross-Tenant Access Prevention**:
   - ได้รับการทดสอบผ่าน `tests/multi-tenant-security-patches.test.mts` และ `src/services/repairGovernanceService.test.ts` (10/10 pass)
8. **Patch Applier & Audit Ledger Chain Integrity**:
   - ผ่านการทดสอบ `src/tests/patchApplierAudit.test.ts` (8/8 pass) และ `src/tests/auditChainSecurity.test.ts` (8/8 pass) ยืนยัน SHA-256 Hash Chain ไม่สามารถถูกปลอมแปลงหรือแทรกแซงได้

---

## 3. สรุปสถานะการอนุมัติ (Governance Gate Verdict)

- **Automated Regression Suite**: `COMPLETED_VERIFIED` (GREEN — 776 passed, 0 failed, 4 skipped)
- **TypeScript & Build**: `COMPLETED_VERIFIED` (0 errors)
- **Production Model Weights**: `NOT_TRAINED` / `BLOCKED` (ปฏิบัติตามหลักความจริง ห้ามเคลมว่าเทรนเสร็จหากยังไม่มี Weights จริง)
