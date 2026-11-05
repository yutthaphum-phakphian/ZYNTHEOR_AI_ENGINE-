# ZYNTHEOR — Dual-Platform Architecture

> **Policy Directive**: `Build Web First. Architect for Both.`
> **Product Identity**: `ZYNTHEOR AI ENGINE`
> **Intelligence Layer**: `ZYNTHEOR INTELLIGENCE`
> **Model Family**: `ZYNTHEOR CORE`

---

## 1. Executive Summary & Policy

**Build Web First. Architect for Both.**

- **Web First**: พัฒนา Web Application ให้ทำงานได้จริง สมบูรณ์ และผ่านการทดสอบเป็นลำดับแรก
- **Architect for Both**: ออกแบบ API, Intelligence Core, Storage Abstractions และ Runtime ให้รองรับ Native Desktop และ Native Mobile ตั้งแต่ระดับสถาปัตยกรรมรากฐาน โดยไม่ต้องรื้อระบบหรือเขียนระบบประมวลผลใหม่ในภายหลัง
- **Sovereign Intelligence**: รักษาเอกลักษณ์ อธิปไตยของโมเดล (Model Sovereignty) และการควบคุมข้อมูลของ ZYNTHEOR AI ENGINE ทุกแพลตฟอร์ม

---

## 2. Platform Roadmap & Deployment Targets

| แพลตฟอร์ม | เป้าหมาย | ลำดับการพัฒนา | บทบาทสถาปัตยกรรม |
|---|---|---|---|
| **Web Application** | ใช้งานผ่าน Web Browser ทั่วไป | **พัฒนาก่อน (Current)** | Client UI (React + Tailwind + Vite) เชื่อมต่อผ่าน Shared Express API |
| **Native Desktop** | ติดตั้งบน Windows / macOS / Linux | **อนาคต (Planned)** | Desktop Shell (ประเมิน Tauri) ใช้งาน Shared Core Runtime & Local Storage |
| **Native Mobile** | ติดตั้งบน Android / iOS | **อนาคต (Planned)** | Mobile Shell (Tauri Mobile หรือ Native Integration) เข้าถึงเซ็นเซอร์และการประมวลผลบนเครื่อง |

ทั้งสามแพลตฟอร์มต้องใช้ **ZYNTHEOR INTELLIGENCE** และระบบความรู้ (Knowledge Engine), หน่วยความจำ (Memory), และระบบบันทึกการตรวจสอบ (Audit Ledger) ชุดเดียวกันตามสิทธิ์และขอบเขตความปลอดภัยที่กำหนด

---

## 3. High-Level System Architecture

```text
                     ZYNTHEOR AI ENGINE
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
      WEB CLIENT                             NATIVE CLIENTS
    (Browser / Vite)                     (Desktop & Mobile Shells)
          │                                       │
          └───────────────────┬───────────────────┘
                              │
                      SHARED API LAYER
                    (Express & OpenAPI)
                              │
                    ZYNTHEOR INTELLIGENCE
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
     ZYNTHEOR CORE        KNOWLEDGE             MEMORY
  (Buffalo Native 14k)  (Docs / Context)  (Context & Session)
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                        NATIVE RUNTIME
                              │
                       INTERNET GATEWAY
                 (Data Source, Not Provider)
                              │
                        AUDIT SYSTEM
                 (Cryptographic Chain Stamp)
```

---

## 4. End-to-End Execution & Sovereign Verification Pipeline

กระบวนการประมวลผลและการบังคับใช้อธิปไตยโมเดลในทุกคำขอ:

```text
Main Chat
   ↓
Intelligence Runtime
   ↓
Model Router (Enforce ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY)
   ↓
CORE_NATIVE Buffalo Edition (14,962 seals)
   ↓
Memory & Session Context
   ↓
PostgreSQL / Local Datastore (Multi-tenant Isolation)
   ↓
Tool Gateway & Internet Gateway (Strict Data Retrieval Only)
   ↓
Verification (LB Dual Hash + PQC + ZK Integrity)
   ↓
Audit Ledger (PAdES QR & SHA-256 Hash Chained Records)
   ↓
Legal Runtime (ETDA Standards 9/26/28 Compliance)
   ↓
Gateway Fleet (BKK / FRA / NRT / SIN / IAD)
```

---

## 5. Architectural Invariants (กฎที่ต้องรักษา)

