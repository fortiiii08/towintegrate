import { Prisma } from "@prisma/client";
import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

// Auto-create new columns (EPERM-safe, idempotent)
async function ensureTaskColumns() {
  try { await prisma.$executeRawUnsafe(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ`); } catch {}
}
ensureTaskColumns();

// Schemas
const createTaskSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  listId: z.string().uuid("List ID inválido"),
  statusId: z.string().uuid().optional(),
  cidadeClientId: z.string().uuid().nullable().optional(),
  description: z.string().optional(),
  priority: z.enum(["urgent", "high", "normal", "low"]).default("normal"),
  dueDate: z.string().optional(),
  startDate: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  assigneeName: z.string().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  statusId: z.string().uuid().nullable().optional(),
  cidadeClientId: z.string().uuid().nullable().optional(),
  priority: z.enum(["urgent", "high", "normal", "low"]).optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  assigneeName: z.string().nullable().optional(),
  orderIndex: z.number().optional(),
});

async function createAssignNotification(
  taskId: string,
  taskTitle: string,
  assigneeId: string,
  reporterId: string,
  reporterName: string
) {
  const isSelf = assigneeId === reporterId;
  try {
    await prisma.taskNotification.create({
      data: {
        userId: assigneeId,
        type: isSelf ? "task_self_assigned" : "task_assigned",
        title: isSelf ? "Tarefa auto-atribuída" : "Nova tarefa atribuída",
        message: isSelf
          ? `${reporterName} atribuiu a tarefa "${taskTitle}" para si`
          : `${reporterName} atribuiu a tarefa "${taskTitle}" para você`,
        entityType: "task",
        entityId: taskId,
      },
    });
  } catch {
    // non-blocking
  }
}

// ── Tasks ────────────────────────────────────────────────────────

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { listId, workspaceId } = req.query;

    // ── By workspace (all tasks across all lists) ─────────────────
    if (workspaceId && typeof workspaceId === "string") {
      const spaces = await prisma.space.findMany({ where: { workspaceId }, select: { id: true } });
      const spaceIds = spaces.map((s) => s.id);
      const lists = await prisma.list.findMany({ where: { spaceId: { in: spaceIds } }, select: { id: true } });
      const listIds = lists.map((l) => l.id);

      const isAdmin = req.user!.isAdmin;
      const where: any = { listId: { in: listIds }, deletedAt: null };
      if (!isAdmin) {
        where.OR = [{ reporterId: req.user!.id }, { assigneeId: req.user!.id }];
      }

      const tasks = await prisma.task.findMany({
        where,
        include: {
          status: true,
          cidadeClient: { select: { id: true, name: true, imageUrl: true } },
        },
        orderBy: { orderIndex: "asc" },
      });
      return res.json(tasks);
    }

    // ── By list (original behaviour) ──────────────────────────────
    if (!listId || typeof listId !== "string") {
      return res.status(400).json({ error: "listId ou workspaceId é obrigatório" });
    }

    const isAdmin = req.user!.isAdmin;
    const where: any = { listId, deletedAt: null };
    if (!isAdmin) {
      where.OR = [{ reporterId: req.user!.id }, { assigneeId: req.user!.id }];
    }
    const tasks = await prisma.task.findMany({
      where,
      include: {
        cidadeClient: { select: { id: true, name: true, imageUrl: true } },
      },
      orderBy: { orderIndex: "asc" },
    });

    res.json(tasks);
  } catch (error) {
    console.error("List tasks error:", error);
    res.status(500).json({ error: "Erro ao listar tarefas" });
  }
});

// ── Inbox (all tasks assigned to current user) ───────────────────
router.get("/inbox", async (req: AuthRequest, res: Response) => {
  try {
    const where: any = { deletedAt: null };
    if (!req.user!.isAdmin) {
      where.assigneeId = req.user!.id;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        status: true,
        cidadeClient: { select: { id: true, name: true, imageUrl: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    // Fetch assigned_at from new column (not in Prisma schema yet)
    let assignedAtMap: Record<string, Date | null> = {};
    if (tasks.length > 0) {
      try {
        const ids = tasks.map((t) => t.id);
        const raw = await prisma.$queryRaw<{ id: string; assigned_at: Date | null }[]>`
          SELECT id, assigned_at FROM tasks WHERE id = ANY(${ids}::uuid[])
        `;
        assignedAtMap = Object.fromEntries(raw.map((r) => [r.id, r.assigned_at]));
      } catch {}
    }

    const result = tasks.map((t) => ({
      ...t,
      assignedAt: assignedAtMap[t.id] ?? t.createdAt,
    }));

    // Sort by assignedAt desc
    result.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());

    res.json(result);
  } catch (error) {
    console.error("Inbox tasks error:", error);
    res.status(500).json({ error: "Erro ao buscar tarefas" });
  }
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        status: true,
        cidadeClient: { select: { id: true, name: true, imageUrl: true } },
        subtasks: { orderBy: { orderIndex: "asc" } },
        checklistItems: { orderBy: { orderIndex: "asc" } },
        comments: { orderBy: { createdAt: "asc" } },
        tags: { include: { tag: true } },
        watchers: true,
      },
    });

    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
    res.json(task);
  } catch (error) {
    console.error("Get task error:", error);
    res.status(500).json({ error: "Erro ao buscar tarefa" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createTaskSchema.parse(req.body);

    const task = await prisma.task.create({
      data: {
        title: data.title,
        listId: data.listId,
        statusId: data.statusId,
        cidadeClientId: data.cidadeClientId ?? null,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        assigneeId: data.assigneeId,
        assigneeName: data.assigneeName,
        reporterId: req.user!.id,
        reporterName: req.user!.name,
      },
    });

    // Set assigned_at on creation
    if (data.assigneeId) {
      try {
        await prisma.$executeRawUnsafe(`UPDATE tasks SET assigned_at = NOW() WHERE id = $1`, task.id);
      } catch {}
    }

    // Notify assignee (including self-assignment)
    if (data.assigneeId) {
      await createAssignNotification(task.id, task.title, data.assigneeId, req.user!.id, req.user!.name);
    }

    res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error("Create task error:", error);
    res.status(500).json({ error: "Erro ao criar tarefa" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateTaskSchema.parse(req.body);

    const existingTask = await prisma.task.findFirst({
      where: { id: req.params.id, deletedAt: null },
    });

    if (!existingTask) return res.status(404).json({ error: "Tarefa não encontrada" });

    const updateData: Prisma.TaskUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.cidadeClientId !== undefined) {
      updateData.cidadeClient = data.cidadeClientId
        ? { connect: { id: data.cidadeClientId } }
        : { disconnect: true };
    }
    if (data.statusId !== undefined) {
      updateData.status = data.statusId ? { connect: { id: data.statusId } } : { disconnect: true };
    }
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.assigneeId !== undefined) {
      updateData.assignee = data.assigneeId ? { connect: { id: data.assigneeId } } : { disconnect: true };
    }
    if (data.assigneeName !== undefined) updateData.assigneeName = data.assigneeName;
    if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex;

    const task = await prisma.task.update({ where: { id: req.params.id }, data: updateData });

    // Record status change timestamp
    if (data.statusId !== undefined && data.statusId !== existingTask.statusId) {
      try {
        await prisma.$executeRawUnsafe(`UPDATE tasks SET status_changed_at = NOW() WHERE id = $1`, req.params.id);
      } catch {}
    }

    // Record assignment timestamp
    if (data.assigneeId !== undefined && data.assigneeId !== existingTask.assigneeId && data.assigneeId) {
      try {
        await prisma.$executeRawUnsafe(`UPDATE tasks SET assigned_at = NOW() WHERE id = $1`, req.params.id);
      } catch {}
    }

    // Notify new assignee (including self-assignment)
    if (data.assigneeId && data.assigneeId !== existingTask.assigneeId) {
      await createAssignNotification(task.id, task.title, data.assigneeId, req.user!.id, req.user!.name);
    }

    res.json(task);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error("Update task error:", error);
    res.status(500).json({ error: "Erro ao atualizar tarefa" });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) return res.status(404).json({ error: "Tarefa não encontrada" });
    await prisma.task.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ error: "Erro ao excluir tarefa" });
  }
});

// ── Complete / Uncomplete task ────────────────────────────────────
router.put("/:id/complete", async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.task.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });

    const doneStatus = await prisma.taskStatus.findFirst({
      where: { listId: task.listId, isDone: true },
      orderBy: { orderIndex: "asc" },
    });
    if (!doneStatus) return res.status(404).json({ error: "Nenhum status de conclusão configurado para esta lista" });

    await prisma.task.update({ where: { id: req.params.id }, data: { statusId: doneStatus.id } });
    await prisma.$executeRawUnsafe(`UPDATE tasks SET status_changed_at = NOW() WHERE id = $1`, req.params.id);

    res.json({ success: true, statusId: doneStatus.id });
  } catch (err) {
    console.error("Complete task error:", err);
    res.status(500).json({ error: "Erro ao concluir tarefa" });
  }
});

// ── Subtasks ─────────────────────────────────────────────────────

router.get("/:id/subtasks", async (req: AuthRequest, res: Response) => {
  try {
    const subtasks = await prisma.subtask.findMany({
      where: { taskId: req.params.id },
      orderBy: { orderIndex: "asc" },
    });
    res.json(subtasks);
  } catch (error) {
    console.error("List subtasks error:", error);
    res.status(500).json({ error: "Erro ao listar subtarefas" });
  }
});

router.post("/:id/subtasks", async (req: AuthRequest, res: Response) => {
  try {
    const { title, assigneeId, assigneeName } = req.body;
    const subtask = await prisma.subtask.create({
      data: { taskId: req.params.id, title, assigneeId, assigneeName },
    });
    res.status(201).json(subtask);
  } catch (error) {
    console.error("Create subtask error:", error);
    res.status(500).json({ error: "Erro ao criar subtarefa" });
  }
});

router.put("/:taskId/subtasks/:subtaskId", async (req: AuthRequest, res: Response) => {
  try {
    const { title, isDone, assigneeId, assigneeName, orderIndex } = req.body;
    const subtask = await prisma.subtask.update({
      where: { id: req.params.subtaskId },
      data: { title, isDone, assigneeId, assigneeName, orderIndex },
    });
    res.json(subtask);
  } catch (error) {
    console.error("Update subtask error:", error);
    res.status(500).json({ error: "Erro ao atualizar subtarefa" });
  }
});

router.delete("/:taskId/subtasks/:subtaskId", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.subtask.delete({ where: { id: req.params.subtaskId } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete subtask error:", error);
    res.status(500).json({ error: "Erro ao excluir subtarefa" });
  }
});

// ── Comments ─────────────────────────────────────────────────────

router.get("/:id/comments", async (req: AuthRequest, res: Response) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { taskId: req.params.id },
      orderBy: { createdAt: "asc" },
    });
    res.json(comments);
  } catch (error) {
    console.error("List comments error:", error);
    res.status(500).json({ error: "Erro ao listar comentários" });
  }
});

router.post("/:id/comments", async (req: AuthRequest, res: Response) => {
  try {
    const { body } = req.body;
    const comment = await prisma.comment.create({
      data: {
        taskId: req.params.id,
        userId: req.user!.id,
        userName: req.user!.name,
        userEmail: req.user!.email,
        body,
      },
    });
    res.status(201).json(comment);
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({ error: "Erro ao criar comentário" });
  }
});

router.put("/:taskId/comments/:commentId", async (req: AuthRequest, res: Response) => {
  try {
    const { body } = req.body;
    const comment = await prisma.comment.update({
      where: { id: req.params.commentId },
      data: { body },
    });
    res.json(comment);
  } catch (error) {
    console.error("Update comment error:", error);
    res.status(500).json({ error: "Erro ao atualizar comentário" });
  }
});

router.delete("/:taskId/comments/:commentId", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.comment.delete({ where: { id: req.params.commentId } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ error: "Erro ao excluir comentário" });
  }
});

export default router;
