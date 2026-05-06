import { useState, useEffect, type ReactNode } from "react";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Client } from "@/hooks/useClients";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { buildDisabledMatcher, getHolidaySet, isNonWorkingDay } from "@/lib/brazilianHolidays";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  MapPin,
  Mail,
  Users,
  Send,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
} from "lucide-react";

interface MapaCidadeDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MilestoneField {
  key: string;
  label: string;
  type: "text" | "date";
  icon?: ReactNode;
}

interface MapaCidadeResponse {
  clientEmail?: string;
  partnerEmail?: string;
  assinaturaCliente?: string;
  primeiroPagamento?: string;
  reuniaoBriefing?: string;
  materialDrive?: string;
  acessoRedes?: string;
  entregaRoteiro?: string;
  dataGravacao?: string;
  primeiraPostagemFeed?: string;
  linkedin?: string;
  trafegoPago?: string;
  analisePerfil?: string;
  cronogramaMensal?: string;
  google?: string;
  landingPage?: string;
}

const MILESTONES: MilestoneField[] = [
  { key: "clientEmail", label: "E-mail do Cliente", type: "text", icon: <Mail className="w-4 h-4" /> },
  { key: "partnerEmail", label: "E-mail do Sócio", type: "text", icon: <Users className="w-4 h-4" /> },
  { key: "assinatura_cliente", label: "Assinatura do Cliente", type: "date" },
  { key: "primeiro_pagamento", label: "Primeiro Pagamento", type: "date" },
  { key: "reuniao_briefing", label: "Reunião de Briefing", type: "date" },
  { key: "material_drive", label: "Disponibilizar material visual no drive", type: "date" },
  { key: "acesso_redes", label: "Acesso às redes sociais", type: "date" },
  { key: "entrega_roteiro", label: "Entrega dos Roteiros", type: "date" },
  { key: "data_gravacao", label: "Data de Gravação", type: "date" },
  { key: "primeira_postagem_feed", label: "Primeira postagem do feed", type: "date" },
  { key: "linkedin", label: "Postagem no LinkedIn", type: "date" },
  { key: "trafego_pago", label: "Tráfego Pago", type: "date" },
  { key: "analise_perfil", label: "Análise de perfil", type: "date" },
  { key: "cronograma_mensal", label: "Cronograma mensal", type: "date" },
  { key: "google", label: "Google Meu Negócio", type: "date" },
  { key: "landing_page", label: "Landing Page", type: "date" },
];

// Map backend camelCase fields to our form keys
const BACKEND_TO_FORM: Record<keyof MapaCidadeResponse, string> = {
  clientEmail: "clientEmail",
  partnerEmail: "partnerEmail",
  assinaturaCliente: "assinatura_cliente",
  primeiroPagamento: "primeiro_pagamento",
  reuniaoBriefing: "reuniao_briefing",
  materialDrive: "material_drive",
  acessoRedes: "acesso_redes",
  entregaRoteiro: "entrega_roteiro",
  dataGravacao: "data_gravacao",
  primeiraPostagemFeed: "primeira_postagem_feed",
  linkedin: "linkedin",
  trafegoPago: "trafego_pago",
  analisePerfil: "analise_perfil",
  cronogramaMensal: "cronograma_mensal",
  google: "google",
  landingPage: "landing_page",
};

