import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { getIO } from "../lib/socket.js";

const CPL_THRESHOLD = 120;

async function checkAllClientsCpl() {
  console.log("[LinkedIn CPL Job] Running check...");

  const clients = await prisma.cidadeClient.findMany({
    where: {
      linkedin_access_token: { not: null },
      linkedin_ad_account_id: { not: null },
    },
  });

  for (const client of clients) {
    try {
      await checkClientCpl(client);
    } catch (err) {
      console.error(`[LinkedIn CPL Job] Error for client ${client.name}:`, err);
    }
  }
}

async function checkClientCpl(client: {
  id: string;
  name: string;
  linkedin_access_token: string | null;
  linkedin_ad_account_id: string | null;
}) {
  const token = client.linkedin_access_token!;
  const rawAccountUrn = `urn:li:sponsoredAccount:${client.linkedin_ad_account_id}`;

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  // Fetch campaigns
  const campaignParams = new URLSearchParams({
    q: "search",
    "search.account.values[0]": rawAccountUrn,
    "search.status.values[0]": "ACTIVE",
    "search.status.values[1]": "PAUSED",
    count: "50",
  });

  const campaignsRes = await fetch(
    `https://api.linkedin.com/v2/adCampaignsV2?${campaignParams}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!campaignsRes.ok) return;

  const campaignsData = (await campaignsRes.json()) as { elements: any[] };
  const campaigns = campaignsData.elements ?? [];
  if (campaigns.length === 0) return;

  // Fetch analytics
  const analyticsParams = new URLSearchParams({
    q: "analytics",
    pivot: "CAMPAIGN",
    "dateRange.start.day": String(start.getDate()),
    "dateRange.start.month": String(start.getMonth() + 1),
    "dateRange.start.year": String(start.getFullYear()),
    "dateRange.end.day": String(end.getDate()),
    "dateRange.end.month": String(end.getMonth() + 1),
    "dateRange.end.year": String(end.getFullYear()),
    "accounts[0]": rawAccountUrn,
    timeGranularity: "ALL",
    fields: "impressions,clicks,costInLocalCurrency,oneClickLeads,pivotValues",
  });

  const analyticsRes = await fetch(
    `https://api.linkedin.com/v2/adAnalyticsV2?${analyticsParams}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  let analytics: any[] = [];
  if (analyticsRes.ok) {
    try {
      analytics = ((await analyticsRes.json()) as any).elements ?? [];
    } catch {}
  }

  // Calculate CPL per campaign
  const highCpl = campaigns
    .map((c: any) => {
      const urn = `urn:li:sponsoredCampaign:${c.id}`;
      const stats = analytics.find((a: any) =>
        (a.pivotValues ?? []).some((v: string) => v === urn || v.includes(String(c.id)))
      ) ?? {};
      const leads = stats.oneClickLeads ?? 0;
      const spend = parseFloat(String(stats.costInLocalCurrency ?? 0)) || 0;
      const cpl = leads > 0 ? spend / leads : 0;
      return { id: c.id, name: c.name, leads, cpl };
    })
    .filter((c: any) => c.leads > 0 && c.cpl > CPL_THRESHOLD);

  if (highCpl.length === 0) return;

  // 24h dedup
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pattern = `%LinkedIn%${client.name}%CPL%`;
  const recent = await prisma.$queryRaw<any[]>`
    SELECT id FROM inside_inbox
    WHERE body ILIKE ${pattern}
      AND created_at > ${since}
    LIMIT 1
  `;
  if (recent.length > 0) return;

  const worstCampaign = highCpl.sort((a: any, b: any) => b.cpl - a.cpl)[0];
  const body = `⚠️ LinkedIn Ads · ${client.name}: CPL alto detectado. Campanha "${worstCampaign.name}" com CPL de R$ ${worstCampaign.cpl.toFixed(2)} (acima de R$ 120,00). Revise o público-alvo ou o criativo.`;

  // Fetch all non-client users, deduped
  const allRoles = await prisma.userRole.findMany({
    where: { role: { in: ["employee", "admin", "second_owner"] } },
    include: { user: true },
  });
  const seenIds = new Set<string>();
  const recipients = allRoles.filter((r) => {
    if (seenIds.has(r.userId)) return false;
    seenIds.add(r.userId);
    return true;
  });

  // We need a system sender — use the first recipient as sender (or a fixed UUID)
  // Use a deterministic "system" approach: send from_user_id = first recipient
  const senderId = recipients[0]?.userId;
  if (!senderId) return;

  const io = getIO();
  for (const rec of recipients) {
    await prisma.$executeRaw`
      INSERT INTO inside_inbox (to_user_id, from_user_id, from_name, body)
      VALUES (
        ${rec.userId}::uuid,
        ${senderId}::uuid,
        ${"Town · Alertas LinkedIn"},
        ${body}
      )
    `;
    io.to(`user:${rec.userId}`).emit("inside_inbox_new");
  }

  // Also notify the linked client user (if any)
  const clientUsers = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT u.id FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     WHERE u.linked_cidade_client_id = $1 AND ur.role = 'client'`,
    client.id
  );
  for (const cu of clientUsers) {
    if (recipients.some((r) => r.userId === cu.id)) continue;
    await prisma.$executeRaw`
      INSERT INTO inside_inbox (to_user_id, from_user_id, from_name, body)
      VALUES (
        ${cu.id}::uuid,
        ${senderId}::uuid,
        ${"Town · Alertas LinkedIn"},
        ${body}
      )
    `;
    io.to(`user:${cu.id}`).emit("inside_inbox_new");
  }

  console.log(`[LinkedIn CPL Job] Warning sent for ${client.name} (worst CPL: R$${worstCampaign.cpl.toFixed(2)})`);
}

// Runs every hour
export function startLinkedInCplJob() {
  cron.schedule("0 * * * *", checkAllClientsCpl);
  console.log("[LinkedIn CPL Job] Scheduled — runs every hour");
}
