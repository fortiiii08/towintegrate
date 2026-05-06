import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

// Schemas
const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  role: z.enum(["client", "employee"]).default("employee"),
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

function buildUserResponse(user: any, linkedClientId?: string | null) {
  return {
    id: user.id,
    email: user.email,
    isAdmin: user.userRoles?.some((r: any) => r.role === "admin") || false,
    isSecondOwner: user.userRoles?.some((r: any) => r.role === "second_owner") || false,
    profile: user.profile
      ? {
          id: user.profile.id,
          userId: user.profile.userId,
          name: user.profile.name,
          email: user.profile.email,
          avatarUrl: user.profile.avatarUrl || null,
          createdAt: user.profile.createdAt,
          updatedAt: user.profile.updatedAt,
        }
      : null,
    roles: user.userRoles?.map((r: any) => r.role) || [],
    linkedClientId: linkedClientId ?? null,
  };
}

async function fetchLinkedClientId(userId: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ linked_cidade_client_id: string | null }[]>(
      `SELECT linked_cidade_client_id FROM users WHERE id = $1`, userId
    );
    return rows[0]?.linked_cidade_client_id ?? null;
  } catch {
    return null;
  }
}

// Register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        profile: {
          create: { name: data.name, email: data.email },
        },
        userRoles: {
          create: { role: data.role },
        },
      },
      include: { profile: true, userRoles: true },
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Auto-create inside_member card for employees
    if (data.role === "employee") {
      prisma.$executeRawUnsafe(
        `INSERT INTO inside_members (name, email, user_id)
         SELECT $1, $2, $3::uuid WHERE NOT EXISTS (SELECT 1 FROM inside_members WHERE user_id = $3::uuid)`,
        data.name, data.email, user.id
      ).catch(() => {});
    }

    const linkedClientId = await fetchLinkedClientId(user.id);
    res.status(201).json({ token, user: buildUserResponse(user, linkedClientId) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("Register error:", error);
    res.status(500).json({ error: "Erro ao criar conta" });
  }
});

// Login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { profile: true, userRoles: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    const linkedClientId = await fetchLinkedClientId(user.id);
    res.json({ token, user: buildUserResponse(user, linkedClientId) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error("Login error:", error);
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

// Get current user
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { profile: true, userRoles: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const linkedClientId = await fetchLinkedClientId(user.id);
    res.json(buildUserResponse(user, linkedClientId));
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

// Forgot password (placeholder - needs email service)
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if email exists
      return res.json({ success: true });
    }

    // TODO: Implement email sending with reset token
    // For now, just acknowledge
    res.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Erro ao processar solicitação" });
  }
});

// Update password
router.put("/update-password", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({ error: "Erro ao atualizar senha" });
  }
});

// Refresh token
router.post("/refresh", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const token = jwt.sign(
      { userId: req.user!.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: "Erro ao renovar token" });
  }
});

export default router;
