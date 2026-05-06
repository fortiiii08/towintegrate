import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

// List notifications for current user
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.taskNotification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
  } catch (error) {
    console.error("List notifications error:", error);
    res.status(500).json({ error: "Erro ao listar notificações" });
  }
});

// Mark single as read
router.put("/:id/read", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.taskNotification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ error: "Erro ao marcar notificação" });
  }
});

// Mark all as read
router.put("/read-all", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.taskNotification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Mark all read error:", error);
    res.status(500).json({ error: "Erro ao marcar notificações" });
  }
});

export default router;
