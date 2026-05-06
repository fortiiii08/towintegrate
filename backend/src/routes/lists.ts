import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

// Schemas
const createListSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  spaceId: z.string().uuid("Space ID inválido"),
  folderId: z.string().uuid().optional(),
});

const updateListSchema = z.object({
  name: z.string().min(1).optional(),
  folderId: z.string().uuid().nullable().optional(),
  orderIndex: z.number().optional(),
});

// Default statuses for new lists
const defaultStatuses = [
  { name: "A Fazer", color: "#6b7280", orderIndex: 0, isDone: false },
  { name: "Em Progresso", color: "#3b82f6", orderIndex: 1, isDone: false },
  { name: "Em Revisão", color: "#f59e0b", orderIndex: 2, isDone: false },
  { name: "Concluído", color: "#22c55e", orderIndex: 3, isDone: true },
];

// List lists by space
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { spaceId } = req.query;

    if (!spaceId) {
      return res.status(400).json({ error: "spaceId é obrigatório" });
    }

    const lists = await prisma.list.findMany({
      where: { spaceId: spaceId as string },
      orderBy: { orderIndex: "asc" },
    });

    res.json(lists);
  } catch (error) {
    console.error("List lists error:", error);
    res.status(500).json({ error: "Erro ao listar listas" });
  }
});

// Get list by ID with statuses
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const list = await prisma.list.findUnique({
      where: { id: req.params.id },
      include: {
        statuses: {
          orderBy: { orderIndex: "asc" },
        },
        tasks: {
          where: { deletedAt: null },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!list) {
      return res.status(404).json({ error: "Lista não encontrada" });
    }

    res.json(list);
  } catch (error) {
    console.error("Get list error:", error);
    res.status(500).json({ error: "Erro ao buscar lista" });
  }
});

// Create list with default statuses
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createListSchema.parse(req.body);

    const list = await prisma.list.create({
      data: {
        name: data.name,
        spaceId: data.spaceId,
        folderId: data.folderId,
        statuses: {
          create: defaultStatuses,
        },
      },
      include: {
        statuses: true,
      },
    });

    res.status(201).json(list);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("Create list error:", error);
    res.status(500).json({ error: "Erro ao criar lista" });
  }
});

// Update list
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateListSchema.parse(req.body);

    const list = await prisma.list.update({
      where: { id: req.params.id },
      data,
    });

    res.json(list);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("Update list error:", error);
    res.status(500).json({ error: "Erro ao atualizar lista" });
  }
});

// Delete list
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.list.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Delete list error:", error);
    res.status(500).json({ error: "Erro ao excluir lista" });
  }
});

// Get statuses for a list
router.get("/:id/statuses", async (req: AuthRequest, res: Response) => {
  try {
    const statuses = await prisma.status.findMany({
      where: { listId: req.params.id },
      orderBy: { orderIndex: "asc" },
    });

    res.json(statuses);
  } catch (error) {
    console.error("List statuses error:", error);
    res.status(500).json({ error: "Erro ao listar status" });
  }
});

// Create status
router.post("/:id/statuses", async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, isDone } = req.body;

    const status = await prisma.status.create({
      data: {
        listId: req.params.id,
        name,
        color: color || "#407b75",
        isDone: isDone || false,
      },
    });

    res.status(201).json(status);
  } catch (error) {
    console.error("Create status error:", error);
    res.status(500).json({ error: "Erro ao criar status" });
  }
});

// Update status
router.put("/:listId/statuses/:statusId", async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, isDone, orderIndex } = req.body;

    const status = await prisma.status.update({
      where: { id: req.params.statusId },
      data: { name, color, isDone, orderIndex },
    });

    res.json(status);
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ error: "Erro ao atualizar status" });
  }
});

// Delete status
router.delete("/:listId/statuses/:statusId", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.status.delete({
      where: { id: req.params.statusId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Delete status error:", error);
    res.status(500).json({ error: "Erro ao excluir status" });
  }
});

export default router;
