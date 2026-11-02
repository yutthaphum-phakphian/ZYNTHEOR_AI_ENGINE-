# Advanced Reasoning & Planning — Evidence Integrity

## เป้าหมาย
ทำให้แผนงานหลายขั้นและหลักฐานของ ZYNTHEOR สะท้อนสถานะจริง ไม่เลื่อนผลลัพธ์ที่ยังไม่ผ่านการตรวจสอบให้กลายเป็นข้อเท็จจริงที่ยืนยันแล้ว

## การเปลี่ยนแปลง
- ขั้นตอนตอบคำถามโดยตรงถูกจัดเป็น `MODEL_INTERPRETATION` ไม่ใช่ `VERIFIED_FACT`
- ขั้นตอนที่ยังไม่ดำเนินการใช้ `UNVERIFIED_RESULT`
- การเรียก Tool ที่คืนผลสำเร็จถูกบันทึกเป็น `UNVERIFIED_RESULT` จนกว่าจะมี independent verification
- ขั้นตอน orchestration ที่ไม่มีการตรวจสอบข้อเท็จจริงภายนอกใช้ `MODEL_INTERPRETATION`
- ปรับ verification criteria ให้ตรวจจากผลที่สังเกตได้ แทนการรับประกันว่าไม่มี unverified claims
- เพิ่ม source-contract tests สำหรับป้องกัน regression ของหลักฐาน

## ข้อจำกัดที่ยังคงอยู่
- Planner ยังใช้กฎและ task type แบบ deterministic ไม่ใช่ learned planning model
- ระบบยังไม่ได้ทำ dependency graph แบบ dynamic หรือ re-planning จากผลลัพธ์จริง
- การบันทึก SHA-256 ยืนยันความคงที่ของ payload ที่บันทึก ไม่ได้ยืนยันความถูกต้องของเนื้อหา
- Test ที่ import TypeScript โดยตรงยังต้องใช้ runtime/loader ที่รองรับ TypeScript

## Verification
- `node --test tests/reasoning-evidence-integrity.test.mjs`: source-contract tests
- `tests/p8-core-intelligence-advancement.test.mjs`: พยายามรันแล้ว แต่ Node.js v22.16.0 หยุดก่อนเริ่ม test เพราะ `ERR_UNKNOWN_FILE_EXTENSION` สำหรับ `.ts`
- TypeScript typecheck และ production build ยังไม่ได้ยืนยัน
