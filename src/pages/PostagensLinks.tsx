import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCidadeClients, CidadeClientForRecording } from "@/hooks/useClients";
import { ClientCircle } from "@/components/ClientCircle";
import {
  ArrowLeft, Loader2, FolderPlus, Folder, FolderOpen, Trash2,
  Link2, Plus, ExternalLink, X, ChevronDown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────

interface PostagemLink {
  id: string;
  folder_id: string;
  client_id: string;
  title: string;
  url: string;
  link_date: string | null;
  created_at: string;
}

interface PostagemFolder {
  id: string;
  client_id: string;
  name: string;
  created_at: string;
  links: PostagemLink[];
}

// ── Link date badge ───────────────────────────────────────────────

function LinkDateBadge({ date }: { date: string | null }) {
  if (!date) return null;
  return (
    <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
      {format(parseISO(date), "dd/MM/yyyy", { locale: ptBR })}
    </span>
  );
}

// ── Client repository ─────────────────────────────────────────────

function ClientRepository({ clientId, clientName }: { clientId: string; clientName: string }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [addLinkFolder, setAddLinkFolder] = useState<string | null>(null);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkDate, setLinkDate] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ["postagens-folders", clientId],
    queryFn: () => api.get<PostagemFolder[]>(`/cidade/${clientId}/postagens-folders`),
  });

  const createFolder = useMutation({
    mutationFn: (name: string) => api.post(`/cidade/${clientId}/postagens-folders`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postagens-folders", clientId] });
      setNewFolderName("");
      setNewFolderOpen(false);
      toast.success("Pasta criada!");
    },
    onError: () => toast.error("Erro ao criar pasta"),
  });

  const deleteFolder = useMutation({
    mutationFn: (folderId: string) =>
      api.delete(`/cidade/${clientId}/postagens-folders/${folderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postagens-folders", clientId] });
      toast.success("Pasta excluída");
    },
    onError: () => toast.error("Erro ao excluir pasta"),
  });

  const addLink = useMutation({
    mutationFn: ({ folderId, title, url, linkDate }: {
      folderId: string; title: string; url: string; linkDate?: string;
    }) =>
      api.post(`/cidade/${clientId}/postagens-folders/${folderId}/links`, {
        title, url, linkDate: linkDate || null,
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["postagens-folders", clientId] });
      setAddLinkFolder(null);
      setLinkTitle("");
      setLinkUrl("");
      setLinkDate(undefined);
      toast.success("Link adicionado!");
      // ensure folder is open
      setExpanded((prev) => new Set([...prev, vars.folderId]));
    },
    onError: () => toast.error("Erro ao adicionar link"),
  });

  const deleteLink = useMutation({
    mutationFn: ({ folderId, linkId }: { folderId: string; linkId: string }) =>
      api.delete(`/cidade/${clientId}/postagens-folders/${folderId}/links/${linkId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postagens-folders", clientId] });
      toast.success("Link removido");
    },
    onError: () => toast.error("Erro ao excluir link"),
  });

  const toggleFolder = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleAddLink = (folderId: string) => {
    if (!linkTitle.trim() || !linkUrl.trim()) {
      toast.error("Título e URL são obrigatórios");
      return;
    }
    addLink.mutate({
      folderId,
      title: linkTitle,
      url: linkUrl,
      linkDate: linkDate ? format(linkDate, "yyyy-MM-dd") : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">{clientName}</h2>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => setNewFolderOpen(true)}
        >
          <FolderPlus className="w-3.5 h-3.5" /> Nova pasta
        </Button>
      </div>

      {folders.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma pasta criada. Crie uma pasta para começar a organizar os links.
        </p>
      )}

      {folders.map((folder) => {
        const isOpen = expanded.has(folder.id);
        const isAddingLink = addLinkFolder === folder.id;
        // Sort links by date descending
        const sortedLinks = [...folder.links].sort((a, b) => {
          if (!a.link_date && !b.link_date) return 0;
          if (!a.link_date) return 1;
          if (!b.link_date) return -1;
          return b.link_date.localeCompare(a.link_date);
        });

        return (
          <div key={folder.id} className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
            {/* Folder header */}
            <div
              className="flex items-center gap-2.5 px-4 py-3 cursor-pointer select-none hover:bg-muted/40 transition-colors"
              onClick={() => toggleFolder(folder.id)}
            >
              {isOpen
                ? <FolderOpen className="w-4 h-4 text-yellow-500 shrink-0" />
                : <Folder className="w-4 h-4 text-yellow-500 shrink-0" />}
              <span className="text-sm font-medium text-foreground flex-1 truncate">{folder.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">({sortedLinks.length})</span>
              {isOpen
                ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              {/* Folder actions */}
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                  title="Adicionar link"
                  onClick={() => {
                    setAddLinkFolder(isAddingLink ? null : folder.id);
                    if (!isOpen) toggleFolder(folder.id);
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-red-500"
                  title="Excluir pasta"
                  onClick={() => deleteFolder.mutate(folder.id)}
                  disabled={deleteFolder.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Folder contents */}
            {isOpen && (
              <div className="border-t border-border bg-muted/20">
                {/* Add link form */}
                {isAddingLink && (
                  <div className="px-4 py-3 bg-blue-50/60 border-b border-border space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Adicionar link
                    </p>
                    <Input
                      placeholder="Título do link"
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Input
                      placeholder="URL (https://...)"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "text-xs h-8 flex-1",
                              !linkDate && "text-muted-foreground"
                            )}
                          >
                            {linkDate
                              ? format(linkDate, "dd/MM/yyyy", { locale: ptBR })
                              : "Data (opcional)"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-auto p-3">
                          <CalendarPicker
                            mode="single"
                            selected={linkDate}
                            onSelect={(d) => { setLinkDate(d); setDatePickerOpen(false); }}
                            locale={ptBR}
                            className="rounded-lg pointer-events-auto"
                          />
                          {linkDate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-1 text-xs"
                              onClick={() => setLinkDate(undefined)}
                            >
                              Limpar data
                            </Button>
                          )}
                        </PopoverContent>
                      </Popover>
                      <Button
                        size="sm"
                        className="h-8 text-xs px-3"
                        onClick={() => handleAddLink(folder.id)}
                        disabled={addLink.isPending}
                      >
                        {addLink.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => {
                          setAddLinkFolder(null);
                          setLinkTitle("");
                          setLinkUrl("");
                          setLinkDate(undefined);
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {sortedLinks.length === 0 && !isAddingLink && (
                  <p className="text-xs text-muted-foreground italic px-4 py-3">
                    Nenhum link ainda.{" "}
                    <button
                      className="underline hover:text-foreground"
                      onClick={() => setAddLinkFolder(folder.id)}
                    >
                      Adicionar
                    </button>
                  </p>
                )}

                {sortedLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group"
                  >
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
                      >
                        {link.title}
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                      </a>
                      <p className="text-[11px] text-muted-foreground truncate">{link.url}</p>
                    </div>
                    <LinkDateBadge date={link.link_date} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => deleteLink.mutate({ folderId: folder.id, linkId: link.id })}
                      disabled={deleteLink.isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}

                {sortedLinks.length > 0 && (
                  <div className="px-4 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                      onClick={() => setAddLinkFolder(isAddingLink ? null : folder.id)}
                    >
                      <Plus className="w-3 h-3" /> Adicionar link
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* New folder dialog */}
      <Dialog open={newFolderOpen} onOpenChange={(o) => !o && setNewFolderOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4" /> Nova pasta
            </DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome da pasta"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && newFolderName.trim() && createFolder.mutate(newFolderName)
            }
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setNewFolderOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createFolder.mutate(newFolderName)}
              disabled={!newFolderName.trim() || createFolder.isPending}
            >
              {createFolder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

const TOTAL_SLOTS = 30;

const PostagensLinks = () => {
  const navigate = useNavigate();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const { data: allClients, isLoading } = useCidadeClients();
  const clients = allClients?.filter((c) => c.package === "acelerador");

  const slots: (CidadeClientForRecording | undefined)[] = Array(TOTAL_SLOTS).fill(undefined);
  clients?.forEach((client, index) => {
    if (index < TOTAL_SLOTS) slots[index] = client;
  });

  const selectedClient = clients?.find((c) => c.id === selectedClientId) ?? null;

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm">
        <div className="container py-5">
          <Button variant="ghost" size="sm" onClick={() => navigate("/gravacoes")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-4 mt-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Link2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground leading-tight">Postagens</h1>
              <p className="text-xs text-muted-foreground">
                {selectedClient
                  ? `Repositório de links — ${selectedClient.name}`
                  : "Selecione um cliente"}
              </p>
            </div>
            {selectedClient && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs"
                onClick={() => setSelectedClientId(null)}
              >
                <X className="w-3.5 h-3.5 mr-1" /> Trocar cliente
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !selectedClient ? (
          <>
            <p className="text-center text-sm text-muted-foreground mb-6">
              Clique em um cliente para acessar seu repositório de links
            </p>
            <div className="grid grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-4 md:gap-6 justify-items-center max-w-5xl mx-auto">
              {slots.map((client, index) => (
                <ClientCircle
                  key={client?.id || `empty-${index}`}
                  client={
                    client
                      ? {
                          id: index,
                          name: client.name,
                          image: client.image_url || undefined,
                        }
                      : undefined
                  }
                  isSelected={selectedClientId === client?.id}
                  onClick={client ? () => setSelectedClientId(client.id) : undefined}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="max-w-2xl mx-auto">
            <ClientRepository clientId={selectedClient.id} clientName={selectedClient.name} />
          </div>
        )}
      </main>
    </div>
  );
};

export default PostagensLinks;
