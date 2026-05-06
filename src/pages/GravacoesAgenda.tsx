import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClientCircle } from "@/components/ClientCircle";
import { RecordingInfoDialog } from "@/components/RecordingInfoDialog";
import {
  useCidadeClients,
  useUpdateCidadeClientRecording,
  useSendRecordingNotification,
  CidadeClientForRecording as Client,
} from "@/hooks/useClients";
import { api } from "@/lib/api";
import {
  ArrowLeft, Calendar, Loader2, Bell, CalendarCheck, AlertCircle,
  Pencil, Trash2, Mail, X, Check, Clock, Video,
  Plus, ExternalLink, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  addDays, format, isToday, isPast, isTomorrow,
  isThisWeek, parseISO, differenceInDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { isBlockedDay, nextWorkingDay } from "@/lib/holidays";
import { toast } from "sonner";

const TOTAL_SLOTS = 30;

function calcEarliestNext(client: Client): Date | null {
  if (!client.last_recording_date) return null;
  const lastDate = parseISO(client.last_recording_date);
  let raw: Date;
  if (client.reels_per_session && client.videos_per_week && client.videos_per_week > 0) {
    const contentDays = Math.ceil((client.reels_per_session / client.videos_per_week) * 7);
    const notifyDays = Math.max(contentDays - 30, 1);
    raw = addDays(lastDate, notifyDays);
  } else {
    raw = addDays(lastDate, 75);
  }
  return nextWorkingDay(raw);
}

// ── Notification bell ─────────────────────────────────────────────

interface Notif { type: "today" | "expired"; clientName: string; }

function useRecordingNotifications(clients: Client[] | undefined): Notif[] {
  return useMemo(() => {
    if (!clients) return [];
    const notifs: Notif[] = [];
    for (const c of clients) {
      if (c.next_recording_date && isToday(parseISO(c.next_recording_date)))
        notifs.push({ type: "today", clientName: c.name });
      if (c.last_recording_date) {
        const earliest = calcEarliestNext(c);
        if (earliest && (isPast(earliest) || isToday(earliest))) {
          const hasUpcoming = c.next_recording_date && !isPast(parseISO(c.next_recording_date));
          if (!hasUpcoming) notifs.push({ type: "expired", clientName: c.name });
        }
      }
    }
    return notifs;
  }, [clients]);
}

// ── REC tab ───────────────────────────────────────────────────────

function groupRecordingsByPeriod(clients: Client[]) {
  const withDate = clients
    .filter((c) => c.next_recording_date)
    .map((c) => ({ client: c, date: parseISO(c.next_recording_date!) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const groups: { label: string; items: typeof withDate }[] = [];
  for (const item of withDate) {
    let label: string;
    if (isToday(item.date)) label = "Hoje";
    else if (isTomorrow(item.date)) label = "Amanhã";
    else if (isThisWeek(item.date, { weekStartsOn: 1 })) label = "Esta semana";
    else label = format(item.date, "MMMM yyyy", { locale: ptBR });
    const existing = groups.find((g) => g.label === label);
    if (existing) existing.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

function RecStatusBadge({ date }: { date: Date }) {
  const past = isPast(date) && !isToday(date);
  if (past) return <Badge variant="destructive" className="text-xs">Atrasada</Badge>;
  if (isToday(date)) return <Badge className="bg-green-500 text-white text-xs">Hoje</Badge>;
  const days = differenceInDays(date, new Date());
  if (days <= 3) return <Badge className="bg-amber-500 text-white text-xs">Em {days}d</Badge>;
  return <Badge variant="outline" className="text-xs">{format(date, "dd/MM", { locale: ptBR })}</Badge>;
}

function RecTab({ clients }: { clients: Client[] }) {
  const updateRecording = useUpdateCidadeClientRecording();
  const sendNotification = useSendRecordingNotification();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editTime, setEditTime] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const aceleradorClients = clients.filter((c) => c.package === "acelerador");
  const startLineClients  = clients.filter((c) => c.package === "start_line");

  const renderGroup = (label: string, groupClients: Client[]) => {
    if (groupClients.length === 0) return null;
    const groups = groupRecordingsByPeriod(groupClients);
    const noScheduled = groupClients.filter((c) => !c.next_recording_date);

    return (
      <div key={label} className="space-y-4">
        {/* Category header */}
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
            label === "Acelerador"
              ? "bg-primary/10 text-primary"
              : "bg-amber-100 text-amber-700"
          )}>
            {label}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {group.label}
            </p>
            <div className="rounded-xl border border-border bg-white divide-y divide-border overflow-hidden shadow-sm">
              {group.items.map(({ client, date }) => (
                <RecRow
                  key={client.id}
                  client={client}
                  date={date}
                  editingId={editingId}
                  editDate={editDate}
                  editTime={editTime}
                  setEditingId={setEditingId}
                  setEditDate={setEditDate}
                  setEditTime={setEditTime}
                  setDeleteTarget={setDeleteTarget}
                  updateRecording={updateRecording}
                  sendNotification={sendNotification}
                />
              ))}
            </div>
          </div>
        ))}

        {noScheduled.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Sem data agendada</p>
            <div className="rounded-xl border border-dashed border-border bg-white/60 divide-y divide-border overflow-hidden">
              {noScheduled.map((client) => {
                const lastDate = client.last_recording_date ? parseISO(client.last_recording_date) : null;
                const earliest = calcEarliestNext(client);
                const ready = earliest ? isPast(earliest) || isToday(earliest) : !lastDate;
                return (
                  <div key={client.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-gray-500">{client.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {lastDate ? `Última: ${format(lastDate, "dd/MM/yyyy", { locale: ptBR })}` : "Nunca gravou"}
                      </p>
                    </div>
                    {ready
                      ? <Badge className="bg-green-500 text-white text-xs shrink-0">Pronto</Badge>
                      : earliest && (
                          <Badge variant="outline" className="text-xs shrink-0 text-amber-600 border-amber-300">
                            {format(earliest, "dd/MM", { locale: ptBR })}
                          </Badge>
                        )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {groups.length === 0 && noScheduled.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum cliente nesta categoria</p>
        )}
      </div>
    );
  };

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <CalendarCheck className="w-12 h-12 opacity-30" />
        <p className="text-sm">Nenhuma gravação agendada</p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-8">
        {renderGroup("Acelerador", aceleradorClients)}
        {renderGroup("Start Line", startLineClients)}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover a gravação agendada de <strong>{deleteTarget?.name}</strong>?
              A data da última gravação não será alterada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await updateRecording.mutateAsync({ id: deleteTarget.id, next_recording_date: null });
                  toast.success(`Agendamento de ${deleteTarget.name} removido`);
                  setDeleteTarget(null);
                } catch { toast.error("Erro ao remover agendamento"); }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// RecRow extracted to avoid repetition
function RecRow({ client, date, editingId, editDate, editTime, setEditingId, setEditDate, setEditTime, setDeleteTarget, updateRecording, sendNotification }: any) {
  const lastDate = client.last_recording_date ? parseISO(client.last_recording_date) : null;
  const isEditing = editingId === client.id;

  const handleSaveEdit = async () => {
    if (!editDate) return;
    try {
      await updateRecording.mutateAsync({
        id: client.id,
        next_recording_date: format(editDate, "yyyy-MM-dd"),
        recording_time: editTime || null,
      });
      toast.success("Data atualizada!");
      setEditingId(null);
      setEditDate(undefined);
      setEditTime("");
    } catch { toast.error("Erro ao atualizar data"); }
  };

  const handleNotify = async () => {
    if (!client.email) { toast.error("Este cliente não tem e-mail cadastrado"); return; }
    try {
      await sendNotification.mutateAsync(client.id);
      toast.success(`E-mail enviado para ${client.name}!`);
    } catch (e: any) { toast.error(e?.message || "Erro ao enviar e-mail"); }
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-red-600">{client.name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{client.name}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {lastDate ? `Última: ${format(lastDate, "dd/MM/yyyy", { locale: ptBR })}` : "Sem registro anterior"}
            </p>
            {client.recording_time && (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> {client.recording_time}
              </span>
            )}
          </div>
        </div>
        <RecStatusBadge date={date} />
        <div className="flex items-center gap-1 shrink-0">
          <Popover open={isEditing} onOpenChange={(open) => {
            if (!open) { setEditingId(null); setEditDate(undefined); setEditTime(""); }
            else { setEditingId(client.id); setEditDate(date); setEditTime(client.recording_time ?? ""); }
          }}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Alterar data e horário</p>
              <CalendarPicker
                mode="single"
                selected={editDate}
                onSelect={setEditDate}
                locale={ptBR}
                className="rounded-lg border pointer-events-auto"
                disabled={(d) => isBlockedDay(d)}
              />
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="flex-1 border border-input rounded-md px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleSaveEdit} disabled={!editDate || updateRecording.isPending}>
                  <Check className="w-3 h-3 mr-1" /> Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditDate(undefined); setEditTime(""); }}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-blue-600"
            title={client.email ? `Notificar ${client.email}` : "Sem e-mail cadastrado"}
            disabled={sendNotification.isPending}
            onClick={handleNotify}
          >
            <Mail className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-red-600"
            onClick={() => setDeleteTarget(client)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Meet tab ──────────────────────────────────────────────────────

function MeetTab({ clients }: { clients: Client[] }) {
  const clientsWithEmail = clients.filter((c) => c.email);

  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [extraEmails, setExtraEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [title, setTitle] = useState("");
  const [sending, setSending] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const selectedClient = clientsWithEmail.find((c) => c.id === selectedClientId) ?? null;

  function addEmail() {
    const e = emailInput.trim().toLowerCase();
    if (!e || extraEmails.includes(e)) return;
    if (!/\S+@\S+\.\S+/.test(e)) { toast.error("E-mail inválido"); return; }
    setExtraEmails((prev) => [...prev, e]);
    setEmailInput("");
  }

  function buildCalendarUrl(): string {
    if (!date || !selectedClient) return "";
    const [h, m] = time.split(":").map(Number);
    const start = new Date(date);
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + Number(duration) * 60 * 1000);

    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const meetTitle = title.trim() || `Reunião DigiTown — ${selectedClient.name}`;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: meetTitle,
      dates: `${fmt(start)}/${fmt(end)}`,
      details: `Reunião agendada pela plataforma DigiTown.\n\nCliente: ${selectedClient.name}`,
      crm: "AVAILABLE",
    });

    const allEmails = [selectedClient.email!, ...extraEmails].filter(Boolean);
    let url = `https://calendar.google.com/calendar/render?${params.toString()}`;
    for (const email of allEmails) url += `&add=${encodeURIComponent(email)}`;
    return url;
  }

  async function createMeetingFolder() {
    if (!selectedClient || !date) return;
    const folderName = `REUNIÃO → ${format(date, "dd/MM/yyyy")}`;
    try {
      await api.post(`/cidade/${selectedClient.id}/folders`, { name: folderName });
    } catch {
      // não bloqueia a ação principal se falhar
    }
  }

  async function handleOpenCalendar() {
    const url = buildCalendarUrl();
    if (!url) { toast.error("Selecione um cliente e uma data"); return; }
    await createMeetingFolder();
    window.open(url, "_blank");
    toast.success("Pasta criada nos docs do cliente!");
  }

  async function handleSendEmail() {
    if (!selectedClient || !date) { toast.error("Selecione um cliente e uma data"); return; }
    setSending(true);
    try {
      await Promise.all([
        api.post("/cidade/schedule-meet", {
          clientId: selectedClient.id,
          extraEmails,
          meetingTitle: title.trim() || `Reunião DigiTown — ${selectedClient.name}`,
          date: format(date, "dd/MM/yyyy", { locale: ptBR }),
          time,
          duration: Number(duration),
        }),
        createMeetingFolder(),
      ]);
      toast.success(`Convite enviado e pasta criada nos docs de ${selectedClient.name}!`);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar convite");
    } finally {
      setSending(false);
    }
  }

  const canSchedule = !!selectedClient && !!date;

  return (
    <div className="max-w-xl mx-auto space-y-5">

      {/* Header card */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Video className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-foreground">Agendar Reunião no Google Meet</h2>
            <p className="text-xs text-muted-foreground">Cria um evento no Google Calendar com link do Meet e envia convite por e-mail</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm space-y-4">

        {/* Client selector */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Cliente *
          </label>
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecionar cliente..." />
            </SelectTrigger>
            <SelectContent>
              {clientsWithEmail.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  Nenhum cliente com e-mail cadastrado
                </div>
              )}
              {/* Group by package */}
              {["acelerador", "start_line"].map((pkg) => {
                const group = clientsWithEmail.filter((c) => c.package === pkg);
                if (!group.length) return null;
                return (
                  <div key={pkg}>
                    <p className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {pkg === "acelerador" ? "Acelerador" : "Start Line"}
                    </p>
                    {group.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex flex-col">
                          <span>{c.name}</span>
                          <span className="text-[11px] text-muted-foreground">{c.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                );
              })}
            </SelectContent>
          </Select>
          {selectedClient && (
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="w-3 h-3" /> {selectedClient.email}
            </p>
          )}
        </div>

        {/* Extra emails */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Convidar mais e-mails
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
              placeholder="outro@email.com"
              className="flex-1 border border-input rounded-md px-3 py-2 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button type="button" variant="outline" size="icon" onClick={addEmail}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {extraEmails.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {extraEmails.map((e) => (
                <span key={e} className="flex items-center gap-1 bg-muted text-xs px-2 py-1 rounded-full">
                  {e}
                  <button type="button" onClick={() => setExtraEmails((prev) => prev.filter((x) => x !== e))}>
                    <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Date + Time + Duration */}
        <div className="grid grid-cols-2 gap-3">
          {/* Date picker */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Data *
            </label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal text-sm", !date && "text-muted-foreground")}
                >
                  <Calendar className="w-3.5 h-3.5 mr-2" />
                  {date ? format(date, "dd/MM/yyyy") : "Escolher data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarPicker
                  mode="single"
                  selected={date}
                  onSelect={(d) => { setDate(d); setCalendarOpen(false); }}
                  locale={ptBR}
                  disabled={(d) => isPast(d) && !isToday(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Horário *
            </label>
            <div className="flex items-center gap-2 border border-input rounded-md px-3 bg-background h-9">
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="flex-1 text-sm bg-transparent focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Duration + Title */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Duração
            </label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="45">45 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1h 30min</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Assunto (opcional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={selectedClient ? `Reunião — ${selectedClient.name}` : "Título da reunião"}
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2"
            disabled={!canSchedule}
            onClick={handleOpenCalendar}
          >
            <ExternalLink className="w-4 h-4" />
            Abrir no Google Calendar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2"
            disabled={!canSchedule || sending}
            onClick={handleSendEmail}
          >
            {sending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
            {sending ? "Enviando..." : "Enviar convite por e-mail"}
          </Button>
        </div>

        {canSchedule && (
          <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 leading-relaxed">
            <strong>Como funciona:</strong> "Abrir no Google Calendar" abre um evento pré-preenchido com o e-mail do cliente como convidado.
            O Google Calendar gera o link do Meet automaticamente ao salvar.
            "Enviar convite" manda um e-mail de confirmação com os detalhes da reunião.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Clients grid with categories ──────────────────────────────────

function ClientsTab({
  allClients,
  selectedClientId,
  onClientClick,
}: {
  allClients: Client[];
  selectedClientId: string | null;
  onClientClick: (c: Client) => void;
}) {
  const acelerador = allClients.filter((c) => c.package === "acelerador");
  const startLine  = allClients.filter((c) => c.package === "start_line");
  const others     = allClients.filter((c) => !c.package);

  const renderSection = (label: string, color: string, clients: Client[], slots: number) => {
    if (clients.length === 0 && label !== "Acelerador" && label !== "Start Line") return null;
    const grid: (Client | undefined)[] = Array(slots).fill(undefined);
    clients.forEach((c, i) => { if (i < slots) grid[i] = c; });

    return (
      <div key={label} className="mb-8">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold", color)}>
            {label}
            <span className="opacity-60">· {clients.length} cliente{clients.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex-1 h-px bg-border" />
        </div>

        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">
            Nenhum cliente cadastrado nesta categoria
          </p>
        ) : (
          <div className="grid grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-4 md:gap-5 justify-items-center">
            {grid.map((client, index) => (
              <ClientCircle
                key={client?.id || `${label}-empty-${index}`}
                client={client ? {
                  id: index,
                  name: client.name,
                  image: client.image_url || undefined,
                  lastRecordingDate: client.last_recording_date ? new Date(client.last_recording_date) : undefined,
                } : undefined}
                isSelected={selectedClientId === client?.id}
                onClick={client ? () => onClientClick(client) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {renderSection("Acelerador", "bg-primary/10 text-primary", acelerador, Math.max(acelerador.length, TOTAL_SLOTS))}
      {renderSection("Start Line", "bg-amber-100 text-amber-700", startLine, Math.max(startLine.length, TOTAL_SLOTS))}
      {others.length > 0 && renderSection("Sem categoria", "bg-gray-100 text-gray-600", others, others.length)}

      <div className="mt-6 flex justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-primary/30 bg-white" />
          <span>Cliente cadastrado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-dashed border-muted-foreground/20 bg-muted/30" />
          <span>Vaga disponível</span>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────

const GravacoesAgenda = () => {
  const navigate = useNavigate();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"clientes" | "rec" | "meet">("clientes");
  const { data: allClients, isLoading } = useCidadeClients();
  const notifications = useRecordingNotifications(allClients);

  useEffect(() => {
    api.post("/cidade/check-reminders", {}).catch(() => {});
  }, []);

  const handleClientClick = (client: Client) => {
    setSelectedClientId(client.id);
    setDialogOpen(true);
  };

  // Only acelerador clients have recording dialog
  const selectedClient = allClients?.find((c) => c.id === selectedClientId) ?? null;

  const recCount = allClients?.filter((c) => c.next_recording_date).length ?? 0;

  const tabs: { id: "clientes" | "rec" | "meet"; label: string; icon?: React.ReactNode; badge?: number }[] = [
    { id: "clientes", label: "Clientes" },
    { id: "rec",  label: "REC",  badge: recCount },
    { id: "meet", label: "Meet", icon: <Video className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm">
        <div className="container py-5">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/gravacoes")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>

            {/* Notification bell */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {notifications.length > 9 ? "9+" : notifications.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-semibold text-sm">Notificações de gravação</p>
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhuma notificação</div>
                ) : (
                  <div className="divide-y divide-border max-h-72 overflow-y-auto">
                    {notifications.map((n, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3">
                        {n.type === "today"
                          ? <CalendarCheck className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                          : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                        <p className="text-sm text-foreground leading-snug">
                          {n.type === "today"
                            ? `Hoje tem gravação de ${n.clientName}`
                            : `Período de ${n.clientName} expirou — pronto para nova gravação`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Title + tabs */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground leading-tight">Agenda</h1>
                <p className="text-xs text-muted-foreground">Gravações e reuniões</p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                    activeTab === tab.id ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.icon}
                  {tab.id === "rec" ? <span className="text-red-500 font-bold">REC</span> : tab.label}
                  {tab.badge != null && tab.badge > 0 && (
                    <span className="w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activeTab === "clientes" ? (
          <ClientsTab
            allClients={allClients ?? []}
            selectedClientId={selectedClientId}
            onClientClick={handleClientClick}
          />
        ) : activeTab === "rec" ? (
          <RecTab clients={allClients ?? []} />
        ) : (
          <MeetTab clients={allClients ?? []} />
        )}
      </main>

      <RecordingInfoDialog
        client={selectedClient?.package === "acelerador" ? selectedClient : null}
        open={dialogOpen && selectedClient?.package === "acelerador"}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};

export default GravacoesAgenda;
