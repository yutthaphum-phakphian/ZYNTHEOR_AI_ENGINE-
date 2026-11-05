// @ts-nocheck
import { Router, type Request, type Response, type NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.ts';
import { tasks } from '../db/schema.ts';
import { postgresIdentityService } from '../services/postgresIdentityService.ts';

const router = Router();
type AuthenticatedTaskRequest = Request & { userId?: number; tenantId?: string };

async function authenticateSession(req: AuthenticatedTaskRequest, res: Response, next: NextFunction) {
  const bearer = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const sessionCookie = String(req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('zyntheor_session='));
  let cookieToken = '';
  if (sessionCookie) { try { cookieToken = decodeURIComponent(sessionCookie.slice('zyntheor_session='.length)); } catch { cookieToken = ''; } }
  const token = cookieToken || bearer;
  if (!token) return res.status(401).json({ error: 'Access session required' });
  try {
    const result = await postgresIdentityService.validateSession(token);
    if (!result.valid || !result.session) return res.status(401).json({ error: 'Session is invalid, expired, revoked, or unauthorized' });
    req.userId = result.session.userId;
    req.tenantId = result.session.tenantId;
    return next();
  } catch {
    return res.status(503).json({ error: 'Identity database unavailable; no local fallback was used' });
  }
}
router.use(authenticateSession);

router.get('/', async (req: AuthenticatedTaskRequest, res: Response) => {
  try {
    const userTasks = await db.select().from(tasks).where(eq(tasks.ownerId, req.userId!));
    return res.json({ success: true, data: userTasks });
  } catch {
    return res.status(503).json({ error: 'PostgreSQL task storage unavailable' });
  }
});
router.post('/', async (req: AuthenticatedTaskRequest, res: Response) => {
  const title = req.body?.title;
  if (typeof title !== 'string' || !title.trim() || title.length > 255) return res.status(400).json({ error: 'A valid title is required' });
  try {
    const [newTask] = await db.insert(tasks).values({ ownerId: req.userId!, title: title.trim(), status: 'pending' }).returning();
    return res.status(201).json({ success: true, data: newTask });
  } catch {
    return res.status(503).json({ error: 'PostgreSQL task storage unavailable' });
  }
});
router.put('/:id', async (req: AuthenticatedTaskRequest, res: Response) => {
  const taskId = Number(req.params.id);
  if (!Number.isSafeInteger(taskId) || taskId < 1) return res.status(400).json({ error: 'Invalid task ID' });
  const { title, status } = req.body || {};
  if (title !== undefined && (typeof title !== 'string' || !title.trim() || title.length > 255)) return res.status(400).json({ error: 'Invalid title' });
  try {
    const [updatedTask] = await db.update(tasks).set({ ...(title !== undefined ? { title: title.trim() } : {}), ...(status !== undefined ? { status } : {}), updatedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.ownerId, req.userId!))).returning();
    if (!updatedTask) return res.status(404).json({ error: 'Task not found or access denied' });
    return res.json({ success: true, data: updatedTask });
  } catch {
    return res.status(503).json({ error: 'PostgreSQL task storage unavailable' });
  }
});
router.delete('/:id', async (req: AuthenticatedTaskRequest, res: Response) => {
  const taskId = Number(req.params.id);
  if (!Number.isSafeInteger(taskId) || taskId < 1) return res.status(400).json({ error: 'Invalid task ID' });
  try {
    const [deletedTask] = await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.ownerId, req.userId!))).returning();
    if (!deletedTask) return res.status(404).json({ error: 'Task not found or access denied' });
    return res.json({ success: true, message: 'Task deleted successfully' });
  } catch {
    return res.status(503).json({ error: 'PostgreSQL task storage unavailable' });
  }
});
export default router;
