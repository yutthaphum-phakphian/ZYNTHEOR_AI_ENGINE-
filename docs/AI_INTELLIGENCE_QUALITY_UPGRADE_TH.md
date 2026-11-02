# ZYNTHEOR — AI Intelligence Quality Upgrade

## ขอบเขต
รอบนี้ปรับปรุงการจัดประเภทคำขอใน Intelligence Core แบบ deterministic โดยเน้นสัญญาณภาษาไทยและอังกฤษ และความซื่อตรงต่อระดับหลักฐาน

## การเปลี่ยนแปลง
- ปรับลำดับกฎจำแนกงานให้แยก Debugging, Prompt Forge, Agent, Code Review, Architecture, Research และ Software Development
- เพิ่มคำสัญญาณภาษาไทยควบคู่ภาษาอังกฤษ
- เพิ่ม `rationale` เพื่ออธิบายเหตุผลของการจัดประเภท
- ลดคะแนนเมื่อไม่พบสัญญาณชัดเจน และไม่เรียกเครื่องมืออัตโนมัติสำหรับคำขอทั่วไปที่กำกวม
- เปลี่ยน `evidenceLevel` ของผลจำแนกจาก `VERIFIED` เป็น `ASSUMPTION` เพราะ keyword heuristic ไม่ใช่ข้อเท็จจริงที่ตรวจสอบแล้ว
- ปรับข้อความภายในแผนให้เรียกคะแนนดังกล่าวว่า heuristic score ไม่ใช่ calibrated probability

## ข้อจำกัด
- นี่ยังเป็น rule-based classifier ไม่ใช่ trained classifier หรือ Native Model inference
- คะแนน confidence เป็น heuristic score ที่กำหนดตามกฎ ยังไม่ได้ผ่าน calibration กับชุดข้อมูลตัวแทน
- การเลือกหมวดงานไม่อนุญาตให้เรียกเครื่องมือหรือข้าม permission/approval gate ด้วยตัวเอง
- ยังต้องประเมินกับชุดทดสอบไทย อังกฤษ และข้อความผสมจากผู้ใช้จริงก่อนนำไปใช้เป็นตัวชี้วัดคุณภาพ

## Verification
รันทดสอบเฉพาะส่วนด้วย:

```bash
node --test tests/intelligence-classifier-quality.test.mjs
```

TypeScript, full test suite และ production build ต้องตรวจใน environment ที่ติดตั้ง dependencies ครบถ้วน

## English summary
This upgrade improves bilingual Thai/English task classification, adds a concise rationale, labels heuristic classifications as ASSUMPTION rather than VERIFIED, and avoids automatic tool requests for ambiguous general prompts. It does not claim trained-model intelligence or calibrated confidence.
