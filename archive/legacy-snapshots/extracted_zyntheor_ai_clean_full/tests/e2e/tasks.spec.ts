import { test, expect } from "@playwright/test";

test.describe("Buffalo 0.9.0 - E2E Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    // 1. จำลองการ Login เข้าสู่ระบบ
    await page.goto("http://localhost:3000");
    await page.evaluate(() => {
      localStorage.setItem("token", "mock_jwt_token");
    });
  });

  test("ควรสร้าง Task ใหม่ และแสดงผลบนรายการได้ถูกต้อง", async ({ page }) => {
    await page.goto("http://localhost:3000");

    // กรอกชื่อ Task ใหม่
    const input = page.locator('input[placeholder="เพิ่มงานใหม่..."]');
    await input.fill("E2E Test Task");
    await page.click('button:has-text("เพิ่ม")');

    // ตรวจสอบว่ามี Task ปรากฏขึ้นใน List
    await expect(page.locator("text=E2E Test Task")).toBeVisible();
  });

  test("ควรเปลี่ยนสถานะ Task จาก Pending เป็น Done ได้", async ({ page }) => {
    await page.goto("http://localhost:3000");

    const taskItem = page.locator("text=E2E Test Task");
    await taskItem.click();

    // ตรวจสอบสัญลักษณ์ Done (✅)
    await expect(page.locator("text=✅ E2E Test Task")).toBeVisible();
  });

  test("ควรลบ Task ออกจากรายการได้", async ({ page }) => {
    await page.goto("http://localhost:3000");

    // กดปุ่ม ลบ
    await page.click('button:has-text("ลบ")');

    // ตรวจสอบว่า Task หายไปแล้ว
    await expect(page.locator("text=E2E Test Task")).not.toBeVisible();
  });
});
