import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, Link2, Unlink, RefreshCw, TrendingUp,
  MousePointerClick, Eye, Users, ChevronDown,
} from "lucide-react";

interface LinkedInStatus {
  connected: boolean;
  adAccountId: string | null;
}

interface AdAccount {
  id: number;
  name: string;
  status: string;
  currency: string;
}

interface Campaign {
  id: number;
  name: string;
  status: string;
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
  cpl: number;
  ctr: string;
}

const LI_BLUE = "#0A66C2";

export function LinkedInAdsTab({ clientId }: { clientId: string }) {
  const [status, setStatus] = useState<LinkedInStatus | null>(null);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  // ── Fetch status ────────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const s = await api.get<LinkedInStatus>(`/linkedin/${clientId}/status`);
      setStatus(s);
      return s;
    } catch {
      setStatus({ connected: false, adAccountId: null });
      return null;
    }
  }, [clientId]);

  useEffect(() => {
    setLoadingStatus(true);
    fetchStatus().finally(() => setLoadingStatus(false));
  }, [fetchStatus]);

  // ── After status loaded, fetch accounts or campaigns ────────────────────────
  useEffect(() => {
    if (!status) return;
    if (!status.connected) return;

    if (!status.adAccountId) {
      fetchAccounts();
    } else {
      fetchCampaigns();
    }
  }, [status?.connected, status?.adAccountId]); // eslint-disable-line

  // ── Listen for OAuth popup result ───────────────────────────────────────────
  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (e.data?.type === "linkedin_connected" && e.data.clientId === clientId) {
        setConnecting(false);
        setError(null);
        const s = await fetchStatus();
        if (s?.connected && !s.adAccountId) fetchAccounts();
      }
      if (e.data?.type === "linkedin_error") {
        setConnecting(false);
        setError("Não foi possível conectar. Tente novamente.");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [clientId, fetchStatus]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const { url } = await api.get<{ url: string }>(`/linkedin/auth-url?clientId=${clientId}`);
      const popup = window.open(url, "linkedin_oauth", "width=600,height=700,left=200,top=100");
      if (!popup) {
        setError("Popup bloqueado. Permite popups para este site e tente novamente.");
        setConnecting(false);
      }
    } catch {
      setError("Erro ao gerar URL de autenticação.");
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await api.delete(`/linkedin/${clientId}/disconnect`);
      setStatus({ connected: false, adAccountId: null });
      setAccounts([]);
      setCampaigns([]);
    } finally {
      setDisconnecting(false);
    }
  }

  async function fetchAccounts() {
    setLoadingAccounts(true);
    setError(null);
    try {
      const data = await api.get<AdAccount[]>(`/linkedin/${clientId}/accounts`);
      setAccounts(data);
      setShowAccountPicker(true);
    } catch {
      setError("Erro ao buscar contas de anúncio.");
    } finally {
      setLoadingAccounts(false);
    }
  }

  async function selectAccount(accountId: number) {
    try {
      await api.post(`/linkedin/${clientId}/set-account`, { accountId: String(accountId) });
      setStatus((s) => s ? { ...s, adAccountId: String(accountId) } : s);
      setShowAccountPicker(false);
      fetchCampaigns();
    } catch {
      setError("Erro ao salvar conta.");
    }
  }

  async function fetchCampaigns() {
    setLoadingCampaigns(true);
    setError(null);
    try {
      const data = await api.get<Campaign[]>(`/linkedin/${clientId}/campaigns`);
      setCampaigns(data);
    } catch (e: any) {
      setError(e.message || "Erro ao buscar campanhas.");
    } finally {
      setLoadingCampaigns(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loadingStatus) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Not connected
  if (!status?.connected) {
    return (
      <div className="py-6 space-y-4">
        <div className="text-center py-6">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3"
            style={{ background: "#E8F0F9" }}
          >
            <LinkedInIcon />
          </div>
          <p className="font-medium text-lg">LinkedIn Ads não conectado</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Conecte sua conta LinkedIn para visualizar campanhas deste cliente em tempo real.
          </p>
        </div>

        {error && (
          <p className="text-xs text-destructive text-center">{error}</p>
        )}

        <div className="flex justify-center">
          <Button
            onClick={handleConnect}
            disabled={connecting}
            style={{ background: LI_BLUE }}
            className="text-white hover:opacity-90"
          >
            {connecting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Link2 className="w-4 h-4 mr-2" />
            )}
            Conectar LinkedIn Ads
          </Button>
        </div>
      </div>
    );
  }

  // Connected — account picker
  if (!status.adAccountId || showAccountPicker) {
    return (
      <div className="py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkedInIcon />
            <span className="text-sm font-medium">Selecione a conta de anúncio</span>
          </div>
          <Button size="sm" variant="ghost" onClick={handleDisconnect} disabled={disconnecting}>
            <Unlink className="w-3 h-3 mr-1" />
            Desconectar
          </Button>
        </div>

        {loadingAccounts ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Nenhuma conta de anúncio encontrada.
            <br />
            <button
              className="mt-2 text-xs underline"
              onClick={fetchAccounts}
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => selectAccount(acc.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left"
              >
                <div>
                  <p className="text-sm font-medium">{acc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ID: {acc.id} · {acc.currency}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {acc.status}
                </Badge>
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // Connected + account set — campaigns view
  return (
    <div className="py-2 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LinkedInIcon />
          <Badge className="text-xs" style={{ background: LI_BLUE, color: "#fff" }}>
            Conectado
          </Badge>
          <span className="text-xs text-muted-foreground">Conta: {status.adAccountId}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2"
            onClick={fetchCampaigns}
            disabled={loadingCampaigns}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loadingCampaigns ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2 text-muted-foreground"
            onClick={() => setShowAccountPicker(true)}
          >
            <ChevronDown className="w-3 h-3 mr-1" />
            Trocar conta
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2 text-muted-foreground"
            onClick={handleDisconnect}
            disabled={disconnecting}
          >
            <Unlink className="w-3 h-3 mr-1" />
            Desconectar
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {loadingCampaigns ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhuma campanha ativa ou pausada encontrada.
        </div>
      ) : (
        <>
          {/* KPI totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              icon={<Eye className="w-4 h-4 text-muted-foreground" />}
              label="Impressões"
              value={fmtNum(campaigns.reduce((s, c) => s + c.impressions, 0))}
            />
            <KpiCard
              icon={<Users className="w-4 h-4 text-muted-foreground" />}
              label="Leads"
              value={fmtNum(campaigns.reduce((s, c) => s + c.leads, 0))}
            />
            <KpiCard
              icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />}
              label="Gasto (30d)"
              value={`R$ ${fmtNum(campaigns.reduce((s, c) => s + c.spend, 0))}`}
            />
            <KpiCard
              icon={<MousePointerClick className="w-4 h-4 text-muted-foreground" />}
              label="CPL médio"
              value={(() => {
                const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
                const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
                return totalLeads > 0 ? `R$ ${fmtNum(totalSpend / totalLeads)}` : "—";
              })()}
            />
          </div>

          {/* Campaign list */}
          <Card className="overflow-hidden">
            <div className="p-3 border-b border-border bg-muted/40">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Campanhas · últimos 30 dias
              </p>
            </div>
            <div className="divide-y divide-border">
              {campaigns.map((c) => (
                <div key={c.id} className="p-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusDot status={c.status} />
                      <span className="text-xs text-muted-foreground capitalize">
                        {c.status.toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-4 text-right shrink-0">
                    <Metric label="Impressões" value={fmtNum(c.impressions)} />
                    <Metric label="Cliques" value={fmtNum(c.clicks)} />
                    <Metric label="CTR" value={`${c.ctr}%`} />
                    <Metric label="Leads" value={fmtNum(c.leads)} />
                    <Metric label="CPL" value={c.leads > 0 ? `R$ ${fmtNum(c.cpl)}` : "—"} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "ACTIVE" ? "#22c55e" : "#94a3b8";
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full"
      style={{ background: color }}
    />
  );
}

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={LI_BLUE}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function fmtNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(Math.round(n));
}
