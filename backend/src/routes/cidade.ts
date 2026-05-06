import { Router, Response, Request } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { sendMilestoneEmail, sendRecordingNotificationEmail, sendRecordingReminderEmail, sendMeetingInviteEmail } from "../lib/email.js";

const router = Router();

// ── Upload config ────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../../../uploads/cidade");
const filesDir = path.join(__dirname, "../../../uploads/cidade/files");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Apenas imagens são permitidas"));
  },
});

const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, filesDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const uploadAnyFile = multer({
  storage: fileStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// ── Schemas ──────────────────────────────────────────────────────
const packageEnum = z.enum(["acelerador", "start_line"]).nullable().optional();

const createSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  contractValue: z.number().nullable().optional(),
  contractStartDate: z.string().nullable().optional(),
  package: packageEnum,
  imageUrl: z.string().url().nullable().optional(),
  driveLink: z.string().nullable().optional(),
  briefingNotes: z.string().nullable().optional(),
  niche: z.string().nullable().optional(),
});

const updateSchema = createSchema.partial();

const milestoneSchema = z.object({
  assinaturaCliente:      z.string().nullable().optional(),
  primeiroPagamento:      z.string().nullable().optional(),
  reuniaoBriefing:        z.string().nullable().optional(),
  materialDrive:          z.string().nullable().optional(),
  acessoRedes:            z.string().nullable().optional(),
  entregaRoteiro:         z.string().nullable().optional(),
  dataGravacao:           z.string().nullable().optional(),
  edicaoFotos:            z.string().nullable().optional(),
  edicaoVideos:           z.string().nullable().optional(),
  backup:                 z.string().nullable().optional(),
  analisePerfil:          z.string().nullable().optional(),
  cronogramaMensal:       z.string().nullable().optional(),
  google:                 z.string().nullable().optional(),
  landingPage:            z.string().nullable().optional(),
  linkedin:               z.string().nullable().optional(),
  trafegoPago:            z.string().nullable().optional(),
  entregaAprovacaoPosts:  z.string().nullable().optional(),
  solicitacoesAlteracoes: z.string().nullable().optional(),
  primeiraPostagemFeed:   z.string().nullable().optional(),
});

function toDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// ── Ensure extra columns ─────────────────────────────────────────
async function ensureCidadeColumns() {
  try { await prisma.$executeRawUnsafe(`ALTER TABLE cidade_clients ADD COLUMN IF NOT EXISTS last_recording_date DATE`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE cidade_clients ADD COLUMN IF NOT EXISTS next_recording_date DATE`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE cidade_clients ADD COLUMN IF NOT EXISTS recording_time VARCHAR(5)`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE cidade_clients ADD COLUMN IF NOT EXISTS reels_per_session INT`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE cidade_clients ADD COLUMN IF NOT EXISTS videos_per_week INT`); } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE cidade_clients ADD COLUMN IF NOT EXISTS recording_reminder_sent_at DATE`); } catch {}
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS cidade_client_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES cidade_clients(id) ON DELETE CASCADE,
        original_name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        mime_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch {}
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS cidade_client_folders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES cidade_clients(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE cidade_client_files ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES cidade_client_folders(id) ON DELETE CASCADE`); } catch {}
}
ensureCidadeColumns();

router.use(authenticate);

// ── Image upload ─────────────────────────────────────────────────
router.post("/upload", upload.single("image"), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
  const url = `${process.env.API_BASE_URL || "http://localhost:3001"}/uploads/cidade/${req.file.filename}`;
  res.json({ url });
});

// ── Briefing file upload ──────────────────────────────────────────
router.post("/:id/files", uploadAnyFile.single("file"), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
  const url = `${process.env.API_BASE_URL || "http://localhost:3001"}/uploads/cidade/files/${req.file.filename}`;
  try {
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO cidade_client_files (client_id, original_name, url, mime_type)
      VALUES (${req.params.id}, ${req.file.originalname}, ${url}, ${req.file.mimetype})
      RETURNING *
    `;
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ error: "Erro ao salvar arquivo" });
  }
});

router.get("/:id/files", async (req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT id, original_name, url, mime_type, created_at
      FROM cidade_client_files
      WHERE client_id = ${req.params.id}
      ORDER BY created_at DESC
    `;
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar arquivos" });
  }
});

router.delete("/files/:fileId", async (req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      DELETE FROM cidade_client_files WHERE id = ${req.params.fileId} RETURNING url
    `;
    if (rows[0]?.url) {
      const filePath = rows[0].url.replace(`${process.env.API_BASE_URL || "http://localhost:3001"}`, "");
      const diskPath = path.join(__dirname, "../../../", filePath);
      fs.unlink(diskPath, () => {});
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao excluir arquivo" });
  }
});

// ── Folders ───────────────────────────────────────────────────────

async function ensureFolderTable() {
  // Create files table (no FK — avoids table-name mismatches on first run)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS cidade_client_files (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id     UUID NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      url           TEXT NOT NULL,
      mime_type     VARCHAR(100),
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `).catch((e) => console.error("ensureFolderTable files:", e));

  // Create folders table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS cidade_client_folders (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id  UUID NOT NULL,
      name       VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch((e) => console.error("ensureFolderTable folders:", e));

  // Add folder_id column to files
  await prisma.$executeRawUnsafe(
    `ALTER TABLE cidade_client_files ADD COLUMN IF NOT EXISTS folder_id UUID`
  ).catch(() => {}); // ignore if column already exists

  // Create notes table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS cidade_client_notes (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      folder_id  UUID NOT NULL,
      client_id  UUID NOT NULL,
      title      VARCHAR(500),
      content    TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `).catch((e) => console.error("ensureFolderTable notes:", e));
}

const folderTableReady = ensureFolderTable();

// Ensure users.linked_cidade_client_id column exists (awaitable)
const linkedClientColumnReady = prisma.$executeRawUnsafe(
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_cidade_client_id TEXT`
).catch(() => {});

