# Authentication Hardening — สถานะการพัฒนา

## สิ่งที่ปรับในรอบนี้
- เพิ่ม rate limit แบบ in-memory สำหรับ `/api/auth/register` (5 ครั้ง/15 นาที/IP) และ `/api/auth/login` (10 ครั้ง/15 นาที/IP)
- ตรวจรูปแบบอีเมล ความยาวรหัสผ่าน และชื่อก่อนเรียก IdentityService
- ใช้ HTTP 409 สำหรับอีเมลที่สมัครแล้ว และข้อความ Login แบบทั่วไปเพื่อลดการเปิดเผยรายละเอียดบัญชี
- จำกัดข้อความผิดพลาดจาก Registration ไม่ให้ส่ง exception ภายในกลับไปยังผู้ใช้
- ยกเลิกการเก็บ Bearer token ใน `localStorage`; ใช้ `sessionStorage` เท่านั้นใน AccountCenterModal

## ข้อจำกัดที่ยังต้องแก้ก่อนเปิดสมัครสมาชิกสาธารณะ
- Rate limit เป็น in-memory ต่อ process; production หลาย instance ต้องใช้ Redis หรือ shared store
- ยังต้องทบทวนค่าเริ่มต้นบัญชีผู้ดูแลระบบใน `IdentityService` และยกเลิก credential เริ่มต้นที่คาดเดาได้ก่อน deploy
- ยังไม่มี password reset / email verification workflow ที่ยืนยันตัวตนผ่านอีเมลจริง
- ควรย้าย session ไปใช้ Secure, HttpOnly, SameSite cookies พร้อม CSRF protection แทนการเก็บ bearer token ใน JavaScript storage
- ตรวจสอบ PBKDF2 work factor และแผน migration แบบ versioned ก่อนปรับค่า hash เดิม
- ต้องตรวจ proxy trust configuration ก่อนเชื่อถือ `X-Forwarded-For`
- ต้องใช้ persistent shared database และ unique constraints สำหรับ registration ใน deployment หลาย instance

## Verification
Dependencies ไม่ได้ติดตั้งในสภาพแวดล้อมนี้ จึงยังไม่ได้รัน TypeScript, integration tests หรือ production build รอบนี้ การเปลี่ยนแปลงนี้ไม่ถือเป็นการรับรองความพร้อม production
