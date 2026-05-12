import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Loader2, Zap, ArrowLeft, Search, X, BarChart2 } from "lucide-react";
import { TrafegoClientDialog } from "@/components/TrafegoClientDialog";
import { ClientCircle } from "@/components/ClientCircle";
import { useClients, Client } from "@/hooks/useClients";
import { useAuthContext } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const TOTAL_SLOTS = 30;
const OWNER_EMAIL = "gustavosaforti@gmail.com";
const CRM_URL = import.meta.env.VITE_CRM_URL || "http://localhost:5173";

const MATHEUS_CLIENTS = [
  "lansoni", "dinor", "h&h", "paz mendes", "garcia guedes", "diego cruz",
  "miguel cassiano", "souza menezes", "victor púpio", "victor pupío", "almeida lima",
  "ellion lopes", "hellen pestile",
];

function isMatheus(name: string) {
  const n = name.toLowerCase();
  return MATHEUS_CLIENTS.some((m) => n.includes(m));
}

function getCplColor(cpl: number | null | undefined): string | null {
  if (cpl === null || cpl === undefined) return null;
  if (cpl < 100) return "#22c55e";       // verde
  if (cpl < 120) return "#eab308";       // amarelo
  return "#ef4444";                       // vermelho
}

type ManagerFilter = "todos" | "gelyson" | "matheus";

