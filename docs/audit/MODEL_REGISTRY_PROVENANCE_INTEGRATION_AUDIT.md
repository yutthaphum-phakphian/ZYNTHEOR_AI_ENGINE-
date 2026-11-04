# ZYNTHEOR Model Registry & Provenance Integration Audit

วันที่ตรวจสอบ: 2026-11-04
แพ็กงาน: Cumulative Incremental Patch — Patch 1 + Patch 2

## ขอบเขต

ตรวจและปรับปรุงเส้นทาง Model Registry → Runtime Provenance → Models UI โดยไม่สร้างโปรเจกต์ใหม่ ไม่เปลี่ยน Model Router ไม่เปลี่ยน External Provider identity และไม่ประกาศ runtime readiness เกินหลักฐานจริง

## Patch 1 — Registry & Provenance UI

- เพิ่ม `ModelProvenancePanel`
- เชื่อม panel กับ selected model ใน `ModelsPage`
- แยก Overview กับ Technical Provenance
- ลบ hardcoded license, dataset digest และข้อความ verification ที่ไม่มีหลักฐาน
- แสดง missing evidence เป็น `ยังไม่มีข้อมูลยืนยัน`
- รองรับ long model IDs และ SHA-256 บน mobile

## Patch 2 — Runtime Model Provenance Verification

### Registry cross-check

`lib/native-model-runtime.ts` อ่านทั้ง `training/registry/model_registry.json` และ `training/registry/native_model_identity.json` แล้วส่งผล `registryCrossCheck` ออกมาเป็น `MATCH`, `MISMATCH` หรือ `UNAVAILABLE`

ผลตรวจจริงของ Repository ปัจจุบัน:

```text
model_registry:       zyntheor-core-0.10.0-foundation
native_identity:      zyntheor-native-cpu-001
registryCrossCheck:   MISMATCH
runtime status:       MODEL_NOT_FOUND
checkpoint exists:    false
checksum matched:     null
```

ระบบจะไม่ถือ records สองชุดเป็นโมเดลเดียวกันเมื่อ model ID ไม่ตรงกัน

### Checkpoint verification

Runtime probe ยังคงตรวจ SHA-256 จากไฟล์ checkpoint จริงเท่านั้น โดยแยก:

- Registry-recorded digest
- Runtime-calculated actual digest
- Checksum match result
- Runtime model identity

ไม่มีการสร้าง checkpoint file หรือ digest จำลอง

### Training History evidence boundary

ลบ synthetic checkpoint digest, synthetic checkpoint path และ synthetic evidence digest ออกจาก `/api/training/history` เมื่อไม่มี checkpoint ที่ runtime ตรวจได้ โดยจะแสดง:

- `BLOCKED_NO_VERIFIED_CHECKPOINT`
- `checkpointHashSha256: null`
- `checkpointPath: null`
- `evidenceDigestSha256: null`
- metrics เป็น `null` หากไม่มีหลักฐาน checkpoint ที่ verified

`ModelsPage` และ `TrainingLogHistory` รองรับ null อย่างปลอดภัยและแสดง `UNVERIFIED` แทนการทำให้หน้าเดิมล่ม

### Runtime UI integration

`ModelsPage` เรียกใช้ API เดิม `/api/native-model/status` เพื่อแสดง runtime model ID, actual digest, checksum match และ registry cross-check โดยไม่เพิ่ม API ใหม่

หาก runtime model ID ไม่ตรงกับ selected Registry model จะมีคำเตือนและไม่ถือ provenance เป็นของโมเดลเดียวกัน

## Verification results

- Registry data consistency: ผ่านค่าที่บันทึกใน 2 registry records
- Runtime cross-check: ตรวจพบ `MISMATCH` ตามข้อมูลจริง
- Checkpoint file presence: ไม่พบ checkpoint จริง
- Python native runtime: ไม่สามารถ probe ได้ใน environment นี้เนื่องจากไม่มี `torch`; gateway แปลงเป็น `RUNTIME_UNAVAILABLE` แบบ fail-closed
- Synthetic evidence scan: ผ่าน ไม่มี synthetic checkpoint digest/path เหลือใน Training History API
- Null-safe history consumer scan: ผ่าน
- TypeScript typecheck: PASS
- Production build: PASS
- Evidence provenance tests: 9/9 PASS
- Model lifecycle และ dataset quality tests: 11/11 PASS

## สถานะที่ยังไม่ผ่านโดยเจตนา

Patch 2 **ยังไม่ประกาศว่า Runtime Model Provenance Verification ผ่าน** เพราะยังไม่มีหลักฐาน runtime/checkpoint จริง ระบบจึงคงสถานะ `MODEL_NOT_FOUND`, `RUNTIME_UNAVAILABLE`, `UNVERIFIED` หรือ `BLOCKED` ตามจุดที่เกี่ยวข้อง

การจะเลื่อนเป็น verified ต้องมีทั้ง:

1. checkpoint จริงใน path ที่อนุญาต
2. SHA-256 ของไฟล์ตรงกับ registry
3. Registry identity สองชุดตรงกันหรือมี mapping ที่อนุมัติอย่างชัดเจน
4. native runtime load และ forward/generation probe ผ่าน
5. dataset lineage และ final weights digest ผ่านการตรวจ

## ไฟล์ที่เปลี่ยนใน cumulative patch

- `src/components/ModelsPage.tsx`
- `src/components/ModelProvenancePanel.tsx`
- `src/components/TrainingLogHistory.tsx`
- `lib/native-model-runtime.ts`
- `server.ts`
- `docs/audit/MODEL_REGISTRY_PROVENANCE_INTEGRATION_AUDIT.md`
