import { Router, Response, Request } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const membersDir = path.join(__dirname, "../../../uploads/inside/members");
const filesDir   = path.join(__dirname, "../../../uploads/inside/files");
[membersDir, filesDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const makeStorage = (dir: string) => multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename:    (_req,  file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const uploadImage = multer({ storage: makeStorage(membersDir), limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_r, f, cb) => f.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Apenas imagens")) });
const uploadFile  = multer({ storage: makeStorage(filesDir),   limits: { fileSize: 50 * 1024 * 1024 } });

const BASE = () => process.env.API_BASE_URL || "http://localhost:3001";

// ── Ensure tables ────────────────────────────────────────────────
async function ensureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS inside_members (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name       VARCHAR(255) NOT NULL,
      role       VARCHAR(255),
      email      VARCHAR(255),
      phone      VARCHAR(100),
      image_url  TEXT,
      user_id    UUID,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  // Add user_id column if table already existed without it
  await prisma.$executeRawUnsafe(
    `ALTER TABLE inside_members ADD COLUMN IF NOT EXISTS user_id UUID`
  ).catch(() => {});
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS inside_inbox (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      to_user_id         UUID NOT NULL,
      from_user_id       UUID NOT NULL,
      from_name          VARCHAR(255),
      body               TEXT,
      file_url           TEXT,
      file_original_name VARCHAR(255),
      file_mime_type     VARCHAR(100),
      is_read            BOOLEAN DEFAULT FALSE,
      created_at         TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS task_files (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id       TEXT NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      url           TEXT NOT NULL,
      mime_type     VARCHAR(100),
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await prisma.$executeRawUnsafe(
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS inside_member_id UUID REFERENCES inside_members(id) ON DELETE SET NULL`
  ).catch(() => {});
}
ensureTables();

router.use(authenticate);

// ══════════════════════════════════════════════════════════════════
// MEMBERS
// ══════════════════════════════════════════════════════════════════

router.post("/members/upload", uploadImage.single("image"), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "Sem arquivo" });
  res.json({ url: `${BASE()}/uploads/inside/members/${req.file.filename}` });
});

// Update image_url of the inside_member linked to the logged-in user
router.put("/members/my-image", async (req: AuthRequest, res: Response) => {
  const { imageUrl } = req.body;
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE inside_members SET image_url=$1, updated_at=NOW() WHERE user_id=$2::uuid`,
      imageUrl || null, req.user!.id
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Erro" }); }
});

router.get("/members", async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT m.*
      FROM inside_members m
      ORDER BY m.name ASC
    `;
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro" }); }
});

router.post("/members", async (req: AuthRequest, res: Response) => {
  const { name, role, email, phone, imageUrl, userId } = req.body;
  if (!name) return res.status(400).json({ error: "Nome obrigatório" });
  try {
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO inside_members (name, role, email, phone, image_url, user_id)
      VALUES (${name}, ${role||null}, ${email||null}, ${phone||null}, ${imageUrl||null}, ${userId||null})
      RETURNING *
    `;
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: "Erro ao criar membro" }); }
});

router.put("/members/:id", async (req: AuthRequest, res: Response) => {
  const { name, role, email, phone, imageUrl, userId } = req.body;
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE inside_members SET name=$1, role=$2, email=$3, phone=$4, image_url=$5, user_id=$6::uuid, updated_at=NOW() WHERE id=$7::uuid`,
      name, role||null, email||null, phone||null, imageUrl||null, userId||null, req.params.id
    );
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM inside_members WHERE id=$1::uuid`, req.params.id);
    res.json(rows[0]);
  } catch (e) { console.error("PUT /members/:id error:", e); res.status(500).json({ error: "Erro ao atualizar" }); }
});

router.delete("/members/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM inside_members WHERE id=$1`, req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Erro ao excluir" }); }
});

// ══════════════════════════════════════════════════════════════════
// INBOX
// ══════════════════════════════════════════════════════════════════

