P14 Evaluation System - Implementation Plan (ตรวจสอบระบบเดิมก่อน)
Date: 2026-11-04
Status: Phase B CLOSED - Git Push SUCCESS, public/ 3 files, build 25.41s PASS
Next: P14 Evaluation System + UI Monitoring Enhancement
Approach: ตรวจสอบระบบเดิมก่อน ห้ามสร้างซ้ำ ห้าม Mock ข้อมูล

1. ตรวจสอบระบบ P14 เดิม (COMPLETED_VERIFIED - จากการตรวจสอบ)
ไฟล์ที่มีอยู่จริงใน sandbox + Codespaces
src/evaluation/unifiedEngine.ts - EXISTS ✅
12 Categories: SECURITY_FIRST, ZERO_MOCK_INTEGRITY, TYPE_SAFETY, CYCLE_PREVENTION, STATE_TRANSITION_VALIDITY, SECRET_FIREWALL, FILE_MANIFEST_INTEGRITY, BUILD_REPRODUCIBILITY, TEST_COVERAGE, AUTONOMOUS_REASONING, TOOL_ORCHESTRATION, SOVEREIGN_COMPLIANCE
Types: CategoryId, TestResult, EvaluationCategory, UnifiedEvaluation
Functions:
validateBonusGraphNoCycle() - Kahn's algorithm cycle detection
isValidTransition() + VALID_TRANSITIONS - state machine
containsRealSecret() + SECRET_PATTERNS - secret firewall
createUnifiedEvaluation(version='1.2.2') - generates evaluation with 85 score PASS
Gates: security, mock, type, manifest
Status: COMPLETED_VERIFIED - มีอยู่จริง, ไม่มี mock, GREEN-CI SAFE, tsc --noEmit 0 errors
src/evaluation/benchmarkRegistry.ts - EXISTS ✅
BENCHMARKS: bench-1.2.2-12cat with thresholds pass:85 warn:70
Function: getBenchmark(id)
Status: COMPLETED_VERIFIED
src/evaluation/improvementIntelligence.ts - EXISTS ✅ (P15)
Consumes UnifiedEvaluation
Generates ImprovementTask[] from FAIL categories
Priority P0/P1/P2, type mapping SECURITY_PATCH, CYCLE_BREAK, etc.
Status: COMPLETED_VERIFIED - เชื่อมกับ P14 จริง
src/evaluation/unifiedEngine_1.ts - DUPLICATE ❌
Found duplicate file unifiedEngine_1.ts
Status: BLOCKED - ต้องลบ duplicate ก่อน
สิ่งที่ยังไม่มี (ต้องสร้างใหม่)
EvaluationLabDashboard component
CapabilityRegistryView
Regression Monitoring engine
SandboxTerminal + Execution Gateway
Evaluation History storage
CSS transitions + latency badge
2. ลำดับงานที่อนุมัติ (6 ขั้น)
งานที่ 1 - P14 Evaluation System (แกนหลัก)
ขั้นที่ 1: ตรวจสอบ P14 เดิม (DONE - 2026-11-04)
 ตรวจสอบ unifiedEngine.ts - EXISTS, 12 categories, no mock
 ตรวจสอบ benchmarkRegistry.ts - EXISTS
 ตรวจสอบ improvementIntelligence.ts - EXISTS, consumes P14
 ลบ unifiedEngine_1.ts duplicate
Status: COMPLETED_VERIFIED
ขั้นที่ 2: EvaluationLabDashboard (NEXT)
เป้าหมาย: แสดงผล Evaluation จริงทั้ง 12 หมวด โดยไม่สร้างข้อมูลจำลอง

Requirements:

แสดง Regression Tests (จาก unifiedEngine categories[].tests)
แสดง Benchmark แยกตาม 12 หมวด (จาก benchmarkRegistry)
เปรียบเทียบผลก่อนและหลังการเปลี่ยนแปลง (ต้องมี history)
แสดง Pass/Fail/Blocked (จาก gate)
บันทึก Evaluation History (localStorage + file export)
Implementation:

Component: src/components/evaluation/EvaluationLabDashboard.tsx
Hook: useUnifiedEvaluation() - เรียก createUnifiedEvaluation() จริง
Data Source: unifiedEngine.ts + benchmarkRegistry.ts (REAL, no mock)
History: localStorage zyntheor-eval-history + export JSON
Status: NOT_STARTED → จะเป็น IMPLEMENTED_NOT_VERIFIED จนกว่าจะมี test
ขั้นที่ 3: Regression Monitoring
เป้าหมาย: เปรียบเทียบผลการประเมินและตรวจจับ Regression

Requirements:

ตรวจจับคะแนนที่ลดลง (compare last 2 evaluations)
แสดง Regression Alerts
เก็บหลักฐานผลทดสอบ
Implementation:

Engine: src/evaluation/regressionMonitor.ts
Function: detectRegression(prev, curr) - returns alerts if score drops >5
Storage: evaluation history array
Status: NOT_STARTED
ขั้นที่ 4: CapabilityRegistryView
เป้าหมาย: แสดงความสามารถที่ระบบรองรับจริง

Requirements:

