import { Router, Request, Response } from "express";
import { db } from "../db/connection";
import { tasks } from "../db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// Middleware สมมติสำหรับการยืนยันตัวตน (JWT Authentication)
const authenticateToken = (req: any, res: Response, next: Function) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access token required" });

  // ในระบบจริงจะใช้ jwt.verify(token, SECRET)
  // ตัวอย่างนี้จำลอง Payload จาก Token
  req.user = { id: 1, email: "user@example.com" };
  next();
};

router.use(authenticateToken);

// 1. GET /api/tasks - ดึงข้อมูล Task ทั้งหมดของ User (ป้องกัน IDOR)
router.get("/", async (req: any, res: Response) => {
  try {
    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.ownerId, req.user.id));

    res.json({ success: true, data: userTasks });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// 2. POST /api/tasks - สร้าง Task ใหม่
router.post("/", async (req: any, res: Response) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });

  try {
    const [newTask] = await db
      .insert(tasks)
      .values({
        ownerId: req.user.id,
        title,
        status: "pending",
      })
      .returning();

    // บันทึก Audit Log (ตัวอย่าง)
    console.log(`[AUDIT LOG] User ${req.user.id} created Task ${newTask.id}`);

    res.status(201).json({ success: true, data: newTask });
  } catch (error) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

// 3. PUT /api/tasks/:id - แก้ไข Task (ป้องกัน IDOR โดยเช็ก ownerId ร่วมกับ id)
router.put("/:id", async (req: any, res: Response) => {
  const taskId = parseInt(req.params.id);
  const { title, status } = req.body;

  try {
    const [updatedTask] = await db
      .update(tasks)
      .set({
        ...(title && { title }),
        ...(status && { status }),
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.ownerId, req.user.id)))
      .returning();

    if (!updatedTask) {
      return res.status(4403).json({ error: "Task not found or unauthorized access (IDOR Protection)" });
    }

    console.log(`[AUDIT LOG] User ${req.user.id} updated Task ${taskId}`);
    res.json({ success: true, data: updatedTask });
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

// 4. DELETE /api/tasks/:id - ลบ Task (ป้องกัน IDOR)
router.delete("/:id", async (req: any, res: Response) => {
  const taskId = parseInt(req.params.id);

  try {
    const [deletedTask] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.ownerId, req.user.id)))
      .returning();

    if (!deletedTask) {
      return res.status(403).json({ error: "Task not found or unauthorized access (IDOR Protection)" });
    }

    console.log(`[AUDIT LOG] User ${req.user.id} deleted Task ${taskId}`);
    res.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;
