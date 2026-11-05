# ZYNTHEOR AI ENGINE — SOVEREIGN GENERAL INTELLIGENCE ARCHITECTURE

> **Sovereign General Intelligence Platform**  
> "สร้างแพลตฟอร์มปัญญาประดิษฐ์อเนกประสงค์ที่มีความสามารถในการเข้าใจ เรียนรู้ วิเคราะห์ ใช้ความรู้ ให้เหตุผล สร้างสรรค์ และดำเนินงาน โดยมี Intelligence, Model, Knowledge และ Memory เป็นรากฐานที่ผู้พัฒนาสามารถควบคุมได้เอง"

---

## 1. The 6 Core Product Pillars (แกนผลิตภัณฑ์ 6 แกน)

```
                       ZYNTHEOR AI ENGINE
                 (Universal Intelligence Platform)
                               │
   ┌───────────┬───────────────┼───────────────┬────────────┐
   │           │               │               │            │
   ▼           ▼               ▼               ▼            ▼
① INTELLIGENCE ② CORE    ③ KNOWLEDGE      ④ MEMORY    ⑤ CAPABILITIES
  (สมองกลาง)  (ตระกูลโมเดล)  (ระบบความรู้)    (ความจำ/บริบท)  (10 หมวดงาน)
   │           │               │               │            │
   └───────────┴───────────────┼───────────────┴────────────┘
                               ▼
                           ⑥ TRUST
                   (ความน่าเชื่อถือและการกำกับดูแล)
```

| แกน | ชื่อระบบ | บทบาทหน้าที่ | ไฟล์หลักใน Repository | สถานะการทำงานจริง |
|---|---|---|---|---|
| **1** | **ZYNTHEOR INTELLIGENCE** | สมองกลางสำหรับ Intent Parsing, Adaptive Reasoning, Planning, Parameter Calibration และ Orchestration | `lib/intelligence-orchestrator.ts`<br>`lib/adaptive-reasoning.ts`<br>`src/routes/intelligence.ts` | **OPERATIONAL** (ประมวลผลคำสั่ง ปรับพารามิเตอร์ตามความซับซ้อน และตรวจสอบผลลัพธ์) |
| **2** | **ZYNTHEOR CORE** | ตระกูลโมเดลปัญญาประดิษฐ์ของตัวเอง (NATIVE, ADAPTED, DISTILLED) โดยไม่เปลี่ยนชื่อ Gemini มาแอบอ้าง | `lib/native-model-runtime.ts`<br>`src/contracts/modelIdentityContract.ts`<br>`training/native_cpu/` | **OPERATIONAL & GOVERNED** (มี Identity Contract และ Fail-Closed Guard) |
| **3** | **ZYNTHEOR KNOWLEDGE** | การค้นคว้า ค้นหาความรู้ ข้อมูลอ้างอิง เอกสาร และการตรวจสอบความถูกต้องของแหล่งข้อมูล | `lib/internet-gateway.ts`<br>`src/services/repositoryIntelligence.ts`<br>`src/services/codeGraph.ts` | **OPERATIONAL** (Grounding Search, Code Graph, AST Analysis) |
| **4** | **ZYNTHEOR MEMORY** | การจดจำข้ามเซสชัน ความชอบผู้ใช้ บริบท Workspace และระบบ Vector Database Semantic Recall | `src/services/vectorMemory.ts`<br>`src/services/workspaceMemory.ts`<br>`src/services/taskMemory.ts` | **OPERATIONAL** (128-d Vector Cosine Search & Local Persistence) |
| **5** | **ZYNTHEOR CAPABILITIES** | 10 หมวดความสามารถมาตรฐาน พร้อมช่องทางรับข้อมูลมัลติโมดอล (Voice, Image, Document, Text) | `src/lib/capabilityEngine.ts`<br>`src/components/MainChat.tsx`<br>`src/hooks/useVoiceIntelligenceInput.ts` | **OPERATIONAL** (Voice 1.1 + Multi-Format Document & Vision Chips) |
| **6** | **ZYNTHEOR TRUST** | ความปลอดภัย การจำกัดสิทธิ์ การขออนุมัติจากมนุษย์ Sandbox Containment และ Audit Ledger | `src/services/safeExecutor.ts`<br>`src/services/repairGovernanceService.ts`<br>`src/services/auditLedger.ts` | **HARDENED** (Fail-Closed, Human Approval Gate, SHA-256 Chain) |

---

## 2. โครงสร้างการทำงานกลาง (Unified Processing Pipeline)

```
                            USER
                             │
                             ▼
                     ZYNTHEOR WORKSPACE
                             │
                             ▼
                       OMNI COMPOSER
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
      INPUT LAYER                       CONTEXT LAYER
   • Text / Prompts                  • User Profile & Language
   • Voice (Web Speech 1.1)          • Workspace Project Structure
   • Image (Vision preview)          • Memory Context (Vector DB)
   • Documents (PDF, Code, TXT)      • Grounding Context (SHA-256)
            │                                 │
            └────────────────┬────────────────┘
                             ▼
                   ZYNTHEOR INTELLIGENCE
                             │
                    INTENT UNDERSTANDING
                             │
                    ADAPTIVE REASONING
           (Calibrate Temp, Top-P, CoT Depth)
                             │
                    REASONING & PLANNING
                             │
                    CAPABILITY SELECTION
                    (10 Canonical Modes)
                             │
                     CORE MODEL ROUTING
             (ZYNTHEOR CORE vs External Provider)
                             │
                     KNOWLEDGE & MEMORY
                 (Vector Semantic Recall)
                             │
                    EXECUTION GOVERNANCE
               (Human Approval & Containment)
                             │
                        VERIFICATION
                   (Cryptographic Evidence)
                             │
                             ▼
                       FINAL RESPONSE
```