1. **Shared Central API Contract**:
   Web และ Native ต้องใช้ API Contract กลางชุดเดียวกัน (OpenAPI Specification) เพื่อให้การเชื่อมต่อคงที่และสอดคล้องกันทุกไคลเอนต์

2. **Decoupled Intelligence**:
   ห้ามผูกมัด Business Logic หรือ Intelligence เข้ากับ React, DOM หรือ Browser API โดยตรง โค้ดส่วน Intelligence ต้องทำงานได้ใน Node.js, Background Workers หรือ Embedded Runtimes

3. **CORE as Primary Model**:
   `ZYNTHEOR CORE` (รวมถึง `zyntheor-buffalo`, `zyntheor-native`) ต้องเป็นตระกูลโมเดลหลักในทุกแพลตฟอร์ม ห้ามบายพาสไปใช้โมเดลภายนอกโดยไม่ผ่านการกลั่นกรองของ ZYNTHEOR INTELLIGENCE

4. **Internet Gateway as Data Source (Not Model Provider)**:
   Internet Gateway ทำหน้าที่เป็นแหล่งค้นคว้าข้อมูลภายนอก (Data Retrieval Source) เท่านั้น **ไม่ใช่** Model Provider ข้อมูลที่ดึงเข้ามาต้องผ่านการสังเคราะห์และประเมินความปลอดภัยโดย ZYNTHEOR INTELLIGENCE ก่อนส่งให้ผู้ใช้งาน

5. **Multi-Mode Support (Online, Local & Airgap)**:
   สถาปัตยกรรมต้องรองรับการทำงานทั้งแบบเชื่อมต่ออินเทอร์เน็ต (Online), ทำงานเฉพาะเครื่อง (Local-Only), และแบบตัดการเชื่อมต่อสมบูรณ์ (Airgap Sovereign Mode)

6. **Native Resource Sandboxing**:
   Native Application ต้องสามารถกำหนดสิทธิ์เข้าถึงระบบไฟล์ ฮาร์ดแวร์ และทรัพยากรในเครื่องของผู้ใช้อย่างรัดกุม ปลอดภัย และมีการขอความยินยอม (Consent Boundary)

7. **Zero Duplicate Storage Core**:
   ไม่สร้างระบบ Memory, Knowledge หรือ Audit แยกซ้ำซ้อนตามแพลตฟอร์ม ให้ใช้อะแดปเตอร์ (Adapter Pattern) ครอบชั้นจัดเก็บข้อมูลเดียวกัน

8. **Platform Migration Ready**:
   โครงสร้างข้อมูลและการเข้ารหัสต้องมีระบบ Schema Migration เพื่อให้ผู้ใช้สามารถสำรอง ย้าย หรือซิงก์ข้อมูลข้ามแพลตฟอร์มได้อย่างราบรื่น

---

## 6. Technology Matrix

| Layer | Selected Technology / Pattern | Rationale |
|---|---|---|
| **Web Client** | React 19 + Vite + Tailwind CSS | ประสิทธิภาพสูง โหลดเร็ว เหมาะกับ PWA และ Web Experience |
| **Backend API** | Express.js (TypeScript) + Vite Middleware | รองรับ Dev Server แบบรวมศูนย์ และ Production Standalone |
| **Native Desktop** | Tauri (ประเมินสำหรับระยะถัดไป) | ขนาดเบา ใช้ทรัพยากรน้อย ปลอดภัยสูงด้วย Rust backend |
| **Native Mobile** | Tauri Mobile / Native Shell | ใช้โค้ด Web UI เดิมร่วมกับ Native API bridge |
| **API Contract** | Shared TypeScript Contracts / OpenAPI | Single source of truth ป้องกัน API Drift |
| **Intelligence** | Shared Node.js / TypeScript Engine | Portable ระหว่าง Server, Local process และ Edge |
| **Model Standard** | ZYNTHEOR CORE (Buffalo Sovereign) | รักษาอธิปไตยและการรับประกันผลลัพธ์ (Deterministic Governance) |
| **Storage Layer** | Adapter Pattern (PostgreSQL + LocalStorage + SQLite) | ทำงานได้ทั้ง Cloud และ On-Device |
| **Security & Audit** | Canonical Hash Chain + Dual Cryptographic Stamp | ตรวจสอบย้อนกลับ ป้องกันการแก้ไขประวัติ (Tamper-evident) |

---

## 7. Status & Verification

- **Policy Status**: APPROVED & ACTIVE
- **Scope**: ZYNTHEOR AI ENGINE Core Platform
- **Last Updated**: 2026-11-05
