import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { getIO } from "../lib/socket.js";

function getCrmApiUrl() {
  return process.env.CRM_API_URL || "http://localhost:5174";
}
function getCrmApiKey() {
  return process.env.CRM_ADMIN_KEY || "town_admin_key_dev";
}

export async function checkNewLeadsForClients() {
  const clients = await prisma.$queryRaw<{ id: string; name: string; crm_tenant_id: string }[]>`
    SELECT id, name, crm_tenant_id FROM cidade_clients
    WHERE crm_tenant_id IS NOT NULL AND crm_tenant_id != ''
  `;

  for (const client of clients) {
    try {
      await notifyClientUser(client);
    } catch (err) {
      console.error(`[CRM Leads Job] Error for ${client.name}:`, err);
    }
  }
}

async function notifyClientUser(client: { id: string; name: string; crm_tenant_id: string }) {
  // Find the linked client user(s)
  const clientUsers = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT u.id FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     WHERE u.linked_cidade_client_id = $1 AND ur.role = 'client'`,
    client.id
  );
  if (!clientUsers.length) return;

  // Fetch recent leads from CRM
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  let recentLeads: any[] = [];
  try {
    const res = await fetch(
      `${getCrmApiUrl()}/api/admin/tenants/${client.crm_tenant_id}/stats`,
      { headers: { "x-admin-key": getCrmApiKey() }, signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return;
    const stats: any = await res.json();
    recentLeads = stats.recentLeads ?? [];
  } catch {
    clearTimeout(timeout);
    return;
  }

  if (!recentLeads.length) return;

  const io = getIO();

  for (const lead of recentLeads) {
    const leadId = String(lead.id ?? lead.leadId ?? "");
    if (!leadId) continue;

    // Dedup by lead ID embedded in body — never notifies the same lead twice
    const dedupTag = `[lead:${leadId}]`;

    for (const clientUser of clientUsers) {
      const already = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM inside_inbox WHERE to_user_id = $1::uuid AND body LIKE $2 LIMIT 1`,
        clientUser.id, `%${dedupTag}%`
      );
      if (already.length > 0) continue;

      const stageName: string = lead.stage?.name ?? lead.stageName ?? "Novo";
      const isWon: boolean  = lead.stage?.isWon  ?? lead.isWon  ?? false;
      const isLost: boolean = lead.stage?.isLost ?? lead.isLost ?? false;

      const icon  = isWon ? "🏆" : isLost ? "❌" : "📥";
      const label = isWon ? "Lead ganho" : isLost ? "Lead perdido" : "Novo lead recebido";
      const body  = `${icon} ${label}: "${lead.name}" · ${stageName} ${dedupTag}`;

      await prisma.$executeRaw`
        INSERT INTO inside_inbox (to_user_id, from_user_id, from_name, body)
        VALUES (
          ${clientUser.id}::uuid,
          ${clientUser.id}::uuid,
          ${"Town · CRM"},
          ${body}
        )
      `;
      io.to(`user:${clientUser.id}`).emit("inside_inbox_new");
      console.log(`[CRM Leads Job] Notified ${clientUser.id} — ${label}: ${lead.name} (${client.name})`);
    }
  }
}

// Runs every 5 minutes
export function startCrmLeadsJob() {
  cron.schedule("*/5 * * * *", checkNewLeadsForClients);
  console.log("[CRM Leads Job] Scheduled — runs every 5 minutes");
}