const Trafego = () => {
  const navigate = useNavigate();
  const { user, userRole, linkedClientId } = useAuthContext();
  const { data: clients, isLoading } = useClients();

  const [loadingClientId, setLoadingClientId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [crmOpen, setCrmOpen] = useState(false);
  const [crmSrc, setCrmSrc] = useState("");
  const [crmTenantName, setCrmTenantName] = useState("");
  const [crmReady, setCrmReady] = useState(false);
  const [dialogClient, setDialogClient] = useState<Client | null>(null);
  const [manager, setManager] = useState<ManagerFilter>("todos");

  const isOwner = user?.email === OWNER_EMAIL;
  const isAdmin = user?.isAdmin;

  const { data: cplSummary } = useQuery<Record<string, number | null>>({
    queryKey: ["cpl-summary"],
    queryFn: () => api.get("/linkedin/cpl-summary"),
    staleTime: 5 * 60 * 1000,
  });

  const handleClientClick = async (client: Client) => {
    setErrorMsg(null);
    setLoadingClientId(client.id);
    try {
      const result = await api.post<{ token: string; user: any }>(
        `/cidade/${client.id}/crm/impersonate`
      );
      const src = `${CRM_URL}?crm_token=${encodeURIComponent(result.token)}&crm_user=${encodeURIComponent(JSON.stringify(result.user))}`;
      setCrmSrc(src);
      setCrmTenantName(result.user?.tenant?.name || client.name);
      setCrmReady(false);
      setCrmOpen(true);
    } catch (err: any) {
      console.error("[Trafego] CRM error:", err);
      setErrorMsg(err.message || "Erro ao acessar CRM do cliente");
    } finally {
      setLoadingClientId(null);
    }
  };

  const filteredClients = (clients || []).filter((c) => {
    if (search.trim() && !c.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (manager === "matheus" && !isMatheus(c.name)) return false;
    if (manager === "gelyson" && isMatheus(c.name)) return false;
    return true;
  });

  const slots: (Client | undefined)[] = Array(TOTAL_SLOTS).fill(undefined);
  filteredClients.forEach((client, index) => {
    if (index < TOTAL_SLOTS) slots[index] = client;
  });

  const managerButtons: { key: ManagerFilter; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "gelyson", label: "Gelyson" },
    { key: "matheus", label: "Matheus" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: "linear-gradient(135deg, #0a1628 0%, #0d1f38 40%, #1a0d0d 100%)",
    }}>
      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #0d9488 0%, transparent 70%)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #ea580c 0%, transparent 70%)" }} />

      {/* Header */}
      <header className="relative z-10" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="container py-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm mb-6 transition-colors"
            style={{ color: "rgba(255,255,255,0.45)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao painel
          </button>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.25), rgba(234,88,12,0.25))", border: "1px solid rgba(255,255,255,0.1)" }}>
              <TrendingUp className="w-8 h-8" style={{ color: "#0d9488" }} />
            </div>
            <h1 className="text-3xl font-bold text-white">Tráfego</h1>
            <p className="mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              Selecione o cliente para acessar o CRM
            </p>
          </div>

          {/* Manager filter + Search */}
          <div className="mt-6 flex flex-col items-center gap-3">
            {/* Manager buttons */}
            <div className="flex gap-2">
              {managerButtons.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setManager(key)}
                  className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: manager === key ? "rgba(13,148,136,0.35)" : "rgba(255,255,255,0.07)",
                    border: `1px solid ${manager === key ? "rgba(13,148,136,0.7)" : "rgba(255,255,255,0.12)"}`,
                    color: manager === key ? "#5eead4" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search bar */}
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(255,255,255,0.35)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                }}
                onFocus={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(13,148,136,0.5)"; }}
                onBlur={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Erro */}
      {errorMsg && (
        <div className="container pt-4 relative z-10">
          <div className="text-sm px-4 py-2 rounded-lg"
            style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}>
            {errorMsg}
          </div>
        </div>
      )}

      {/* Client Grid */}
      <main className="container py-10 relative z-10">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#0d9488" }} />
          </div>
        ) : userRole === "client" && !linkedClientId ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: "rgba(255,255,255,0.4)" }}>
            <TrendingUp className="w-12 h-12 opacity-20" />
            <p className="text-sm">Sua conta ainda não foi vinculada a um cliente.</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Contate o administrador para liberar seu acesso.</p>
          </div>
        ) : search.trim() && filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: "rgba(255,255,255,0.35)" }}>
            <Search className="w-10 h-10 opacity-30" />
            <p className="text-sm">Nenhum cliente encontrado para "{search}"</p>
            <button onClick={() => setSearch("")} className="text-xs underline" style={{ color: "rgba(13,148,136,0.8)" }}>Limpar busca</button>
          </div>
        ) : (
          <div className="grid grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-4 md:gap-6 justify-items-center max-w-5xl mx-auto">
            {slots.map((client, index) => {
              const cpl = client ? cplSummary?.[client.id] : undefined;
              const cplColor = getCplColor(cpl);
              return (
                <div key={client?.id || `empty-${index}`} className="relative group">
                  {loadingClientId === client?.id && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#0d9488" }} />
                    </div>
                  )}
                  {/* CPL color ring */}
                  {cplColor && (
                    <div className="absolute inset-0 rounded-full pointer-events-none z-10"
                      style={{ boxShadow: `0 0 0 3px ${cplColor}`, borderRadius: "9999px" }} />
                  )}
                  <ClientCircle
                    client={client ? { id: index, name: client.name, image: client.image_url || undefined } : undefined}
                    isSelected={loadingClientId === client?.id}
                    onClick={client ? () => handleClientClick(client) : undefined}
                  />
                  {client && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDialogClient(client); }}
                      title="Ver dados e LinkedIn Ads"
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      style={{ background: "rgba(13,148,136,0.9)" }}
                    >
                      <BarChart2 className="w-3 h-3 text-white" />
                    </button>
                  )}
                  {/* CPL tooltip */}
                  {cpl !== null && cpl !== undefined && (
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: cplColor ?? "white" }}>
                      R${cpl.toFixed(0)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legenda */}
        <div className="mt-10 flex justify-center flex-wrap gap-4 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#22c55e" }} />
            <span>CPL &lt; R$100</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#eab308" }} />
            <span>CPL R$100–120</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#ef4444" }} />
            <span>CPL &gt; R$120</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ border: "2px dashed rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)" }} />
            <span>Vaga disponível</span>
          </div>
        </div>

        {(isOwner || isAdmin) && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => navigate("/cidade")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.2), rgba(234,88,12,0.2))", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(13,148,136,0.5)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
            >
              <Zap className="w-4 h-4" />
              Gerenciar clientes e CRM
            </button>
          </div>
        )}
      </main>

      {/* Analytics + LinkedIn dialog */}
      <TrafegoClientDialog
        client={dialogClient}
        open={!!dialogClient}
        onOpenChange={(open) => { if (!open) setDialogClient(null); }}
      />

      {/* Overlay CRM */}
      {crmOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white shrink-0">
            <button
              onClick={() => setCrmOpen(false)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <div className="w-px h-4 bg-gray-200" />
            <span className="text-sm font-medium text-gray-700">{crmTenantName}</span>
            {!crmReady && <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-2" />}
          </div>

          <iframe
            key={crmSrc}
            src={crmSrc}
            onLoad={() => setCrmReady(true)}
            className="flex-1 w-full border-0"
            allow="clipboard-write"
            title="CRM Leads"
          />
        </div>
      )}
    </div>
  );
};

export default Trafego;
