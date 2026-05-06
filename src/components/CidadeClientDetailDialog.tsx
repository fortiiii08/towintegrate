import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getAuthToken } from "@/lib/api";
import { toast } from "sonner";
import {
  Pencil,
  Mail,
  FolderOpen,
  Folder,
  FolderPlus,
  ExternalLink,
  CalendarDays,
  FileText,
  Layers,
  MessageCircle,
  DollarSign,
  Paperclip,
  Upload,
  Trash2,
  ChevronDown,
  ChevronRight,
  File,
  FileImage,

} from "lucide-react";

type ClientPackage = "acelerador" | "start_line" | null;

interface CidadeClient {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  contractValue?: number | null;
  package?: ClientPackage;
  imageUrl?: string | null;
  driveLink?: string | null;
  briefingNotes?: string | null;
  niche?: string | null;
}

interface Props {
  client: CidadeClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onMilestone: () => void;
  canViewFinanceiro?: boolean;
  canEdit?: boolean;
}

const PACKAGE_CONFIG = {
  acelerador: { label: "Acelerador", className: "bg-blue-600 text-white" },
  start_line: { label: "Start Line", className: "bg-[#9b3515] text-white" },
} as const;

function toWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}?text=${encodeURIComponent("Olá Doutor(a)")}`;
}

function fmtCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Render briefing notes with clickable URLs and optionally R$ values
function BriefingNotesRenderer({
  notes,
  clientId,
  onNavigate,
  canViewFinanceiro,
}: {
  notes: string;
  clientId: string;
  onNavigate: (path: string) => void;
  canViewFinanceiro: boolean;
}) {
  const pattern = /(https?:\/\/[^\s]+)|(R\$\s*[\d.,]+)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(notes)) !== null) {
    if (match.index > lastIndex) {
      parts.push(notes.slice(lastIndex, match.index));
    }

    const full = match[0];
    if (full.startsWith("http")) {
      parts.push(
        <a
          key={match.index}
          href={full}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#5bbfb5] hover:text-[#7dd4cb] underline break-all transition-colors"
        >
          {full}
        </a>
      );
    } else if (canViewFinanceiro) {
      // R$ value → only clickable for admins
      parts.push(
        <button
          key={match.index}
          onClick={() => onNavigate(`/financeiro?clientId=${clientId}`)}
          className="text-[#407b75] hover:text-[#5bbfb5] font-semibold underline transition-colors"
          title="Ver no Financeiro"
        >
          {full}
        </button>
      );
    } else {
      // Non-admin: show masked value
      parts.push(
        <span key={match.index} className="text-white/30 font-semibold">
          R$ ••••
        </span>
      );
    }

    lastIndex = match.index + full.length;
  }

  if (lastIndex < notes.length) {
    parts.push(notes.slice(lastIndex));
  }

  return <>{parts}</>;
}

interface BriefingFile { id: string; original_name: string; url: string; mime_type: string; }

interface DocFile {
  id: string;
  original_name: string;
  url: string;
  mime_type: string;
  folder_id: string;
  created_at: string;
}

interface DocFolder {
  id: string;
  client_id: string;
  name: string;
  created_at: string;
  files: DocFile[];
}

function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return <FileImage className="w-3.5 h-3.5 shrink-0 text-blue-400" />;
  if (mime === "application/pdf") return <FileText className="w-3.5 h-3.5 shrink-0 text-red-400" />;
  return <File className="w-3.5 h-3.5 shrink-0 text-white/40" />;
}

function DocsSection({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeFolder = useRef<string | null>(null);

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ["cidade-folders", clientId],
    queryFn: () => api.get<DocFolder[]>(`/cidade/${clientId}/folders`),
  });

  const createFolder = useMutation({
    mutationFn: (name: string) => api.post(`/cidade/${clientId}/folders`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cidade-folders", clientId] });
      setNewFolderName("");
      setNewFolderOpen(false);
      toast.success("Pasta criada!");
    },
    onError: () => toast.error("Erro ao criar pasta"),
  });

  const deleteFolder = useMutation({
    mutationFn: (folderId: string) => api.delete(`/cidade/${clientId}/folders/${folderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cidade-folders", clientId] });
      toast.success("Pasta excluída");
    },
    onError: () => toast.error("Erro ao excluir pasta"),
  });

  const deleteFile = useMutation({
    mutationFn: ({ folderId, fileId }: { folderId: string; fileId: string }) =>
      api.delete(`/cidade/${clientId}/folders/${folderId}/files/${fileId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cidade-folders", clientId] });
      toast.success("Arquivo excluído");
    },
    onError: () => toast.error("Erro ao excluir arquivo"),
  });

  const handleUpload = async (file: File, folderId: string) => {
    setUploadingFor(folderId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = getAuthToken();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/cidade/${clientId}/folders/${folderId}/files`,
        { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData }
      );
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["cidade-folders", clientId] });
      toast.success("Arquivo enviado!");
    } catch {
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploadingFor(null);
    }
  };

  const toggleFolder = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
        <FolderOpen className="w-4 h-4 text-yellow-400/70" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Documentos</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setNewFolderOpen(true)}
              className="flex items-center gap-1 text-[10px] text-[#5bbfb5] hover:text-[#7dd4cb] transition-colors"
            >
              <FolderPlus className="w-3 h-3" /> Nova pasta
            </button>
          )}
        </div>

        {isLoading && <p className="text-white/25 text-xs">Carregando...</p>}

        {!isLoading && folders.length === 0 && (
          <p className="text-white/20 text-xs italic">Nenhuma pasta criada ainda.</p>
        )}

        <div className="space-y-1.5">
          {folders.map((folder) => {
            const isOpen = expanded.has(folder.id);
            return (
              <div key={folder.id} className="rounded-lg border border-white/8 bg-white/[0.02] overflow-hidden">
                {/* Folder header */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => toggleFolder(folder.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    {isOpen
                      ? <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      : <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />}
                    <Folder className="w-3.5 h-3.5 text-yellow-400/70 shrink-0" />
                    <span className="text-sm text-white/80 font-medium truncate">{folder.name}</span>
                    <span className="text-[10px] text-white/25 shrink-0">({folder.files.length})</span>
                  </button>

                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title="Upload"
                        onClick={() => { activeFolder.current = folder.id; fileInputRef.current?.click(); }}
                        disabled={uploadingFor === folder.id}
                        className="p-1 text-white/20 hover:text-[#5bbfb5] transition-colors disabled:opacity-40"
                      >
                        {uploadingFor === folder.id
                          ? <div className="w-3.5 h-3.5 border border-[#5bbfb5] border-t-transparent rounded-full animate-spin" />
                          : <Upload className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        title="Excluir pasta"
                        onClick={() => deleteFolder.mutate(folder.id)}
                        className="p-1 text-white/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Files */}
                {isOpen && (
                  <div className="border-t border-white/5 px-3 py-2 space-y-1.5">
                    {folder.files.length === 0 && (
                      <p className="text-white/20 text-xs italic py-1">Pasta vazia.</p>
                    )}
                    {folder.files.map((file) => (
                      <div key={file.id} className="flex items-center gap-2 group">
                        {fileIcon(file.mime_type)}
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#5bbfb5] hover:text-[#7dd4cb] truncate flex-1 transition-colors"
                        >
                          {file.original_name}
                        </a>
                        <ExternalLink className="w-3 h-3 text-white/20 shrink-0 group-hover:text-white/40 transition-colors" />
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => deleteFile.mutate({ folderId: folder.id, fileId: file.id })}
                            className="p-0.5 text-white/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => { activeFolder.current = folder.id; fileInputRef.current?.click(); }}
                        className="flex items-center gap-1.5 text-[10px] text-white/25 hover:text-[#5bbfb5] transition-colors mt-1"
                      >
                        <Upload className="w-3 h-3" /> Enviar arquivo
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && activeFolder.current) handleUpload(file, activeFolder.current);
          e.target.value = "";
        }}
      />

      {/* New folder dialog */}
      <Dialog open={newFolderOpen} onOpenChange={(o) => !o && setNewFolderOpen(false)}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-yellow-400/70" /> Nova pasta
            </DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newFolderName.trim() && createFolder.mutate(newFolderName)}
            placeholder="Ex: Atas de reunião, Briefing..."
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setNewFolderOpen(false)} className="text-white/60 hover:text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button
              onClick={() => createFolder.mutate(newFolderName)}
              disabled={!newFolderName.trim() || createFolder.isPending}
              className="bg-[#407b75] hover:bg-[#356862] text-white"
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CidadeClientDetailDialog({ client, open, onOpenChange, onEdit, onMilestone, canViewFinanceiro = false, canEdit = false }: Props) {
  const navigate = useNavigate();

  if (!client) return null;

  const pkg = client.package ? PACKAGE_CONFIG[client.package] : null;

  const handleFinanceiro = () => {
    onOpenChange(false);
    setTimeout(() => navigate(`/financeiro?clientId=${client.id}`), 150);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header with image */}
        <div className="relative h-36 bg-gradient-to-br from-[#407b75]/40 to-[#9b3515]/30">
          {client.imageUrl ? (
            <img src={client.imageUrl} alt={client.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl font-bold text-white/10">{client.name.charAt(0)}</span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e] to-transparent" />

          {/* Action buttons */}
          <div className="absolute top-3 right-3 flex gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              onClick={onMilestone}
              title="Marcos do cliente"
              className="h-8 w-8 bg-black/40 hover:bg-[#407b75]/70 text-white backdrop-blur-sm"
            >
              <CalendarDays className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => { onOpenChange(false); setTimeout(onEdit, 150); }}
              title="Editar"
              className="h-8 w-8 bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 -mt-4 relative z-10 overflow-y-auto flex-1">
          {/* Name + package */}
          <div className="mb-5">
            <h2 className="text-xl font-bold text-white leading-tight">{client.name}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {pkg && (
                <Badge className={`text-xs font-semibold px-2 py-0.5 ${pkg.className}`}>
                  {pkg.label}
                </Badge>
              )}
              {client.niche && (
                <span className="text-white/40 text-xs flex items-center gap-1">
                  <Layers className="w-3 h-3" /> {client.niche}
                </span>
              )}
            </div>
          </div>

          {/* Info rows */}
          <div className="space-y-3">

            {/* Contract value — only visible to admins/owner */}
            {canViewFinanceiro && client.contractValue != null && client.contractValue > 0 && (
              <button
                onClick={handleFinanceiro}
                className="w-full flex items-center gap-3 group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[#407b75]/15 flex items-center justify-center flex-shrink-0 group-hover:bg-[#407b75]/30 transition-colors">
                  <DollarSign className="w-4 h-4 text-[#407b75]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Contrato Mensal</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-[#407b75] group-hover:text-[#5bbfb5] font-semibold transition-colors">
                      {fmtCurrency(client.contractValue)}
                    </p>
                    <span className="text-[10px] text-white/20 group-hover:text-white/40 transition-colors flex items-center gap-0.5">
                      <ExternalLink className="w-2.5 h-2.5" /> ver financeiro
                    </span>
                  </div>
                </div>
              </button>
            )}

            {client.phone && (
              <a
                href={toWhatsApp(client.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/25 transition-colors">
                  <MessageCircle className="w-4 h-4 text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">WhatsApp</p>
                  <p className="text-sm text-green-400 group-hover:text-green-300 font-medium transition-colors">
                    {client.phone}
                  </p>
                </div>
              </a>
            )}

            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 transition-colors">
                  <Mail className="w-4 h-4 text-white/50" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Email</p>
                  <p className="text-sm text-[#5bbfb5] group-hover:text-[#7dd4cb] truncate transition-colors">
                    {client.email}
                  </p>
                </div>
              </a>
            )}

            {client.driveLink && (
              <a
                href={client.driveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 transition-colors">
                  <FolderOpen className="w-4 h-4 text-yellow-400/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Google Drive</p>
                  <div className="flex items-center gap-1">
                    <p className="text-sm text-white/70 group-hover:text-white transition-colors">
                      Pasta do cliente
                    </p>
                    <ExternalLink className="w-3 h-3 text-white/30 group-hover:text-white/60 transition-colors" />
                  </div>
                </div>
              </a>
            )}

            {client.briefingNotes && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="w-4 h-4 text-white/50" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Reunião de Briefing</p>
                  <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                    <BriefingNotesRenderer
                      notes={client.briefingNotes}
                      clientId={client.id}
                      canViewFinanceiro={canViewFinanceiro}
                      onNavigate={(path) => {
                        onOpenChange(false);
                        setTimeout(() => navigate(path), 150);
                      }}
                    />
                  </p>
                </div>
              </div>
            )}

            {/* Documents / Folders */}
            <DocsSection clientId={client.id} canEdit={canEdit} />

            {!client.phone && !client.email && !client.driveLink && !client.briefingNotes && !client.contractValue && (
              <p className="text-white/25 text-sm text-center py-4">
                Nenhuma informação adicional cadastrada.{" "}
                <button onClick={() => { onOpenChange(false); setTimeout(onEdit, 150); }} className="text-[#5bbfb5] hover:underline">
                  Editar cliente
                </button>
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
