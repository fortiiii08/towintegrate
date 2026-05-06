import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Schemas
const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

// List workspaces
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { createdBy: req.user!.id },
          { members: { some: { userId: req.user!.id } } },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(workspaces);
  } catch (error) {
    console.error("List workspaces error:", error);
    res.status(500).json({ error: "Erro ao listar workspaces" });
  }
});

// Get workspace by ID
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
      include: {
        members: true,
        spaces: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: "Workspace não encontrado" });
    }

    res.json(workspace);
  } catch (error) {
    console.error("Get workspace error:", error);
    res.status(500).json({ error: "Erro ao buscar workspace" });
  }
});

// Create workspace
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createWorkspaceSchema.parse(req.body);

    const workspace = await prisma.workspace.create({
      data: {
        name: data.name,
        description: data.description,
        createdBy: req.user!.id,
        members: {
          create: {
            userId: req.user!.id,
            userEmail: req.user!.email,
            userName: req.user!.name,
            role: "owner",
            joinedAt: new Date(),
          },
        },
      },
    });

    res.status(201).json(workspace);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("Create workspace error:", error);
    res.status(500).json({ error: "Erro ao criar workspace" });
  }
});

// Update workspace
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateWorkspaceSchema.parse(req.body);

    const workspace = await prisma.workspace.update({
      where: { id: req.params.id },
      data,
    });

    res.json(workspace);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("Update workspace error:", error);
    res.status(500).json({ error: "Erro ao atualizar workspace" });
  }
});

// Delete workspace
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.workspace.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Delete workspace error:", error);
    res.status(500).json({ error: "Erro ao excluir workspace" });
  }
});

// Get workspace members
router.get("/:id/members", async (req: AuthRequest, res: Response) => {
  try {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: "asc" },
    });

    res.json(members);
  } catch (error) {
    console.error("List members error:", error);
    res.status(500).json({ error: "Erro ao listar membros" });
  }
});

// Add member to workspace
router.post("/:id/members", async (req: AuthRequest, res: Response) => {
  try {
    const { userId, role = "member" } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId: req.params.id,
        userId: user.id,
        userEmail: user.email,
        userName: user.profile?.name || "Usuário",
        role,
      },
    });

    res.status(201).json(member);
  } catch (error) {
    console.error("Add member error:", error);
    res.status(500).json({ error: "Erro ao adicionar membro" });
  }
});

// Remove member from workspace
router.delete("/:id/members/:userId", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId: req.params.id,
          userId: req.params.userId,
        },
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({ error: "Erro ao remover membro" });
  }
});

export default router;