// List folders with nested files and notes
router.get("/:id/folders", async (req: AuthRequest, res: Response) => {
  await folderTableReady;
  await prisma.$executeRawUnsafe(`ALTER TABLE cidade_client_files ADD COLUMN IF NOT EXISTS folder_id UUID`).catch(() => {});
  try {
    const folders = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM cidade_client_folders WHERE client_id=$1::uuid ORDER BY name ASC`,
      req.params.id
    );
    // folder_id column might not exist yet on older installs — tolerate failure
    let files: any[] = [];
    try {
      files = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM cidade_client_files WHERE client_id=$1::uuid AND folder_id IS NOT NULL ORDER BY created_at DESC`,
        req.params.id
      );
    } catch { /* column not yet migrated, return empty files */ }
    let notes: any[] = [];
    try {
      notes = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM cidade_client_notes WHERE client_id=$1::uuid ORDER BY updated_at DESC`,
        req.params.id
      );
    } catch { /* notes table might not exist yet */ }
    const result = folders.map((f: any) => ({
      ...f,
      files: files.filter((file: any) => String(file.folder_id) === String(f.id)),
      notes: notes.filter((n: any) => String(n.folder_id) === String(f.id)),
    }));
    res.json(result);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro ao listar pastas" }); }
});

// Create folder
router.post("/:id/folders", async (req: AuthRequest, res: Response) => {
  await folderTableReady;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Nome obrigatório" });
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO cidade_client_folders (client_id, name) VALUES ($1::uuid, $2) RETURNING *`,
      req.params.id, name.trim()
    );
    res.status(201).json({ ...rows[0], files: [] });
  } catch (e) { console.error("POST folders error:", e); res.status(500).json({ error: "Erro ao criar pasta" }); }
});

// Delete folder (files + notes cascade)
router.delete("/:id/folders/:folderId", async (req: AuthRequest, res: Response) => {
  await folderTableReady;
  try {
    // Collect file URLs to delete from disk
    const files = await prisma.$queryRawUnsafe<any[]>(
      `DELETE FROM cidade_client_files WHERE folder_id=$1::uuid RETURNING url`,
      req.params.folderId
    );
    files.forEach((f: any) => {
      if (f.url) {
        const p = f.url.replace(`${process.env.API_BASE_URL || "http://localhost:3001"}`, "");
        fs.unlink(path.join(__dirname, "../../../", p), () => {});
      }
    });
    await prisma.$executeRawUnsafe(
      `DELETE FROM cidade_client_notes WHERE folder_id=$1::uuid`,
      req.params.folderId
    ).catch(() => {});
    await prisma.$executeRawUnsafe(
      `DELETE FROM cidade_client_folders WHERE id=$1::uuid AND client_id=$2::uuid`,
      req.params.folderId, req.params.id
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Erro ao excluir pasta" }); }
});

// Upload file into folder
router.post("/:id/folders/:folderId/files", uploadAnyFile.single("file"), async (req: AuthRequest, res: Response) => {
  await folderTableReady;

  // Ensure folder_id column — log if it fails
  const alterErr = await prisma.$executeRawUnsafe(
    `ALTER TABLE cidade_client_files ADD COLUMN IF NOT EXISTS folder_id UUID`
  ).then(() => null).catch((e: any) => e);
  if (alterErr) console.error("ALTER TABLE folder_id error:", alterErr?.message ?? alterErr);

  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

  const url = `${process.env.API_BASE_URL || "http://localhost:3001"}/uploads/cidade/files/${req.file.filename}`;
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO cidade_client_files (client_id, folder_id, original_name, url, mime_type)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5) RETURNING *`,
      req.params.id, req.params.folderId, req.file.originalname, url, req.file.mimetype
    );
    res.status(201).json(rows[0]);
  } catch (e: any) {
    const msg = e?.meta?.message ?? e?.message ?? String(e);
    console.error("Upload folder file error:", msg);
    res.status(500).json({ error: "Erro ao salvar arquivo", detail: msg });
  }
});

// Delete file
router.delete("/:id/folders/:folderId/files/:fileId", async (req: AuthRequest, res: Response) => {
  await folderTableReady;
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `DELETE FROM cidade_client_files WHERE id=$1::uuid AND folder_id=$2::uuid RETURNING url`,
      req.params.fileId, req.params.folderId
    );
    if (rows[0]?.url) {
      const p = rows[0].url.replace(`${process.env.API_BASE_URL || "http://localhost:3001"}`, "");
      fs.unlink(path.join(__dirname, "../../../", p), () => {});
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Erro ao excluir arquivo" }); }
});

// ── Folder notes ─────────────────────────────────────────────────

// Create note in folder
router.post("/:id/folders/:folderId/notes", async (req: AuthRequest, res: Response) => {
  await folderTableReady;
  const { title, content } = req.body;
  if (!content?.trim() && !title?.trim()) return res.status(400).json({ error: "Conteúdo obrigatório" });
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO cidade_client_notes (folder_id, client_id, title, content)
       VALUES ($1::uuid, $2::uuid, $3, $4) RETURNING *`,
      req.params.folderId, req.params.id, (title || "").trim(), (content || "").trim()
    );
    res.status(201).json(rows[0]);
  } catch (e: any) {
    console.error("POST note error:", e);
    res.status(500).json({ error: "Erro ao criar nota" });
  }
});

