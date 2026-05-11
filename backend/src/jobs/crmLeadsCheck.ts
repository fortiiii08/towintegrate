import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { getIO } from "../lib/socket.js";
import Anthropic from "@anthropic-ai/sdk";

function getCrmApiUrl() {
  return process.env.CRM_API_URL || "http://localhost:5174";
}
function getCrmApiKey() {
  return process.env.CRM_ADMIN_KEY || "town_admin_key_dev";
}
function getWaApiUrl() {
  return process.env.WHATSAPP_API_URL || "http://localhost:8080";
}
function getWaApiKey() {
  return process.env.WHATSAPP_API_KEY || "town-evolution-key-2026";
}
function getWaInstance() {
  return process.env.WHATSAPP_INSTANCE || "towncrm";
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateLeadAnalysis(lead: any, clientName: string): Promise<string> {
  try {
    const leadInfo = [
      `Nome: ${lead.name}`,
      lead.phone ? `Telefone: ${lead.phone}` : null,
      lead.email ? `E-mail: ${lead.email}` : null,
      lead.jobTitle ? `Cargo: ${lead.jobTitle}` : null,
      lead.bankWorked ? `Empresa/Banco: ${lead.bankWorked}` : null,
      lead.pharmacyName ? `Farmácia/Empresa: ${lead.pharmacyName}` : null,
      lead.timeSinceDismissal ? `Tempo desde desligamento: ${lead.timeSinceDismissal}` : null,
      lead.source ? `Origem: ${lead.source}` : null,
      lead.notes ? `Observações: ${lead.notes}` : null,
      `Etapa: ${lead.stage?.name ?? "Novo"}`,
    ].filter(Boolean).join("\n");

    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `Você é um especialista em direito trabalhista brasileiro. Analise este lead do CRM do escritório "${clientName}" e gere uma mensagem de WhatsApp direta e estratégica para o time de captação.

Dados do lead:
${leadInfo}

Gere uma mensagem com:
1. Classificação do lead (DIAMANTE/OURO/PRATA) baseada no potencial
2. Resumo do perfil em 2-3 linhas
3. Análise estratégica: timing, empresa, cargo
4. 2-3 teses jurídicas aplicáveis mais relevantes
5. Próximo passo recomendado

Use emojis, seja direto e prático. Máximo 400 palavras. Não inclua saudações nem despedidas.`,
      }],
    });

    return (msg.content[0] as any).text ?? "";
  } catch (err: any) {
    console.error("[WA AI] Error generating analysis:", err?.message);
    return "";
  }
}

// ── Ensure dedup table for WhatsApp notifications ─────────────────
const waTableReady = prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS crm_wa_notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id  TEXT NOT NULL,
    lead_id    TEXT NOT NULL,
    sent_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE (client_id, lead_id)
  )
