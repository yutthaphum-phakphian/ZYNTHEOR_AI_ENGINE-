REMOVE GEMINI FROM PRODUCT UI — DELETION PLAN (NOT RENAME)
Status: DELETION SPEC — ห้าม Rename Gemini เป็น ZYNTHEOR CORE
Principle: ลบสิ่งที่ไม่ต้องการออกจริง ไม่ใช่ซ่อนปัญหาไว้ใต้ UI ใหม่
Date: 2026-11-06

หลักการที่ล็อกไว้
ZYNTHEOR ต้องมี Product Identity เป็นของตัวเอง
ระบบภายนอกที่ยังจำเป็นต้องมี ต้องไม่แอบทำงาน หรือแสดงตัวตนผิดพลาด
ห้าม: เปลี่ยนชื่อ Gemini เป็น ZYNTHEOR CORE โดยที่ยังใช้โมเดลภายนอกอยู่
เป้าหมาย: ลบ Gemini Branding / Provider Cards / Model Options / API Key Fields ที่ทำให้เข้าใจว่า Gemini เป็นส่วนหนึ่งของ CORE
ขอบเขตที่ต้องลบ — Product UI
1. src/components/GovernanceObservabilityPanels.tsx
ลบ: บรรทัด 151 — Provider Card ที่มี provider-gemini-primary
ลบ: บรรทัด 167 — leaderProviderId ?? 'provider-gemini-primary' + array ที่มี 'provider-gemini-primary', 'provider-ollama-local', 'provider-zyntheor-core'
วิธีลบ: ลบทั้ง Card / ทั้ง Option ออก ไม่ใช่เปลี่ยน string เป็น provider-zyntheor-core-primary
ถ้าไม่มี Provider Card เหลือ ให้แสดงแค่ ZYNTHEOR CORE status อย่างเดียว
2. src/components/SettingsCenter.tsx
ลบ: บรรทัด 167-168 — descTh: '...Gemini, OpenAI, Anthropic และ Local Ollama' / descEn: 'Connection status for Gemini, OpenAI...'
ลบ: บรรทัด 1342 — API Key Field ที่มี GEMINI_API_KEY + ข้อความ Configured / Not configured
วิธีลบ: ลบทั้ง Field + ทั้ง Section ที่เกี่ยวกับ External Provider ออกจากหน้านี้
ถ้านโยบายกำหนดให้ไม่มี External Provider ในหน้านี้ → ต้องลบทั้ง Section ไม่ใช่ซ่อน input
ถ้าจำเป็นต้องมี External จริง → ย้ายไปหน้าแยก Settings > External Provider (Supplementary) ที่มี Consent + คำเตือนชัดว่า NOT NATIVE ไม่ใช่ CORE
3. src/components/ModelsPage.tsx
ลบ: บรรทัด 334 — Google Gemini Cloud Card
วิธีลบ: ลบทั้ง Card ออก ไม่ใช่เปลี่ยนชื่อเป็น ZYNTHEOR CORE
เหลือแค่: ZYNTHEOR CORE / CORE_NATIVE / CORE_ADAPTED / CORE_DISTILLED ที่เป็นของจริง
4. ตัวเลือก OpenAI — ลบถ้านโยบายกำหนด
ถ้าในหน้าเดียวกันมี OpenAI / Anthropic / Claude Options → ลบออกด้วยหลักการเดียวกัน
ห้ามเหลือ GPT- / Claude / OpenAI ใน Model Selection ของ Main Product
สิ่งที่ต้อง KEEP ไว้ — Guard ไม่ใช่ UI
src/contracts/modelIdentityContract.ts — isGemini = normalizedId.startsWith('gemini') → ตัวบล็อก ห้ามลบ
src/lib/sovereignty.ts — blockedPrefixes = ['gemini', 'gpt-', 'openai', 'claude'] → ตัวบล็อก ห้ามลบ
2 ไฟล์นี้คือตัวที่ป้องกันไม่ให้ Gemini กลับมา ไม่ใช่ UI ที่เสนอ Gemini
ตรวจสอบก่อนลบ — Backend / Routing / Env / Dependencies
Backend Adapters
grep -Rni "GeminiProvider\|GoogleGenAI\|generativelanguage" lib/ src/ || echo "CLEAN_BACKEND"
lib/providers.ts ตอนนี้ CLEAN แล้ว — ต้องเช็คซ้ำหลังลบ UI
Routing
grep -Rni "wantsGemini\|gemini-first\|fallback.*gemini" lib/ src/ || echo "CLEAN_ROUTING"
ห้ามมี Routing ที่เลือก Gemini อัตโนมัติเมื่อมี API Key
Environment Variables
grep -Rni "GEMINI_API_KEY\|GOOGLE_API_KEY\|OPENAI_API_KEY" src/ lib/ .env.example || echo "CLEAN_ENV"
ถ้าเจอใน .env.example → ลบบรรทัดนั้นออกด้วย ไม่ใช่แค่ comment
ถ้าเจอในโค้ด → ลบการอ่าน env นั้นออก
Dependencies
grep -i "google\|openai\|anthropic" package.json
grep -i "google.*genai" package-lock.json || echo "CLEAN_LOCK"
ต้องไม่มี @google/genai / @google/generative-ai / openai ใน dependencies ถ้านโยบายคือไม่มี External Provider
ถ้ายังมี → npm uninstall <package> + git checkout -- package-lock.json แล้ว install ใหม่
ขั้นตอนลบจริง
เปิด 3 ไฟล์ UI ใน VS Code
ลบทั้ง Component / Card / Field ตามรายการข้างบน — ไม่ใช่ Replace string
กด Ctrl+S ทุกไฟล์
รันเช็ค:
grep -Rni "gemini" src/components/ || echo "CLEAN_UI"
grep -Rni "GEMINI_API_KEY" src/ lib/ || echo "CLEAN_ENV"
npm run typecheck
npm run build
git status --short ต้องขึ้น M 3 ไฟล์นั้น — ถ้าขึ้นว่างเปล่าแปลว่ายังไม่ได้ Save ห้าม Commit
Commit แยก:
git add -A
git commit -m "feat!: remove Gemini branding, provider cards, model options, API key fields from Product UI - no rename to CORE"
git push origin main
Acceptance
 ไม่มี Gemini Branding ใน Product UI
 ไม่มี Provider Cards ของ Gemini / OpenAI ใน ModelsPage / Settings
 ไม่มี API Key Field ของ Gemini
 ไม่มี Model Option ที่เป็น Gemini
 Backend ไม่มี GeminiProvider / Gemini-first Routing
 Env ไม่มี GEMINI_API_KEY / GOOGLE_API_KEY
 Dependencies ไม่มี Google SDK
 Guard ใน modelIdentityContract / sovereignty ยังอยู่ครบ
 Build + Typecheck ผ่าน
 Product Identity แสดงแค่ ZYNTHEOR CORE เท่านั้นในหน้าหลัก
