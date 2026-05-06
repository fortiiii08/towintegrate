import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

const OWNER_EMAIL = "gustavosaforti@gmail.com";

const isOwnerOrSuperAdmin = (req: AuthRequest) =>
  req.user?.email === OWNER_EMAIL || req.user?.isSecondOwner === true;

// ── NF upload storage ─────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nfUploadDir = path.join(__dirname, "../../../uploads/nf");
if (!fs.existsSync(nfUploadDir)) fs.mkdirSync(nfUploadDir, { recursive: true });

const nfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, nfUploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});
const nfUpload = multer({ storage: nfStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Ensure NF tables ──────────────────────────────────────────────────────────
async function ensureNfTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS nf_folders (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).catch(() => {});
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS nf_entries (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      folder_id TEXT REFERENCES nf_folders(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).catch(() => {});
  // Add folder_id column if table already existed without it
  await prisma.$executeRawUnsafe(`
    ALTER TABLE nf_entries ADD COLUMN IF NOT EXISTS folder_id TEXT REFERENCES nf_folders(id) ON DELETE SET NULL
  `).catch(() => {});
}
ensureNfTable();

// POST /api/financeiro/nf  — any authenticated user can upload an NF entry
// (Placed before the admin-only middleware)
router.post("/nf", nfUpload.single("file"), async (req: AuthRequest, res: Response) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "Arquivo obrigatório" });

  const senderId = req.user!.id;
  const senderName = req.user!.name;
  const fileUrl = `/uploads/nf/${file.filename}`;
  const fileName = file.originalname;

  try {
    const entry = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO nf_entries (sender_id, sender_name, file_url, file_name)
       VALUES ($1::text, $2::text, $3::text, $4::text)
       RETURNING id, sender_id, sender_name, file_url, file_name, created_at`,
      senderId, senderName, fileUrl, fileName
    );
    res.json(entry[0]);
  } catch (error) {
    console.error("NF entry create error:", error);
    res.status(500).json({ error: "Erro ao salvar NF" });
  }
});

// Only admins (and owner) can access remaining financeiro routes
router.use((req: AuthRequest, res, next) => {
  if (!req.user?.isAdmin && req.user?.email !== OWNER_EMAIL) {
    return res.status(403).json({ error: "Acesso restrito a administradores" });
  }
  next();
});

// Ensure extra columns exist (idempotent)
async function ensureColumns() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE cidade_clients ADD COLUMN IF NOT EXISTS contract_value FLOAT`
    );
  } catch { /* ignore */ }
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE cidade_clients ADD COLUMN IF NOT EXISTS contract_start_date DATE`
    );
  } catch { /* ignore */ }
}
ensureColumns();

// Extract R$ value from briefing notes, e.g. "R$ 1.500,00" → 1500
function extractValueFromNotes(notes: string | null): number | null {
  if (!notes) return null;
  const match = notes.match(/R\$\s*([\d.,]+)/i);
  if (!match) return null;
  const raw = match[1].replace(/\./g, "").replace(",", ".");
  const val = parseFloat(raw);
  return isNaN(val) ? null : val;
}

function monthKey(date: Date): string {
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

// GET /api/financeiro/summary
router.get("/summary", async (_req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.$queryRaw<any[]>`
      SELECT id, name, package, contract_value, briefing_notes, created_at, contract_start_date
      FROM cidade_clients
      ORDER BY created_at ASC
    `;

    const enriched = clients.map((c) => {
      const contractValue =
        c.contract_value != null
          ? Number(c.contract_value)
          : extractValueFromNotes(c.briefing_notes);
      return {
        id: c.id,
        name: c.name,
        package: c.package,
        contractValue: contractValue ?? 0,
        createdAt: c.created_at,
        contractStartDate: c.contract_start_date ?? null,
      };
    });

    const totalMRR = enriched.reduce((sum, c) => sum + c.contractValue, 0);
    const activeClients = enriched.filter((c) => c.contractValue > 0).length;
    const avgContract = activeClients > 0 ? totalMRR / activeClients : 0;
    const annualProjection = totalMRR * 12;

    // Package breakdown
    const packageBreakdown = enriched.reduce(
      (acc: Record<string, { count: number; mrr: number }>, c) => {
        const key = c.package || "sem_pacote";
        if (!acc[key]) acc[key] = { count: 0, mrr: 0 };
        acc[key].count++;
        acc[key].mrr += c.contractValue;
        return acc;
      },
      {}
    );

    // MRR growth over time (cumulative by client join date)
    let cumulative = 0;
    const mrrGrowth = enriched
      .filter((c) => c.contractValue > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((c) => {
        cumulative += c.contractValue;
        return {
          date: monthKey(new Date(c.createdAt)),
          mrr: cumulative,
          client: c.name,
        };
      });

    // Per-client values for bar chart
    const perClient = enriched
      .filter((c) => c.contractValue > 0)
      .sort((a, b) => b.contractValue - a.contractValue)
      .map((c) => ({
        name: c.name.split(" ")[0],
        fullName: c.name,
        value: c.contractValue,
        package: c.package,
      }));

    // Monthly new clients — only those with contract_start_date set
    // Groups by year-month so future months appear correctly
    const monthlyMap: Record<string, { month: string; sortKey: string; newClients: number; newMRR: number }> = {};
    for (const c of enriched) {
      if (!c.contractStartDate) continue;
      const d = new Date(c.contractStartDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = { month: monthKey(d), sortKey: key, newClients: 0, newMRR: 0 };
      }
      monthlyMap[key].newClients++;
      monthlyMap[key].newMRR += c.contractValue;
    }
    const newClientsPerMonth = Object.values(monthlyMap)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ month, newClients, newMRR }) => ({ month, newClients, newMRR }));

    res.json({
      totalMRR,
      activeClients,
      avgContract,
      annualProjection,
      totalClients: enriched.length,
      packageBreakdown,
      mrrGrowth,
      perClient,
      newClientsPerMonth,
    });
  } catch (error) {
    console.error("Financeiro summary error:", error);
    res.status(500).json({ error: "Erro ao carregar dados financeiros" });
  }
});

// GET /api/financeiro/clients – full list with contract values
router.get("/clients", async (_req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.$queryRaw<any[]>`
      SELECT id, name, package, email, phone, contract_value, briefing_notes, image_url, created_at, contract_start_date
      FROM cidade_clients
      ORDER BY name ASC
    `;

    const result = clients.map((c) => {
      const contractValue =
        c.contract_value != null
          ? Number(c.contract_value)
          : extractValueFromNotes(c.briefing_notes);
      return {
        id: c.id,
        name: c.name,
        package: c.package,
        email: c.email,
        phone: c.phone,
        imageUrl: c.image_url,
        contractValue: contractValue ?? 0,
        contractStartDate: c.contract_start_date ?? null,
        createdAt: c.created_at,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Financeiro clients error:", error);
    res.status(500).json({ error: "Erro ao carregar clientes" });
  }
});

// GET /api/financeiro/nf  — owner + super_admin only
router.get("/nf", async (req: AuthRequest, res: Response) => {
  if (!isOwnerOrSuperAdmin(req)) {
    return res.status(403).json({ error: "Acesso negado" });
  }
  try {
    const entries = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, sender_id, sender_name, file_url, file_name, folder_id,
              to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
       FROM nf_entries ORDER BY created_at DESC`
    );
    res.json(entries.map(e => ({
      id: String(e.id),
      senderId: String(e.sender_id),
      senderName: String(e.sender_name),
      fileUrl: String(e.file_url),
      fileName: String(e.file_name),
      folderId: e.folder_id ? String(e.folder_id) : null,
      createdAt: String(e.created_at),
    })));
  } catch (error) {
    console.error("NF entries list error:", error);
    res.status(500).json({ error: "Erro ao listar NFs" });
  }
});