// Update note
router.put("/:id/folders/:folderId/notes/:noteId", async (req: AuthRequest, res: Response) => {
  await folderTableReady;
  const { title, content } = req.body;
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `UPDATE cidade_client_notes
       SET title=$3, content=$4, updated_at=NOW()
       WHERE id=$1::uuid AND folder_id=$2::uuid RETURNING *`,
      req.params.noteId, req.params.folderId, (title || "").trim(), (content || "").trim()
    );
    if (!rows[0]) return res.status(404).json({ error: "Nota não encontrada" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: "Erro ao atualizar nota" });
  }
});

// Delete note
router.delete("/:id/folders/:folderId/notes/:noteId", async (req: AuthRequest, res: Response) => {
  await folderTableReady;
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM cidade_client_notes WHERE id=$1::uuid AND folder_id=$2::uuid`,
      req.params.noteId, req.params.folderId
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Erro ao excluir nota" });
  }
});

// ── Postagens (link repository) ───────────────────────────────────

async function ensurePostagensTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS postagens_folders (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id  UUID NOT NULL,
      name       VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch((e) => console.error("ensurePostagensTables folders:", e));

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS postagens_links (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      folder_id   UUID NOT NULL REFERENCES postagens_folders(id) ON DELETE CASCADE,
      client_id   UUID NOT NULL,
      title       VARCHAR(500) NOT NULL,
      url         TEXT NOT NULL,
      link_date   DATE,
      created_at  TIMESTAMP DEFAULT NOW()
    )
  `).catch((e) => console.error("ensurePostagensTables links:", e));
}

const postagensTablesReady = ensurePostagensTables();

// List postagens folders (with nested links)
router.get("/:id/postagens-folders", async (req: AuthRequest, res: Response) => {
  await postagensTablesReady;
  try {
    const folders = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM postagens_folders WHERE client_id=$1::uuid ORDER BY name ASC`,
      req.params.id
    );
    const links = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM postagens_links WHERE client_id=$1::uuid ORDER BY link_date DESC NULLS LAST, created_at DESC`,
      req.params.id
    );
    const result = folders.map((f: any) => ({
      ...f,
      links: links.filter((l: any) => String(l.folder_id) === String(f.id)),
    }));
    res.json(result);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro ao listar pastas" }); }
});

// Create postagens folder
router.post("/:id/postagens-folders", async (req: AuthRequest, res: Response) => {
  await postagensTablesReady;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Nome obrigatório" });
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO postagens_folders (client_id, name) VALUES ($1::uuid, $2) RETURNING *`,
      req.params.id, name.trim()
    );
    res.status(201).json({ ...rows[0], links: [] });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro ao criar pasta" }); }
});

// Delete postagens folder (links cascade via FK)
router.delete("/:id/postagens-folders/:folderId", async (req: AuthRequest, res: Response) => {
  await postagensTablesReady;
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM postagens_folders WHERE id=$1::uuid AND client_id=$2::uuid`,
      req.params.folderId, req.params.id
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Erro ao excluir pasta" }); }
});

// Add link to folder
router.post("/:id/postagens-folders/:folderId/links", async (req: AuthRequest, res: Response) => {
  await postagensTablesReady;
  const { title, url, linkDate } = req.body;
  if (!title?.trim() || !url?.trim()) return res.status(400).json({ error: "Título e URL são obrigatórios" });
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO postagens_links (folder_id, client_id, title, url, link_date)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5) RETURNING *`,
      req.params.folderId, req.params.id, title.trim(), url.trim(), linkDate || null
    );
    res.status(201).json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro ao adicionar link" }); }
});

// Delete link
router.delete("/:id/postagens-folders/:folderId/links/:linkId", async (req: AuthRequest, res: Response) => {
  await postagensTablesReady;
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM postagens_links WHERE id=$1::uuid AND folder_id=$2::uuid`,
      req.params.linkId, req.params.folderId
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Erro ao excluir link" }); }
});

// ── Provision client users from CRM credentials ───────────────────
router.post("/provision-client-users", async (req: AuthRequest, res: Response) => {
  if (req.user?.email !== OWNER_EMAIL && !req.user?.isSecondOwner) {
    return res.status(403).json({ error: "Acesso restrito ao owner/super admin" });
  }

  try {
    await linkedClientColumnReady.catch(() => {});
    // Ensure column exists before we try to UPDATE it
    await prisma.$executeRawUnsafe(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_cidade_client_id TEXT`
    ).catch(() => {});

    const clients = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, briefing_notes FROM cidade_clients WHERE briefing_notes ILIKE '%--- CRM LEADS ---%'`
    );

    const results: { name: string; email: string; status: string }[] = [];

    for (const client of clients) {
      const notes: string = client.briefing_notes || "";
      const emailMatch = notes.match(/Email:\s*(.+)/i);
      const passMatch = notes.match(/Senha:\s*(.+)/i);

      if (!emailMatch || !passMatch) {
        results.push({ name: client.name, email: "—", status: "sem credenciais" });
        continue;
      }

      const email = emailMatch[1].trim();
      const password = passMatch[1].trim();

      // Check if user already exists
      const existing = await prisma.user.findUnique({ where: { email } });

      if (existing) {
        // Just ensure the link is set
        await prisma.$executeRawUnsafe(
          `UPDATE users SET linked_cidade_client_id = $1 WHERE id = $2`,
          client.id, existing.id
        );
        results.push({ name: client.name, email, status: "já existe (link atualizado)" });
        continue;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: {
          email,
          passwordHash,
          profile: { create: { name: client.name, email } },
          userRoles: { create: { role: "client" } },
        },
      });

      await prisma.$executeRawUnsafe(
        `UPDATE users SET linked_cidade_client_id = $1 WHERE id = $2`,
        client.id, newUser.id
      );

      results.push({ name: client.name, email, status: "criado" });
    }

    res.json({ results });
  } catch (error) {
    console.error("Provision client users error:", error);
    res.status(500).json({ error: "Erro ao provisionar usuários" });
  }
});