// Send message to a member's linked user (with optional file)
router.post("/inbox", uploadFile.single("file"), async (req: AuthRequest, res: Response) => {
  const { toUserId, body } = req.body;
  if (!toUserId) return res.status(400).json({ error: "toUserId obrigatório" });
  if (!body?.trim() && !req.file) return res.status(400).json({ error: "Mensagem ou arquivo obrigatório" });

  let fileUrl: string | null = null;
  let fileOriginalName: string | null = null;
  let fileMimeType: string | null = null;
  if (req.file) {
    fileUrl = `${BASE()}/uploads/inside/files/${req.file.filename}`;
    fileOriginalName = req.file.originalname;
    fileMimeType = req.file.mimetype;
  }

  try {
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO inside_inbox (to_user_id, from_user_id, from_name, body, file_url, file_original_name, file_mime_type)
      VALUES (
        ${toUserId}::uuid,
        ${req.user!.id}::uuid,
        ${req.user!.name},
        ${body?.trim() || null},
        ${fileUrl},
        ${fileOriginalName},
        ${fileMimeType}
      )
      RETURNING *
    `;
    res.status(201).json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro ao enviar mensagem" }); }
});

// Get my inbox (messages sent to me)
router.get("/inbox/mine", async (req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM inside_inbox
      WHERE to_user_id = ${req.user!.id}::uuid
      ORDER BY created_at DESC
    `;
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro" }); }
});

// Count unread
router.get("/inbox/unread-count", async (req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int AS count FROM inside_inbox
      WHERE to_user_id = ${req.user!.id}::uuid AND is_read = FALSE
    `;
    res.json({ count: Number(rows[0]?.count ?? 0) });
  } catch (e) { res.status(500).json({ error: "Erro" }); }
});

// Mark as read
router.put("/inbox/:id/read", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE inside_inbox SET is_read = TRUE WHERE id = $1::uuid AND to_user_id = $2::uuid`,
      req.params.id, req.user!.id
    );
    res.json({ success: true });
  } catch (e) { console.error("PUT /inbox/:id/read error:", e); res.status(500).json({ error: "Erro" }); }
});

// Mark all as read
router.put("/inbox/read-all", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE inside_inbox SET is_read = TRUE WHERE to_user_id = $1::uuid`,
      req.user!.id
    );
    res.json({ success: true });
  } catch (e) { console.error("PUT /inbox/read-all error:", e); res.status(500).json({ error: "Erro" }); }
});

// Delete ALL inbox messages for current user
router.delete("/inbox/all", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM inside_inbox WHERE to_user_id = $1::uuid`,
      req.user!.id
    );
    res.json({ success: true });
  } catch (e) { console.error("DELETE /inbox/all error:", e); res.status(500).json({ error: "Erro ao limpar caixa" }); }
});

// Delete inbox message
router.delete("/inbox/:id", async (req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      DELETE FROM inside_inbox WHERE id=${req.params.id} AND to_user_id=${req.user!.id}::uuid RETURNING file_url
    `;
    if (rows[0]?.file_url) {
      const p = rows[0].file_url.replace(BASE(), "");
      fs.unlink(path.join(__dirname, "../../../", p), () => {});
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Erro ao excluir" }); }
});

// ══════════════════════════════════════════════════════════════════
// TASK FILES (usados pelo TaskDetailDialog)
// ══════════════════════════════════════════════════════════════════

const taskFilesDir = path.join(__dirname, "../../../uploads/tasks");
if (!fs.existsSync(taskFilesDir)) fs.mkdirSync(taskFilesDir, { recursive: true });
const uploadTaskFile = multer({ storage: makeStorage(taskFilesDir), limits: { fileSize: 100 * 1024 * 1024 } });

router.post("/task-files/:taskId", uploadTaskFile.single("file"), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "Sem arquivo" });
  const url = `${BASE()}/uploads/tasks/${req.file.filename}`;
  try {
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO task_files (task_id, original_name, url, mime_type)
      VALUES (${req.params.taskId}, ${req.file.originalname}, ${url}, ${req.file.mimetype})
      RETURNING *
    `;
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: "Erro ao salvar" }); }
});

router.get("/task-files/:taskId", async (req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM task_files WHERE task_id=${req.params.taskId} ORDER BY created_at DESC
    `;
    res.json(rows);
  } catch (e) { res.status(500).json({ error: "Erro" }); }
});

router.delete("/task-files/file/:fileId", async (req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`DELETE FROM task_files WHERE id=${req.params.fileId} RETURNING url`;
    if (rows[0]?.url) {
      const p = rows[0].url.replace(BASE(), "");
      fs.unlink(path.join(__dirname, "../../../", p), () => {});
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Erro ao excluir" }); }
});

export default router;
