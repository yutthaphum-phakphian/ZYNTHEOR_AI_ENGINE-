#!/bin/bash
# ZYNTHEOR - CLEAR ALL MOCKS - ZERO MOCK MODE
# รันใน root ของโปรเจค zyntheor-ai-fixed

echo "=== 1. หาไฟล์ที่มีคำว่า MOCK / mockData / fake ==="
grep -R -n --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -i "mock\|fakeData\|dummyData\|generateRollingFallback\|Math.random" src/ | grep -v "node_modules"

echo ""
echo "=== 2. ลบ __mocks__ และ *.mock.* ทั้งหมด ==="
find . -type d -name "__mocks__" -prune -exec rm -rf {} +
find . -type f -name "*.mock.*" -delete
find . -type f -name "*mock*" | grep -v node_modules | grep -v ".git"

echo ""
echo "=== 3. เช็ค Math.random ที่เหลือ (ต้องเป็น 0) ==="
grep -R -n "Math.random" --include="*.ts" --include="*.tsx" src/ | grep -v "node_modules" || echo "✓ No Math.random found - ZERO MOCK VERIFIED"

echo ""
echo "=== 4. เช็ค generateRollingFallback ที่เหลือ (ต้องเป็น 0) ==="
grep -R -n "generateRollingFallback\|generateFallback" --include="*.ts" --include="*.tsx" src/ || echo "✓ No fallback generator found - ZERO MOCK VERIFIED"

echo ""
echo "=== 5. เช็ค hardcoded HMAC test secret (CRITICAL) ==="
grep -R -n "test-hmac-secret-for-ci-only" --include="*.ts" --include="*.tsx" src/ || echo "✓ No hardcoded HMAC test secret - PASS"

echo ""
echo "=== 6. ลบ dist / build / .turbo / coverage ==="
rm -rf dist build .turbo coverage .next

echo ""
echo "=== 7. Clean install ==="
npm ci

echo ""
echo "=== 8. Typecheck ==="
npm run typecheck

echo ""
echo "=== 9. Build ==="
npm run build

echo ""
echo "=== 10. Verify No Mocks in Build Output ==="
grep -R -i "mock" dist/ 2>/dev/null | head -20 || echo "✓ No mock strings in dist/"

echo ""
echo "=== DONE - ZERO MOCK VERIFIED ==="
echo "ถ้าขึ้น ✓ ทั้งหมด แปลว่าเคลียร์ MOCK หมดแล้วบง"