// ── Clients CRUD ─────────────────────────────────────────────────
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    await linkedClientColumnReady.catch(() => {});

    const isClientRole = req.user?.role === "client" && !req.user?.isAdmin;

    // Get linkedClientId from middleware, or fall back to a fresh DB lookup
    let linkedClientId: string | null = req.user?.linkedCidadeClientId ?? null;
    if (isClientRole && !linkedClientId) {
      try {
        const rows = await prisma.$queryRawUnsafe<{ linked_cidade_client_id: string | null }[]>(
          `SELECT linked_cidade_client_id FROM users WHERE id = $1`, req.user!.id
        );
        linkedClientId = rows[0]?.linked_cidade_client_id ?? null;
      } catch {}
    }

    // Client role with no linked ID → return empty (never expose other clients)
    if (isClientRole && !linkedClientId) {
      return res.json([]);
    }

    const clients = isClientRole && linkedClientId
      ? await prisma.$queryRawUnsafe<any[]>(
          `SELECT c.*, m.id as milestone_id,
            c.phone, c.contract_value, c.contract_start_date,
            row_to_json(m.*) as milestone
           FROM cidade_clients c
           LEFT JOIN cidade_client_milestones m ON m.client_id = c.id
           WHERE c.id = $1`,
          linkedClientId
        )
      : await prisma.$queryRaw<any[]>`
      SELECT c.*, m.id as milestone_id,
        c.phone, c.contract_value, c.contract_start_date,
        row_to_json(m.*) as milestone
      FROM cidade_clients c
      LEFT JOIN cidade_client_milestones m ON m.client_id = c.id
      ORDER BY c.name ASC
    `;
    // Normalize snake_case → camelCase for key fields the frontend expects
    const mapped = clients.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      contractValue: c.contract_value != null ? Number(c.contract_value) : null,
      contractStartDate: c.contract_start_date ?? null,
      package: c.package,
      imageUrl: c.image_url,
      driveLink: c.drive_link,
      briefingNotes: c.briefing_notes,
      niche: c.niche,
      lastRecordingDate: c.last_recording_date ?? null,
      nextRecordingDate: c.next_recording_date ?? null,
      recordingTime: c.recording_time ?? null,
      reelsPerSession: c.reels_per_session != null ? Number(c.reels_per_session) : null,
      videosPerWeek: c.videos_per_week != null ? Number(c.videos_per_week) : null,
      recordingReminderSentAt: c.recording_reminder_sent_at ?? null,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      milestone: c.milestone,
    }));
    res.json(mapped);
  } catch (error) {
    console.error("List cidade clients error:", error);
    res.status(500).json({ error: "Erro ao listar clientes" });
  }
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT c.*, c.phone, c.contract_value, c.contract_start_date, row_to_json(m.*) as milestone
      FROM cidade_clients c
      LEFT JOIN cidade_client_milestones m ON m.client_id = c.id
      WHERE c.id = ${req.params.id}
    `;
    if (!rows.length) return res.status(404).json({ error: "Cliente não encontrado" });
    const c = rows[0];
    res.json({
      id: c.id, name: c.name, email: c.email, phone: c.phone,
      contractValue: c.contract_value != null ? Number(c.contract_value) : null,
      contractStartDate: c.contract_start_date ?? null,
      package: c.package, imageUrl: c.image_url, driveLink: c.drive_link,
      briefingNotes: c.briefing_notes, niche: c.niche,
      createdAt: c.created_at, updatedAt: c.updated_at, milestone: c.milestone,
    });
  } catch (error) {
    console.error("Get cidade client error:", error);
    res.status(500).json({ error: "Erro ao buscar cliente" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    const { phone, contractValue, contractStartDate, ...rest } = data as any;
    const client = await prisma.cidadeClient.create({ data: rest });
    await prisma.$executeRawUnsafe(
      "UPDATE cidade_clients SET phone = $1, contract_value = $2, contract_start_date = $3 WHERE id = $4",
      phone ?? null, contractValue ?? null, contractStartDate ?? null, client.id
    );
    res.status(201).json({ ...client, phone: phone ?? null, contractValue: contractValue ?? null, contractStartDate: contractStartDate ?? null });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error("Create cidade client error:", error);
    res.status(500).json({ error: "Erro ao criar cliente" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateSchema.parse(req.body);
    const { phone, contractValue, contractStartDate, ...rest } = data as any;

    // Only call Prisma ORM update if there are schema fields to update
    let client: any;
    if (Object.keys(rest).length > 0) {
      client = await prisma.cidadeClient.update({ where: { id: req.params.id }, data: rest });
    } else {
      const rows = await prisma.$queryRaw<any[]>`SELECT * FROM cidade_clients WHERE id = ${req.params.id}`;
      client = rows[0] ?? { id: req.params.id };
    }

    if (phone !== undefined) {
      await prisma.$executeRawUnsafe("UPDATE cidade_clients SET phone = $1 WHERE id = $2", phone ?? null, req.params.id);
    }
    if (contractValue !== undefined) {
      await prisma.$executeRawUnsafe("UPDATE cidade_clients SET contract_value = $1 WHERE id = $2", contractValue ?? null, req.params.id);
    }
    if (contractStartDate !== undefined) {
      await prisma.$executeRawUnsafe("UPDATE cidade_clients SET contract_start_date = $1 WHERE id = $2", contractStartDate ?? null, req.params.id);
    }
    const { lastRecordingDate, nextRecordingDate } = req.body;
    if (lastRecordingDate !== undefined) {
      await prisma.$executeRawUnsafe("UPDATE cidade_clients SET last_recording_date = $1::date WHERE id = $2", lastRecordingDate ?? null, req.params.id);
    }
    if (nextRecordingDate !== undefined) {
      await prisma.$executeRawUnsafe("UPDATE cidade_clients SET next_recording_date = $1::date WHERE id = $2", nextRecordingDate ?? null, req.params.id);
    }

    // Return raw fields from DB
    const row = await prisma.$queryRaw<any[]>`
      SELECT phone, contract_value, contract_start_date, last_recording_date, next_recording_date FROM cidade_clients WHERE id = ${req.params.id}
    `;
    res.json({
      ...client,
      phone: row[0]?.phone ?? null,
      contractValue: row[0]?.contract_value != null ? Number(row[0].contract_value) : null,
      contractStartDate: row[0]?.contract_start_date ?? null,
      lastRecordingDate: row[0]?.last_recording_date ?? null,
      nextRecordingDate: row[0]?.next_recording_date ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error("Update cidade client error:", error);
    res.status(500).json({ error: "Erro ao atualizar cliente" });
  }
});

// ── Recording dates (dedicated endpoint) ─────────────────────────
router.put("/:id/recording", async (req: AuthRequest, res: Response) => {
  try {
    const { lastRecordingDate, nextRecordingDate, recordingTime, reelsPerSession, videosPerWeek } = req.body as {
      lastRecordingDate?: string | null;
      nextRecordingDate?: string | null;
      recordingTime?: string | null;
      reelsPerSession?: number | null;
      videosPerWeek?: number | null;
    };

    if (lastRecordingDate !== undefined) {
      // Reset reminder when a new last_recording_date is set
      await prisma.$executeRawUnsafe(
        "UPDATE cidade_clients SET last_recording_date = $1::date, recording_reminder_sent_at = NULL WHERE id = $2",
        lastRecordingDate ?? null, req.params.id
      );
    }
    if (nextRecordingDate !== undefined) {
      await prisma.$executeRawUnsafe(
        "UPDATE cidade_clients SET next_recording_date = $1::date WHERE id = $2",
        nextRecordingDate ?? null, req.params.id
      );
    }
    if (recordingTime !== undefined) {
      await prisma.$executeRawUnsafe(
        "UPDATE cidade_clients SET recording_time = $1 WHERE id = $2",
        recordingTime ?? null, req.params.id
      );
    }
    if (reelsPerSession !== undefined) {
      await prisma.$executeRawUnsafe(
        "UPDATE cidade_clients SET reels_per_session = $1 WHERE id = $2",
        reelsPerSession ?? null, req.params.id
      );
    }
    if (videosPerWeek !== undefined) {
      await prisma.$executeRawUnsafe(
        "UPDATE cidade_clients SET videos_per_week = $1 WHERE id = $2",
        videosPerWeek ?? null, req.params.id
      );
    }

    const rows = await prisma.$queryRaw<any[]>`
      SELECT id, name, last_recording_date, next_recording_date, recording_time,
             reels_per_session, videos_per_week, recording_reminder_sent_at
      FROM cidade_clients WHERE id = ${req.params.id}
    `;
    if (!rows.length) return res.status(404).json({ error: "Cliente não encontrado" });

    const r = rows[0];
    res.json({
      id: r.id,
      name: r.name,
      lastRecordingDate: r.last_recording_date ?? null,
      nextRecordingDate: r.next_recording_date ?? null,
      recordingTime: r.recording_time ?? null,
      reelsPerSession: r.reels_per_session != null ? Number(r.reels_per_session) : null,
      videosPerWeek: r.videos_per_week != null ? Number(r.videos_per_week) : null,
      recordingReminderSentAt: r.recording_reminder_sent_at ?? null,
    });
  } catch (error) {
    console.error("Update recording date error:", error);
    res.status(500).json({ error: "Erro ao salvar data de gravação" });
  }
});

// ── Send recording notification email ────────────────────────────
router.post("/:id/recording/notify", async (req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT name, email, next_recording_date, recording_time FROM cidade_clients WHERE id = ${req.params.id}
    `;
    if (!rows.length) return res.status(404).json({ error: "Cliente não encontrado" });
    const c = rows[0];
    if (!c.email) return res.status(400).json({ error: "Cliente sem e-mail cadastrado" });
    if (!c.next_recording_date) return res.status(400).json({ error: "Nenhuma gravação agendada para este cliente" });

    const dateFormatted = new Date(c.next_recording_date).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "long", year: "numeric",
    });

    const result = await sendRecordingNotificationEmail({
      clientName: c.name,
      clientEmail: c.email,
      nextRecordingDate: dateFormatted,
      recordingTime: c.recording_time ?? null,
    });

    console.log("[recording notify] Resend result:", JSON.stringify(result));
    res.json({ success: true });
  } catch (error) {
    console.error("Send recording notification error:", error);
    res.status(500).json({ error: "Erro ao enviar e-mail" });
  }
});