---

## 3. ตรวจสอบสถานะ Repository ปัจจุบัน (Repository Inventory Audit)

### ① ZYNTHEOR INTELLIGENCE
- **ระบบที่มีอยู่จริง**:
  - `AdaptiveReasoningEngine` ใน `lib/adaptive-reasoning.ts`: จำแนกความซับซ้อน (Score 0-100, 4 Tiers) และคำนวณ Temperature, Top-P, CoT Depth, Max Tokens และ Verification Strategy แบบไดนามิก
  - `IntelligenceOrchestrationEngine` ใน `lib/intelligence-orchestrator.ts`: จัดการ TaskType, Planning, Verification Artifacts และ AbortSignal Cancellation
  - `IntentClassifier` ใน `src/lib/capabilityEngine.ts`: จัดประเภทงานตามเจตนา

### ② ZYNTHEOR CORE
- **ระบบที่มีอยู่จริง**:
  - `ModelIdentityContract` ใน `src/contracts/modelIdentityContract.ts`: ป้องกันการแอบอ้างโมเดลภายนอก บังคับใช้ Category (`CORE_NATIVE`, `CORE_ADAPTED`, `CORE_DISTILLED`, `EXTERNAL_MODEL_PROVIDER`)
  - `NativeModelRuntime` ใน `lib/native-model-runtime.ts` และ `training/native_cpu/`: สถาปัตยกรรม CPU Native Model Pipeline สำหรับการฝึกฝนและประเมินผล

### ③ ZYNTHEOR KNOWLEDGE
- **ระบบที่มีอยู่จริง**:
  - `InternetGateway` ใน `lib/internet-gateway.ts`: ดึงข้อมูลจากภายนอกแบบแยกขาดจากโมเดล (Data Source Only ไม่ใช่ Model) บันทึก SHA-256 Digest
  - `RepositoryIntelligence` ใน `src/services/repositoryIntelligence.ts`: ทำดัชนีโค้ดและค้นหาสัญลักษณ์แบบเจาะลึก
  - `CodeGraph` ใน `src/services/codeGraph.ts`: สร้างกราฟความสัมพันธ์ของโมดูลในระบบ

### ④ ZYNTHEOR MEMORY
- **ระบบที่มีอยู่จริง**:
  - `LongTermVectorMemoryService` ใน `src/services/vectorMemory.ts`: ระบบ Vector Database 128-dimensional Cosine Similarity ในตัว พร้อมคัดกรอง 4 หมวด (USER_PREFERENCE, PROJECT_KNOWLEDGE, SESSION_CONTEXT, DOMAIN_ENTITY) และบันทึกลง Persistent Storage
  - `WorkspaceMemoryService` ใน `src/services/workspaceMemory.ts`: จัดเก็บบันทึกสถาปัตยกรรมและการตัดสินใจ

### ⑤ ZYNTHEOR CAPABILITIES
- **ระบบที่มีอยู่จริง**:
  - 10 หมวดความสามารถมาตรฐานใน `src/lib/capabilityEngine.ts`: General Conversation, Research & Knowledge, Reasoning & Problem Solving, Writing & Language, Learning & Education, Document Intelligence, Data & Analytics, Creativity & Design, Planning & Organization, Engineering & Technical
  - Omni Composer รองรับ Text, Voice (Speech-to-Text 1.1), Document Input (PDF, TXT, JSON, Code) และ Image Input

### ⑥ ZYNTHEOR TRUST
- **ระบบที่มีอยู่จริง**:
  - `AuditLedgerService` ใน `src/services/auditLedger.ts`: บันทึกเหตุการณ์ด้วย SHA-256 Merkle Block Hash Chain
  - `SafeExecutor` ใน `src/services/safeExecutor.ts`: ควบคุมการรันคำสั่งในขอบเขตปลอดภัย
  - `RepairGovernanceService` ใน `src/services/repairGovernanceService.ts`: Human-in-the-Loop Approval Gate ก่อนแก้ไขไฟล์สำคัญ

---

## 4. รัฐธรรมนูญผลิตภัณฑ์ ZYNTHEOR (Product Constitution)

1. **Not a Chatbot**: ไม่จำกัดตัวเองอยู่แค่การสนทนา เป็น Workspace สำหรับงานปัญญาประดิษฐ์อเนกประสงค์
2. **First-Party Intelligence**: พัฒนาสมองกลและโมเดล CORE เป็นของตนเอง
3. **Universal Capabilities**: รองรับงานทั่วไป 10 โดเมน ไม่จำกัดเฉพาะงานเขียนโค้ด
4. **Unified Intelligence**: ทุกช่องทาง (Voice, Doc, Vision, Text) ส่งผ่านสมองกลางชุดเดียวกัน
5. **No Fake Intelligence**: ไม่นำกฎ Deterministic หรือ Mock มาแอบอ้างว่าเป็นโมเดลภาษา
6. **Model Transparency**: แยก CORE_NATIVE, ADAPTED, DISTILLED และ EXTERNAL_MODEL ชัดเจน
7. **User Sovereignty**: ผู้ใช้ควบคุมการเชื่อมต่อ Local-Only ข้อมูล และความจำของตนเองได้เต็มที่
8. **Security First**: งานแก้ไขและงานวิกฤต (Tier 4) ต้องผ่านการอนุมัติจากมนุษย์
9. **Evidence-Based Verification**: ทุกผลการทดสอบต้องสะท้อนสิ่งที่รันจริง พร้อมหลักฐานดิจิทัล
10. **Continuous Intelligence Development**: พัฒนาความสามารถและโมเดลของระบบอย่างต่อเนื่องเป็นขั้นเป็นตอน
