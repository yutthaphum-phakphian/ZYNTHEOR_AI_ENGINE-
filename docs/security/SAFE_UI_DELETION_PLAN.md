SAFE UI DELETION — ลบแบบไม่ทิ้ง State / Handler / Validation ตกค้าง
Date: 2026-11-06
Rule: ห้ามลบ Card / Section ด้วยการเลือกข้อความแบบสุ่ม — ต้องไล่ Dependency Chain ให้ครบก่อนลบ
Gate: Layer 1 UI = FAIL, Layer 2 Call Path = ยังไม่ยืนยัน, Layer 3 Guard & Build = PASS

หลักการลบแบบปลอดภัย
หา Definition ก่อนลบ: State, Handler, Validation, Type, Import ที่ผูกกับ UI นั้น
หา Usages ทั้งหมด: ใช้ Find All References ใน VS Code (Shift + F12) ว่า State / Handler นั้นถูกใช้ที่อื่นไหม
ถ้าใช้เฉพาะ Gemini → ลบทั้ง Chain: State + Handler + Validation + Type + UI
ถ้าใช้ร่วมกับ Provider อื่น → ลบแค่ Branch ของ Gemini ออก ไม่ลบ State กลาง
หลังลบ: Typecheck + Build + Tests ต้องผ่าน และ grep ต้อง CLEAN ทั้งชื่อและ State ที่เหลือ
1. GovernanceObservabilityPanels.tsx — ลบ Gemini Provider Card + ข้อมูลเฉพาะ Provider
ค้นหาก่อนลบ (Ctrl + Shift + F ในไฟล์นี้):

provider-gemini-primary
leaderProviderId
providerCard / ProviderCard
geminiProvider / geminiStatus
เช็ค:

ถ้า leaderProviderId ใช้แค่เลือก Gemini → ลบ State + Handler ที่ set leaderProviderId ของ Gemini ด้วย
ถ้า leaderProviderId ใช้เลือก Provider อื่นด้วย (ZYNTHEOR CORE / Ollama) → ลบแค่ Option 'provider-gemini-primary' ออกจาก array ไม่ลบ State กลาง
ถ้ามี Type ที่มี 'provider-gemini-primary' → ลบแค่ member นั้น ไม่ลบ Type ทั้งก้อนถ้ายังใช้กับ CORE
ลบ:

Gemini Provider Card Component ทั้งก้อน
Gemini entry ใน array / map ของ Providers
Gemini-specific status / description / icon ที่ผูกกับ Card นั้นเท่านั้น
KEEP:

ZYNTHEOR CORE Card + Logic ของ CORE
Guard: blockedPrefixes, isGemini check — ห้ามลบ
2. SettingsCenter.tsx — ลบ Gemini / OpenAI / Anthropic UI + GEMINI_API_KEY Field + State + Validation
ค้นหาก่อนลบ:

GEMINI_API_KEY, geminiApiKey, geminiKey
handleGeminiKeyChange / onGeminiKeyChange / setGeminiApiKey
validateGeminiKey / geminiKeyValid / geminiKeyError
descTh / descEn ที่มี 'Gemini, OpenAI, Anthropic'
openaiApiKey / anthropicApiKey ถ้ามี — ลบด้วยหลักการเดียวกันถ้านโยบายคือไม่มี External
เช็ค:

ถ้า State geminiApiKey ถูกใช้แค่ใน Field นี้ → ลบ State + useState + Handler + Validation ทั้ง Chain
ถ้า Validation function ใช้ร่วมกับ Provider อื่น → ลบแค่ Branch ของ Gemini ออกจาก Validation ไม่ลบ function กลาง
ถ้ามี import ที่ใช้แค่สำหรับ Gemini Field → ลบ import นั้นด้วย
ลบ:

Gemini / OpenAI / Anthropic Section ทั้ง Section
GEMINI_API_KEY Field + Label + Configured / Not configured text
State + Handler + Validation ที่ผูกกับ Field นั้นเท่านั้น
KEEP:

Settings อื่นๆ ของ ZYNTHEOR CORE
Guard — ห้ามลบ
3. ModelsPage.tsx — ลบ Google Gemini Cloud Card + Logic เฉพาะที่ไม่มีผู้ใช้งานแล้ว
ค้นหาก่อนลบ:

Google Gemini Cloud, googleGemini, geminiModel, geminiCloud
handleSelectGemini / onSelectGemini / setSelectedGemini
geminiModelList / geminiPricing
เช็ค:

ถ้า Logic นั้นใช้แค่สำหรับ Gemini Card → ลบ Logic + Handler + State นั้นด้วย
ถ้า Card List ใช้ map จาก models array → ลบแค่ Gemini object ออกจาก array ไม่ลบ map logic
ถ้ามี fetch ที่ดึง Gemini models → ลบ fetch นั้นด้วย
ลบ:

Google Gemini Cloud Card ทั้งก้อน
Gemini entry ใน models array
Handler / State / fetch ที่ใช้แค่ Gemini
KEEP:

ZYNTHEOR CORE / CORE_NATIVE / CORE_ADAPTED / CORE_DISTILLED Cards
Guard — ห้ามลบ
ตรวจสอบหลังแก้ไข — 3 ชั้น
ชั้นที่ 1: UI CLEAN + ไม่มี State / Handler ตกค้าง
grep -RniE "gemini|google ai|openai|anthropic|claude|gpt-" src/components/ || echo CLEAN_UI
ต้องขึ้น CLEAN_UI

เช็ค State ที่อาจตกค้าง (ต้องขึ้น CLEAN ทุกบรรทัด):

grep -Rni "geminiApiKey|handleGemini|validateGemini|geminiModel|geminiProvider" src/components/ || echo CLEAN_STATE
ชั้นที่ 2: Call Path CLEAN
grep -Rni "generativelanguage|api.openai.com|api.anthropic.com" lib/ src/ || echo CLEAN_HOSTS
grep -Rni "GEMINI_API_KEY|GOOGLE_API_KEY|OPENAI_API_KEY" lib/ src/ .env.example || echo CLEAN_ENV
grep -Rni "wantsGemini|gemini-first|fallbackList" lib/ src/ || echo CLEAN_ROUTING
ชั้นที่ 3: Guard + Build + Tests
npm run typecheck
npm run build
npm test
Typecheck ต้องผ่าน — ถ้ามี State ตกค้างที่ไม่ได้ใช้แต่เปิด noUnusedLocals จะ fail ตรงนี้ = ต้องลบ State นั้นออกด้วย
Build ต้องผ่าน
Tests ต้องผ่านจริง ห้ามปิด Test ห้าม Mock หลอกผล
ชั้นที่ 4: Git Diff — ยืนยันว่าไม่ลบ Logic ที่ยังจำเป็น
git diff --stat
git diff -- src/components/GovernanceObservabilityPanels.tsx src/components/SettingsCenter.tsx src/components/ModelsPage.tsx
ตรวจด้วยตา:

Diff ต้องแสดงแค่การลบ Gemini / OpenAI / Anthropic + State/Handler ที่ผูกกันเท่านั้น
ถ้า Diff แสดงการลบ Logic ของ ZYNTHEOR CORE → หยุด อย่า Commit ให้ revert แล้วลบใหม่แบบระวัง
Gate Pass Conditions
 UI ไม่มี External Provider ที่ไม่ต้องการ
 ไม่มี State / Handler / Validation ตกค้างหลังลบ
 Guard ยังทำงาน (blockedPrefixes + isGemini)
 ไม่มี Silent Fallback
 Typecheck, Build, Tests ผ่าน
 Git Diff ยืนยันว่าไม่ลบ Logic ที่ยังจำเป็น
Gate = NOT PASSED จนกว่าทุกชั้นจะมีหลักฐานจริง
CLEAN FIRST → VERIFY → REBUILD NATIVE → EXPAND

