import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Pencil, Trash2, ExternalLink, FolderOpen,
  Users, Image as ImageIcon, X, Search, CalendarDays, Upload,
  Phone, Mail, MessageCircle, Paperclip, FileText as FileIcon, Trash,
  Building2, Network, BookOpen,
} from "lucide-react";
import { InsideView } from "@/components/InsideView";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/api";
import { toast } from "sonner";
import { CidadeClientMilestoneForm } from "@/components/CidadeClientMilestoneForm";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { CidadeClientDetailDialog } from "@/components/CidadeClientDetailDialog";
import { useAuthContext } from "@/contexts/AuthContext";

const OWNER_EMAIL = "gustavosaforti@gmail.com";

type ClientPackage = "acelerador" | "start_line" | null;

interface CidadeClient {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  contractValue?: number | null;
  contractStartDate?: string | null;
  package?: ClientPackage;
  imageUrl?: string | null;
  driveLink?: string | null;
  briefingNotes?: string | null;
  niche?: string | null;
  createdAt: string;
  updatedAt: string;
}

const PACKAGE_CONFIG = {
  acelerador: { label: "Acelerador", color: "bg-blue-600 hover:bg-blue-600 text-white" },
  start_line: { label: "Start Line", color: "bg-[#9b3515] hover:bg-[#9b3515] text-white" },
} as const;

function PackageBadge({ pkg }: { pkg: ClientPackage }) {
  if (!pkg) return null;
  const cfg = PACKAGE_CONFIG[pkg];
  return <Badge className={`text-xs font-semibold px-2 py-0.5 ${cfg.color}`}>{cfg.label}</Badge>;
}

function toWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}?text=${encodeURIComponent("Olá Doutor(a)")}`;
}

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  contractValue: "",
  contractStartDate: "",
  package: "" as ClientPackage | "",
  imageUrl: "",
  driveLink: "",
  briefingNotes: "",
  niche: "",
};

const Cidade = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, user, userRole, linkedClientId } = useAuthContext();
  const isLinkedClient = userRole === "client";   // any client user goes straight to their view
  const canViewFinanceiro = isAdmin || user?.email === OWNER_EMAIL;
  const [view, setView] = useState<"landing" | "clients" | "inside">(
    isLinkedClient ? "clients" : "landing"
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<CidadeClient | null>(null);
  const [deletingClient, setDeletingClient] = useState<CidadeClient | null>(null);
  const [detailClient, setDetailClient] = useState<CidadeClient | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [filterPackage, setFilterPackage] = useState<ClientPackage | "all">("all");
  const [milestoneClient, setMilestoneClient] = useState<CidadeClient | null>(null);

  const [form, setForm] = useState(emptyForm);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const briefingFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBriefingFile, setUploadingBriefingFile] = useState(false);

  const handleImageUpload = async (blob: Blob) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", blob, "image.jpg");
      const token = getAuthToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/cidade/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Falha no upload");
      const { url } = await res.json();
      setForm((f) => ({ ...f, imageUrl: url }));
      toast.success("Imagem enviada!");
    } catch {
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropDialogOpen(false);
    setCropFile(null);
    await handleImageUpload(blob);
  };

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["cidade-clients"],
    queryFn: () => api.get<CidadeClient[]>("/cidade"),
  });

  interface BriefingFile { id: string; original_name: string; url: string; mime_type: string; created_at: string; }

  const { data: briefingFiles = [], refetch: refetchFiles } = useQuery({
    queryKey: ["cidade-files", editingClient?.id],
    queryFn: () => editingClient ? api.get<BriefingFile[]>(`/cidade/${editingClient.id}/files`) : Promise.resolve([]),
    enabled: !!editingClient?.id,
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => api.delete(`/cidade/files/${fileId}`),
    onSuccess: () => { refetchFiles(); toast.success("Arquivo removido!"); },
    onError: () => toast.error("Erro ao remover arquivo"),
  });

  const handleBriefingFileUpload = async (file: File) => {
    if (!editingClient) return;
    setUploadingBriefingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = getAuthToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/cidade/${editingClient.id}/files`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Falha no upload");
      await refetchFiles();
      toast.success("Arquivo anexado!");
    } catch {
      toast.error("Erro ao anexar arquivo");
    } finally {
      setUploadingBriefingFile(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post<CidadeClient>("/cidade", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cidade-clients"] });
      toast.success("Cliente adicionado!");
      closeDialog();
    },
    onError: () => toast.error("Erro ao salvar cliente"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) =>
      api.put<CidadeClient>(`/cidade/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cidade-clients"] });
      toast.success("Cliente atualizado!");
      closeDialog();
    },
    onError: () => toast.error("Erro ao atualizar cliente"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/cidade/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cidade-clients"] });
      toast.success("Cliente removido!");
      setDeleteDialogOpen(false);
      setDeletingClient(null);
    },
    onError: () => toast.error("Erro ao remover cliente"),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingClient(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (client: CidadeClient) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      contractValue: client.contractValue != null ? String(client.contractValue) : "",
      contractStartDate: client.contractStartDate ? client.contractStartDate.split("T")[0] : "",
      package: client.package ?? "",
      imageUrl: client.imageUrl || "",
      driveLink: client.driveLink || "",
      briefingNotes: client.briefingNotes || "",
      niche: client.niche || "",
    });
    setDialogOpen(true);
  };

  const openDetail = (client: CidadeClient) => {
    setDetailClient(client);
    setDetailOpen(true);
  };

  const filteredClients = clients.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesPackage = filterPackage === "all" || c.package === filterPackage;
    return matchesSearch && matchesPackage;
  });

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    const contractValueParsed = form.contractValue.trim()
      ? parseFloat(form.contractValue.replace(",", "."))
      : null;
    const payload = {
      ...form,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      contractValue: contractValueParsed != null && !isNaN(contractValueParsed) ? contractValueParsed : null,
      contractStartDate: form.contractStartDate.trim() || null,
      package: (form.package || null) as ClientPackage,
      imageUrl: form.imageUrl.trim() ? form.imageUrl.trim() : null,
      driveLink: form.driveLink.trim() ? form.driveLink.trim() : null,
      briefingNotes: form.briefingNotes.trim() ? form.briefingNotes.trim() : null,
      niche: form.niche.trim() ? form.niche.trim() : null,
    };
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: payload as any });
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Landing ────────────────────────────────────────────────────────────
  if (view === "landing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#407b75] via-black to-[#9b3515] font-lufga flex flex-col">
        <header className="py-6 px-6 border-b border-white/10">
          <div className="container flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-white/60 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Cidade</h1>
              <p className="text-white/60 text-sm">Selecione uma área</p>
            </div>
          </div>
        </header>

        <main className="flex-1 container px-6 flex items-center justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
            {/* Clientes */}
            <button
              type="button"
              onClick={() => setView("clients")}
              className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#407b75]/20 to-[#407b75]/5 p-8 text-left
                hover:border-[#5bbfb5]/50 hover:shadow-[0_0_40px_rgba(64,123,117,0.2)] transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#407b75]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-[#407b75]/30 border border-[#407b75]/50 flex items-center justify-center mb-5
                  group-hover:bg-[#407b75]/50 group-hover:shadow-[0_0_20px_rgba(91,191,181,0.3)] transition-all">
                  <Building2 className="w-7 h-7 text-[#5bbfb5]" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Clientes</h2>
                <p className="text-white/40 text-sm leading-relaxed">
                  Gerencie os clientes, briefings, pacotes e marcos de cada conta.
                </p>
              </div>
              <div className="absolute bottom-4 right-4 text-[#5bbfb5]/30 group-hover:text-[#5bbfb5]/60 transition-colors">
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </div>
            </button>

            {/* Inside */}
            <button
              type="button"
              onClick={() => setView("inside")}
              className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#9b3515]/20 to-[#9b3515]/5 p-8 text-left
                hover:border-[#e05a30]/50 hover:shadow-[0_0_40px_rgba(155,53,21,0.2)] transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#9b3515]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {/* Futuristic grid pattern */}
              <div className="absolute inset-0 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity"
                style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-[#9b3515]/30 border border-[#9b3515]/50 flex items-center justify-center mb-5
                  group-hover:bg-[#9b3515]/50 group-hover:shadow-[0_0_20px_rgba(155,53,21,0.3)] transition-all">
                  <Network className="w-7 h-7 text-[#e05a30]" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Inside</h2>
                <p className="text-white/40 text-sm leading-relaxed">
                  Equipe interna, colaboradores, demandas e gestão da operação.
                </p>
              </div>
              <div className="absolute bottom-4 right-4 text-[#e05a30]/30 group-hover:text-[#e05a30]/60 transition-colors">
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </div>
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#407b75] via-black to-[#9b3515] font-lufga">
      {/* Header */}
      <header className="py-6 px-6 border-b border-white/10">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => isLinkedClient ? navigate("/") : setView("landing")}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {view === "inside" ? "Inside" : "Clientes"}
              </h1>
              <p className="text-white/60 text-sm">
                {view === "inside" ? "Equipe e demandas internas" : "Dashboard de clientes"}
              </p>
            </div>
          </div>
          {view === "clients" && !isLinkedClient && (
            <Button onClick={openCreate} className="bg-[#407b75] hover:bg-[#356862] text-white gap-2">
              <Plus className="w-4 h-4" />
              Novo Cliente
            </Button>
          )}
        </div>
      </header>

      {/* Inside view */}
      {view === "inside" && (
        <main className="container py-6 px-6">
          <InsideView />
        </main>
      )}

      {/* Search & Filter — clients only */}
      {view === "clients" && (
      <div className="container px-6 pt-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "acelerador", "start_line"] as const).map((pkg) => (
            <button
              key={pkg}
              onClick={() => setFilterPackage(pkg)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterPackage === pkg
                  ? pkg === "acelerador" ? "bg-blue-600 text-white"
                  : pkg === "start_line" ? "bg-[#9b3515] text-white"
                  : "bg-white/20 text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
              }`}
            >
              {pkg === "all" ? "Todos" : pkg === "acelerador" ? "Acelerador" : "Start Line"}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Content — clients only */}
      {view === "clients" && (
      <main className="container py-6 px-6">
        {isLoading ? (
          <div className="text-center py-20 text-white/50">Carregando...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
            {isLinkedClient && !linkedClientId ? (
              <>
                <p className="text-white/50 text-lg">Sua conta não está vinculada a um cliente</p>
                <p className="text-white/30 text-sm mt-1">Contate o administrador para liberar seu acesso.</p>
              </>
            ) : (
              <>
                <p className="text-white/50 text-lg">Nenhum cliente encontrado</p>
                <p className="text-white/30 text-sm mt-1">Tente outro nome ou filtro</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredClients.map((client) => (
              <Card
                key={client.id}
                onClick={() => openDetail(client)}
                className="bg-black/40 backdrop-blur-sm border-white/10 hover:border-white/25 transition-all duration-300 overflow-hidden group cursor-pointer"
              >
                {/* Image banner */}
                <div className="h-32 bg-gradient-to-br from-[#407b75]/40 to-[#9b3515]/40 flex items-center justify-center relative">
                  {client.imageUrl ? (
                    <img src={client.imageUrl} alt={client.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-white/20" />
                  )}
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon" variant="ghost"
                      className="h-8 w-8 bg-[#407b75]/70 hover:bg-[#407b75] text-white"
                      onClick={() => setMilestoneClient(client)}
                      title="Marcos"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost"
                      className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
                      onClick={() => openEdit(client)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost"
                      className="h-8 w-8 bg-red-900/50 hover:bg-red-900/70 text-white"
                      onClick={() => { setDeletingClient(client); setDeleteDialogOpen(true); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white/20 flex-shrink-0">
                      {client.imageUrl ? <AvatarImage src={client.imageUrl} alt={client.name} /> : null}
                      <AvatarFallback className="bg-[#407b75] text-white font-bold">
                        {client.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-white text-base truncate">{client.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <PackageBadge pkg={client.package ?? null} />
                        {client.niche && <p className="text-white/40 text-xs truncate">{client.niche}</p>}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 pt-0">
                  {/* WhatsApp */}
                  {client.phone && (
                    <a
                      href={toWhatsApp(client.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span className="truncate">{client.phone}</span>
                    </a>
                  )}

                  {/* Drive */}
                  {client.driveLink && (
                    <a
                      href={client.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 text-sm text-[#5bbfb5] hover:text-[#7dd4cb] transition-colors"
                    >
                      <FolderOpen className="w-4 h-4 shrink-0" />
                      <span className="truncate">Pasta Drive</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}

                  {/* Docs */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigate(`/cidade/${client.id}/docs`); }}
                    className="flex items-center gap-2 text-sm text-white/50 hover:text-[#5bbfb5] transition-colors"
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>Documentos</span>
                  </button>

                  {/* Briefing — apenas owner/admin */}
                  {canViewFinanceiro && client.briefingNotes && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/50 text-xs mb-1 font-medium">Notas</p>
                      <p className="text-white/80 text-sm whitespace-pre-line line-clamp-4">{client.briefingNotes}</p>
                    </div>
                  )}

                  {!client.phone && !client.driveLink && !(canViewFinanceiro && client.briefingNotes) && (
                    <p className="text-white/30 text-xs text-center py-2">Sem informações adicionais</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white">{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription className="text-white/60">
              Preencha os dados do cliente da cidade.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            <div>
              <label className="text-white/60 text-sm mb-1 block">Nome *</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nome do cliente" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-sm mb-1 block">Email</label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@cliente.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <div>
                <label className="text-white/60 text-sm mb-1 flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5 text-green-400" /> WhatsApp
                </label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(00) 00000-0000" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-sm mb-1 flex items-center gap-1">
                  <span className="text-[#407b75]">R$</span> Valor Mensal do Contrato
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.contractValue}
                  onChange={(e) => setForm((f) => ({ ...f, contractValue: e.target.value }))}
                  placeholder="1500.00"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <label className="text-white/60 text-sm mb-1 block">Início do Contrato</label>
                <Input
                  type="date"
                  value={form.contractStartDate}
                  onChange={(e) => setForm((f) => ({ ...f, contractStartDate: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 [color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <label className="text-white/60 text-sm mb-1 block">Pacote</label>
              <Select value={form.package || "none"} onValueChange={(v) => setForm((f) => ({ ...f, package: v === "none" ? "" : (v as ClientPackage) }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Selecionar pacote" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                  <SelectItem value="none" className="text-white/50">Sem pacote</SelectItem>
                  <SelectItem value="acelerador">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />Acelerador</span>
                  </SelectItem>
                  <SelectItem value="start_line">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#9b3515] inline-block" />Start Line</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-white/60 text-sm mb-1 block">Imagem</label>
              <input type="file" accept="image/*" ref={fileInputRef} className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { setCropFile(file); setCropDialogOpen(true); }
                  e.target.value = "";
                }}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex-1 bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white gap-2">
                  <Upload className="w-4 h-4" />
                  {uploadingImage ? "Enviando..." : "Escolher arquivo"}
                </Button>
                {form.imageUrl && (
                  <Button type="button" size="icon" variant="ghost"
                    onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                    className="text-white/40 hover:text-white hover:bg-white/10">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {form.imageUrl && (
                <div className="mt-2 h-20 w-20 rounded-lg overflow-hidden bg-white/5">
                  <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div>
              <label className="text-white/60 text-sm mb-1 block">Nicho</label>
              <Input value={form.niche} onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
                placeholder="Ex: Advocacia, Saúde..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>

            <div>
              <label className="text-white/60 text-sm mb-1 block">Link do Drive</label>
              <Input value={form.driveLink} onChange={(e) => setForm((f) => ({ ...f, driveLink: e.target.value }))}
                placeholder="https://drive.google.com/..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>

            <div>
              <label className="text-white/60 text-sm mb-1 block">Reunião de Briefing</label>
              <Textarea
                value={form.briefingNotes}
                onChange={(e) => setForm((f) => ({ ...f, briefingNotes: e.target.value }))}
                placeholder="Descreva o briefing do cliente: informações sobre o negócio, objetivos, entregas, links, observações..."
                rows={8}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-y min-h-[160px]"
              />
            </div>

            {/* Attachments — only when editing an existing client */}
            {editingClient && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-white/60 text-sm flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" /> Arquivos anexos
                  </label>
                  <button
                    type="button"
                    onClick={() => briefingFileInputRef.current?.click()}
                    disabled={uploadingBriefingFile}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    {uploadingBriefingFile ? "Enviando..." : "Anexar arquivo"}
                  </button>
                  <input
                    ref={briefingFileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBriefingFileUpload(file);
                      e.target.value = "";
                    }}
                  />
                </div>
                {briefingFiles.length > 0 ? (
                  <div className="space-y-1.5">
                    {briefingFiles.map((f) => (
                      <div key={f.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                        <FileIcon className="w-3.5 h-3.5 text-white/40 shrink-0" />
                        <a href={f.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-[#5bbfb5] hover:text-[#7dd4cb] truncate flex-1 transition-colors">
                          {f.original_name}
                        </a>
                        <button
                          type="button"
                          onClick={() => deleteFileMutation.mutate(f.id)}
                          className="text-white/30 hover:text-red-400 transition-colors shrink-0"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/25 text-xs">Nenhum arquivo anexado ainda.</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={closeDialog} className="text-white/60 hover:text-white hover:bg-white/10">Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="bg-[#407b75] hover:bg-[#356862] text-white">
              {isSaving ? "Salvando..." : editingClient ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Cliente</DialogTitle>
            <DialogDescription>Essa ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <p className="text-white/70">
            Tem certeza que deseja excluir <strong>{deletingClient?.name}</strong>?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} className="text-white/60 hover:text-white hover:bg-white/10">Cancelar</Button>
            <Button variant="destructive" onClick={() => deletingClient && deleteMutation.mutate(deletingClient.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <CidadeClientDetailDialog
        client={detailClient}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => { setDetailOpen(false); if (detailClient) openEdit(detailClient); }}
        onMilestone={() => { setDetailOpen(false); if (detailClient) setMilestoneClient(detailClient); }}
        canViewFinanceiro={canViewFinanceiro}
        canEdit={true}
      />

      {/* Image Crop Dialog */}
      <ImageCropDialog
        file={cropFile}
        open={cropDialogOpen}
        onClose={() => { setCropDialogOpen(false); setCropFile(null); }}
        onCrop={handleCropConfirm}
      />

      {/* Milestone Sheet */}
      {milestoneClient && (
        <CidadeClientMilestoneForm
          open={!!milestoneClient}
          onClose={() => setMilestoneClient(null)}
          clientId={milestoneClient.id}
          clientName={milestoneClient.name}
          clientEmail={milestoneClient.email}
        />
      )}
    </div>
  );
};

export default Cidade;