// ── Schedule Meet — send invite email ────────────────────────────
router.post("/schedule-meet", authenticate, async (req: AuthRequest, res: Response) => {
  const { clientId, extraEmails, meetingTitle, date, time, duration, meetUrl } = req.body;
  if (!clientId || !date || !time) return res.status(400).json({ error: "clientId, date e time são obrigatórios" });
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT name, email FROM cidade_clients WHERE id = ${clientId}
    `;
    if (!rows.length) return res.status(404).json({ error: "Cliente não encontrado" });
    const client = rows[0];
    if (!client.email) return res.status(400).json({ error: "Cliente não possui e-mail cadastrado" });

    await sendMeetingInviteEmail({
      clientName: client.name,
      clientEmail: client.email,
      extraEmails: Array.isArray(extraEmails) ? extraEmails.filter(Boolean) : [],
      meetingTitle: meetingTitle || `Reunião DigiTown — ${client.name}`,
      date,
      time,
      duration: Number(duration) || 60,
      meetUrl: meetUrl || undefined,
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error("schedule-meet error:", e);
    res.status(500).json({ error: e?.message || "Erro ao enviar convite" });
  }
});

// ── Auto recording reminders ──────────────────────────────────────
router.post("/check-reminders", async (req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.$queryRaw<any[]>`
      SELECT id, name, last_recording_date, reels_per_session, videos_per_week, recording_reminder_sent_at
      FROM cidade_clients
      WHERE last_recording_date IS NOT NULL
        AND reels_per_session IS NOT NULL
        AND videos_per_week IS NOT NULL
        AND videos_per_week > 0
    `;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toNotify = clients.filter((c) => {
      const lastDate = new Date(c.last_recording_date);
      lastDate.setHours(0, 0, 0, 0);
      const reels = Number(c.reels_per_session);
      const perWeek = Number(c.videos_per_week);
      const contentDays = Math.ceil((reels / perWeek) * 7);
      const notifyDay = contentDays - 30;
      const notifyDate = new Date(lastDate);
      notifyDate.setDate(notifyDate.getDate() + notifyDay);

      if (notifyDate > today) return false;

      if (c.recording_reminder_sent_at) {
        const sentAt = new Date(c.recording_reminder_sent_at);
        sentAt.setHours(0, 0, 0, 0);
        // Already notified in this recording cycle (after last recording date)
        if (sentAt >= lastDate) return false;
      }

      return true;
    });

    let sent = 0;
    for (const c of toNotify) {
      try {
        const lastDate = new Date(c.last_recording_date);
        const reels = Number(c.reels_per_session);
        const perWeek = Number(c.videos_per_week);
        const contentDays = Math.ceil((reels / perWeek) * 7);
        const lastVideoDate = new Date(lastDate);
        lastVideoDate.setDate(lastVideoDate.getDate() + contentDays);
        const lastVideoFormatted = lastVideoDate.toLocaleDateString("pt-BR", {
          day: "2-digit", month: "long", year: "numeric",
        });

        await sendRecordingReminderEmail({
          clientName: c.name,
          lastVideoDate: lastVideoFormatted,
          notifyDaysAhead: 30,
        });

        await prisma.$executeRawUnsafe(
          "UPDATE cidade_clients SET recording_reminder_sent_at = CURRENT_DATE WHERE id = $1",
          c.id
        );
        sent++;
      } catch (err) {
        console.error(`Reminder email failed for ${c.name}:`, err);
      }
    }

    res.json({ success: true, checked: clients.length, sent });
  } catch (error) {
    console.error("Check reminders error:", error);
    res.status(500).json({ error: "Erro ao verificar lembretes" });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.cidadeClient.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete cidade client error:", error);
    res.status(500).json({ error: "Erro ao excluir cliente" });
  }
});

// ── Milestones ───────────────────────────────────────────────────
router.get("/:id/milestone", async (req: AuthRequest, res: Response) => {
  try {
    const milestone = await prisma.cidadeClientMilestone.findUnique({
      where: { clientId: req.params.id },
    });
    res.json(milestone ?? null);
  } catch (error) {
    console.error("Get milestone error:", error);
    res.status(500).json({ error: "Erro ao buscar marcos" });
  }
});

router.put("/:id/milestone", async (req: AuthRequest, res: Response) => {
  try {
    const raw = milestoneSchema.parse(req.body);
    const data = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, toDate(v as string | null)])
    );

    const milestone = await prisma.cidadeClientMilestone.upsert({
      where: { clientId: req.params.id },
      update: data,
      create: { clientId: req.params.id, ...data },
    });
    res.json(milestone);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error("Upsert milestone error:", error);
    res.status(500).json({ error: "Erro ao salvar marcos" });
  }
});

// Send milestone email to client
router.post("/:id/milestone/send-email", async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.cidadeClient.findUnique({
      where: { id: req.params.id },
      include: { milestone: true },
    });

    if (!client) return res.status(404).json({ error: "Cliente não encontrado" });
    if (!client.email) return res.status(400).json({ error: "Cliente não possui email cadastrado" });
    if (!client.milestone) return res.status(400).json({ error: "Nenhum marco salvo para este cliente" });

    await sendMilestoneEmail({
      clientName: client.name,
      clientEmail: client.email,
      ...client.milestone,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Send milestone email error:", error);
    res.status(500).json({ error: "Erro ao enviar email" });
  }
});

// ========== CRM INTEGRATION ==========

// Read at call-time so env vars loaded by dotenv in index.ts are available
function getCrmApiUrl() { return process.env.CRM_API_URL || "http://localhost:3002"; }
function getCrmApiKey() { return process.env.CRM_API_KEY || ""; }
const OWNER_EMAIL = "gustavosaforti@gmail.com";

async function ensureCrmColumns() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE cidade_clients ADD COLUMN IF NOT EXISTS crm_tenant_id VARCHAR(255)`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE cidade_clients ADD COLUMN IF NOT EXISTS crm_tenant_slug VARCHAR(255)`
  );
}
ensureCrmColumns().catch(console.error);

// POST /cidade/:id/crm/provision
router.post("/:id/crm/provision", async (req: AuthRequest, res: Response) => {
  const isOwner = req.user?.email === OWNER_EMAIL;
  const isAdmin = req.user?.isAdmin === true;
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "Acesso restrito a admins" });

  try {
    const client = await prisma.cidadeClient.findUnique({ where: { id: req.params.id } });
    if (!client) return res.status(404).json({ error: "Cliente não encontrado" });

    const rows = await prisma.$queryRaw<any[]>`
      SELECT crm_tenant_id FROM cidade_clients WHERE id = ${req.params.id}
    `;
    if (rows[0]?.crm_tenant_id) {
      return res.status(400).json({ error: "CRM já ativado para este cliente" });
    }

    const { adminEmail, adminPassword, adminName } = req.body;
    if (!adminEmail || !adminPassword) {
      return res.status(400).json({ error: "adminEmail e adminPassword são obrigatórios" });
    }

    const crmRes = await fetch(`${getCrmApiUrl()}/api/admin/provision`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": getCrmApiKey() },
      body: JSON.stringify({
        tenantName: client.name,
        adminName: adminName || client.name,
        adminEmail,
        adminPassword,
        townClientId: client.id,
      }),
    });

    if (!crmRes.ok) {
      const err: any = await crmRes.json();
      return res.status(crmRes.status).json({ error: err.message || "Erro ao criar CRM" });
    }

    const crmData: any = await crmRes.json();

    await prisma.$executeRawUnsafe(
      `UPDATE cidade_clients SET crm_tenant_id = $1, crm_tenant_slug = $2 WHERE id = $3`,
      crmData.tenantId,
      crmData.tenantSlug,
      req.params.id
    );

    res.json({ success: true, tenantId: crmData.tenantId, tenantSlug: crmData.tenantSlug });
  } catch (error) {
    console.error("CRM provision error:", error);
    res.status(500).json({ error: "Erro ao ativar CRM" });
  }
});

// POST /cidade/:id/crm/impersonate
// Gera token CRM do admin do tenant sem precisar de senha.
// Auto-provisiona o tenant CRM se ainda não existir e salva credenciais nas notas do cliente.
router.post("/:id/crm/impersonate", async (req: AuthRequest, res: Response) => {
  const isOwner = req.user?.email === OWNER_EMAIL;
  const isAdmin = req.user?.isAdmin === true;

  // Check if this client user owns this cidade_client record
  let isOwnClient = req.user?.linkedCidadeClientId === req.params.id;
  if (!isOwnClient && req.user?.role === "client") {
    try {
      await linkedClientColumnReady.catch(() => {});
      const rows = await prisma.$queryRawUnsafe<{ linked_cidade_client_id: string | null }[]>(
        `SELECT linked_cidade_client_id FROM users WHERE id = $1`, req.user.id
      );
      isOwnClient = rows[0]?.linked_cidade_client_id === req.params.id;
    } catch {}
  }

  if (!isOwner && !isAdmin && !isOwnClient) return res.status(403).json({ error: "Acesso restrito a admins" });

  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT id, name, crm_tenant_id, briefing_notes FROM cidade_clients WHERE id = ${req.params.id}
    `;
    if (!rows.length) return res.status(404).json({ error: "Cliente não encontrado" });

    let tenantId: string = rows[0]?.crm_tenant_id;
    const existingNotes: string = rows[0].briefing_notes || "";
    const hasCreds = existingNotes.includes("--- CRM LEADS ---");

    if (!tenantId) {
      // Cliente sem CRM: provisiona tenant novo
      const clientName: string = rows[0].name;
      const slug = clientName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      const adminEmail = `${slug}@towncrm.internal`;
      const adminPassword = `Town@${Math.random().toString(36).slice(2, 10)}`;

      const provRes = await fetch(`${getCrmApiUrl()}/api/admin/provision`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": getCrmApiKey() },
        body: JSON.stringify({
          tenantName: clientName,
          adminName: clientName,
          adminEmail,
          adminPassword,
          townClientId: req.params.id,
        }),
      });

      if (!provRes.ok) {
        const err: any = await provRes.json();
        return res.status(provRes.status).json({ error: err.message || "Erro ao criar CRM para cliente" });
      }

      const provData: any = await provRes.json();
      tenantId = provData.tenantId;

      const credBlock = `--- CRM LEADS ---\nEmail: ${adminEmail}\nSenha: ${adminPassword}`;
      const newNotes = existingNotes ? `${existingNotes}\n\n${credBlock}` : credBlock;

      await prisma.$executeRawUnsafe(
        `UPDATE cidade_clients SET crm_tenant_id = $1, crm_tenant_slug = $2, briefing_notes = $3 WHERE id = $4`,
        tenantId,
        provData.tenantSlug,
        newNotes,
        req.params.id
      );

    } else if (!hasCreds) {
      // Cliente já tem CRM mas sem credenciais salvas: reseta a senha e salva
      const resetRes = await fetch(`${getCrmApiUrl()}/api/admin/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": getCrmApiKey() },
        body: JSON.stringify({ tenantId }),
      });

      if (resetRes.ok) {
        const resetData: any = await resetRes.json();
        const credBlock = `--- CRM LEADS ---\nEmail: ${resetData.email}\nSenha: ${resetData.password}`;
        const newNotes = existingNotes ? `${existingNotes}\n\n${credBlock}` : credBlock;

        await prisma.$executeRawUnsafe(
          `UPDATE cidade_clients SET briefing_notes = $1 WHERE id = $2`,
          newNotes,
          req.params.id
        );
      }
    }

    const crmRes = await fetch(`${getCrmApiUrl()}/api/admin/impersonate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": getCrmApiKey() },
      body: JSON.stringify({ tenantId }),
    });

    if (!crmRes.ok) {
      const err: any = await crmRes.json();
      return res.status(crmRes.status).json({ error: err.message || "Erro ao impersonar tenant" });
    }

    const data = await crmRes.json();
    res.json(data);
  } catch (error) {
    console.error("CRM impersonate error:", error);
    res.status(500).json({ error: "Erro ao gerar token CRM" });
  }
});

