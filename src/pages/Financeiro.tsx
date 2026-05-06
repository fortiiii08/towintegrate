import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  ArrowLeft,
  Package,
  Receipt,
  Download,
  FileText,
  FolderPlus,
  Folder,
  FolderOpen,
  X,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { downloadFile } from "@/lib/downloadFile";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const SOCKET_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace("/api", "");

interface FinanceiroSummary {
  totalMRR: number;
  activeClients: number;
  avgContract: number;
  annualProjection: number;
  totalClients: number;
  packageBreakdown: Record<string, { count: number; mrr: number }>;
  mrrGrowth: { date: string; mrr: number; client: string }[];
  perClient: { name: string; fullName: string; value: number; package: string }[];
  newClientsPerMonth: { month: string; newClients: number; newMRR: number }[];
}

interface FinanceiroClient {
  id: string;
  name: string;
  package: string | null;
  email: string | null;
  phone: string | null;
  imageUrl: string | null;
  contractValue: number;
  contractStartDate: string | null;
  createdAt: string;
}

interface NfEntry {
  id: string;
  senderId: string;
  senderName: string;
  fileUrl: string;
  fileName: string;
  folderId: string | null;
  createdAt: string;
}

interface NfFolder {
  id: string;
  name: string;
  createdAt: string;
}

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PACKAGE_COLORS: Record<string, string> = {
  acelerador: "#407b75",
  start_line: "#9b3515",
  sem_pacote: "#6b7280",
};

const PACKAGE_LABELS: Record<string, string> = {
  acelerador: "Acelerador",
  start_line: "Start Line",
  sem_pacote: "Sem pacote",
};

const BAR_COLOR = "#407b75";

