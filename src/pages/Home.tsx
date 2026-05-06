import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io as socketIO } from "socket.io-client";
import {
  TrendingUp, FileText, Video, CalendarDays, CheckSquare, DollarSign, LogOut, Shield,
  MessageCircle, Inbox, Paperclip, ExternalLink, Check, CheckCheck, Trash2, ChevronDown, ChevronUp,
  Camera, Eye, EyeOff, UserPlus, Trophy, X, Clock, RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import digitownLogo from "@/assets/digitown-logo.webp";
import { useAuthContext } from "@/contexts/AuthContext";
import { AdminManagerDialog } from "@/components/AdminManagerDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getAuthToken } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useInboxBadge } from "@/hooks/useInboxBadge";
import { useMyBlockedCards } from "@/hooks/useCardPermissions";

const OWNER_EMAIL = "gustavosaforti@gmail.com";
const SOCKET_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace("/api", "");

// ── ProfileDialog ─────────────────────────────────────────────────────────────
function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, user, updateProfile, updatePassword } = useAuthContext();
  const queryClient = useQueryClient();
  const [name, setName] = useState(profile?.name || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync name when profile changes
  const currentName = profile?.name || "";
  const avatarUrl = profile?.avatar_url || null;
  const initials = (profile?.name || user?.email || "?").charAt(0).toUpperCase();

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const token = getAuthToken();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/inside/members/upload`,
        { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData }
      );
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      await updateProfile({ avatarUrl: url });
      // Also update the linked inside_member image
      fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/inside/members/my-image`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ imageUrl: url }),
      }).catch(() => {});
    } catch {
      toast.error("Erro ao enviar foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }
    setSaving(true);
    try {
      if (name.trim() && name.trim() !== currentName) {
        await updateProfile({ name: name.trim() });
        // Invalidate tasks cache so assignee/reporter names refresh
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["employees"] });
      }
      if (newPassword) {
        await updatePassword(newPassword);
        setNewPassword("");
        setConfirmPassword("");
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#0d0d1a] border-white/10 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Meu Perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="w-20 h-20 border-2 border-white/20 ring-2 ring-[#407b75]/40">
                {avatarUrl && <AvatarImage src={avatarUrl} className="object-cover" />}
                <AvatarFallback className="bg-gradient-to-br from-[#407b75] to-[#356862] text-white text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingPhoto
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera className="w-5 h-5 text-white" />}
              </div>
            </div>
            <p className="text-white/30 text-xs">Clique para alterar a foto</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.target.value = ""; }}
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="text-white/50 text-xs mb-1 block">Email</label>
            <Input value={user?.email || ""} disabled className="bg-white/5 border-white/10 text-white/50" />
          </div>

          {/* Name */}
          <div>
            <label className="text-white/60 text-xs mb-1 block">Nome</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              placeholder="Seu nome"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-white/60 text-xs block">Nova senha <span className="text-white/30">(deixe em branco para não alterar)</span></label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-10"
              />
              <button type="button" onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar senha"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-10"
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1 text-white/60 hover:text-white hover:bg-white/10">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#407b75] hover:bg-[#356862] text-white"
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface InboxMessage {
  id: string;
  to_user_id: string;
  from_user_id: string;
  from_name: string;
  body: string | null;
  file_url: string | null;
  file_original_name: string | null;
  file_mime_type: string | null;
  is_read: boolean;
  created_at: string;
}

// ── CRM Leads Inbox (admins with tráfego access) ─────────────────────────────
const CRM_SEEN_KEY = "crm_inbox_seen_ids";

function getCrmSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(CRM_SEEN_KEY) || "[]")); }
  catch { return new Set(); }
}
function addCrmSeen(ids: string[]) {
  const seen = getCrmSeen();
  ids.forEach((id) => seen.add(id));
  localStorage.setItem(CRM_SEEN_KEY, JSON.stringify([...seen]));
}

interface CrmLead {
  id: string;
  leadId: string;
  leadName: string;
  clientId: string;
  clientName: string;
  stage: string;
  isWon: boolean;
  isLost: boolean;
  createdAt: string;
}

