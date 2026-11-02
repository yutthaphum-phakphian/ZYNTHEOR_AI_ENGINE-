# บันทึกการปรับปรุง AI Intelligence

## สิ่งที่แก้ไข

1. `lib/native-model-runtime.ts` ใช้ `readdirSync` จาก `node:fs` โดยตรง แทน `require()` ภายใน ES module ซึ่งเดิมถูก `catch` กลบข้อผิดพลาด ทำให้การค้นหา checkpoint อาจไม่ทำงานตามที่ตั้งใจ
2. `lib/intelligence-core.ts` ปรับค่า confidence ของ Task Classifier ให้สะท้อนระดับหลักฐานจากกฎ keyword ที่จับได้ แทนการกำหนด 0.95 เหมือนกันทุกคำขอ ค่านี้เป็น heuristic score ไม่ใช่ความน่าจะเป็นที่ผ่าน calibration
3. เพิ่ม source-level regression tests สำหรับสองสัญญาข้างต้น

## ขอบเขตและข้อจำกัด

- ไม่ได้ฝึกหรือเปลี่ยน weights ของ ZYNTHEOR CORE
- ไม่ได้เพิ่มความสามารถค้นเว็บหรือ execute tools โดยอัตโนมัติ
- การจัดประเภทงานยังเป็น deterministic keyword heuristic ไม่ใช่ ML classifier
- ยังไม่ได้ยืนยัน TypeScript check, integration tests หรือ production build ในสภาพแวดล้อมนี้ เนื่องจากไม่มี `node_modules` และ Node.js ที่ใช้รัน `node --test` โดยตรงไม่โหลดไฟล์ `.ts` ในชุดทดสอบเดิม
- ควรรัน `npm ci` แล้ว `npm run verify` ในสภาพแวดล้อมโครงการก่อน merge/deploy
