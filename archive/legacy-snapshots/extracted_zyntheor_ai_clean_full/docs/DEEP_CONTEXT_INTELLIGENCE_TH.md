# Deep Context Intelligence — การปรับปรุงรอบนี้

## สิ่งที่เปลี่ยน
- เพิ่มการแยกคำค้นภาษาไทยด้วย `Intl.Segmenter('th')` เมื่อ runtime รองรับ
- เก็บ token ภาษาอังกฤษ, identifier, API path และคำเทคนิคไว้ในการค้นหา
- จำกัดจำนวน keyword ที่ใช้จัดอันดับ เพื่อลด query noise
- ตรวจสอบ path ที่ resolve แล้วว่าต้องอยู่ภายใน repository root ก่อนอ่าน
- ข้ามไฟล์ที่ไม่ใช่ regular file, ไฟล์ขนาดเกิน 1 MiB และเนื้อหาที่มี NUL byte
- คงการ sanitize เนื้อหา repository และ provenance เดิม

## ข้อจำกัด
- `workspaceId` ยังเป็นขอบเขตเชิง metadata ของ retrieval engine นี้ ไม่ได้หมายถึงการ mount root directory แยกต่อ workspace
- การค้นหายังเป็น lexical/Code Graph retrieval ไม่ใช่ semantic embedding search
- `Intl.Segmenter` ขึ้นกับ Node.js runtime; มี fallback เป็น Thai-run matching

## Verification
- พยายามรัน `node --test tests/p2-workspace-intelligence.test.mjs`
- test runner หยุดก่อนเริ่ม tests เพราะ Node.js ไม่รู้จักการ import `.ts` โดยตรง (`ERR_UNKNOWN_FILE_EXTENSION`) ใน environment นี้
- TypeScript check และ production build ยังไม่ได้ยืนยัน
