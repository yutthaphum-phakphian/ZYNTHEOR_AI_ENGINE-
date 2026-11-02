# Reasoning Evidence Gate — รอบปรับปรุง

## การเปลี่ยนแปลง
- ตรรกะ gate ย้ายไปอยู่ใน `lib/evidence-gate.ts` (pure, ไม่มี dependency) และ `evaluatePlanVerification()` เรียกใช้
- `allVerified: true` เฉพาะเมื่อ **ทุกขั้นมี `executionStatus === 'COMPLETED'` และหลักฐานหมวด `VERIFIED_FACT`**
- `MODEL_INTERPRETATION`, `HYPOTHESIS`, `UNVERIFIED_RESULT` ไม่นับเป็นข้อเท็จจริงที่ยืนยันแล้ว
- ขั้นที่ `PENDING`/`RUNNING`/`SKIPPED` ไม่ถูกนับเป็น Verified แม้จะติดป้าย `VERIFIED_FACT` (แก้ช่องโหว่ที่พบจากการตรวจรอบก่อน)
- แผนว่างหรือมีขั้น `FAILED` ไม่ผ่าน gate
- เทสต์เดิมที่ใช้ regex ตรวจข้อความซอร์สถูกคงไว้เป็น contract test และเพิ่ม **behavioral tests** ที่เรียก gate จริง

## ผลทดสอบ
- `node --test tests/reasoning-evidence-integrity.test.mjs`: PASS 14/14 (6 source-contract + 8 behavioral)
- Mutation check: ลบเงื่อนไข `COMPLETED` ออกจาก gate แล้วเทสต์ล้ม 2 ข้อ (จับช่องโหว่เดิมได้จริง)
- `p8-core-intelligence-advancement.test.mjs`: BLOCKED — ไม่มี `node_modules` (`Cannot find package '@google/genai'`) ไม่ใช่ปัญหาการโหลด `.ts` ของ Node
- เทสต์ไฟล์นี้ต้องใช้ Node ที่ strip TypeScript types ได้ (22.18+ หรือ `--experimental-strip-types`)
- TypeScript check, production build, native model inference: ยังไม่ยืนยัน

## ขอบเขต
แก้กติกาการจัดประเภทหลักฐานและสถานะการวางแผนเท่านั้น ไม่ได้เพิ่มความสามารถ reasoning ของโมเดล