export function MapaCidadeDialog({
  client,
  open,
  onOpenChange,
}: MapaCidadeDialogProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (client && open) {
      setLoading(true);

      api
        .get<MapaCidadeResponse>(`/mapa-cidade/${client.id}`)
        .then((data) => {
          if (data) {
            const mapped: Record<string, string> = {};

            Object.entries(BACKEND_TO_FORM).forEach(([backendKey, formKey]) => {
              const typedKey = backendKey as keyof MapaCidadeResponse;
              const val = data[typedKey];

              if (typeof val === "string" && val.trim() !== "") {
                const milestone = MILESTONES.find((m) => m.key === formKey);

                if (milestone?.type === "date") {
                  try {
                    mapped[formKey] = format(parseISO(val), "yyyy-MM-dd");
                  } catch {
                    mapped[formKey] = val;
                  }
                } else {
                  mapped[formKey] = val;
                }
              }
            });

            setFormData(mapped);
          } else {
            setFormData({});
          }
        })
        .catch(() => {
          setFormData({});
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [client, open]);

  if (!client) return null;

  const dateMilestones = MILESTONES.filter((m) => m.type === "date");

  const addBusinessDaysLocal = (start: Date, days: number): Date => {
    const holidays = getHolidaySet(start.getFullYear());
    let current = new Date(start);
    let added = 0;
    while (added < days) {
      current = addDays(current, 1);
      if (!isNonWorkingDay(current, holidays)) added++;
    }
    return current;
  };

  const DATE_KEYS_ORDER = dateMilestones.map((m) => m.key);

  const handleTextChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleDateChange = (key: string, date: Date | undefined) => {
    if (!date) return;

    const dateStr = format(date, "yyyy-MM-dd");
    const keyIndex = DATE_KEYS_ORDER.indexOf(key);

    setFormData((prev) => {
      const updated = { ...prev, [key]: dateStr };

      if (keyIndex >= 0) {
        let lastDate = date;

        for (let i = keyIndex + 1; i < DATE_KEYS_ORDER.length; i++) {
          const nextKey = DATE_KEYS_ORDER[i];

          if (!prev[nextKey] || prev[nextKey].trim() === "") {
            lastDate = addBusinessDaysLocal(lastDate, 1);
            updated[nextKey] = format(lastDate, "yyyy-MM-dd");
          } else {
            const parsed = parseISO(prev[nextKey]);
            if (!isNaN(parsed.getTime())) {
              lastDate = parsed;
            }
          }
        }
      }

      return updated;
    });
  };

  const getDateValue = (key: string): Date | undefined => {
    const val = formData[key];
    if (!val) return undefined;

    const d = parseISO(val);
    return isNaN(d.getTime()) ? undefined : d;
  };

  const filledCount = dateMilestones.filter(
    (m) => formData[m.key] && formData[m.key].trim() !== ""
  ).length;

  const handleSubmit = async () => {
    setSaving(true);

    try {
      await api.post("/mapa-cidade", {
        clientId: client.id,
        ...formData,
      });

      queryClient.invalidateQueries({ queryKey: ["clients"] });

      toast.success("Mapa da Cidade salvo com sucesso!", {
        description: `${filledCount}/${dateMilestones.length} marcos preenchidos para ${client.name}`,
      });

      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao salvar Mapa da Cidade";

      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] p-0 gap-0 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/15 to-accent/10 px-6 py-5 border-b border-border">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <MapPin className="w-7 h-7 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Mapa da Cidade</DialogTitle>
                <DialogDescription className="mt-1">
                  Cronograma de entrega —{" "}
                  <span className="font-semibold text-foreground">
                    {client.name}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${(filledCount / dateMilestones.length) * 100}%` }}
              />
            </div>
            <Badge variant="secondary" className="text-xs font-mono">
              {filledCount}/{dateMilestones.length}
            </Badge>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="px-6 py-5 space-y-1">
              <div className="mb-4">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Nome do Cliente
                </Label>
                <p className="text-lg font-semibold text-foreground mt-1">
                  {client.name}
                </p>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {MILESTONES.filter((m) => m.type === "text").map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-2">
                      {field.icon}
                      {field.label}
                    </Label>
                    <Input
                      type="email"
                      placeholder={`Digite o ${field.label.toLowerCase()}`}
                      value={formData[field.key] || ""}
                      onChange={(e) => handleTextChange(field.key, e.target.value)}
                      className="h-10"
                    />
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">
                Marcos de Entrega
              </Label>

              <div className="space-y-2">
                {dateMilestones.map((field) => {
                  const dateVal = getDateValue(field.key);
                  const isFilled = !!dateVal;

                  return (
                    <div
                      key={field.key}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors",
                        isFilled
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-card hover:bg-muted/50"
                      )}
                    >
                      {isFilled ? (
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
                      )}

                      <span
                        className={cn(
                          "flex-1 text-sm",
                          isFilled
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {field.label}
                      </span>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "w-[160px] justify-start text-left font-normal h-9",
                              !dateVal && "text-muted-foreground"
                            )}
                          >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {dateVal
                              ? format(dateVal, "dd/MM/yyyy", { locale: ptBR })
                              : "Selecionar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={dateVal}
                            onSelect={(d) => handleDateChange(field.key, d)}
                            locale={ptBR}
                            disabled={buildDisabledMatcher()}
                            className="pointer-events-auto [&_.rdp-day_button:disabled]:opacity-20 [&_.rdp-day_button:disabled]:cursor-not-allowed"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}

        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {filledCount === 0
              ? "Nenhum marco preenchido"
              : `${filledCount} marco${filledCount > 1 ? "s" : ""} preenchido${filledCount > 1 ? "s" : ""}`}
          </div>
          <Button onClick={handleSubmit} disabled={saving || loading} className="gap-2">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Salvar Mapa da Cidade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}