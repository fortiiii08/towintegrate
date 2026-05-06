import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { addCalendarDays, addBusinessDays, toInputDate, formatDate } from "@/lib/dateUtils";
import { buildDisabledMatcher } from "@/lib/brazilianHolidays";
import { CalendarDays, Lock, Send, CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const disabledDays = buildDisabledMatcher();

interface Milestone {
  assinaturaCliente?: string | null;
  primeiroPagamento?: string | null;
  reuniaoBriefing?: string | null;
  materialDrive?: string | null;
  acessoRedes?: string | null;
  entregaRoteiro?: string | null;
  dataGravacao?: string | null;
  edicaoFotos?: string | null;
  edicaoVideos?: string | null;
  backup?: string | null;
  analisePerfil?: string | null;
  cronogramaMensal?: string | null;
  google?: string | null;
  landingPage?: string | null;
  linkedin?: string | null;
  trafegoPago?: string | null;
  entregaAprovacaoPosts?: string | null;
  solicitacoesAlteracoes?: string | null;
  primeiraPostagemFeed?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  clientEmail?: string | null;
}

function calcDates(form: Milestone): Partial<Milestone> {
  const calc: Partial<Milestone> = {};

  const briefing = form.reuniaoBriefing ? new Date(form.reuniaoBriefing) : null;
  if (briefing) {
    calc.materialDrive  = toInputDate(addCalendarDays(briefing, 7));
    calc.acessoRedes    = toInputDate(addCalendarDays(briefing, 7));
    calc.entregaRoteiro = toInputDate(addCalendarDays(briefing, 5));
    calc.analisePerfil  = toInputDate(addCalendarDays(briefing, 15));
    calc.cronogramaMensal = toInputDate(addCalendarDays(briefing, 15));
    calc.google         = toInputDate(addCalendarDays(briefing, 20));
    calc.landingPage    = toInputDate(addCalendarDays(briefing, 30));
    calc.linkedin       = toInputDate(addCalendarDays(briefing, 15));
    calc.trafegoPago    = toInputDate(addCalendarDays(briefing, 14));
  }

  const gravacao = form.dataGravacao ? new Date(form.dataGravacao) : null;
  if (gravacao) {
    const fimFotos  = addBusinessDays(gravacao, 15);
    const fimVideos = addBusinessDays(gravacao, 5);
    calc.edicaoFotos  = toInputDate(fimFotos);
    calc.edicaoVideos = toInputDate(fimVideos);
    calc.backup       = toInputDate(addCalendarDays(gravacao, 1));

    // "fim das edições" = maior entre fotos e vídeos (fotos: 15 úteis)
    const fimEdicoes = fimFotos;
    calc.primeiraPostagemFeed   = toInputDate(addBusinessDays(fimEdicoes, 3));
    calc.entregaAprovacaoPosts  = toInputDate(addBusinessDays(fimEdicoes, 21));
    const entregaAprov = addBusinessDays(fimEdicoes, 21);
    calc.solicitacoesAlteracoes = toInputDate(addCalendarDays(entregaAprov, 1));
  }

  return calc;
}

const MANUAL_FIELDS: { key: keyof Milestone; label: string }[] = [
  { key: "assinaturaCliente", label: "Assinatura do cliente" },
  { key: "primeiroPagamento",  label: "Primeiro pagamento" },
  { key: "reuniaoBriefing",    label: "Reunião de Briefing" },
  { key: "dataGravacao",       label: "Data de gravação" },
];

const AUTO_FIELDS: { key: keyof Milestone; label: string; internal?: boolean }[] = [
  { key: "materialDrive",          label: "Material visual no Drive",        },
  { key: "acessoRedes",            label: "Acesso às redes sociais",         },
  { key: "entregaRoteiro",         label: "Entrega dos roteiros",            },
  { key: "analisePerfil",          label: "Análise de perfil",               },
  { key: "cronogramaMensal",       label: "Cronograma mensal",               },
  { key: "google",                 label: "Google Meu Negócio",              },
  { key: "landingPage",            label: "Landing Page",                    },
  { key: "linkedin",               label: "Postagem no LinkedIn",            },
  { key: "trafegoPago",            label: "Tráfego pago",                    },
  { key: "edicaoFotos",            label: "Edição de fotos",       internal: true },
  { key: "edicaoVideos",           label: "Edição de vídeos",      internal: true },
  { key: "backup",                 label: "Backup",                internal: true },
  { key: "entregaAprovacaoPosts",  label: "Entrega para aprovação dos posts" },
  { key: "solicitacoesAlteracoes", label: "Solicitações de alterações"       },
  { key: "primeiraPostagemFeed",   label: "Primeira postagem do feed"        },
];

export function CidadeClientMilestoneForm({ open, onClose, clientId, clientName, clientEmail }: Props) {
  const queryClient = useQueryClient();

  const { data: saved } = useQuery({
    queryKey: ["cidade-milestone", clientId],
    queryFn: () => api.get<Milestone | null>(`/cidade/${clientId}/milestone`),
    enabled: open,
  });

  const empty: Milestone = {
    assinaturaCliente: "", primeiroPagamento: "", reuniaoBriefing: "", dataGravacao: "",
    materialDrive: "", acessoRedes: "", entregaRoteiro: "", edicaoFotos: "", edicaoVideos: "",
    backup: "", analisePerfil: "", cronogramaMensal: "", google: "", landingPage: "",
    linkedin: "", trafegoPago: "", entregaAprovacaoPosts: "", solicitacoesAlteracoes: "",
    primeiraPostagemFeed: "",
  };

  const [form, setForm] = useState<Milestone>(empty);

  useEffect(() => {
    if (saved) {
      const normalized = Object.fromEntries(
        Object.entries(saved).map(([k, v]) => [k, v ? toInputDate(new Date(v as string)) : ""])
      ) as Milestone;
      setForm(normalized);
    } else if (saved === null) {
      setForm(empty);
    }
  }, [saved]);

  // Re-calculate auto fields whenever manual inputs change
  const auto = calcDates(form);

  const saveMutation = useMutation({
    mutationFn: (data: Milestone) => api.put(`/cidade/${clientId}/milestone`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cidade-milestone", clientId] });
      toast.success("Marcos salvos!");
    },
    onError: () => toast.error("Erro ao salvar marcos"),
  });

  const emailMutation = useMutation({
    mutationFn: () => api.post(`/cidade/${clientId}/milestone/send-email`),
    onSuccess: () => toast.success(`Email enviado para ${clientEmail}!`),
    onError: (err: Error) => toast.error(err.message || "Erro ao enviar email"),
  });

  const handleSave = () => {
    saveMutation.mutate({ ...form, ...auto });
  };

  const handleSaveAndSend = async () => {
    await saveMutation.mutateAsync({ ...form, ...auto });
    emailMutation.mutate();
  };

  const setManual = (key: keyof Milestone, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg bg-white border-gray-200 text-gray-900 overflow-y-auto"
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#407b75]" />
            Marcos do cliente
          </SheetTitle>
          <SheetDescription className="text-gray-500">{clientName}</SheetDescription>
        </SheetHeader>

        {/* Manual inputs */}
        <div className="mb-6">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Datas manuais</p>
          <div className="space-y-3">
            {MANUAL_FIELDS.map(({ key, label }) => {
              const rawVal = form[key] ?? "";
              const dateVal = rawVal ? (() => { try { return parseISO(rawVal); } catch { return undefined; } })() : undefined;
              return (
                <div key={key}>
                  <label className="text-gray-600 text-xs mb-1 block">{label}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white border-gray-200 hover:bg-gray-50",
                          dateVal ? "text-gray-900" : "text-gray-400"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        {dateVal ? format(dateVal, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border-gray-200 shadow-lg" align="start">
                      <Calendar
                        mode="single"
                        selected={dateVal}
                        onSelect={(d) => setManual(key, d ? toInputDate(d) : "")}
                        locale={ptBR}
                        disabled={disabledDays}
                        initialFocus
                        className="pointer-events-auto [&_.rdp-day_button:disabled]:opacity-30 [&_.rdp-day_button:disabled]:cursor-not-allowed"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              );
            })}
          </div>
        </div>

        {/* Auto-calculated fields */}
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Calculadas automaticamente
          </p>
          <div className="space-y-2">
            {AUTO_FIELDS.map(({ key, label, internal }) => {
              const value = auto[key] ?? form[key];
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                    internal
                      ? "bg-gray-50 border border-gray-100"
                      : "bg-[#407b75]/5 border border-[#407b75]/10"
                  }`}
                >
                  <span className={`text-sm ${internal ? "text-gray-400 italic" : "text-gray-600"}`}>
                    {internal ? `# ${label}` : label}
                  </span>
                  <span className="text-sm font-semibold text-[#407b75]">
                    {value ? formatDate(new Date(value)) : <span className="text-gray-300">aguardando...</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 space-y-2">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || emailMutation.isPending}
              className="flex-1 bg-[#407b75] hover:bg-[#356862] text-white"
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
          {clientEmail && (
            <Button
              onClick={handleSaveAndSend}
              disabled={saveMutation.isPending || emailMutation.isPending}
              className="w-full bg-[#9b3515] hover:bg-[#7d2b10] text-white gap-2"
            >
              <Send className="w-4 h-4" />
              {emailMutation.isPending ? "Enviando..." : `Salvar e enviar para ${clientEmail}`}
            </Button>
          )}
          {!clientEmail && (
            <p className="text-gray-400 text-xs text-center">
              Adicione o email do cliente para habilitar o envio automático.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