export default function Financeiro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightClientId = searchParams.get("clientId");
  const highlightRowRef = useRef<HTMLTableRowElement>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "nf">("overview");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // null = "Todos"
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [movingNfId, setMovingNfId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [nfSeen, setNfSeen] = useState(0);
  const qc = useQueryClient();

  // Scroll to highlighted client after render
  useEffect(() => {
    if (highlightClientId && highlightRowRef.current) {
      setTimeout(() => {
        highlightRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    }
  }, [highlightClientId]);

  const { data: summary, isLoading: loadingSummary } = useQuery<FinanceiroSummary>({
    queryKey: ["financeiro-summary"],
    queryFn: () => api.get<FinanceiroSummary>("/financeiro/summary"),
    refetchInterval: 60_000,
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery<FinanceiroClient[]>({
    queryKey: ["financeiro-clients"],
    queryFn: () => api.get<FinanceiroClient[]>("/financeiro/clients"),
  });

  const { data: nfEntries = [], isLoading: loadingNf } = useQuery<NfEntry[]>({
    queryKey: ["financeiro-nf"],
    queryFn: () => api.get<NfEntry[]>("/financeiro/nf"),
    refetchInterval: 30_000,
  });

  const { data: nfFolders = [] } = useQuery<NfFolder[]>({
    queryKey: ["financeiro-nf-folders"],
    queryFn: () => api.get<NfFolder[]>("/financeiro/nf/folders"),
  });

  const createFolder = useMutation({
    mutationFn: (name: string) => api.post("/financeiro/nf/folders", { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["financeiro-nf-folders"] }); setCreatingFolder(false); setNewFolderName(""); },
  });

  const deleteFolder = useMutation({
    mutationFn: (id: string) => api.delete(`/financeiro/nf/folders/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["financeiro-nf-folders"] }); setSelectedFolder(null); },
  });

  const moveNf = useMutation({
    mutationFn: ({ nfId, folderId }: { nfId: string; folderId: string | null }) =>
      api.put(`/financeiro/nf/${nfId}/folder`, { folderId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["financeiro-nf"] }); setMovingNfId(null); },
  });

  const isLoading = loadingSummary || loadingClients;

  const pieData = summary
    ? Object.entries(summary.packageBreakdown).map(([key, val]) => ({
        name: PACKAGE_LABELS[key] ?? key,
        value: val.mrr,
        count: val.count,
        fill: PACKAGE_COLORS[key] ?? "#6b7280",
      }))
    : [];

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="h-5 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#407b75]" />
          <h1 className="text-xl font-semibold text-gray-900">Financeiro</h1>
        </div>
        {/* Tabs */}
        <div className="ml-4 flex items-center gap-1 border border-gray-200 rounded-lg p-0.5 bg-gray-50">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === "overview"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => { setActiveTab("nf"); setNfSeen(nfEntries.length); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === "nf"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            NF
            {nfEntries.length > nfSeen && (
              <span className="bg-amber-100 text-amber-700 text-xs font-semibold rounded-full px-1.5 py-0.5 leading-none">
                {nfEntries.length - nfSeen}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── NF Tab ──────────────────────────────────────────────────────── */}
        {activeTab === "nf" && (
          <div className="flex gap-6">
            {/* Sidebar — Folders */}
            <div className="w-52 flex-shrink-0 space-y-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pastas</p>
                <button
                  onClick={() => setCreatingFolder(true)}
                  className="text-gray-400 hover:text-[#407b75] transition-colors"
                  title="Nova pasta"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              </div>

              {/* New folder input */}
              {creatingFolder && (
                <div className="flex items-center gap-1 mb-1">
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newFolderName.trim()) createFolder.mutate(newFolderName.trim());
                      if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); }
                    }}
                    placeholder="Nome da pasta"
                    className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-[#407b75]"
                  />
                  <button onClick={() => { setCreatingFolder(false); setNewFolderName(""); }} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* All */}
              <button
                onClick={() => setSelectedFolder(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedFolder === null ? "bg-[#407b75]/10 text-[#407b75] font-medium" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Receipt className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left truncate">Todas</span>
                <span className="text-xs text-gray-400">{nfEntries.filter(e => !e.folderId).length}</span>
              </button>

              {/* Folder list */}
              {nfFolders.map((folder) => {
                const count = nfEntries.filter((e) => e.folderId === folder.id).length;
                const isActive = selectedFolder === folder.id;
                return (
                  <div key={folder.id} className="group flex items-center gap-1">
                    <button
                      onClick={() => setSelectedFolder(folder.id)}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? "bg-[#407b75]/10 text-[#407b75] font-medium" : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {isActive ? <FolderOpen className="w-4 h-4 flex-shrink-0" /> : <Folder className="w-4 h-4 flex-shrink-0" />}
                      <span className="flex-1 text-left truncate">{folder.name}</span>
                      <span className="text-xs text-gray-400">{count}</span>
                    </button>
                    <button
                      onClick={() => deleteFolder.mutate(folder.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-1 flex-shrink-0"
                      title="Remover pasta"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {loadingNf ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 border-[#407b75] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (() => {
                const visible = selectedFolder === null
                  ? nfEntries.filter((e) => !e.folderId)
                  : nfEntries.filter((e) => e.folderId === selectedFolder);
                const folderName = selectedFolder ? nfFolders.find(f => f.id === selectedFolder)?.name : "Todas";

                if (visible.length === 0) return (
                  <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
                    <Receipt className="w-12 h-12 opacity-20" />
                    <p className="text-sm">{selectedFolder ? "Nenhuma NF nesta pasta." : "Nenhuma Nota Fiscal registrada ainda."}</p>
                    {!selectedFolder && <p className="text-xs text-gray-300">Nas mensagens, anexe um arquivo e ative a tag NF antes de enviar.</p>}
                  </div>
                );

                return (
                  <Card className="bg-white shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-amber-500" />
                      <h2 className="font-semibold text-gray-900">{folderName}</h2>
                      <span className="text-xs text-gray-400 ml-auto">{visible.length} registro{visible.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {visible.map((entry) => {
                        const date = new Date(entry.createdAt);
                        const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
                        const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(entry.fileName);
                        const isDownloading = downloadingId === entry.id;

                        return (
                          <div key={entry.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group">
                            {/* Icon */}
                            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                              {isImage
                                ? <img src={`${SOCKET_URL}${entry.fileUrl}`} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                : <FileText className="w-5 h-5 text-amber-500" />
                              }
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm">NF — {entry.senderName}</p>
                              <p className="text-xs text-gray-500 truncate">{entry.fileName}</p>
                              {entry.folderId && (
                                <p className="text-xs text-[#407b75] flex items-center gap-1 mt-0.5">
                                  <Folder className="w-3 h-3" />
                                  {nfFolders.find(f => f.id === entry.folderId)?.name}
                                </p>
                              )}
                            </div>

                            {/* Date */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm text-gray-700 font-medium">{dateStr}</p>
                              <p className="text-xs text-gray-400">{timeStr}</p>
                            </div>

                            {/* Move to folder */}
                            <div className="relative flex-shrink-0">
                              <button
                                onClick={() => setMovingNfId(movingNfId === entry.id ? null : entry.id)}
                                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#407b75] hover:border-[#407b75] transition-colors opacity-0 group-hover:opacity-100"
                                title="Mover para pasta"
                              >
                                <FolderPlus className="w-4 h-4" />
                              </button>
                              {movingNfId === entry.id && (
                                <div className="absolute right-0 bottom-full mb-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                                  <button
                                    onClick={() => moveNf.mutate({ nfId: entry.id, folderId: null })}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Receipt className="w-3.5 h-3.5" /> Sem pasta
                                  </button>
                                  {nfFolders.map(f => (
                                    <button
                                      key={f.id}
                                      onClick={() => moveNf.mutate({ nfId: entry.id, folderId: f.id })}
                                      className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <Folder className="w-3.5 h-3.5 text-[#407b75]" /> {f.name}
                                      {entry.folderId === f.id && <ChevronRight className="w-3 h-3 ml-auto text-[#407b75]" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Download */}
                            <button
                              onClick={async () => {
                                setDownloadingId(entry.id);
                                try { await downloadFile(`${SOCKET_URL}${entry.fileUrl}`, entry.fileName); }
                                catch { /* silent */ }
                                finally { setDownloadingId(null); }
                              }}
                              disabled={isDownloading}
                              className="flex-shrink-0 w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#407b75] hover:border-[#407b75] transition-colors disabled:opacity-50"
                              title="Baixar arquivo"
                            >
                              {isDownloading
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Download className="w-4 h-4" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── Overview Tab ─────────────────────────────────────────────────── */}
        {activeTab === "overview" && isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#407b75] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === "overview" ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                icon={<DollarSign className="w-6 h-6 text-[#407b75]" />}
                label="MRR Total"
                value={fmt(summary?.totalMRR ?? 0)}
                sub="Receita mensal recorrente"
                accent="#407b75"
              />
              <KpiCard
                icon={<Users className="w-6 h-6 text-[#9b3515]" />}
                label="Clientes Ativos"
                value={String(summary?.activeClients ?? 0)}
                sub={`de ${summary?.totalClients ?? 0} cadastrados`}
                accent="#9b3515"
              />
              <KpiCard
                icon={<Package className="w-6 h-6 text-[#6366f1]" />}
                label="Ticket Médio"
                value={fmt(summary?.avgContract ?? 0)}
                sub="por cliente ativo"
                accent="#6366f1"
              />
              <KpiCard
                icon={<Calendar className="w-6 h-6 text-[#f59e0b]" />}
                label="Projeção Anual"
                value={fmt(summary?.annualProjection ?? 0)}
                sub="baseado no MRR atual"
                accent="#f59e0b"
              />
            </div>

            {/* New clients per month */}
            <Card className="p-6 bg-white shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#407b75]" />
                  <h2 className="font-semibold text-gray-900">Novos Clientes por Mês</h2>
                </div>
                <span className="text-xs text-gray-400">Apenas clientes com data de início preenchida</span>
              </div>

              {(summary?.newClientsPerMonth ?? []).length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <Users className="w-8 h-8 opacity-30" />
                  <p className="text-sm">Nenhum dado ainda</p>
                  <p className="text-xs text-gray-300">
                    Preencha o campo "Início do Contrato" ao cadastrar novos clientes
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={summary?.newClientsPerMonth ?? []} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis
                      yAxisId="clients"
                      orientation="left"
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      label={{ value: "Clientes", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "#9ca3af" } }}
                    />
                    <YAxis
                      yAxisId="mrr"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v}`}
                    />
                    <Tooltip
                      formatter={(v: number, name: string) =>
                        name === "newClients"
                          ? [`${v} cliente${v !== 1 ? "s" : ""}`, "Novos clientes"]
                          : [fmt(v), "Novo MRR"]
                      }
                    />
                    <Bar yAxisId="clients" dataKey="newClients" fill="#407b75" radius={[4, 4, 0, 0]} name="newClients" />
                    <Bar yAxisId="mrr" dataKey="newMRR" fill="#9b3515" radius={[4, 4, 0, 0]} name="newMRR" opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* MRR Growth Area Chart */}
              <Card className="lg:col-span-2 p-6 bg-white shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-4 h-4 text-[#407b75]" />
                  <h2 className="font-semibold text-gray-900">Crescimento do MRR</h2>
                </div>
                {(summary?.mrrGrowth ?? []).length < 2 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                    Dados insuficientes para o gráfico
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={summary?.mrrGrowth ?? []}>
                      <defs>
                        <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#407b75" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#407b75" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) =>
                          v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v}`
                        }
                      />
                      <Tooltip
                        formatter={(v: number) => [fmt(v), "MRR"]}
                        labelFormatter={(label, payload) =>
                          payload?.[0]
                            ? `+${(payload[0].payload as any).client}`
                            : label
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="mrr"
                        stroke="#407b75"
                        strokeWidth={2}
                        fill="url(#mrrGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* Package Pie */}
              <Card className="p-6 bg-white shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-6">
                  <Package className="w-4 h-4 text-[#9b3515]" />
                  <h2 className="font-semibold text-gray-900">Por Pacote</h2>
                </div>
                {pieData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                    Sem dados
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-2">
                      {pieData.map((entry, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: entry.fill }}
                            />
                            <span className="text-gray-700">{entry.name}</span>
                            <span className="text-gray-400 text-xs">({entry.count})</span>
                          </div>
                          <span className="font-medium text-gray-900">{fmt(entry.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            </div>

            {/* Per-client bar chart */}
            {(summary?.perClient ?? []).length > 0 && (
              <Card className="p-6 bg-white shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-6">
                  <DollarSign className="w-4 h-4 text-[#407b75]" />
                  <h2 className="font-semibold text-gray-900">Valor por Cliente</h2>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={summary?.perClient ?? []}
                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v}`
                      }
                    />
                    <Tooltip
                      formatter={(v: number, _n, props) => [
                        fmt(v),
                        props.payload.fullName,
                      ]}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {(summary?.perClient ?? []).map((entry, i) => (
                        <Cell
                          key={i}
                          fill={PACKAGE_COLORS[entry.package] ?? BAR_COLOR}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2 justify-center">
                  {Object.entries(PACKAGE_COLORS)
                    .filter(([k]) => k !== "sem_pacote")
                    .map(([key, color]) => (
                      <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        {PACKAGE_LABELS[key]}
                      </div>
                    ))}
                </div>
              </Card>
            )}

            {/* Client table */}
            <Card className="bg-white shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <h2 className="font-semibold text-gray-900">Clientes</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pacote
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Início
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contrato Mensal
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Anual
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clients
                      .slice()
                      .sort((a, b) => b.contractValue - a.contractValue)
                      .map((client) => {
                        const isHighlighted = highlightClientId === client.id;
                        return (
                        <tr
                          key={client.id}
                          ref={isHighlighted ? highlightRowRef : undefined}
                          className={`hover:bg-gray-50 transition-colors ${isHighlighted ? "bg-[#407b75]/8 ring-1 ring-inset ring-[#407b75]/30" : ""}`}
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              {client.imageUrl ? (
                                <img
                                  src={client.imageUrl}
                                  alt={client.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#407b75] to-[#9b3515] flex items-center justify-center text-white text-xs font-bold">
                                  {client.name[0]}
                                </div>
                              )}
                              <span className="font-medium text-gray-900">{client.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            {client.package ? (
                              <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                                style={{
                                  backgroundColor:
                                    PACKAGE_COLORS[client.package] ?? "#6b7280",
                                }}
                              >
                                {PACKAGE_LABELS[client.package] ?? client.package}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-500">
                            {client.contractStartDate ? (
                              new Date(client.contractStartDate).toLocaleDateString("pt-BR", {
                                month: "short",
                                year: "numeric",
                              })
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right font-medium text-gray-900">
                            {client.contractValue > 0 ? (
                              fmt(client.contractValue)
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right text-gray-600">
                            {client.contractValue > 0 ? (
                              fmt(client.contractValue * 12)
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );})}
                  </tbody>
                  {clients.some((c) => c.contractValue > 0) && (
                    <tfoot>
                      <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                        <td className="px-6 py-3 text-gray-700" colSpan={3}>
                          Total
                        </td>
                        <td className="px-6 py-3 text-right text-[#407b75]">
                          {fmt(clients.reduce((s, c) => s + c.contractValue, 0))}
                        </td>
                        <td className="px-6 py-3 text-right text-[#407b75]">
                          {fmt(clients.reduce((s, c) => s + c.contractValue * 12, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <Card className="p-5 bg-white shadow-sm border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${accent}15` }}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </Card>
  );
}
