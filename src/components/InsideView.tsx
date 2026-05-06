import { useState, useRef } from "react";
import {
  Plus, Pencil, Trash2, Upload, X,
  Mail, Phone, Briefcase,
  Link2, UserCheck, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getAuthToken } from "@/lib/api";
import { toast } from "sonner";
import { useEmployees } from "@/hooks/useTasks";

// ── Types ──────────────────────────────────────────────────────────────────
interface InsideMember {
  id: string;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  image_url?: string | null;
  user_id?: string | null;
  created_at: string;
}

const emptyMemberForm = { name: "", role: "", email: "", phone: "", imageUrl: "", userId: "" };

// ── Glow card ──────────────────────────────────────────────────────────────
function GlowCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm
        transition-all duration-300 hover:border-[#5bbfb5]/30 hover:shadow-[0_0_30px_rgba(64,123,117,0.1)] ${className}`}
    >
      {children}
    </div>
  );
}

// ── MemberCard ─────────────────────────────────────────────────────────────
function MemberCard({
  member,
  onEdit,
  onDelete,
}: {
  member: InsideMember;
  onEdit: (m: InsideMember) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <GlowCard className="overflow-hidden">
        {/* Photo banner */}
        <div className="h-24 bg-gradient-to-br from-[#407b75]/30 to-[#9b3515]/20 relative overflow-hidden">
          {member.image_url && (
            <img
              src={member.image_url}
              alt={member.name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d1a] via-transparent to-transparent" />
          {/* action buttons */}
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              type="button"
              onClick={() => onEdit(member)}
              className="p-1.5 rounded-lg bg-black/50 text-white/50 hover:text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(member.id)}
              className="p-1.5 rounded-lg bg-black/50 text-white/50 hover:text-red-400 hover:bg-black/70 transition-colors backdrop-blur-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Avatar overlapping banner */}
        <div className="px-5 pb-5 -mt-8 relative">
          <Avatar className="w-16 h-16 border-[3px] border-[#0d0d1a] ring-2 ring-[#407b75]/30 mb-3">
            {member.image_url ? (
              <AvatarImage src={member.image_url} alt={member.name} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-[#407b75] to-[#356862] text-white font-bold text-xl">
              {member.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <h3 className="text-white font-semibold text-base leading-tight">{member.name}</h3>

          {member.role && (
            <p className="text-[#5bbfb5] text-xs mt-0.5 flex items-center gap-1">
              <Briefcase className="w-3 h-3 shrink-0" /> {member.role}
            </p>
          )}

          <div className="mt-2 space-y-0.5">
            {member.email && (
              <p className="text-white/30 text-xs flex items-center gap-1.5 truncate">
                <Mail className="w-3 h-3 shrink-0" /> {member.email}
              </p>
            )}
            {member.phone && (
              <p className="text-white/30 text-xs flex items-center gap-1.5">
                <Phone className="w-3 h-3 shrink-0" /> {member.phone}
              </p>
            )}
          </div>

          {/* Linked user indicator */}
          <div className="mt-3">
            {member.user_id ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400/70 border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded-full w-fit">
                <UserCheck className="w-3 h-3" /> Vinculado ao sistema
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-white/20 border border-white/10 px-2 py-0.5 rounded-full w-fit">
                <Link2 className="w-3 h-3" /> Sem vínculo
              </span>
            )}
          </div>
        </div>
    </GlowCard>
  );
}

// ── InsideView ─────────────────────────────────────────────────────────────
export function InsideView() {
  const queryClient = useQueryClient();
  const [memberDialog, setMemberDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<InsideMember | null>(null);
  const [memberForm, setMemberForm] = useState(emptyMemberForm);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["inside-members"],
    queryFn: () => api.get<InsideMember[]>("/inside/members"),
  });

  const { data: employees = [] } = useEmployees();

  const createMember = useMutation({
    mutationFn: (data: typeof memberForm) =>
      api.post("/inside/members", {
        name: data.name,
        role: data.role || null,
        email: data.email || null,
        phone: data.phone || null,
        imageUrl: data.imageUrl || null,
        userId: data.userId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inside-members"] });
      toast.success("Colaborador adicionado!");
      closeMemberDialog();
    },
    onError: () => toast.error("Erro ao criar colaborador"),
  });

  const updateMember = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof memberForm }) =>
      api.put(`/inside/members/${id}`, {
        name: data.name,
        role: data.role || null,
        email: data.email || null,
        phone: data.phone || null,
        imageUrl: data.imageUrl || null,
        userId: data.userId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inside-members"] });
      toast.success("Colaborador atualizado!");
      closeMemberDialog();
    },
    onError: () => toast.error("Erro ao atualizar colaborador"),
  });

  const deleteMember = useMutation({
    mutationFn: (id: string) => api.delete(`/inside/members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inside-members"] });
      toast.success("Colaborador removido");
    },
    onError: () => toast.error("Erro ao remover colaborador"),
  });

  const closeMemberDialog = () => {
    setMemberDialog(false);
    setEditingMember(null);
    setMemberForm(emptyMemberForm);
  };

  const openNewMember = () => {
    setEditingMember(null);
    setMemberForm(emptyMemberForm);
    setMemberDialog(true);
  };

  const openEditMember = (m: InsideMember) => {
    setEditingMember(m);
    setMemberForm({
      name: m.name,
      role: m.role || "",
      email: m.email || "",
      phone: m.phone || "",
      imageUrl: m.image_url || "",
      userId: m.user_id || "",
    });
    setMemberDialog(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImg(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const token = getAuthToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/inside/members/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      setMemberForm((f) => ({ ...f, imageUrl: url }));
      toast.success("Foto enviada!");
    } catch {
      toast.error("Erro ao enviar foto");
    } finally {
      setUploadingImg(false);
    }
  };

  const handleMemberSubmit = () => {
    if (!memberForm.name.trim()) { toast.error("Nome obrigatório"); return; }
    if (editingMember) {
      updateMember.mutate({ id: editingMember.id, data: memberForm });
    } else {
      createMember.mutate(memberForm);
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Equipe</h2>
          <p className="text-white/40 text-sm">Colaboradores internos</p>
        </div>
        <Button onClick={openNewMember} className="bg-[#407b75] hover:bg-[#356862] text-white gap-2">
          <Plus className="w-4 h-4" /> Novo Colaborador
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-20 text-white/30">Carregando...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-24">
          <User className="w-14 h-14 text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-lg font-medium">Nenhum colaborador cadastrado</p>
          <button type="button" onClick={openNewMember} className="mt-3 text-[#5bbfb5] hover:underline text-sm">
            Adicionar primeiro colaborador
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {members.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              onEdit={openEditMember}
              onDelete={(id) => deleteMember.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Member Dialog */}
      <Dialog open={memberDialog} onOpenChange={(o) => !o && closeMemberDialog()}>
        <DialogContent className="bg-[#0d0d1a] border-white/10 text-white max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingMember ? "Editar Colaborador" : "Novo Colaborador"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            <div>
              <label className="text-white/60 text-sm mb-1 block">Nome *</label>
              <Input
                value={memberForm.name}
                onChange={(e) => setMemberForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nome do colaborador"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div>
              <label className="text-white/60 text-sm mb-1 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-[#5bbfb5]" /> Cargo / Função
              </label>
              <Input
                value={memberForm.role}
                onChange={(e) => setMemberForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="Ex: Designer, Dev, Gestor..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-sm mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <Input
                  type="email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <label className="text-white/60 text-sm mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Telefone
                </label>
                <Input
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            {/* Link to system user */}
            <div>
              <label className="text-white/60 text-sm mb-1 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-[#5bbfb5]" /> Usuário do sistema
              </label>
              <Select
                value={memberForm.userId || "__none__"}
                onValueChange={(v) => setMemberForm((f) => ({ ...f, userId: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d0d1a] border-white/10 text-white">
                  <SelectItem value="__none__">
                    <span className="text-white/40">Sem vínculo</span>
                  </SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.user_id} value={emp.user_id}>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-[#407b75]/30 flex items-center justify-center text-[10px] text-[#5bbfb5] font-bold">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        {emp.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-white/25 text-[11px] mt-1">
                Vincula este card a um usuário — mensagens enviadas chegam na caixa de entrada dele.
              </p>
            </div>

            {/* Photo — direct upload, no crop */}
            <div>
              <label className="text-white/60 text-sm mb-1 block">Foto</label>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                  e.target.value = "";
                }}
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImg}
                  className="flex-1 bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingImg ? "Enviando..." : "Escolher foto"}
                </Button>
                {memberForm.imageUrl && (
                  <>
                    <Avatar className="w-10 h-10 border border-white/20">
                      <AvatarImage src={memberForm.imageUrl} className="object-cover" />
                      <AvatarFallback className="bg-[#407b75] text-white text-sm">
                        {memberForm.name.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => setMemberForm((f) => ({ ...f, imageUrl: "" }))}
                      className="text-white/30 hover:text-white/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={closeMemberDialog} className="text-white/60 hover:text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button
              onClick={handleMemberSubmit}
              disabled={createMember.isPending || updateMember.isPending}
              className="bg-[#407b75] hover:bg-[#356862] text-white"
            >
              {editingMember ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