// ── NF Folders ────────────────────────────────────────────────────────────────

// GET /api/financeiro/nf/folders
router.get("/nf/folders", async (req: AuthRequest, res: Response) => {
  if (!isOwnerOrSuperAdmin(req)) {
    return res.status(403).json({ error: "Acesso negado" });
  }
  try {
    const folders = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
       FROM nf_folders ORDER BY name ASC`
    );
    res.json(folders.map(f => ({ id: String(f.id), name: String(f.name), createdAt: String(f.created_at) })));
  } catch (error) {
    console.error("NF folders list error:", error);
    res.status(500).json({ error: "Erro ao listar pastas" });
  }
});

// POST /api/financeiro/nf/folders
router.post("/nf/folders", async (req: AuthRequest, res: Response) => {
  if (!isOwnerOrSuperAdmin(req)) {
    return res.status(403).json({ error: "Acesso negado" });
  }
  const { name } = req.body as { name: string };
  if (!name?.trim()) return res.status(400).json({ error: "Nome obrigatório" });
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO nf_folders (name) VALUES ($1::text)
       RETURNING id, name, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at`,
      name.trim()
    );
    res.json({ id: String(rows[0].id), name: String(rows[0].name), createdAt: String(rows[0].created_at) });
  } catch (error) {
    console.error("NF folder create error:", error);
    res.status(500).json({ error: "Erro ao criar pasta" });
  }
});

// DELETE /api/financeiro/nf/folders/:id
router.delete("/nf/folders/:id", async (req: AuthRequest, res: Response) => {
  if (!isOwnerOrSuperAdmin(req)) {
    return res.status(403).json({ error: "Acesso negado" });
  }
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM nf_folders WHERE id = $1::text`, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("NF folder delete error:", error);
    res.status(500).json({ error: "Erro ao remover pasta" });
  }
});

// PUT /api/financeiro/nf/:id/folder  — move NF to a folder (or null to ungroup)
router.put("/nf/:id/folder", async (req: AuthRequest, res: Response) => {
  if (!isOwnerOrSuperAdmin(req)) {
    return res.status(403).json({ error: "Acesso negado" });
  }
  const { folderId } = req.body as { folderId: string | null };
  try {
    if (folderId) {
      await prisma.$executeRawUnsafe(
        `UPDATE nf_entries SET folder_id = $1::text WHERE id = $2::text`,
        folderId, req.params.id
      );
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE nf_entries SET folder_id = NULL WHERE id = $1::text`,
        req.params.id
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error("NF move folder error:", error);
    res.status(500).json({ error: "Erro ao mover NF" });
  }
});

export default router;
