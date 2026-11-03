# Account & Access Review — 2026-11-03

## Scope
Reviewed the integrated account gate, member management UI, auth routes, and identity service in the current CORE X workspace.

## Changes in this pass
- Hardened `PATCH /api/auth/members/:userId/role`: generic role editing can no longer assign `OWNER`. Ownership transfer is explicitly blocked until a dedicated atomic workflow updates both membership role and `organizations.ownerId`.
- Protected the current workspace owner from demotion through the generic role editor, including when membership role and organization owner metadata disagree.
- Kept session tokens during transient network failures, but continued to deny app access until the server validates the session. This avoids treating an outage as proof of invalid credentials without allowing offline access.

## Existing implementation observed
- Login/register UI uses `sessionStorage` and validates existing sessions through `/api/auth/me`.
- App API requests use the same `zyntheor.access.v1` key.
- Member list and role change routes derive the caller from a server-validated Bearer session and tenant membership.
- The auth route currently uses process-local rate limiting.
- Identity persistence is JSON-file based; it is not a multi-instance transactional identity store.

## Remaining release blockers
- Move browser authentication to Secure, HttpOnly, SameSite cookies with CSRF protection before public production exposure.
- Replace process-local rate limiting with a shared store and configure trusted proxy boundaries before using forwarded IP headers.
- Migrate identity/session/member persistence to a transactional database with unique constraints and atomic writes.
- Implement a dedicated audited owner-transfer workflow before supporting ownership changes.
- Add password reset, email verification, session rotation, and session management.
- Run full TypeScript/Vite build and browser E2E after dependencies are installed in the target development environment.

## Verification status
Source-level changes only. No dependencies were installed. No full build, browser E2E, deployment, or production security certification is claimed.

---

## P3 Security Audit Supplement — 2026-11-04

การตรวจสอบรอบนี้เป็น read-only และไม่เปลี่ยนแปลง JSON Identity หรือฐานข้อมูล พบว่า `org-usr-3` ระบุ `ownerId=3` แต่ membership `mem-3-org-usr-3` ของ user 3 ยังเป็น `ADMIN` และไม่มี `OWNER` membership การเปลี่ยน role/owner มีผลต่อสิทธิ์สูง จึงยังไม่แก้ไขจนกว่าผู้รับผิดชอบจะอนุมัติการเปลี่ยนแปลงที่เจาะจง

ยังไม่มี `DATABASE_URL` หรือ `P2_TEST_DATABASE_URL`; ไม่มีการเชื่อมต่อ PostgreSQL จริงหรือทำ cutover เพิ่มเติม สร้าง `scripts/postgres-preflight.mjs` ให้ตรวจฐานข้อมูลด้วย `BEGIN READ ONLY`, timeout จำกัด, ตรวจ P1/P2 schema และ checksum โดยไม่รัน DDL/DML และไม่แสดง connection string การทดสอบรอบนี้ยืนยันเฉพาะสัญญาของ source/offline tests ไม่ใช่ผล live database

สถานะ security/cutover: **BLOCKED_SOURCE_CONFLICTS_AND_DATABASE_CONNECTION**. การอนุมัติ owner repair, การทดสอบ PostgreSQL จริง, migration/import, verification และ production cutover ยังคงเป็นคนละ gate; ห้ามนับ source-code checks ว่าผ่าน live integration ดูหลักฐานและขั้นตอนต่อได้ที่ [`POSTGRESQL_IDENTITY_P3_PREFLIGHT.md`](operations/POSTGRESQL_IDENTITY_P3_PREFLIGHT.md).

### P3 owner-approval update — 2026-11-04 00:19 +07:00

ผู้ใช้ระบุว่ามีอำนาจอนุมัติและอนุมัติการเปลี่ยน `mem-3-org-usr-3` จาก `ADMIN` เป็น `OWNER` โดยคง `ownerId=3` และคง JSON ต้นฉบับทุกไฟล์ไว้เหมือนเดิม บันทึกเป็น approval `chat-p3-owner-override-org-usr-3-2026-11-04-0019` พร้อม SHA-256 preconditions ใน private migration override ผู้อนุมัติไม่ได้ผ่านการยืนยันตัวตนแยกต่างหาก จึงบันทึกตามคำยืนยันของผู้ใช้โดยไม่กล่าวอ้างว่าได้ตรวจสอบตัวตนภายนอก

ตัว importer สร้าง projection ใน memory เท่านั้น, ตรวจ hash/value ก่อนใช้, เก็บ backup จาก byte snapshot และตรวจ hash ซ้ำก่อน import/commit การตรวจ dry-run หลังอนุมัติยืนยันว่า projection ไม่มี source conflicts, `sourceSnapshotVerified=true`, ต้นฉบับ JSON ทั้งสี่ไฟล์ hash ไม่เปลี่ยน และไม่เขียนฐานข้อมูล สถานะปัจจุบัน **BLOCKED_PENDING_DATABASE_CONNECTION**; ไม่มี live PostgreSQL, import หรือ cutover.

### P3 full-bundle update — 2026-11-04 00:36 +07:00

ผู้ใช้ขอโดยชัดแจ้งให้นำ JSON Identity ต้นฉบับและ backups ทั้งหมดเข้า ZIP final; รวมไฟล์ 32 รายการใน `workspace_data/identity` (87,801 bytes ณ เวลาตรวจ) รวม `usage_records.json` และ backup เก่าที่มี test data ปะปน โดยเอกสาร P3 ระบุชัดว่า backup นั้นห้ามใช้เป็น migration source ไฟล์ ZIP จำกัด permission เป็น owner-only และผ่านการตรวจรายการ/bytes เทียบต้นฉบับ เนื่องจากบรรจุ profile/credential hashes/session token hashes ให้เก็บและส่งต่ออย่างปลอดภัย การใส่ข้อมูลลง ZIP ไม่ได้เปลี่ยนแปลง JSON และไม่ยืนยัน PostgreSQL จริงหรือ cutover.
