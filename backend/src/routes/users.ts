import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();
const OWNER_EMAIL = "gustavosaforti@gmail.com";
const SECOND_OWNER_ROLE = "second_owner";

router.use(authenticate);

// ── Helpers ──────────────────────────────────────────────────────

const isOwner = (req: AuthRequest) => req.user?.email === OWNER_EMAIL;
const isOwnerOrSuperAdmin = (req: AuthRequest) =>
  req.user?.email === OWNER_EMAIL || req.user?.isSecondOwner === true;

// ── Ensure card blocks table ──────────────────────────────────────
async function ensureCardBlocksTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS user_card_blocks (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      card_id VARCHAR(50) NOT NULL,
      PRIMARY KEY (user_id, card_id)
    )
  `).catch(() => {});
}
ensureCardBlocksTable();

// ── List employees (for task assignment) ─────────────────────────
router.get("/employees", async (req: AuthRequest, res: Response) => {
  try {
    const employees = await prisma.user.findMany({
      where: {
        userRoles: { some: { role: { in: ["employee", "admin"] } } },
      },
      include: { profile: true },
    });

    const result = employees.map((user) => ({
      userId: user.id,
      name: user.profile?.name || "Usuário",
      email: user.email,
    }));

    res.json(result);
  } catch (error) {
    console.error("List employees error:", error);
    res.status(500).json({ error: "Erro ao listar funcionários" });
  }
});

// ── List all profiles ─────────────────────────────────────────────
router.get("/profiles", async (req: AuthRequest, res: Response) => {
  try {
    const profiles = await prisma.profile.findMany({
      orderBy: { name: "asc" },
    });
    res.json(profiles);
  } catch (error) {
    console.error("List profiles error:", error);
    res.status(500).json({ error: "Erro ao listar perfis" });
  }
});

// ── Get / Update user profile ─────────────────────────────────────
router.get("/profile/:id", async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.params.id },
    });
    if (!profile) return res.status(404).json({ error: "Perfil não encontrado" });
    res.json(profile);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Erro ao buscar perfil" });
  }
});

router.put("/profile", async (req: AuthRequest, res: Response) => {
  try {
    const { name, avatarUrl } = req.body;
    const profile = await prisma.profile.update({
      where: { userId: req.user!.id },
      data: { name, avatarUrl },
    });
    if (name) {
      await prisma.task.updateMany({ where: { assigneeId: req.user!.id }, data: { assigneeName: name } }).catch(() => {});
      await prisma.task.updateMany({ where: { reporterId: req.user!.id }, data: { reporterName: name } }).catch(() => {});
    }
    res.json(profile);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Erro ao atualizar perfil" });
  }
});

// ══════════════════════════════════════════════════════════════════
// ADMIN MANAGEMENT (owner + super_admin)
// ══════════════════════════════════════════════════════════════════

// List all users with roles (owner + super_admin)
router.get("/admins", async (req: AuthRequest, res: Response) => {
  if (!isOwnerOrSuperAdmin(req)) {
    return res.status(403).json({ error: "Acesso negado" });
  }
  try {
    const users = await prisma.user.findMany({
      include: { profile: true, userRoles: true },
      orderBy: { profile: { name: "asc" } },
    });
    res.json(users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.profile?.name || u.email,
      isAdmin: u.userRoles.some(r => r.role === "admin"),
      isSecondOwner: u.userRoles.some(r => r.role === SECOND_OWNER_ROLE),
      roles: u.userRoles.map(r => r.role),
    })));
  } catch (error) {
    console.error("List admins error:", error);
    res.status(500).json({ error: "Erro ao listar usuários" });
  }
});

// Promote to admin (owner + super_admin)
router.post("/admins/:id", async (req: AuthRequest, res: Response) => {
  if (!isOwnerOrSuperAdmin(req)) {
    return res.status(403).json({ error: "Acesso negado" });
  }
  try {
    const existing = await prisma.userRole.findFirst({ where: { userId: req.params.id, role: "admin" } });
    if (!existing) {
      await prisma.userRole.create({ data: { userId: req.params.id, role: "admin" } });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Promote admin error:", error);
    res.status(500).json({ error: "Erro ao promover admin" });
  }
});

// Revoke admin (owner + super_admin)
router.delete("/admins/:id", async (req: AuthRequest, res: Response) => {
  if (!isOwnerOrSuperAdmin(req)) {
    return res.status(403).json({ error: "Acesso negado" });
  }
  try {
    await prisma.userRole.deleteMany({ where: { userId: req.params.id, role: "admin" } });
    res.json({ success: true });
  } catch (error) {
    console.error("Remove admin error:", error);
    res.status(500).json({ error: "Erro ao remover admin" });
  }
});

// ══════════════════════════════════════════════════════════════════
// SUPER ADMIN MANAGEMENT (owner only)
// ══════════════════════════════════════════════════════════════════

// Promote to super_admin
router.post("/super-admins/:id", async (req: AuthRequest, res: Response) => {
  if (!isOwner(req)) {
    return res.status(403).json({ error: "Apenas o owner pode promover Super Admins" });
  }
  // Cannot promote the owner themselves
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (target?.email === OWNER_EMAIL) {
    return res.status(400).json({ error: "Owner já tem privilégios máximos" });
  }
  try {
    const existing = await prisma.userRole.findFirst({ where: { userId: req.params.id, role: SECOND_OWNER_ROLE } });
    if (!existing) {
      await prisma.userRole.create({ data: { userId: req.params.id, role: SECOND_OWNER_ROLE as any } });
    }
    // Also ensure they have admin role
    const hasAdmin = await prisma.userRole.findFirst({ where: { userId: req.params.id, role: "admin" } });
    if (!hasAdmin) {
      await prisma.userRole.create({ data: { userId: req.params.id, role: "admin" } });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Promote super admin error:", error);
    res.status(500).json({ error: "Erro ao promover Super Admin" });
  }
});

// Revoke super_admin
router.delete("/super-admins/:id", async (req: AuthRequest, res: Response) => {
  if (!isOwner(req)) {
    return res.status(403).json({ error: "Apenas o owner pode revogar Super Admins" });
  }
  try {
    await prisma.userRole.deleteMany({ where: { userId: req.params.id, role: SECOND_OWNER_ROLE as any } });
    res.json({ success: true });
  } catch (error) {
    console.error("Revoke super admin error:", error);
    res.status(500).json({ error: "Erro ao revogar Super Admin" });
  }
});

// ══════════════════════════════════════════════════════════════════
// USER DELETION (owner only)
// ══════════════════════════════════════════════════════════════════

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  if (!isOwner(req)) {
    return res.status(403).json({ error: "Apenas o owner pode remover usuários" });
  }
  // Cannot delete the owner account
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: "Usuário não encontrado" });
  if (target.email === OWNER_EMAIL) {
    return res.status(400).json({ error: "Não é possível remover o owner" });
  }
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Erro ao remover usuário" });
  }
});

// ══════════════════════════════════════════════════════════════════
// CARD VISIBILITY PERMISSIONS
// ══════════════════════════════════════════════════════════════════

// Get my own blocked cards
router.get("/my-card-blocks", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const rows = await prisma.$queryRawUnsafe<{ card_id: string }[]>(
      `SELECT card_id FROM user_card_blocks WHERE user_id = $1::text`,
      userId
    );
    res.json({ blockedCards: rows.map(r => r.card_id) });
  } catch (error) {
    console.error("Get my card blocks error:", error);
    res.status(500).json({ error: "Erro ao buscar permissões" });
  }
});

// Get blocked cards for a specific user (owner + super_admin)
router.get("/:id/card-blocks", async (req: AuthRequest, res: Response) => {
  if (!isOwnerOrSuperAdmin(req)) {
    return res.status(403).json({ error: "Acesso negado" });
  }
  try {
    const rows = await prisma.$queryRawUnsafe<{ card_id: string }[]>(
      `SELECT card_id FROM user_card_blocks WHERE user_id = $1::text`,
      req.params.id
    );
    res.json({ blockedCards: rows.map(r => r.card_id) });
  } catch (error) {
    console.error("Get card blocks error:", error);
    res.status(500).json({ error: "Erro ao buscar permissões" });
  }
});

// Set blocked cards for a specific user (owner + super_admin)
router.put("/:id/card-blocks", async (req: AuthRequest, res: Response) => {
  if (!isOwnerOrSuperAdmin(req)) {
    return res.status(403).json({ error: "Acesso negado" });
  }
  // Cannot restrict the owner
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (target?.email === OWNER_EMAIL) {
    return res.status(400).json({ error: "Não é possível restringir o owner" });
  }
  // Super admin cannot restrict another super admin
  if (req.user?.isSecondOwner && !isOwner(req)) {
    const targetRoles = await prisma.userRole.findFirst({ where: { userId: req.params.id, role: SECOND_OWNER_ROLE as any } });
    if (targetRoles) {
      return res.status(403).json({ error: "Super Admin não pode restringir outro Super Admin" });
    }
  }
  const { blockedCards } = req.body as { blockedCards: string[] };
  if (!Array.isArray(blockedCards)) {
    return res.status(400).json({ error: "blockedCards deve ser um array" });
  }
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM user_card_blocks WHERE user_id = $1::text`,
      req.params.id
    );
    for (const cardId of blockedCards) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO user_card_blocks (user_id, card_id) VALUES ($1::text, $2::text) ON CONFLICT DO NOTHING`,
        req.params.id, cardId
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Set card blocks error:", error);
    res.status(500).json({ error: "Erro ao salvar permissões" });
  }
});

export default router;
