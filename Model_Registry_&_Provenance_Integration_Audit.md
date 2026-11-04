# Model Registry & Provenance Integration Audit

วันที่ตรวจสอบ: 2026-11-04

## Scope

ตรวจเส้นทางข้อมูลระหว่าง `training/registry/model_registry.json`, `training/dataset/manifest.json`, `training/config/training_config.json`, `ModelsPage` และ `ModelProvenancePanel` โดยไม่เพิ่ม API และไม่เปลี่ยน Model Identity หรือ Runtime Router

## Findings and fixes

### Registry consistency

โมเดลใน registry ทั้ง 2 รายการอ้างอิง manifest name `zyntheor-core-engineering-v1.2`, manifest version `1.3.1`, sample count `15` และ base model เดียวกับ training config ผลตรวจ consistency ผ่านตามค่าที่บันทึกไว้

`selectedModel` ในหน้า Models จะอ้างอิง model id ที่ผู้ใช้เลือกเท่านั้น หาก registry เปลี่ยนจน selection เดิมไม่มีอยู่ ระบบจะเลือก record แรกอย่างชัดเจนผ่าน synchronization effect ไม่ใช่ fallback เงียบ ๆ ภายใน panel

### Missing evidence

ลบ fallback ที่ทำให้ข้อมูลดูเหมือนยืนยันแล้วออกจากหน้า Models ได้แก่ license `Apache-2.0`, sample count, split breakdown, language distribution และข้อความ zero-leakage ที่ hardcode ไว้ ข้อมูลที่ไม่มีจะแสดง `ยังไม่มีข้อมูลยืนยัน`

### Digest verification boundary

Panel แสดง SHA-256 เป็น `recorded` เมื่อค่ามาจาก registry เท่านั้น และแสดงสถานะ `Runtime digest verification` แยกต่างหาก หากไม่มีผล verify จาก runtime จะไม่ประกาศว่า digest ผ่านการตรวจจริง

### Cross-model contamination

Panel ไม่ใช้ dataset provenance จาก manifest ส่วนกลางมาเติมค่าให้ selected model อีกต่อไป และจะใช้ training config ส่วนกลางเฉพาะเมื่อ base model ตรงกับ model ที่เลือก หากไม่ตรงจะแสดงคำเตือนว่า config ยังยืนยันความเป็นของโมเดลนั้นไม่ได้

### Model Identity

Panel ไม่กำหนดหรือเปลี่ยน category/provider ของ model และไม่ประกาศ `CORE_NATIVE` เพิ่มเติม ข้อมูล identity ยังคงอยู่ภายใต้ contract และ response metadata ของระบบเดิม

### Mobile UX

ใช้ responsive grid (`grid-cols-1`, `md`, `lg`), `break-all` สำหรับ model id และ digest, `break-words` สำหรับ metadata และ tab navigation แบบ horizontal scroll เพื่อไม่ให้ SHA-256 หรือข้อมูล provenance ทำให้เกิด horizontal overflow

## Verification results

- Registry/manifest/config consistency script: ผ่านสำหรับ 2 registry records
- TypeScript typecheck: PASS
- Evidence provenance regression: 9/9 PASS
- Prohibited hardcoded evidence fallback scan: PASS

## Remaining blocker

ยังไม่มี endpoint หรือ runtime result ที่ส่งค่า `verified digest` ของ manifest/checkpoint กลับมายังหน้า Models ในขอบเขตงานนี้ ดังนั้น UI จะแสดงได้เพียง registry-recorded digest และสถานะ runtime verification ว่าไม่มีข้อมูล ไม่ถือเป็นหลักฐานการฝึกโมเดลเสร็จ
