# ZYNTHEOR CORE X — Regression Root-Cause Report

วันที่ตรวจล่าสุด: 2026-11-03 16:06 UTC
ฐานที่ใช้: `ZYNTHEOR_CORE_X_FULL_INTEGRATED_RELEASE.zip`

## ผลการตรวจ

| สถานะ | Tests discovered | Passed | Failed | Skipped |
|---|---:|---:|---:|---:|
| Baseline จาก release ZIP | 460 | 443 | 16 | 1 |
| รอบ source fixes | 460 | 454 | 5 | 1 |
| รอบสุดท้ายหลัง contract migration | 460 | 459 | 0 | 1 |
| Vitest | 33 files | 276 | 0 | 0 |

`npm test` ผ่านด้วย exit code 0 และ `npm run typecheck` ผ่านด้วย exit code 0

## Root causes ที่แก้แล้ว

รอบนี้แก้ source จริงใน task-memory authorization, context provenance ranking, local-provider fallback, secure environment defaults, access middleware grouping และ repository artifact policy. Local-only routing ไม่สืบทอด remote `OPENAI_API_BASE`; context retrieval เลือก current source เหนือ legacy snapshot; และ anonymous task-memory access ยังคง fail-closed.

นอกจากนี้ได้ปรับ test contracts ที่ล้าสมัยให้สะท้อน behavior ปัจจุบันอย่างชัดเจน โดยไม่ลด security: dataset tests รองรับ manifest `1.3.1`, P4 สร้าง tenant ผ่าน registration จริงแทน `org-default`, task-memory legacy test ใช้ explicit requester/admin context และ Vitest suites เปลี่ยนจาก `node:test` imports เป็น `vitest` imports ให้ตรงกับ runner.

Repair lifecycle assertion ตรวจหา `AUDIT_LEDGER_REPAIRED` entry ตาม action แทนการบังคับตำแหน่ง index 0 ซึ่งปัจจุบันสงวนให้ approval audit entry ล่าสุดตาม chronology.

## Verification evidence

- Full Node test suite: **459 passed, 0 failed, 1 intentionally skipped**
- Vitest: **33 test files, 276 passed, 0 failed**
- P8 orchestration: **9/9 passed**
- Intelligence runtime integration: **6/6 passed**
- Source guardrails + deployment validation: **20/20 passed**
- TypeScript typecheck: **PASS**
- No native checkpoint created
- No dataset version downgraded
- No predictable bootstrap tenant recreated
- No production deployment attempted

## Release decision

Regression gate is **GREEN** for automated tests. Production approval remains a separate governance decision because native runtime, PostgreSQL migration/rollback, dataset human approval, and sovereign infrastructure gates are not implicitly completed by this regression run.
