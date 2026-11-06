ZYNTHEOR CLEAN FOUNDATION GATE — ห้ามเริ่ม Native Core จนกว่าจะผ่านทั้งหมด
Date: 2026-11-06
Status: GATE NOT PASSED — ยังมี Gemini UI 6 จุด + External Routing ที่ต้องลบ
Principle: CLEAN FIRST → VERIFY → REBUILD NATIVE → EXPAND

ทำไมต้องมี Gate นี้
ถ้าไม่เคลียร์ให้สะอาดตั้งแต่ตอนนี้ ปัญหาจะสะสมและทำให้การพัฒนา ZYNTHEOR CORE ยากขึ้นเรื่อยๆ:

โค้ดเก่ากับ Native Architecture ทำงานทับซ้อนกัน
Model Identity ไม่ชัดเจน
Dependencies และ Routing ที่ไม่จำเป็นยังคงอยู่
Tests ผ่านแต่ทดสอบผิดระบบ
ต้องย้อนกลับมาแก้โครงสร้างเดิมซ้ำๆ
GATE CHECKLIST — 8 ข้อ ต้องผ่านทั้งหมด
 1. ตรวจสอบ Repository ครบทุกส่วน
 2. ลบ Gemini / OpenAI Integration ตามขอบเขตที่กำหนด
 3. ลบ External Provider Routing และ Silent Fallback
 4. ลบ Dependencies, Config และ UI ที่หมดความจำเป็น
 5. แก้ References, Imports, Contracts และ Tests
 6. ตรวจสอบไม่ให้มีระบบภายนอกหลงเหลือในเส้นทาง Production
 7. Build, Typecheck และ Tests ผ่าน
 8. ตรวจสอบ Git Diff และยืนยันว่าไม่มีข้อมูลสำคัญถูกลบ
ข้อสำคัญ: ไม่ใช่แค่ grep แล้วไม่พบชื่อ Gemini
ต้องพิสูจน์ด้วยว่าไม่มีเส้นทางเรียกใช้โมเดลภายนอกหลงเหลืออยู่จริง

วิธีพิสูจน์แบบ 3 ชั้น
ชั้นที่ 1 — ชื่อ (Name Check)
grep หาชื่อ Gemini / OpenAI / Claude ใน Product UI ต้อง CLEAN

ยกเว้น Guard 2 ไฟล์: modelIdentityContract.ts + sovereignty.ts ที่เป็นตัวบล็อก
ชั้นที่ 2 — เส้นทางเรียกใช้ (Call Path Check) — สำคัญที่สุด
ต้องตรวจว่าไม่มี code ที่ fetch / เรียก API ภายนอกจริง:

fetch('https://generativelanguage.googleapis.com')
fetch('https://api.openai.com')
fetch('https://api.anthropic.com')
new GoogleGenAI, new OpenAI, new Anthropic
axios.post('...openai...')
process.env.GEMINI_API_KEY, process.env.OPENAI_API_KEY, process.env.GOOGLE_API_KEY ที่ถูกอ่านแล้วนำไปใช้เรียก API
dynamic import('@google/genai') / import('openai')
ถ้าเจอ fetch ไป host ภายนอกแม้แต่จุดเดียว = Gate FAILED ทันที แม้จะไม่มีคำว่า Gemini ในไฟล์นั้นเลย

ชั้นที่ 3 — Execution Graph Check
ไล่จาก Main Chat → UnifiedIntelligenceCore → ZyntheorIntelligenceRuntime → Provider → fetch

ทุก Path ต้องจบที่ ZYNTHEOR CORE หรือ FAIL-HONESTLY (NOT_TRAINED / UNAVAILABLE / GROUNDING_FAILED)
ห้ามมี Path ใดที่แอบแยกไป External แล้วกลับมาเป็นคำตอบโดยไม่แสดง EXTERNAL PROVIDER
คำสั่งตรวจสอบ Call Path
# หา fetch ไป host ภายนอก
grep -Rni "generativelanguage\|api.openai.com\|api.anthropic.com" lib/ src/ || echo "CLEAN_HOSTS"
# หาการสร้าง Client ภายนอก
grep -Rni "new GoogleGenAI\|new OpenAI\|new Anthropic" lib/ src/ || echo "CLEAN_CLIENTS"
# หาการอ่าน Env Key แล้วใช้
grep -Rni "GEMINI_API_KEY\|GOOGLE_API_KEY\|OPENAI_API_KEY" lib/ src/ .env.example || echo "CLEAN_ENV"
# หา Routing ที่เลือก External อัตโนมัติ
grep -Rni "wantsGemini\|gemini-first\|fallbackList\|models\[0\]" lib/ src/ || echo "CLEAN_ROUTING"
ต้องขึ้น CLEAN ทั้ง 4 คำสั่งถึงจะผ่านชั้นที่ 2

สถานะปัจจุบันจากวิดีโอ Audit
วิดีโอแสดง grep ยังเจอ Gemini / OpenAI เต็มจอ — มาจาก UI 3 ไฟล์ + Guard 2 ไฟล์
Guard 2 ไฟล์ (modelIdentityContract + sovereignty) = KEEP ไว้ ถูกต้องแล้ว
UI 3 ไฟล์ (GovernanceObservabilityPanels, SettingsCenter, ModelsPage) = ต้องลบออกจริง
lib/providers.ts = CLEAN แล้ว
Build + Typecheck = ผ่านแล้ว แต่ต้องรันซ้ำหลังลบ UI
Gate ยัง NOT PASSED — ห้ามเริ่ม Native Core Development จนกว่าจะผ่านทั้ง 8 ข้อ

CLEAN FIRST → VERIFY → REBUILD NATIVE → EXPAND
Own the Intelligence. Own the Model. Own the Platform.

