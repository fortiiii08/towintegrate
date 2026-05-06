import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

// Schemas
const createClientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  niche: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  niche: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  lastRecordingDate: z.string().nullable().optional(),
});

const createLeadSchema = z.object({
  clientId: z.string().uuid("Client ID inválido"),
  platform: z.string().min(1, "Plataforma é obrigatória"),
  niche: z.string().optional().nullable(),
  leadCount: z.number().min(0).default(0),
  campaignName: z.string().optional().nullable(),
  date: z.string().optional(),
});

// ========== CLIENTS ==========

// List all clients
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: "asc" },
    });
    res.json(clients);
  } catch (error) {
    console.error("List clients error:", error);
    res.status(500).json({ error: "Erro ao listar clientes" });
  }
});

// Get client by ID
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: { leads: { orderBy: { date: "desc" } } },
    });
    if (!client) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json(client);
  } catch (error) {
    console.error("Get client error:", error);
    res.status(500).json({ error: "Erro ao buscar cliente" });
  }
});

// Create client
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = createClientSchema.parse(req.body);
    const client = await prisma.client.create({
      data: { name: data.name, niche: data.niche, imageUrl: data.imageUrl },
    });
    res.status(201).json(client);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error("Create client error:", error);
    res.status(500).json({ error: "Erro ao criar cliente" });
  }
});

// Update client
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const data = updateClientSchema.parse(req.body);
    const updateData: any = { ...data };
    if (data.lastRecordingDate !== undefined) {
      updateData.lastRecordingDate = data.lastRecordingDate ? new Date(data.lastRecordingDate) : null;
    }
    const client = await prisma.client.update({ where: { id: req.params.id }, data: updateData });
    res.json(client);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error("Update client error:", error);
    res.status(500).json({ error: "Erro ao atualizar cliente" });
  }
});

// Delete client
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete client error:", error);
    res.status(500).json({ error: "Erro ao excluir cliente" });
  }
});

// ========== LEADS ==========

// List leads by client
router.get("/:clientId/leads", async (req: AuthRequest, res: Response) => {
  try {
    const leads = await prisma.lead.findMany({
      where: { clientId: req.params.clientId },
      orderBy: { date: "desc" },
    });
    res.json(leads);
  } catch (error) {
    console.error("List leads error:", error);
    res.status(500).json({ error: "Erro ao listar leads" });
  }
});

// Create single lead (from useAddLead - uses /clients/leads with clientId in body)
router.post("/leads", async (req: AuthRequest, res: Response) => {
  try {
    const data = createLeadSchema.parse(req.body);
    const lead = await prisma.lead.create({
      data: {
        clientId: data.clientId,
        platform: data.platform,
        niche: data.niche,
        leadCount: data.leadCount,
        campaignName: data.campaignName,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });
    res.status(201).json(lead);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error("Create lead error:", error);
    res.status(500).json({ error: "Erro ao criar lead" });
  }
});

// Create leads in batch
router.post("/leads/batch", async (req: AuthRequest, res: Response) => {
  try {
    const leads = req.body; // array of lead objects

    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: "Array de leads é obrigatório" });
    }

    const createdLeads = await Promise.all(
      leads.map((lead: any) =>
        prisma.lead.create({
          data: {
            clientId: lead.clientId,
            platform: lead.platform,
            niche: lead.niche,
            leadCount: lead.leadCount || 0,
            campaignName: lead.campaignName,
            date: lead.date ? new Date(lead.date) : new Date(),
          },
        })
      )
    );

    res.status(201).json(createdLeads);
  } catch (error) {
    console.error("Create leads batch error:", error);
    res.status(500).json({ error: "Erro ao criar leads" });
  }
});

// Create lead under specific client
router.post("/:clientId/leads", async (req: AuthRequest, res: Response) => {
  try {
    const data = createLeadSchema.parse({
      ...req.body,
      clientId: req.params.clientId,
    });
    const lead = await prisma.lead.create({
      data: {
        clientId: data.clientId,
        platform: data.platform,
        niche: data.niche,
        leadCount: data.leadCount,
        campaignName: data.campaignName,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });
    res.status(201).json(lead);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error("Create lead error:", error);
    res.status(500).json({ error: "Erro ao criar lead" });
  }
});

// Delete lead
router.delete("/:clientId/leads/:leadId", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.lead.delete({ where: { id: req.params.leadId } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete lead error:", error);
    res.status(500).json({ error: "Erro ao excluir lead" });
  }
});

// ========== CRM INTEGRATION ==========

const CRM_API_URL = process.env.CRM_API_URL || "http://localhost:3000";
const CRM_API_KEY = process.env.CRM_API_KEY || "";
const OWNER_EMAIL = "gustavosaforti@gmail.com";

// Add crm columns on startup
async function ensureCrmColumns() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE clients ADD COLUMN IF NOT EXISTS crm_tenant_id VARCHAR(255)`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE clients ADD COLUMN IF NOT EXISTS crm_tenant_slug VARCHAR(255)`
  );
}
ensureCrmColumns().catch(console.error);

// POST /clients/:id/crm/provision
router.post("/:id/crm/provision", async (req: AuthRequest, res: Response) => {
  const isOwner = req.user?.email === OWNER_EMAIL;
  const isAdmin = req.user?.isAdmin === true;
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "Acesso restrito a admins" });

  try {
    const client = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!client) return res.status(404).json({ error: "Cliente não encontrado" });

    const rows = await prisma.$queryRaw<any[]>`
      SELECT crm_tenant_id FROM clients WHERE id = ${req.params.id}
    `;
    if (rows[0]?.crm_tenant_id) {
      return res.status(400).json({ error: "CRM já ativado para este cliente" });
    }

    const { adminEmail, adminPassword, adminName } = req.body;
    if (!adminEmail || !adminPassword) {
      return res.status(400).json({ error: "adminEmail e adminPassword são obrigatórios" });
    }

    const crmRes = await fetch(`${CRM_API_URL}/api/admin/provision`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": CRM_API_KEY },
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
      `UPDATE clients SET crm_tenant_id = $1, crm_tenant_slug = $2 WHERE id = $3`,
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

// GET /clients/:id/crm/stats
router.get("/:id/crm/stats", async (req: AuthRequest, res: Response) => {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT crm_tenant_id, crm_tenant_slug FROM clients WHERE id = ${req.params.id}
    `;
    const tenantId = rows[0]?.crm_tenant_id;
    if (!tenantId) return res.json({ provisioned: false });

    const crmRes = await fetch(`${CRM_API_URL}/api/admin/tenants/${tenantId}/stats`, {
      headers: { "x-admin-key": CRM_API_KEY },
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