// GET /cidade/crm/all-leads — aggregate recent leads from ALL provisioned CRMs
router.get("/crm/all-leads", async (req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.$queryRaw<any[]>`
      SELECT id, name, crm_tenant_id FROM cidade_clients
      WHERE crm_tenant_id IS NOT NULL AND crm_tenant_id != ''
      ORDER BY name ASC
    `;

    if (!clients.length) return res.json([]);

    const results = await Promise.allSettled(
      clients.map(async (client) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const crmRes = await fetch(
            `${getCrmApiUrl()}/api/admin/tenants/${client.crm_tenant_id}/stats`,
            { headers: { "x-admin-key": getCrmApiKey() }, signal: controller.signal }
          );
          clearTimeout(timeout);
          if (!crmRes.ok) return null;
          const stats: any = await crmRes.json();
          const leads: any[] = stats.recentLeads ?? [];
          return leads.map((lead: any) => ({
            id: `${client.id}:${lead.id}`,
            leadId: lead.id,
            leadName: lead.name,
            clientId: client.id,
            clientName: client.name,
            stage: lead.stage?.name ?? "Novo",
            isWon: lead.stage?.isWon ?? false,
            isLost: lead.stage?.isLost ?? false,
            createdAt: lead.createdAt,
          }));
        } catch {
          clearTimeout(timeout);
          return null;
        }
      })
    );

    const allLeads = results
      .filter((r) => r.status === "fulfilled" && r.value)
      .flatMap((r) => (r as PromiseFulfilledResult<any>).value)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(allLeads);
  } catch (error) {
    console.error("CRM all-leads error:", error);
    res.status(500).json({ error: "Erro ao buscar leads" });
  }
});

