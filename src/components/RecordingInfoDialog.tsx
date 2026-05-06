import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useUpdateCidadeClientRecording } from "@/hooks/useClients";
import { addDays, format, differenceInDays, isPast, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Video, Clock, CheckCircle2, Save, CalendarCheck, Timer, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isBlockedDay, nextWorkingDay } from "@/lib/holidays";
import { toast } from "sonner";

interface RecordingClient {
  id: string;
  name: string;
  last_recording_date?: string | null;
  next_recording_date?: string | null;
  recording_time?: string | null;
  reels_per_session?: number | null;
  videos_per_week?: number | null;
}

interface RecordingInfoDialogProps {
  client: RecordingClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RecordingInfoDialog = ({
  client,
  open,
  onOpenChange,
}: RecordingInfoDialogProps) => {
  const [selectedLastDate, setSelectedLastDate] = useState<Date | undefined>(undefined);
  const [selectedNextDate, setSelectedNextDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [editReels, setEditReels] = useState<string>("");
  const [editPerWeek, setEditPerWeek] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const updateClient = useUpdateCidadeClientRecording();

  if (!client) return null;

  const lastRecordingDate = client.last_recording_date
    ? parseISO(client.last_recording_date)
    : undefined;

  const scheduledNextDate = client.next_recording_date
    ? parseISO(client.next_recording_date)
    : undefined;

  const scheduledTime = client.recording_time ?? null;
  const reelsPerSession = client.reels_per_session ?? null;
  const videosPerWeek = client.videos_per_week ?? null;

  // Calculate earliest allowed next recording based on reels/week cadence
  // Result is pushed forward to the next working day (skips weekends + holidays)
  const calculateEarliestNext = (lastDate?: Date): Date | null => {
    if (!lastDate) return null;
    let raw: Date;
    if (reelsPerSession && videosPerWeek && videosPerWeek > 0) {
      const contentDays = Math.ceil((reelsPerSession / videosPerWeek) * 7);
      const notifyDays = Math.max(contentDays - 30, 1);
      raw = addDays(lastDate, notifyDays);
    } else {
      // fallback: 2 months + 15 days
      raw = addDays(lastDate, 75);
    }
    return nextWorkingDay(raw);
  };

  const earliestNext = calculateEarliestNext(lastRecordingDate);
  const daysUntilAllowed = earliestNext ? differenceInDays(earliestNext, new Date()) : 0;
  const isReady = !lastRecordingDate || (earliestNext && (isPast(earliestNext) || isToday(earliestNext)));

  // Last video date = last_recording_date + content days
  const lastVideoDate = lastRecordingDate && reelsPerSession && videosPerWeek && videosPerWeek > 0
    ? addDays(lastRecordingDate, Math.ceil((reelsPerSession / videosPerWeek) * 7))
    : null;

  const handleSaveSettings = async () => {
    const reels = editReels ? parseInt(editReels) : null;
    const perWeek = editPerWeek ? parseInt(editPerWeek) : null;
    if (reels !== null && isNaN(reels)) return;
    if (perWeek !== null && isNaN(perWeek)) return;
    try {
      await updateClient.mutateAsync({
        id: client.id,
        reels_per_session: reels,
        videos_per_week: perWeek,
      });
      toast.success("Configuração salva!");
      setShowSettings(false);
      setEditReels("");
      setEditPerWeek("");
    } catch {
      toast.error("Erro ao salvar configuração");
    }
  };

  const handleSaveLastDate = async () => {
    if (!selectedLastDate) return;
    try {
      await updateClient.mutateAsync({
        id: client.id,
        last_recording_date: format(selectedLastDate, "yyyy-MM-dd"),
      });
      toast.success("Data da última gravação salva!");
      setSelectedLastDate(undefined);
    } catch {
      toast.error("Erro ao salvar data");
    }
  };

  const handleSaveNextDate = async () => {
    if (!selectedNextDate) return;
    try {
      await updateClient.mutateAsync({
        id: client.id,
        next_recording_date: format(selectedNextDate, "yyyy-MM-dd"),
        recording_time: selectedTime || null,
      });
      toast.success("Próxima gravação agendada!");
      setSelectedNextDate(undefined);
      setSelectedTime("");
    } catch {
      toast.error("Erro ao agendar gravação");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setSelectedLastDate(undefined);
        setSelectedNextDate(undefined);
        setSelectedTime("");
        setShowSettings(false);
        setEditReels("");
        setEditPerWeek("");
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-primary">
                {client.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span>{client.name}</span>
          </DialogTitle>
          <DialogDescription>Informações de gravação do cliente</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Status */}
          <div className={cn(
            "p-4 rounded-lg border-2",
            isReady ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
          )}>
            <div className="flex items-center gap-3">
              {isReady
                ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                : <Clock className="w-5 h-5 text-amber-600 shrink-0" />}
              <div>
                <p className="font-semibold text-sm">
                  {isReady ? "Pronto para gravar!" : "Aguardando período"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isReady
                    ? "O cliente já pode realizar nova gravação"
                    : `Faltam ${daysUntilAllowed} dias para próxima gravação permitida`}
                </p>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <CalendarDays className="w-3 h-3" />
                <span className="text-xs">Última gravação</span>
              </div>
              <p className="text-base font-semibold">
                {lastRecordingDate ? format(lastRecordingDate, "dd/MM/yy", { locale: ptBR }) : "—"}
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <CalendarCheck className="w-3 h-3" />
                <span className="text-xs">Próxima agendada</span>
              </div>
              <p className="text-base font-semibold">
                {scheduledNextDate ? format(scheduledNextDate, "dd/MM/yy", { locale: ptBR }) : "—"}
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Timer className="w-3 h-3" />
                <span className="text-xs">Horário agendado</span>
              </div>
              <p className="text-base font-semibold">
                {scheduledTime ?? "—"}
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Video className="w-3 h-3" />
                <span className="text-xs">Reels / semana</span>
              </div>
              <p className="text-base font-semibold">
                {reelsPerSession && videosPerWeek
                  ? `${reelsPerSession} reels · ${videosPerWeek}/sem`
                  : "—"}
              </p>
            </div>
          </div>

          {/* Cadence info: last video date + earliest next */}
          {lastVideoDate && (
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-xs text-muted-foreground mb-0.5">Último vídeo estimado</p>
                <p className="text-sm font-bold text-orange-700">
                  {format(lastVideoDate, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              {earliestNext && (
                <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-0.5">Agendar a partir de</p>
                  <p className="text-sm font-bold text-primary">
                    {format(earliestNext, "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>
          )}
          {!lastVideoDate && earliestNext && (
            <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-xs text-muted-foreground mb-0.5">Próxima gravação permitida a partir de</p>
              <p className="text-base font-bold text-primary">
                {format(earliestNext, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          )}

          {/* Settings: reels/week config */}
          <div className="rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => {
                setShowSettings((s) => !s);
                if (!showSettings) {
                  setEditReels(String(reelsPerSession ?? ""));
                  setEditPerWeek(String(videosPerWeek ?? ""));
                }
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5" />
                Configurar cadência de postagem
              </span>
              <span className="text-xs">{showSettings ? "▲" : "▼"}</span>
            </button>
            {showSettings && (
              <div className="px-3 pb-3 pt-1 border-t border-border space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Reels por sessão</label>
                    <input
                      type="number" min="1" value={editReels}
                      onChange={(e) => setEditReels(e.target.value)}
                      placeholder="ex: 20"
                      className="w-full border border-input rounded-md px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Vídeos por semana</label>
                    <input
                      type="number" min="1" value={editPerWeek}
                      onChange={(e) => setEditPerWeek(e.target.value)}
                      placeholder="ex: 2"
                      className="w-full border border-input rounded-md px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                {editReels && editPerWeek && Number(editPerWeek) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {Math.ceil((Number(editReels) / Number(editPerWeek)) * 7)} dias de conteúdo →
                    agendamento libera {Math.max(Math.ceil((Number(editReels) / Number(editPerWeek)) * 7) - 30, 1)} dias após a gravação
                  </p>
                )}
                <Button size="sm" className="w-full" onClick={handleSaveSettings} disabled={updateClient.isPending}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Salvar cadência
                </Button>
              </div>
            )}
          </div>

          <hr className="border-border" />

          {/* Section 1: Set last recording date */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Registrar data da última gravação</p>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedLastDate}
                onSelect={setSelectedLastDate}
                locale={ptBR}
                className="rounded-lg border pointer-events-auto"
                disabled={(date) => date > new Date() || isBlockedDay(date)}
              />
            </div>
            {selectedLastDate && (
              <Button
                onClick={handleSaveLastDate}
                className="w-full"
                disabled={updateClient.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar: {format(selectedLastDate, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            )}
          </div>

          <hr className="border-border" />

          {/* Section 2: Schedule next recording */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Agendar próxima gravação</p>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedNextDate}
                onSelect={setSelectedNextDate}
                locale={ptBR}
                className="rounded-lg border pointer-events-auto"
                disabled={(date) => {
                  if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
                  if (earliestNext && date < earliestNext) return true;
                  if (isBlockedDay(date)) return true;
                  return false;
                }}
              />
            </div>

            {/* Time picker */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                <Timer className="w-4 h-4" />
                Horário
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="flex-1 border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              />
              {selectedTime && (
                <button
                  onClick={() => setSelectedTime("")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>

            {selectedNextDate && (
              <Button
                onClick={handleSaveNextDate}
                variant="secondary"
                className="w-full"
                disabled={updateClient.isPending}
              >
                <CalendarCheck className="w-4 h-4 mr-2" />
                Agendar: {format(selectedNextDate, "dd/MM/yyyy", { locale: ptBR })}
                {selectedTime && ` às ${selectedTime}`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
