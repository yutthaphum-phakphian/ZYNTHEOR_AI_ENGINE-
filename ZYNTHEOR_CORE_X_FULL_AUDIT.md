# ZYNTHEOR CORE X — Full Audit

วันที่ตรวจ: 2026-11-03 15:52 UTC

## ขอบเขตและหลักฐาน

ตรวจ archive `ZYNTHEOR_CORE_X_CONTINUED_HARDENED.zip` ใน workspace แยก `/home/ubuntu/workspaces/zyntheor-core-x-audit` โดยไม่แก้ต้นฉบับ ตรวจ source, documentation, scripts, configuration, tests, training pipeline และ manifest. Archive มี 922 ไฟล์ก่อนติดตั้ง dependencies; source หลักอยู่ใน `src/`, `lib/`, `server.ts`, `training/`, `tests/`.

## สถานะที่ยืนยันจากการรันจริง

| พื้นที่ | สถานะ | หลักฐาน |
|---|---|---|
| TypeScript | COMPLETED_VERIFIED | `npm run typecheck` ผ่านหลังแก้ `lib/agent-orchestrator.ts` |
| Frontend production build | COMPLETED_VERIFIED | `npm run build` ผ่าน, Vite bundle สำเร็จ |
| Native gateway contract | COMPLETED_VERIFIED | `tests/native-model-gateway.test.mjs` ผ่าน 2/2 |
| Full regression | PARTIAL | 460 discovered, 443 pass, 16 fail, 1 skipped; `npm test` exit 1 |
| Native CPU tests | BLOCKED | ไม่มี Python `torch` |
| Dataset validation | BLOCKED | pipeline import `torch` ไม่ได้ใน environment นี้ |
| P17 inference | BLOCKED | ไม่มี checkpoint และ runtime dependency |
| P19 sovereign preflight | BLOCKED | `ZYNTHEOR_LOCAL_ONLY` ไม่ได้เปิด explicit; air-gap/container isolation ยังไม่ verify |
| P20 platform gate | BLOCKED | upstream phases ยังไม่มี acceptance evidence |
| Release approval | BLOCKED | ไม่อนุญาตประกาศ production-ready |

## โครงสร้างและความเสี่ยงสำคัญ

มี Drizzle PostgreSQL schema ที่ `src/db/schema.ts` และ `database/schema.ts` แต่ไม่พบ migration directory หรือ `drizzle.config.*`; จึงยังไม่ใช่ transactional persistence ที่ deploy ได้อย่างปลอดภัย. Runtime ปัจจุบันใช้ file-backed workspace state หลายส่วน.

Execution/intelligence/security foundations มีอยู่จริงหลายโมดูล เช่น `src/services/safeExecutor.ts`, tenant isolation, audit ledger, `lib/intelligence-core.ts` และ `lib/agent-orchestrator.ts`; อย่างไรก็ตาม source presence ไม่เท่ากับ acceptance evidence.

Full regression failures ที่ตรวจพบรวมถึง persistent-memory fixture isolation, dataset manifest version assertions, deployment validation warning, workspace evidence expectation, tenant fixture setup และ local provider availability. Tests ไม่ถูกแก้เพื่อซ่อน failures.

## การเปลี่ยนแปลงรอบนี้

1. ลบ dead branch ที่ทำให้ TypeScript narrow เป็น `never` ใน `lib/agent-orchestrator.ts`; ไม่เปิดทางให้สร้าง diff ปลอม และยังคืน `proposedDiff: undefined` ตาม contract.
2. ปรับ `lib/native-model-gateway.mjs` ให้ probe คืนโครงสร้าง `RUNTIME_UNAVAILABLE` เมื่อไม่มี Torch และ generation fail-closed ด้วย stable `NATIVE_RUNTIME_EXIT_*` โดยไม่เปิดเผย Python traceback หรือ local path.
3. เพิ่มรายงานและ release manifest/ZIP รอบนี้.

## ข้อสรุป

ระบบมี implementation จริงในหลายชั้น แต่ยังอยู่ในสถานะ **IMPLEMENTED_NOT_VERIFIED / PARTIAL / BLOCKED** ไม่ใช่ production-ready. งานถัดไปต้องเริ่มจาก dependency/runtime reproducibility, migration + rollback strategy, tenant-scoped transactional storage, full regression triage และ governed dataset approval ก่อน native training.