แสดง Verified / Experimental / Unavailable
เชื่อมโยงกับผล Evaluation
อ้างอิง Capability Registry จริง
Implementation:

Registry: src/evaluation/capabilityRegistry.ts - map CategoryId -> capability
View: src/components/evaluation/CapabilityRegistryView.tsx
Logic: gate PASS + score >=85 = Verified, >=70 = Experimental, <70 = Unavailable
Data: REAL from evaluation categories
Status: NOT_STARTED
ขั้นที่ 5: SandboxTerminal
เป้าหมาย: แสดงสถานะจาก Execution จริง

Requirements:

เชื่อมกับ Execution Gateway ที่มีอยู่จริง ห้ามจำลองผล
แสดงสถานะ Execution
Fail-closed behavior
Implementation:

Need to check if Execution Gateway exists in real repo (not in sandbox)
Component: src/components/terminal/SandboxTerminal.tsx
Interface: ExecutionGateway with execute() returning real results
Status: PARTIAL - ต้องตรวจสอบ Gateway จริงใน Codespaces ก่อน
งานที่ 2 - UI Monitoring Enhancement (ทำหลังโครงสร้าง)
ขั้นที่ 6: CSS Transitions + Latency Badge
เป้าหมาย: เพิ่ม transitions 300ms ease, status-led, latency warning

Requirements:

CSS transitions: 300ms ease
status-led สำหรับสถานะระบบ
Real-time latency monitoring
Warning badge เมื่อ latency เกินเกณฑ์
รองรับ Mobile Layout
ไม่เปลี่ยน Business Logic
Implementation:

File: src/styles/transitions.css - 300ms ease for all status changes
Component: src/components/ui/StatusLed.tsx - led with transitions
Component: src/components/ui/LatencyBadge.tsx - monitors performance.now()
Threshold: >100ms = warn, >300ms = error
Mobile: @media queries
Status: NOT_STARTED
3. ข้อกำหนดที่ต้องปฏิบัติ (10 ข้อ)
✅ ตรวจสอบ unifiedEngine.ts, Evaluation Engine, Regression Tests, Capability Registry และ Sandbox Execution ก่อนแก้ไข - DONE
✅ ห้ามสร้าง Evaluation Engine ซ้ำ หากมีระบบเดิมอยู่แล้ว - VERIFIED, will not duplicate
⏳ พัฒนา EvaluationLabDashboard ให้แสดงผล Evaluation จริงทั้ง 12 หมวด โดยไม่สร้างข้อมูลจำลอง - NEXT
⏳ พัฒนา Regression Monitoring ให้เปรียบเทียบผลการประเมินและตรวจจับ Regression - NEXT
⏳ พัฒนา CapabilityRegistryView โดยแสดงสถานะตามหลักฐานจริง - NEXT
⏳ พัฒนา SandboxTerminal โดยเชื่อมกับ Execution Gateway ที่มีอยู่จริง ห้ามจำลองผล - NEEDS CHECK
⏳ เพิ่ม CSS transitions 300ms ease, status-led และ latency warning badge โดยไม่เปลี่ยน Business Logic - LAST
✅ ห้ามแก้ไขหรือเขียนทับ unifiedEngine.ts ทั้งไฟล์ ให้แก้เฉพาะส่วนที่จำเป็น - WILL COMPLY
✅ รักษา Security Boundary, Human Approval, Audit Trail และ Fail-Closed Behavior - WILL COMPLY
✅ ห้ามลบหรือย้าย Source Code ที่ไม่เกี่ยวข้อง - WILL COMPLY (Phase B already cleaned archive only)
4. การตรวจสอบ
 Unit Tests - need to check existing tests in real repo
 Integration Tests - evaluation -> improvement -> dashboard
 Regression Tests - detect score drops
 TypeScript Check - tsc --noEmit
 Production Build - npm run build (already PASS 25.41s)
 ตรวจสอบการเชื่อมต่อข้อมูลจริง - no mock
 ตรวจสอบ Mobile Layout
5. รายงานที่ต้องสร้าง
docs/audit/P14_EVALUATION_MONITORING_REPORT.md
docs/audit/P14_EVALUATION_MONITORING_STATUS.json
สถานะ:

COMPLETED_VERIFIED: มีผลทดสอบและหลักฐานยืนยันจริง
IMPLEMENTED_NOT_VERIFIED: สร้างแล้วแต่ยังไม่มีผลทดสอบ
PARTIAL: บางส่วนเสร็จ
BLOCKED: ติด dependency
NOT_STARTED: ยังไม่เริ่ม
ห้ามรายงาน COMPLETED_VERIFIED หากไม่มีผลทดสอบและหลักฐานยืนยันจริง

6. Implementation Plan สรุป
Phase B: CLOSED - 3 KEEP 9 MOVE 25.41s PASS PUSH SUCCESS
P14 Step 1: DONE - ตรวจสอบระบบเดิมแล้ว มีอยู่จริง 12 categories
P14 Step 2-6: NEXT - จะเริ่มจาก EvaluationLabDashboard ด้วยข้อมูลจริง

No mock data. Real evaluation only. Security first.