function CrmLeadsInbox({ onClose }: { onClose?: () => void }) {
  const [seen, setSeen] = useState<Set<string>>(getCrmSeen);
  const { data: leads = [], isLoading, refetch, isFetching } = useQuery<CrmLead[]>({
    queryKey: ["crm-all-leads"],
    queryFn: () => api.get("/cidade/crm/all-leads"),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const unread = leads.filter((l) => !seen.has(l.id));

  function markAllSeen() {
    addCrmSeen(leads.map((l) => l.id));
    setSeen(getCrmSeen());
  }

  function markOneSeen(id: string) {
    addCrmSeen([id]);
    setSeen(getCrmSeen());
  }

  function stageIcon(lead: CrmLead) {
    if (lead.isWon) return <Trophy className="w-3.5 h-3.5 text-amber-400" />;
    if (lead.isLost) return <X className="w-3.5 h-3.5 text-red-400" />;
    return <UserPlus className="w-3.5 h-3.5 text-[#5bbfb5]" />;
  }

  function stageColor(lead: CrmLead) {
    if (lead.isWon) return "text-amber-400";
    if (lead.isLost) return "text-red-400";
    return "text-[#5bbfb5]";
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "agora";
    if (m < 60) return `${m}min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#5bbfb5]" />
          <span className="text-white/80 text-sm font-semibold">Leads CRM</span>
          {unread.length > 0 && (
            <span className="bg-[#407b75] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unread.length} novo{unread.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread.length > 0 && (
            <button onClick={markAllSeen} className="text-[10px] text-white/30 hover:text-[#5bbfb5] transition-colors flex items-center gap-1">
              <CheckCheck className="w-3 h-3" /> Marcar lidos
            </button>
          )}
          <button onClick={() => refetch()} disabled={isFetching} className="p-1 text-white/20 hover:text-white/60 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-[#5bbfb5] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-white/25">
          <TrendingUp className="w-8 h-8 opacity-30" />
          <p className="text-xs">Nenhum lead recente nos CRMs</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {leads.map((lead) => {
            const isNew = !seen.has(lead.id);
            return (
              <div
                key={lead.id}
                onClick={() => markOneSeen(lead.id)}
                className={`relative flex items-start gap-3 rounded-xl px-3 py-2.5 cursor-default transition-all ${
                  isNew
                    ? "bg-[#407b75]/15 border border-[#407b75]/30"
                    : "bg-white/[0.03] border border-white/5"
                }`}
              >
                {isNew && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#5bbfb5]" />
                )}
                <div className={`mt-0.5 flex-shrink-0 ${isNew ? "ml-1.5" : ""}`}>
                  {stageIcon(lead)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold leading-tight ${isNew ? "text-white/90" : "text-white/50"}`}>
                    {lead.isWon ? "Lead Ganho" : lead.isLost ? "Lead Perdido" : "Lead Recebido"} — {lead.clientName}
                  </p>
                  <p className={`text-[11px] truncate mt-0.5 ${isNew ? "text-white/60" : "text-white/30"}`}>
                    {lead.leadName}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${stageColor(lead)} opacity-70`}>
                    {lead.stage}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-2.5 h-2.5 text-white/20" />
                  <span className="text-[10px] text-white/25">{timeAgo(lead.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── ClientCrmLeadsSection — CRM leads panel for client users (in page body) ──
const MY_CRM_SEEN_KEY = "crm_my_leads_seen_ids";
function getMyCrmSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(MY_CRM_SEEN_KEY) || "[]")); }
  catch { return new Set(); }
}
function addMyCrmSeen(ids: string[]) {
  const seen = getMyCrmSeen();
  ids.forEach((id) => seen.add(id));
  localStorage.setItem(MY_CRM_SEEN_KEY, JSON.stringify([...seen]));
}

function ClientCrmLeadsSection({ open = true }: { open?: boolean }) {
  const [seen, setSeen] = useState<Set<string>>(getMyCrmSeen);
  const { data: leads = [], isLoading } = useQuery<CrmLead[]>({
    queryKey: ["crm-my-leads"],
    queryFn: () => api.get<CrmLead[]>("/cidade/crm/my-leads").catch(() => []),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  useEffect(() => { setSeen(getMyCrmSeen()); }, [leads]);

  const unread = leads.filter((l) => !seen.has(l.id));

  function markAllSeen() { addMyCrmSeen(leads.map((l) => l.id)); setSeen(getMyCrmSeen()); }
  function markOneSeen(id: string) { addMyCrmSeen([id]); setSeen(getMyCrmSeen()); }

  function stageIcon(lead: CrmLead) {
    if (lead.isWon) return <Trophy className="w-3.5 h-3.5 text-amber-400" />;
    if (lead.isLost) return <X className="w-3.5 h-3.5 text-red-400" />;
    return <UserPlus className="w-3.5 h-3.5 text-[#5bbfb5]" />;
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "agora";
    if (m < 60) return `${m}min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  return (
    <div className="container px-6 pb-8 max-w-2xl mx-auto">
      <button
        type="button"
        className="w-full flex items-center justify-between mb-3 group cursor-default"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#5bbfb5]" />
          <span className="text-white/70 text-sm font-medium">Leads CRM</span>
          {unread.length > 0 && (
            <span className="bg-[#407b75] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <button
            type="button"
            onClick={markAllSeen}
            className="text-[10px] text-white/30 hover:text-[#5bbfb5] transition-colors flex items-center gap-1"
          >
            <CheckCheck className="w-3 h-3" /> Marcar lidos
          </button>
        )}
      </button>

      {open && (isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-[#5bbfb5] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2" style={{ color: "rgba(255,255,255,0.2)" }}>
          <TrendingUp className="w-8 h-8 opacity-30" />
          <p className="text-xs">Nenhum lead recente no seu CRM</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => {
            const isNew = !seen.has(lead.id);
            return (
              <div
                key={lead.id}
                onClick={() => markOneSeen(lead.id)}
                className={`relative flex items-start gap-3 rounded-xl border px-4 py-3 cursor-default transition-all ${
                  isNew
                    ? "bg-[#407b75]/10 border-[#407b75]/30 shadow-[0_0_15px_rgba(64,123,117,0.08)]"
                    : "bg-white/[0.03] border-white/8"
                }`}
              >
                {isNew && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#5bbfb5]" />
                )}
                <div className={`mt-0.5 flex-shrink-0 ${isNew ? "ml-1.5" : ""}`}>
                  {stageIcon(lead)}
                </div>
                <div className="flex-1 min-w-0 pl-1">
                  <p className={`text-xs font-semibold leading-tight ${isNew ? "text-white/90" : "text-white/50"}`}>
                    {lead.isWon ? "Lead Ganho" : lead.isLost ? "Lead Perdido" : "Lead Recebido"}
                  </p>
                  <p className={`text-sm truncate mt-0.5 ${isNew ? "text-white/80" : "text-white/40"}`}>
                    {lead.leadName}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${lead.isWon ? "text-amber-400" : lead.isLost ? "text-red-400" : "text-[#5bbfb5]"} opacity-70`}>
                    {lead.stage}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-2.5 h-2.5 text-white/20" />
                  <span className="text-[10px] text-white/25">{timeAgo(lead.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── useCrmLeadsUnread — badge count for header button ─────────────────────────
function useCrmLeadsUnread() {
  const { data } = useQuery<CrmLead[]>({
    queryKey: ["crm-all-leads"],
    queryFn: () => api.get("/cidade/crm/all-leads"),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const [seen, setSeen] = useState<Set<string>>(getCrmSeen);
  // Re-sync seen from localStorage when leads update (use `data` not `leads=[]` to avoid new ref on each render)
  useEffect(() => { setSeen(getCrmSeen()); }, [data]);
  return (data ?? []).filter((l) => !seen.has(l.id)).length;
}

function useClientCrmUnread(enabled: boolean) {
  const { data } = useQuery<CrmLead[]>({
    queryKey: ["crm-my-leads"],
    queryFn: () => api.get<CrmLead[]>("/cidade/crm/my-leads").catch(() => []),
    refetchInterval: 60_000,
    staleTime: 30_000,
    enabled,
  });
  const [seen, setSeen] = useState<Set<string>>(getMyCrmSeen);
  useEffect(() => { setSeen(getMyCrmSeen()); }, [data]);
  return (data ?? []).filter((l) => !seen.has(l.id)).length;
}

// ── AdminInboxSection — inside_inbox panel for admins in dropdown ─────────────
function AdminInboxSection({ messages, queryClient }: { messages: InboxMessage[]; queryClient: ReturnType<typeof useQueryClient> }) {
  const markRead = useMutation({
    mutationFn: (id: string) => api.put(`/inside/inbox/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inside-inbox-mine"] }),
  });

  const deleteMsg = useMutation({
    mutationFn: (id: string) => api.delete(`/inside/inbox/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inside-inbox-mine"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.put("/inside/inbox/read-all", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inside-inbox-mine"] }),
  });

  const deleteAll = useMutation({
    mutationFn: () => api.delete("/inside/inbox/all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inside-inbox-mine"] }),
  });

  const unreadCount = messages.filter((m) => !m.is_read).length;

  if (messages.length === 0) return null;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-[#5bbfb5]" />
          <span className="text-white/80 text-sm font-semibold">Alertas & Notificações</span>
          {unreadCount > 0 && (
            <span className="bg-[#407b75] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={() => markAllRead.mutate()} className="text-[10px] text-white/30 hover:text-[#5bbfb5] transition-colors flex items-center gap-1">
              <CheckCheck className="w-3 h-3" /> Marcar lidos
            </button>
          )}
          <button onClick={() => deleteAll.mutate()} className="text-[10px] text-white/30 hover:text-red-400 transition-colors flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Limpar tudo
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all ${
              msg.is_read
                ? "bg-white/[0.03] border border-white/5"
                : "bg-[#407b75]/15 border border-[#407b75]/30"
            }`}
          >
            {!msg.is_read && (
              <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#5bbfb5]" />
            )}
            <div className={`flex-1 min-w-0 ${!msg.is_read ? "ml-1.5" : ""}`}>
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <span className="text-[10px] font-semibold text-white/50">{msg.from_name}</span>
                <span className="text-[10px] text-white/25 shrink-0">
                  {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </div>
              {msg.body && (
                <p className={`text-xs leading-snug ${msg.is_read ? "text-white/40" : "text-white/80"}`}>
                  {msg.body}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              {!msg.is_read && (
                <button onClick={() => markRead.mutate(msg.id)} className="p-1 text-white/20 hover:text-[#5bbfb5] transition-colors">
                  <Check className="w-3 h-3" />
                </button>
              )}
              <button onClick={() => deleteMsg.mutate(msg.id)} className="p-1 text-white/20 hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InboxSection({ alwaysShow = false, externalOpen, onToggle }: { onClose?: () => void; alwaysShow?: boolean; externalOpen?: boolean; onToggle?: () => void } = {}) {
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(true);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const toggle = onToggle ?? (() => setInternalOpen((o) => !o));

  const { data: messages = [] } = useQuery({
    queryKey: ["inside-inbox-mine"],
    queryFn: () => api.get<InboxMessage[]>("/inside/inbox/mine"),
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.put(`/inside/inbox/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inside-inbox-mine"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.put("/inside/inbox/read-all", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inside-inbox-mine"] }),
  });

  const deleteMsg = useMutation({
    mutationFn: (id: string) => api.delete(`/inside/inbox/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inside-inbox-mine"] }),
  });

  const deleteAll = useMutation({
    mutationFn: () => api.delete("/inside/inbox/all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inside-inbox-mine"] }),
  });

  // Real-time: refresh when new inside_inbox message arrives
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    const socket = socketIO(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"] });
    socket.on("inside_inbox_new", () => {
      queryClient.invalidateQueries({ queryKey: ["inside-inbox-mine"] });
    });
    return () => { socket.disconnect(); };
  }, [queryClient]);

  const unreadCount = messages.filter((m) => !m.is_read).length;

  if (messages.length === 0 && !alwaysShow) return null;

  return (
    <div className="container px-6 pb-8 max-w-2xl mx-auto">
      {/* Header */}
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-[#5bbfb5]" />
          <span className="text-white/70 text-sm font-medium group-hover:text-white transition-colors">
            Caixa de Entrada
          </span>
          {unreadCount > 0 && (
            <span className="bg-[#407b75] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); markAllRead.mutate(); }}
              className="text-[10px] text-white/30 hover:text-[#5bbfb5] transition-colors flex items-center gap-1"
            >
              <CheckCheck className="w-3 h-3" /> Marcar lidos
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); deleteAll.mutate(); }}
            className="text-[10px] text-white/30 hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Limpar tudo
          </button>
          {open ? (
            <ChevronUp className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
          )}
        </div>
      </button>

      {open && messages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-2" style={{ color: "rgba(255,255,255,0.2)" }}>
          <Inbox className="w-8 h-8 opacity-30" />
          <p className="text-xs">Nenhuma notificação ainda</p>
        </div>
      )}

      {open && messages.length > 0 && (
        <div className="space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`relative rounded-xl border px-4 py-3 flex gap-3 transition-all ${
                msg.is_read
                  ? "bg-white/[0.03] border-white/8"
                  : "bg-[#407b75]/10 border-[#407b75]/30 shadow-[0_0_15px_rgba(64,123,117,0.08)]"
              }`}
            >
              {/* Unread dot */}
              {!msg.is_read && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#5bbfb5]" />
              )}

              <div className="flex-1 min-w-0 pl-1">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-white/60">{msg.from_name}</span>
                  <span className="text-[10px] text-white/25 shrink-0">
                    {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>

                {msg.body && (
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.is_read ? "text-white/40" : "text-white/80"}`}>
                    {msg.body}
                  </p>
                )}

                {msg.file_url && (
                  <a
                    href={msg.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-[#5bbfb5] hover:text-[#7dd4cb] transition-colors"
                  >
                    <Paperclip className="w-3 h-3 shrink-0" />
                    {msg.file_original_name || "Arquivo anexo"}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0">
                {!msg.is_read && (
                  <button
                    type="button"
                    onClick={() => markRead.mutate(msg.id)}
                    title="Marcar como lido"
                    className="p-1 rounded text-white/20 hover:text-[#5bbfb5] transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteMsg.mutate(msg.id)}
                  title="Excluir"
                  className="p-1 rounded text-white/20 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const Home = () => {
  const navigate = useNavigate();
  const { profile, userRole, isAdmin, isSecondOwner, user, signOut } = useAuthContext();
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const isOwner = user?.email === OWNER_EMAIL;
  const canManage = isOwner || isSecondOwner;

  const { data: cardBlocksData } = useMyBlockedCards();
  const blockedCards = isOwner ? [] : (cardBlocksData?.blockedCards ?? []);

  const inboxUnread = useInboxBadge();
  const queryClient = useQueryClient();

  const isAdminUser = isAdmin || isOwner || isSecondOwner;
  const [insideInboxOpen, setInsideInboxOpen] = useState(false);
  const insideInboxRef = useRef<HTMLDivElement>(null);
  const crmUnread = useCrmLeadsUnread();
  const clientCrmUnread = useClientCrmUnread(userRole === "client");
  const [clientSectionsOpen, setClientSectionsOpen] = useState(true);

  // Real-time: invalidate inside inbox — admins use for header dropdown, clients use for body section badge
  const { data: insideInboxMessages = [] } = useQuery({
    queryKey: ["inside-inbox-mine"],
    queryFn: () => api.get<InboxMessage[]>("/inside/inbox/mine"),
    refetchInterval: 60_000,
    enabled: isAdminUser || userRole === "client",
  });
  const insideInboxUnread = insideInboxMessages.filter((m) => !m.is_read).length;

  useEffect(() => {
    const token = getAuthToken();
    if (!token || !isAdminUser) return;
    const socket = socketIO(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"] });
    socket.on("inside_inbox_new", () => {
      queryClient.invalidateQueries({ queryKey: ["inside-inbox-mine"] });
    });
    return () => { socket.disconnect(); };
  }, [isAdminUser, queryClient]);

  useEffect(() => {
    if (!insideInboxOpen) return;
    function handleClick(e: MouseEvent) {
      if (insideInboxRef.current && !insideInboxRef.current.contains(e.target as Node)) {
        setInsideInboxOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [insideInboxOpen]);

  const allMenuItems = [
    {
      id: "trafego",
      title: "Tráfego",
      description: "Dashboard de leads e métricas",
      icon: TrendingUp,
      path: "/trafego",
      roles: ["employee", "client"],
    },
    {
      id: "cidade",
      title: "Cidade",
      description: "Dashboard de clientes",
      icon: FileText,
      path: "/cidade",
      roles: ["employee", "client"],
    },
    {
      id: "tarefas",
      title: "Tarefas",
      description: "Gestão de projetos e equipe",
      icon: CheckSquare,
      path: "/tarefas",
      roles: ["employee"],
    },
    {
      id: "financeiro",
      title: "Financeiro",
      description: "MRR, contratos e faturamento",
      icon: DollarSign,
      path: "/financeiro",
      roles: ["employee"],
      adminOnly: true,
    },
    {
      id: "gravacoes",
      title: "Agenda",
      description: "Agenda e postagens",
      icon: CalendarDays,
      path: "/gravacoes",
      roles: ["client", "employee"],
    },
    {
      id: "inbox",
      title: "Mensagens",
      description: "Chat interno da equipe",
      icon: MessageCircle,
      path: "/inbox",
      roles: ["client", "employee"],
    },
  ];

  const menuItems = allMenuItems.filter((item) => {
    if (userRole && !item.roles.includes(userRole)) return false;
    if ((item as any).adminOnly && !isAdmin && !isOwner) return false;
    if (blockedCards.includes(item.id)) return false;
    return true;
  });

  const firstName = profile?.name?.split(" ")[0] || "Usuário";

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-[#407b75] via-black to-[#9b3515] flex flex-col font-lufga">
        {/* Header */}
        <header className="py-6 px-6">
          <div className="container flex items-center justify-between">
            <img src={digitownLogo} alt="DigiTown Logo" className="h-12 md:h-16 object-contain" />
            <div className="flex items-center gap-3">
              {/* Caixa de Mensagens */}
              <button
                type="button"
                onClick={() => navigate("/inbox")}
                className="relative flex items-center gap-2 text-white/70 hover:text-white transition-colors border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5"
                title="Caixa de Mensagens"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm hidden sm:inline">Caixa de Mensagens</span>
                {inboxUnread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                    {inboxUnread > 99 ? "99+" : inboxUnread}
                  </span>
                )}
              </button>

              {/* Caixa de Entrada badge — clients see it as a simple indicator (inbox is in page body) */}
              {userRole === "client" && (insideInboxUnread + clientCrmUnread) > 0 && (
                <div className="relative flex items-center gap-2 text-white/70 border border-white/20 rounded-lg px-3 py-1.5">
                  <Inbox className="h-4 w-4" />
                  <span className="text-sm hidden sm:inline">Notificações</span>
                  <span className="absolute -top-1.5 -right-1.5 bg-[#407b75] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                    {(insideInboxUnread + clientCrmUnread) > 99 ? "99+" : (insideInboxUnread + clientCrmUnread)}
                  </span>
                </div>
              )}

              {/* Caixa de Entrada — admins only, dropdown panel */}
              {isAdminUser && (
                <div ref={insideInboxRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setInsideInboxOpen((v) => !v)}
                    className="relative flex items-center gap-2 text-white/70 hover:text-white transition-colors border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5"
                    title="Caixa de Entrada"
                  >
                    <Inbox className="h-4 w-4" />
                    <span className="text-sm hidden sm:inline">Caixa de Entrada</span>
                    {(crmUnread + insideInboxUnread) > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-[#407b75] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                        {(crmUnread + insideInboxUnread) > 99 ? "99+" : (crmUnread + insideInboxUnread)}
                      </span>
                    )}
                  </button>

                  {insideInboxOpen && (
                    <div className="absolute right-0 top-[calc(100%+8px)] w-[420px] max-h-[600px] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1520]/95 backdrop-blur-xl shadow-2xl z-50">
                      <AdminInboxSection messages={insideInboxMessages} queryClient={queryClient} />
                      <div className="border-t border-white/10">
                        <CrmLeadsInbox onClose={() => setInsideInboxOpen(false)} />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => setProfileDialogOpen(true)}
                className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
              >
                <Avatar className="w-8 h-8 border border-white/20 ring-1 ring-[#407b75]/40">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} className="object-cover" />}
                  <AvatarFallback className="bg-gradient-to-br from-[#407b75] to-[#356862] text-white text-sm font-bold">
                    {firstName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white/80 text-sm md:text-base">
                  Bem vindo, <span className="font-semibold text-white">{firstName}</span>
                </span>
              </button>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAdminDialogOpen(true)}
                  className="text-white/70 hover:text-white hover:bg-white/10 gap-2 text-xs border border-white/20"
                >
                  <Shield className="h-3.5 w-3.5" />
                  Gerenciar
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Title */}
        <div className="flex justify-center py-8">
          <h1
            className="font-lufga font-black uppercase tracking-[0.4em] text-5xl md:text-7xl"
            style={{
              background: "linear-gradient(90deg, #5bbfb5 0%, #ffffff 45%, #e07a45 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 18px rgba(91,191,181,0.45)) drop-shadow(0 0 40px rgba(224,122,69,0.3))",
              letterSpacing: "0.4em",
            }}
          >
            TOWN
          </h1>
        </div>

        {/* Main Navigation */}
        <main className="flex-1 container py-8">
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              menuItems.length <= 2
                ? "lg:grid-cols-2 max-w-3xl"
                : menuItems.length <= 3
                ? "lg:grid-cols-3 max-w-5xl"
                : menuItems.length <= 4
                ? "lg:grid-cols-4 max-w-6xl"
                : menuItems.length === 6
                ? "lg:grid-cols-3 max-w-5xl"
                : "lg:grid-cols-5 max-w-7xl"
            } gap-6 mx-auto mb-10`}
          >
            {menuItems.map((item) => (
              <Card
                key={item.id}
                onClick={() => navigate(item.path)}
                className="group cursor-pointer p-10 flex flex-col items-center text-center transition-all duration-300 bg-black/40 backdrop-blur-sm border-white/10 hover:bg-black/60 hover:border-white/30 hover:scale-[1.03] hover:shadow-2xl"
              >
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-gradient-to-br from-[#407b75] to-[#9b3515] group-hover:scale-110 transition-transform shadow-lg">
                  <item.icon className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-3 tracking-wide">{item.title}</h2>
                <p className="text-sm text-white/70">{item.description}</p>
              </Card>
            ))}
          </div>

          {/* Inbox — for non-admin employees and clients (admins get it in the header dropdown) */}
          {(userRole === "employee" && !isAdminUser) && <InboxSection />}
          {userRole === "client" && (
            <InboxSection
              alwaysShow
              externalOpen={clientSectionsOpen}
              onToggle={() => setClientSectionsOpen((o) => !o)}
            />
          )}
          {userRole === "client" && <ClientCrmLeadsSection open={clientSectionsOpen} />}
        </main>

        {/* Footer */}
        <footer className="py-6 text-center">
          <p className="text-sm text-white/50">© 2025 DigiTown - Todos os direitos reservados</p>
        </footer>
      </div>

      <AdminManagerDialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen} />
      <ProfileDialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} />
    </>
  );
};

export default Home;