`).catch(() => {});

// ── Ensure whatsapp_number column on cidade_clients ───────────────
prisma.$executeRawUnsafe(
  `ALTER TABLE cidade_clients ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(30)`
).catch(() => {});

// ── WhatsApp helpers ──────────────────────────────────────────────

function formatPhone(raw: string): string {
  // Strip everything except digits
  const digits = raw.replace(/\D/g, "");
  // If it already starts with 55 and has 12-13 digits, use as-is
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  // Otherwise assume it's a Brazilian number without country code
  return `55${digits}`;
}

export async function sendWhatsAppLeadMessage(
  phone: string,
  clientName: string,
  leadName: string,
  stageName: string,
  isWon: boolean,
  isLost: boolean,
  createdAt?: string,
  fullLead?: any
): Promise<boolean> {
  const waUrl = getWaApiUrl();
  const waKey = getWaApiKey();
  const instance = getWaInstance();

  if (!waUrl || !waKey || !instance) return false;

  const number = formatPhone(phone);

  const icon  = isWon ? "🏆" : isLost ? "❌" : "🎯";
  const label = isWon ? "Lead ganho" : isLost ? "Lead perdido" : "Novo lead";

  let dateStr = "";
  if (createdAt) {
    try {
      dateStr = new Date(createdAt).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      });
    } catch {}
  }

  // Try to generate AI analysis if we have full lead data
  let aiAnalysis = "";
  if (fullLead && process.env.ANTHROPIC_API_KEY) {
    aiAnalysis = await generateLeadAnalysis(fullLead, clientName);
  }

  const text = aiAnalysis
    ? `${icon} *${label}* — ${clientName}\n📅 ${dateStr}\n\n${aiAnalysis}`
    : [
        `${icon} *${label}* — ${clientName}`,
        ``,
        `👤 *Nome:* ${leadName}`,
        `📋 *Etapa:* ${stageName}`,
        dateStr ? `📅 *Data:* ${dateStr}` : null,
        ``,
        `Acesse o CRM para mais detalhes.`,
      ].filter((l) => l !== null).join("\n");

  try {
    const res = await fetch(`${waUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: waKey },
      body: JSON.stringify({ number, text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[WA] sendText failed (${res.status}):`, err.slice(0, 200));
      return false;
    }
    return true;
  } catch (err: any) {
    console.error("[WA] sendText error:", err?.message ?? err);
    return false;
  }
}

// ── Core lead processor ───────────────────────────────────────────

export async function checkNewLeadsForClients() {
  await waTableReady;

  const clients = await prisma.$queryRaw<{
    id: string;
    name: string;
    crm_tenant_id: string;
    whatsapp_number: string | null;
    phone: string | null;
  }[]>`
    SELECT id, name, crm_tenant_id, whatsapp_number, phone FROM cidade_clients
    WHERE crm_tenant_id IS NOT NULL AND crm_tenant_id != ''
  `;

  for (const client of clients) {
    try {
      await processClientLeads(client);
    } catch (err) {
      console.error(`[CRM Leads Job] Error for ${client.name}:`, err);
    }
  }
}

async function processClientLeads(client: {
  id: string;
  name: string;
  crm_tenant_id: string;
  whatsapp_number: string | null;
  phone: string | null;
}) {
  // ── 1. Find linked client users for inside_inbox notifications ───
  const clientUsers = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT u.id FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     WHERE u.linked_cidade_client_id = $1 AND ur.role = 'client'
     AND NOT EXISTS (
       SELECT 1 FROM user_card_blocks ucb WHERE ucb.user_id = u.id AND ucb.card_id = 'trafego'
     )`,
    client.id
  );

  // ── 2. Fetch recent leads from CRM ───────────────────────────────
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

  // ── 3. Only process leads from the last 24h ──────────────────────
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const freshLeads = recentLeads.filter((lead: any) => {
    const created = lead.createdAt ?? lead.created_at;
    if (!created) return false;
    return new Date(created) >= cutoff;
  });

  if (!freshLeads.length) return;

  const io = getIO();
  const waPhone = client.whatsapp_number || client.phone || "";

  for (const lead of freshLeads) {
    const leadId = String(lead.id ?? lead.leadId ?? "");
    if (!leadId) continue;

    const stageName: string = lead.stage?.name ?? lead.stageName ?? "Novo";
    const isWon: boolean  = lead.stage?.isWon  ?? lead.isWon  ?? false;
    const isLost: boolean = lead.stage?.isLost ?? lead.isLost ?? false;
    const createdAt: string = lead.createdAt ?? lead.created_at ?? "";

    // ── 3a. inside_inbox (dedup by tag in body) ──────────────────
    const dedupTag = `[lead:${leadId}]`;
    for (const clientUser of clientUsers) {
      const already = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM inside_inbox WHERE to_user_id = $1::uuid AND body LIKE $2 LIMIT 1`,
        clientUser.id, `%${dedupTag}%`
      );
      if (already.length > 0) continue;

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
      console.log(`[CRM Leads Job] Inbox: ${lead.name} → ${client.name}`);
    }

    // ── 3b. WhatsApp (dedup via crm_wa_notifications table) ──────
    if (!waPhone) continue;

    const waAlready = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM crm_wa_notifications WHERE client_id = $1 AND lead_id = $2 LIMIT 1`,
      client.id, leadId
    );
    if (waAlready.length > 0) continue;

    const sent = await sendWhatsAppLeadMessage(
      waPhone, client.name, lead.name, stageName, isWon, isLost, createdAt, lead
    );

    if (sent) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO crm_wa_notifications (client_id, lead_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        client.id, leadId
      );
      console.log(`[WA] Sent lead "${lead.name}" → ${waPhone} (${client.name})`);
    }
  }
}

// ── Manual WhatsApp send for a specific lead ──────────────────────
export async function sendLeadWhatsAppManual(
  clientId: string,
  leadId: string
): Promise<{ ok: boolean; error?: string }> {
  await waTableReady;

  const clientRows = await prisma.$queryRawUnsafe<{
    id: string; name: string; crm_tenant_id: string;
    whatsapp_number: string | null; phone: string | null;
  }[]>(
    `SELECT id, name, crm_tenant_id, whatsapp_number, phone FROM cidade_clients WHERE id = $1`,
    clientId
  );
  if (!clientRows.length) return { ok: false, error: "Cliente não encontrado" };
  const client = clientRows[0];

  const waPhone = client.whatsapp_number || client.phone || "";
  if (!waPhone) return { ok: false, error: "Nenhum número de WhatsApp configurado para este cliente" };
  if (!client.crm_tenant_id) return { ok: false, error: "Cliente sem CRM ativado" };

  // Fetch lead from CRM
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  let targetLead: any = null;
  try {
    const res = await fetch(
      `${getCrmApiUrl()}/api/admin/tenants/${client.crm_tenant_id}/stats`,
      { headers: { "x-admin-key": getCrmApiKey() }, signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return { ok: false, error: "Erro ao buscar leads do CRM" };
    const stats: any = await res.json();
    const leads: any[] = stats.recentLeads ?? [];
    targetLead = leads.find((l: any) => String(l.id ?? l.leadId) === leadId);
  } catch {
    clearTimeout(timeout);
    return { ok: false, error: "Timeout ao buscar leads do CRM" };
  }

  if (!targetLead) return { ok: false, error: "Lead não encontrado no CRM" };

  const stageName: string = targetLead.stage?.name ?? targetLead.stageName ?? "Novo";
  const isWon: boolean  = targetLead.stage?.isWon  ?? targetLead.isWon  ?? false;
  const isLost: boolean = targetLead.stage?.isLost ?? targetLead.isLost ?? false;
  const createdAt: string = targetLead.createdAt ?? targetLead.created_at ?? "";

  const sent = await sendWhatsAppLeadMessage(
    waPhone, client.name, targetLead.name, stageName, isWon, isLost, createdAt, targetLead
  );

  if (!sent) return { ok: false, error: "Falha ao enviar mensagem WhatsApp" };

  // Upsert dedup so automatic job doesn't resend
  await prisma.$executeRawUnsafe(
    `INSERT INTO crm_wa_notifications (client_id, lead_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    clientId, leadId
  );

  return { ok: true };
}

// Runs every 5 minutes
export function startCrmLeadsJob() {
  cron.schedule("*/5 * * * *", checkNewLeadsForClients);
  console.log("[CRM Leads Job] Scheduled — runs every 5 minutes");
}
