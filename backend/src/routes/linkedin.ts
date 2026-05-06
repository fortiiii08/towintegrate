import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || "";
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || "";
const LINKEDIN_REDIRECT_URI =
  process.env.LINKEDIN_REDIRECT_URI || "http://localhost:3001/api/linkedin/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";

// ── GET /api/linkedin/auth-url?clientId=xxx ──────────────────────────────────
router.get("/auth-url", authenticate, (req: AuthRequest, res: Response) => {
  const { clientId } = req.query;
  if (!clientId || typeof clientId !== "string") {
    return res.status(400).json({ error: "clientId required" });
  }

  const state = Buffer.from(JSON.stringify({ clientId, ts: Date.now() })).toString("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: LINKEDIN_REDIRECT_URI,
    state,
    scope: "r_ads r_ads_reporting",
  });

  res.json({ url: `https://www.linkedin.com/oauth/v2/authorization?${params}` });
});

// ── GET /api/linkedin/callback ───────────────────────────────────────────────
router.get("/callback", async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.send(popupHtml(null, String(error)));
  }

  if (!code || !state) {
    return res.send(popupHtml(null, "missing_params"));
  }

  try {
    const stateData = JSON.parse(Buffer.from(String(state), "base64url").toString());
    const clientId: string = stateData.clientId;

    // Exchange authorization code for access token
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: LINKEDIN_REDIRECT_URI,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("[LinkedIn callback] token exchange failed:", err);
      return res.send(popupHtml(null, "token_exchange_failed"));
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    await prisma.cidadeClient.update({
      where: { id: clientId },
      data: {
        linkedin_access_token: tokenData.access_token,
        linkedin_refresh_token: tokenData.refresh_token ?? null,
        linkedin_token_expires_at: expiresAt,
        linkedin_ad_account_id: null, // reset so user picks account again
      },
    });

    return res.send(popupHtml(clientId, null));
  } catch (err) {
    console.error("[LinkedIn callback] error:", err);
    return res.send(popupHtml(null, "internal_error"));
  }
});

// ── GET /api/linkedin/:clientId/status ───────────────────────────────────────
router.get("/:clientId/status", authenticate, async (req: AuthRequest, res: Response) => {
  const client = await prisma.cidadeClient.findUnique({ where: { id: req.params.clientId } });
  if (!client) return res.status(404).json({ error: "Client not found" });

  res.json({
    connected: !!client.linkedin_access_token,
    adAccountId: client.linkedin_ad_account_id ?? null,
  });
});

// ── GET /api/linkedin/:clientId/accounts ─────────────────────────────────────
router.get("/:clientId/accounts", authenticate, async (req: AuthRequest, res: Response) => {
  const client = await prisma.cidadeClient.findUnique({ where: { id: req.params.clientId } });

  if (!client?.linkedin_access_token) {
    return res.status(401).json({ error: "not_connected" });
  }

  try {
    const r = await fetch(
      "https://api.linkedin.com/v2/adAccountsV2?q=search&search.type.values[0]=BUSINESS&search.status.values[0]=ACTIVE&count=50",
      { headers: { Authorization: `Bearer ${client.linkedin_access_token}` } }
    );

    if (!r.ok) {
      const err = await r.text();
      console.error("[LinkedIn accounts]", err);
      return res.status(502).json({ error: "linkedin_api_error" });
    }

    const data = (await r.json()) as { elements: any[] };
    res.json(data.elements ?? []);
  } catch (err) {
    console.error("[LinkedIn accounts]", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// ── POST /api/linkedin/:clientId/set-account ─────────────────────────────────
router.post("/:clientId/set-account", authenticate, async (req: AuthRequest, res: Response) => {
  const { accountId } = req.body;
  if (!accountId) return res.status(400).json({ error: "accountId required" });

  await prisma.cidadeClient.update({
    where: { id: req.params.clientId },
    data: { linkedin_ad_account_id: String(accountId) },
  });

  res.json({ ok: true });
});

// ── GET /api/linkedin/:clientId/campaigns ────────────────────────────────────
router.get("/:clientId/campaigns", authenticate, async (req: AuthRequest, res: Response) => {
  const client = await prisma.cidadeClient.findUnique({ where: { id: req.params.clientId } });

  if (!client?.linkedin_access_token) {
    return res.status(401).json({ error: "not_connected" });
  }
  if (!client.linkedin_ad_account_id) {
    return res.status(400).json({ error: "no_account_selected" });
  }

  const token = client.linkedin_access_token;
  const rawAccountUrn = `urn:li:sponsoredAccount:${client.linkedin_ad_account_id}`;

  try {
    // Campaigns list
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

    if (!campaignsRes.ok) {
      const err = await campaignsRes.text();
      console.error("[LinkedIn campaigns fetch]", err);
      return res.status(502).json({ error: "campaigns_fetch_failed" });
    }

    const campaignsData = (await campaignsRes.json()) as { elements: any[] };
    const campaigns = campaignsData.elements ?? [];
    console.log(`[LinkedIn] ${campaigns.length} campaigns found`);

    // Analytics last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

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

    const analyticsRaw = await analyticsRes.text();
    console.log(`[LinkedIn] analytics status: ${analyticsRes.status}`);
    console.log(`[LinkedIn] analytics response:`, analyticsRaw.slice(0, 500));

    let analytics: any[] = [];
    if (analyticsRes.ok) {
      try {
        analytics = JSON.parse(analyticsRaw).elements ?? [];
      } catch {
        console.error("[LinkedIn] failed to parse analytics JSON");
      }
    }

    console.log(`[LinkedIn] ${analytics.length} analytics rows`);
    if (analytics.length > 0) {
      console.log(`[LinkedIn] first analytics row:`, JSON.stringify(analytics[0]));
    }

    const result = campaigns.map((c: any) => {
      const urn = `urn:li:sponsoredCampaign:${c.id}`;
      const stats = analytics.find((a: any) => {
        const pv = a.pivotValues ?? [];
        return pv.some((v: string) => v === urn || v.includes(String(c.id)));
      }) ?? {};
      const impressions = stats.impressions ?? 0;
      const clicks = stats.clicks ?? 0;
      const leads = stats.oneClickLeads ?? 0;
      const spend = parseFloat(String(stats.costInLocalCurrency ?? 0)) || 0;
      const cpl = leads > 0 ? spend / leads : 0;
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        impressions,
        clicks,
        spend,
        leads,
        cpl,
        ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0.00",
      };
    });

    res.json(result);
  } catch (err) {
    console.error("[LinkedIn campaigns]", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// ── DELETE /api/linkedin/:clientId/disconnect ─────────────────────────────────
router.delete("/:clientId/disconnect", authenticate, async (req: AuthRequest, res: Response) => {
  await prisma.cidadeClient.update({
    where: { id: req.params.clientId },
    data: {
      linkedin_access_token: null,
      linkedin_refresh_token: null,
      linkedin_token_expires_at: null,
      linkedin_ad_account_id: null,
    },
  });
  res.json({ ok: true });
});

// ── Helper: popup HTML ────────────────────────────────────────────────────────
function popupHtml(clientId: string | null, error: string | null): string {
  const payload = clientId
    ? `{ type: 'linkedin_connected', clientId: '${clientId}' }`
    : `{ type: 'linkedin_error', error: '${error}' }`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>LinkedIn</title></head>
<body>
<script>
  if (window.opener) {
    window.opener.postMessage(${payload}, '*');
  }
  window.close();
</script>
<p>Pode fechar esta janela.</p>
</body>
</html>`;
}

export default router;
