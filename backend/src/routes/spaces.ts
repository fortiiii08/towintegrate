import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

// Schemas
const createSpaceSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  workspaceId: z.string().uuid("Workspace ID inválido"),
  color: z.string().optional(),
  icon: z.string().optional(),
});

const updateSpaceSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  orderIndex: z.number().optional(),
});

// List spaces by workspace
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId é obrigatório" });
    }

    const spaces = await prisma.space.findMany({
      where: { workspaceId: workspaceId as string },
      orderBy: { orderIndex: "asc" },
    });

    res.json(spaces);
  } catch (error) {
    console.error("List spaces error:", error);
    res.status(500).json({ error: "Erro ao listar espaços" });
  }
});

// Get space by ID
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const space = await prisma.space.findUnique({
      where: { id: req.params.id },
      include: {
        lists: {
          orderBy: { orderIndex: "asc" },
        },
        folders: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!space) {
      return res.status(404).json({ error: "Espaço não encontrado" });
    }

    res.json(space);
  } catch (error) {
    console.error("Get space error:", error);
    res.status(500).json({ error: "Erro ao buscar espaço" });
  }
});

// Create space
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createSpaceSchema.parse(req.body);

    const space = await prisma.space.create({
      data: {
        name: data.name,
        workspaceId: data.workspaceId,
        color: data.color || "#407b75",
        icon: data.icon || "folder",
      },
    });

    res.status(201).json(space);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("Create space error:", error);
    res.status(500).json({ error: "Erro ao criar espaço" });
  }
});

// Update space
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateSpaceSchema.parse(req.body);

    const space = await prisma.space.update({
      where: { id: req.params.id },
      data,
    });

    res.json(space);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("Update space error:", error);
    res.status(500).json({ error: "Erro ao atualizar espaço" });
  }
});

// Delete space
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.space.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Delete space error:", error);
    res.status(500).json({ error: "Erro ao excluir espaço" });
  }
});

export default router;