// GET /cidade/crm/my-leads — leads for the client user's own CRM tenant
router.get("/crm/my-leads", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const linkedClientId = (req.user as any)?.linkedCidadeClientId;
    if (!linkedClientId) return res.status(403).json({ error: "Not a linked client user" });

    const rows = await prisma.$queryRaw<{ crm_tenant_id: string; name: string }[]>`
      SELECT crm_tenant_id, name FROM cidade_clients WHERE id = ${linkedClientId}
    `;
    const client = rows[0];
    if (!client?.crm_tenant_id) return res.json([]);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const crmRes = await fetch(
        `${getCrmApiUrl()}/api/admin/tenants/${client.crm_tenant_id}/stats`,
        { headers: { "x-admin-key": getCrmApiKey() }, signal: controller.signal }
      );
      clearTimeout(timeout);
      if (!crmRes.ok) return res.json([]);
      const stats: any = await crmRes.json();
      const leads: any[] = stats.recentLeads ?? [];
      const mapped = leads.map((lead: any) => ({
        id: `${linkedClientId}:${lead.id}`,
        leadId: lead.id,
        leadName: lead.name,
        clientId: linkedClientId,
        clientName: client.name,
        stage: lead.stage?.name ?? "Novo",
        isWon: lead.stage?.isWon ?? false,
        isLost: lead.stage?.isLost ?? false,
        createdAt: lead.createdAt,
      }));
      return res.json(mapped.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {
      clearTimeout(timeout);
      return res.json([]);
    }
  } catch (error) {
    console.error("CRM my-leads error:", error);
    res.status(500).json({ error: "Erro ao buscar leads" });
  }
});

// GET /cidade/:id/crm/stats
router.get("/:id/crm/stats", async (req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT crm_tenant_id, crm_tenant_slug FROM cidade_clients WHERE id = ${req.params.id}
    `;
    const tenantId = rows[0]?.crm_tenant_id;
    if (!tenantId) return res.json({ provisioned: false });

    const crmRes = await fetch(`${getCrmApiUrl()}/api/admin/tenants/${tenantId}/stats`, {
      headers: { "x-admin-key": getCrmApiKey() },
    });

    if (!crmRes.ok) return res.status(crmRes.status).json({ error: "Erro ao buscar dados do CRM" });

    const stats: any = await crmRes.json();
    res.json({ provisioned: true, tenantSlug: rows[0]?.crm_tenant_slug, ...stats });
  } catch (error) {
    console.error("CRM stats error:", error);
    res.status(500).json({ error: "Erro ao buscar stats do CRM" });
  }
});

export default router;
