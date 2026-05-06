import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, FolderPlus, Folder, FolderOpen, Upload, Trash2,
  File, FileImage, FileText, ExternalLink, ChevronRight,
  FileSpreadsheet, CalendarDays, BarChart2, Clock,
  AlignLeft, Plus, Pencil, Check, X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getAuthToken } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format, startOfMonth, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DocNote {
  id: string;
  folder_id: string;
  client_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

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
  notes: DocNote[];
}

interface CidadeClient {
  id: string;
  name: string;
  imageUrl?: string | null;
  package?: string | null;
  niche?: string | null;
}

function fileIcon(mime: string, className = "w-4 h-4") {
  if (mime.startsWith("image/")) return <FileImage className={`${className} text-blue-400`} />;
  if (mime === "application/pdf") return <FileText className={`${className} text-red-400`} />;
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv"))
    return <FileSpreadsheet className={`${className} text-green-400`} />;
  if (mime.includes("word") || mime.includes("document"))
    return <FileText className={`${className} text-blue-300`} />;
  return <File className={`${className} text-white/40`} />;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 bg-white/[0.04] border border-white/8 rounded-xl px-4 py-3">
      <div className="w-9 h-9 rounded-lg bg-[#407b75]/20 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-white/35 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-white leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ── NoteRow ───────────────────────────────────────────────────────
function NoteRow({
  note,
  folderId,
  clientId,
  onDeleted,
  onUpdated,
}: {
  note: DocNote;
  folderId: string;
  clientId: string;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title || "");
  const [editContent, setEditContent] = useState(note.content || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editContent.trim() && !editTitle.trim()) return;
    setSaving(true);
    try {
      await api.put(
        `/cidade/${clientId}/folders/${folderId}/notes/${note.id}`,
        { title: editTitle, content: editContent }
      );
      onUpdated();
      setEditing(false);
      toast.success("Nota salva");
    } catch {
      toast.error("Erro ao salvar nota");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditTitle(note.title || "");
    setEditContent(note.content || "");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-amber-500/5 border border-amber-400/20 rounded-xl px-4 py-3 space-y-2">
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Título (opcional)"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/25 text-sm h-8"
        />
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          placeholder="Conteúdo da nota..."
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 resize-y focus:outline-none focus:border-[#5bbfb5]/50"
        />
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || (!editContent.trim() && !editTitle.trim())}
            className="flex items-center gap-1 text-xs text-[#5bbfb5] hover:text-[#7dd4cb] disabled:opacity-40 transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-3 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-400/15 rounded-xl px-4 py-3 transition-all">
      <AlignLeft className="w-4 h-4 text-amber-400/60 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {note.title && (
          <p className="text-sm font-medium text-white/80 mb-1">{note.title}</p>
        )}
        <p className="text-sm text-white/55 whitespace-pre-wrap leading-relaxed">{note.content}</p>
        <p className="text-[10px] text-white/20 mt-1.5">
          {format(new Date(note.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>
      <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-lg text-white/20 hover:text-amber-400 transition-colors"
          title="Editar"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDeleted}
          className="p-1.5 rounded-lg text-white/20 hover:text-red-400 transition-colors"
          title="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── AddNoteForm ────────────────────────────────────────────────────
function AddNoteForm({ onSave, onCancel }: { onSave: (title: string, content: string) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim() && !title.trim()) return;
    setSaving(true);
    try {
      await onSave(title, content);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-amber-500/5 border border-amber-400/25 border-dashed rounded-xl px-4 py-3 space-y-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título (opcional)"
        className="bg-white/5 border-white/10 text-white placeholder:text-white/25 text-sm h-8"
        autoFocus
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escreva o conteúdo da nota..."
        rows={4}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 resize-y focus:outline-none focus:border-[#5bbfb5]/50"
      />
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || (!content.trim() && !title.trim())}
          className="flex items-center gap-1 text-xs text-[#5bbfb5] hover:text-[#7dd4cb] disabled:opacity-40 transition-colors"
        >
          <Check className="w-3.5 h-3.5" /> {saving ? "Salvando..." : "Adicionar"}
        </button>
      </div>
    </div>
  );
}

export default function ClientDocsPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [addingNote, setAddingNote] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeFolder = useRef<string | null>(null);

  const { data: client } = useQuery({
    queryKey: ["cidade-client", clientId],
    queryFn: () => api.get<CidadeClient>(`/cidade/${clientId}`),
    enabled: !!clientId,
  });

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ["cidade-folders", clientId],
    queryFn: () => api.get<DocFolder[]>(`/cidade/${clientId}/folders`),
    enabled: !!clientId,
  });

  const createFolder = useMutation({
    mutationFn: (name: string) => api.post(`/cidade/${clientId}/folders`, { name }),
    onSuccess: (newFolder: any) => {
      queryClient.invalidateQueries({ queryKey: ["cidade-folders", clientId] });
      setNewFolderName("");
      setNewFolderOpen(false);
      setSelectedFolder(newFolder.id);
      toast.success("Pasta criada!");
    },
    onError: () => toast.error("Erro ao criar pasta"),
  });

  const deleteFolder = useMutation({
    mutationFn: (folderId: string) => api.delete(`/cidade/${clientId}/folders/${folderId}`),
    onSuccess: (_, folderId) => {
      queryClient.invalidateQueries({ queryKey: ["cidade-folders", clientId] });
      if (selectedFolder === folderId) setSelectedFolder(null);
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

  const deleteNote = useMutation({
    mutationFn: ({ folderId, noteId }: { folderId: string; noteId: string }) =>
      api.delete(`/cidade/${clientId}/folders/${folderId}/notes/${noteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cidade-folders", clientId] });
      toast.success("Nota excluída");
    },
    onError: () => toast.error("Erro ao excluir nota"),
  });

  const handleAddNote = async (folderId: string, title: string, content: string) => {
    await api.post(`/cidade/${clientId}/folders/${folderId}/notes`, { title, content });
    queryClient.invalidateQueries({ queryKey: ["cidade-folders", clientId] });
    setAddingNote(false);
    toast.success("Nota adicionada!");
  };

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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || "Erro ao enviar arquivo");
      }
      queryClient.invalidateQueries({ queryKey: ["cidade-folders", clientId] });
      toast.success("Arquivo enviado!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar arquivo");
    } finally {
      setUploadingFor(null);
    }
  };

  // ── Derived metrics ──────────────────────────────────────────────
  const allFiles: (DocFile & { folderName: string })[] = folders.flatMap((f) =>
    f.files.map((file) => ({ ...file, folderName: f.name }))
  );
  const totalDocs = allFiles.length;
  const totalFolders = folders.length;
  const now = new Date();
  const thisMonthDocs = allFiles.filter((f) => isSameMonth(new Date(f.created_at), now)).length;
  const lastUpload = allFiles.length
    ? allFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null;

  // Group all files by month for the timeline
  const byMonth: Record<string, (DocFile & { folderName: string })[]> = {};
  allFiles.forEach((f) => {
    const key = format(startOfMonth(new Date(f.created_at)), "yyyy-MM");
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(f);
  });
  const monthKeys = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  // Current folder
  const currentFolder = selectedFolder ? folders.find((f) => f.id === selectedFolder) : null;
  const totalItems = currentFolder
    ? (currentFolder.files.length + (currentFolder.notes?.length ?? 0))
    : 0;

  const initials = client?.name?.charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white font-lufga">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0d0d1a]/90 backdrop-blur border-b border-white/8 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/cidade")}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="w-10 h-10 border border-white/10 shrink-0">
              {client?.imageUrl && <AvatarImage src={client.imageUrl} className="object-cover" />}
              <AvatarFallback className="bg-gradient-to-br from-[#407b75] to-[#9b3515] text-white font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-base truncate">{client?.name || "..."}</h1>
              <p className="text-white/35 text-xs">Documentos e Registros</p>
            </div>
          </div>

          <Button
            onClick={() => setNewFolderOpen(true)}
            className="bg-[#407b75] hover:bg-[#356862] text-white gap-2 shrink-0"
            size="sm"
          >
            <FolderPlus className="w-4 h-4" /> Nova pasta
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* ── Metrics strip ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<FileText className="w-4 h-4 text-[#5bbfb5]" />}
            label="Total de docs"
            value={totalDocs}
          />
          <StatCard
            icon={<FolderOpen className="w-4 h-4 text-yellow-400/70" />}
            label="Pastas"
            value={totalFolders}
          />
          <StatCard
            icon={<CalendarDays className="w-4 h-4 text-[#5bbfb5]" />}
            label="Este mês"
            value={thisMonthDocs}
          />
          <StatCard
            icon={<Clock className="w-4 h-4 text-white/40" />}
            label="Último upload"
            value={lastUpload ? format(new Date(lastUpload.created_at), "dd/MM/yy", { locale: ptBR }) : "—"}
          />
        </div>

        {/* ── Main layout ───────────────────────────────────────── */}
        <div className="flex gap-5 items-start">

          {/* Sidebar — folders */}
          <aside className="w-56 shrink-0 space-y-1">
            <p className="text-[10px] text-white/30 uppercase tracking-wider px-2 mb-2">Pastas</p>

            {/* All docs shortcut */}
            <button
              type="button"
              onClick={() => setSelectedFolder(null)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedFolder === null
                  ? "bg-[#407b75]/25 text-white border border-[#407b75]/40"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <BarChart2 className="w-4 h-4 shrink-0" />
              <span className="truncate">Visão geral</span>
              <span className="ml-auto text-[10px] text-white/30">{totalDocs}</span>
            </button>

            {isLoading && <p className="text-white/25 text-xs px-3 py-2">Carregando...</p>}

            {folders.map((folder) => (
              <div key={folder.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setSelectedFolder(folder.id); setAddingNote(false); }}
                  className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors min-w-0 ${
                    selectedFolder === folder.id
                      ? "bg-[#407b75]/25 text-white border border-[#407b75]/40"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {selectedFolder === folder.id
                    ? <FolderOpen className="w-4 h-4 text-yellow-400/70 shrink-0" />
                    : <Folder className="w-4 h-4 text-yellow-400/50 shrink-0" />}
                  <span className="truncate flex-1 text-left">{folder.name}</span>
                  <span className="ml-auto text-[10px] text-white/30 shrink-0">
                    {folder.files.length + (folder.notes?.length ?? 0)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteFolder.mutate(folder.id)}
                  className="p-1.5 rounded-lg text-white/0 group-hover:text-white/20 hover:!text-red-400 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {!isLoading && folders.length === 0 && (
              <p className="text-white/20 text-xs px-3 py-2 italic">Nenhuma pasta ainda.</p>
            )}
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">

            {/* ── Folder view ── */}
            {selectedFolder && currentFolder && (
              <div className="space-y-4">
                {/* Folder header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-yellow-400/70" />
                    <h2 className="text-white font-semibold">{currentFolder.name}</h2>
                    <span className="text-white/30 text-sm">
                      ({totalItems} item{totalItems !== 1 ? "s" : ""})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setAddingNote((v) => !v)}
                      className="flex items-center gap-1.5 text-sm text-amber-400/70 hover:text-amber-400 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar texto
                    </button>
                    <button
                      type="button"
                      onClick={() => { activeFolder.current = currentFolder.id; fileInputRef.current?.click(); }}
                      disabled={uploadingFor === currentFolder.id}
                      className="flex items-center gap-1.5 text-sm text-[#5bbfb5] hover:text-[#7dd4cb] transition-colors disabled:opacity-40"
                    >
                      {uploadingFor === currentFolder.id
                        ? <div className="w-4 h-4 border-2 border-[#5bbfb5] border-t-transparent rounded-full animate-spin" />
                        : <Upload className="w-4 h-4" />}
                      Enviar arquivo
                    </button>
                  </div>
                </div>

                {/* Inline add note form */}
                {addingNote && (
                  <AddNoteForm
                    onSave={(title, content) => handleAddNote(currentFolder.id, title, content)}
                    onCancel={() => setAddingNote(false)}
                  />
                )}

                {/* Empty state */}
                {totalItems === 0 && !addingNote ? (
                  <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
                    <Upload className="w-10 h-10 text-white/10 mx-auto mb-3" />
                    <p className="text-white/30 text-sm">Pasta vazia</p>
                    <div className="flex items-center justify-center gap-4 mt-2">
                      <button
                        type="button"
                        onClick={() => { activeFolder.current = currentFolder.id; fileInputRef.current?.click(); }}
                        className="text-[#5bbfb5] hover:text-[#7dd4cb] text-sm transition-colors"
                      >
                        Enviar arquivo
                      </button>
                      <span className="text-white/20 text-xs">ou</span>
                      <button
                        type="button"
                        onClick={() => setAddingNote(true)}
                        className="text-amber-400/70 hover:text-amber-400 text-sm transition-colors"
                      >
                        Adicionar texto
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Notes */}
                    {(currentFolder.notes ?? []).map((note) => (
                      <NoteRow
                        key={note.id}
                        note={note}
                        folderId={currentFolder.id}
                        clientId={clientId!}
                        onDeleted={() => deleteNote.mutate({ folderId: currentFolder.id, noteId: note.id })}
                        onUpdated={() => queryClient.invalidateQueries({ queryKey: ["cidade-folders", clientId] })}
                      />
                    ))}
                    {/* Files */}
                    {currentFolder.files.map((file) => (
                      <FileRow
                        key={file.id}
                        file={file}
                        onDelete={() => deleteFile.mutate({ folderId: currentFolder.id, fileId: file.id })}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Overview / timeline ── */}
            {!selectedFolder && (
              <div className="space-y-6">
                {totalDocs === 0 && !isLoading ? (
                  <div className="text-center py-20 border border-dashed border-white/10 rounded-xl">
                    <FileText className="w-12 h-12 text-white/10 mx-auto mb-3" />
                    <p className="text-white/30">Nenhum documento ainda.</p>
                    <button
                      type="button"
                      onClick={() => setNewFolderOpen(true)}
                      className="mt-2 text-[#5bbfb5] hover:text-[#7dd4cb] text-sm transition-colors"
                    >
                      Criar primeira pasta
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5" /> Histórico de uploads
                    </p>
                    {monthKeys.map((monthKey) => {
                      const monthFiles = byMonth[monthKey];
                      const monthDate = new Date(`${monthKey}-01`);
                      return (
                        <div key={monthKey}>
                          <div className="flex items-center gap-3 mb-3">
                            <p className="text-white/60 text-sm font-semibold capitalize">
                              {format(monthDate, "MMMM yyyy", { locale: ptBR })}
                            </p>
                            <span className="text-[10px] text-white/25 border border-white/10 px-2 py-0.5 rounded-full">
                              {monthFiles.length} doc{monthFiles.length !== 1 ? "s" : ""}
                            </span>
                            <div className="flex-1 h-px bg-white/8" />
                          </div>
                          <div className="space-y-2">
                            {monthFiles.map((file) => (
                              <FileRow
                                key={file.id}
                                file={file}
                                showFolder
                                onDelete={() => deleteFile.mutate({ folderId: file.folder_id, fileId: file.id })}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
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
        <DialogContent className="bg-[#0d0d1a] border-white/10 text-white max-w-xs">
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

function FileRow({
  file,
  showFolder = false,
  onDelete,
}: {
  file: DocFile & { folderName?: string };
  showFolder?: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 group bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 rounded-xl px-4 py-3 transition-all">
      <div className="shrink-0">{fileIcon(file.mime_type)}</div>

      <div className="flex-1 min-w-0">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-white/85 hover:text-[#5bbfb5] font-medium truncate block transition-colors"
        >
          {file.original_name}
        </a>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-white/25">
            {format(new Date(file.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
          {showFolder && file.folderName && (
            <>
              <span className="text-white/15">·</span>
              <span className="text-[11px] text-yellow-400/40 flex items-center gap-1">
                <Folder className="w-2.5 h-2.5" /> {file.folderName}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg text-white/15 hover:text-[#5bbfb5] transition-colors"
          title="Abrir"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded-lg text-white/0 group-hover:text-white/20 hover:!text-red-400 transition-colors"
          title="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
