import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Zap, Users, CheckCircle2, XCircle, LogIn } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCrmStats, useProvisionCrm, useImpersonateCrm, CrmStage } from "@/hooks/useCrm";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCrmAuth } from "@/store/crmAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const OWNER_EMAIL = "gustavosaforti@gmail.com";


interface CrmTabProps {
  clientId: string;
  clientName: string;
}

function StageBar({ stage, total }: { stage: CrmStage; total: number }) {
  const pct = total > 0 ? Math.round((stage.count / total) * 100) : 0;
  const color = stage.isWon
    ? "#22c55e"
    : stage.isLost
    ? "#ef4444"
    : "hsl(var(--primary))";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground truncate max-w-[160px]">{stage.name}</span>
        <span className="font-medium" style={{ color }}>
          {stage.count}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function CrmTab({ clientId, clientName }: CrmTabProps) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthContext();
  const isOwner = user?.email === OWNER_EMAIL;
  const canProvision = isOwner || isAdmin;

  const { data: crm, isLoading } = useCrmStats(clientId);
  const provision = useProvisionCrm();
  const impersonate = useImpersonateCrm();
  const { setCrmAuth } = useCrmAuth();

  const handleEnterCrm = async () => {
    const result = await impersonate.mutateAsync(clientId) as any;
    setCrmAuth(result.user, result.token);
    navigate('/trafego/crm/dashboard');
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminName, setAdminName] = useState(clientName);
  const [showForm, setShowForm] = useState(false);
  const [provisionError, setProvisionError] = useState("");

  const handleProvision = async () => {
    setProvisionError("");
    try {
      await provision.mutateAsync({ clientId, adminEmail: email, adminPassword: password, adminName });
      setShowForm(false);
    } catch (err: any) {
      setProvisionError(err?.response?.data?.error || err?.message || "Erro ao ativar CRM");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!crm?.provisioned) {
    return (
      <div className="py-4 space-y-4">
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-3">
            <Zap className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-medium">CRM não ativado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Ative o CRM para gerenciar leads deste cliente
          </p>
        </div>

        {canProvision && !showForm && (
          <div className="flex justify-center">
            <Button onClick={() => setShowForm(true)} size="sm">
              <Zap className="w-4 h-4 mr-2" />
              Ativar CRM
            </Button>
          </div>
        )}

        {canProvision && showForm && (
          <Card className="p-4 space-y-3 max-w-sm mx-auto">
            <p className="text-sm font-medium">Criar acesso do cliente ao CRM</p>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nome do responsável</label>
              <input
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Email de acesso</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Senha inicial</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {provisionError && (
              <p className="text-xs text-destructive">{provisionError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleProvision}
                disabled={provision.isPending || !email || !password}
                className="flex-1"
              >
                {provision.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Confirmar"
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // CRM is active — show stats
  const total = crm.stages.reduce((s, st) => s + st.count, 0);

  return (
    <div className="space-y-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-green-600 bg-green-50 border-green-200">
            CRM Ativo
          </Badge>
          <span className="text-xs text-muted-foreground">@{crm.tenantSlug}</span>
        </div>
        <Button
          size="sm"
          onClick={handleEnterCrm}
          disabled={impersonate.isPending}
          className="h-7 text-xs px-3"
        >
          {impersonate.isPending
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <><LogIn className="w-3 h-3 mr-1" />Entrar no CRM</>
          }
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-xl font-bold">{crm.leadsActive}</p>
          <p className="text-xs text-muted-foreground">Leads ativos</p>
        </Card>
        <Card className="p-3 text-center">
          <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-green-600">
            {crm.stages.find((s) => s.isWon)?.count ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">Fechados</p>
        </Card>
        <Card className="p-3 text-center">
          <XCircle className="w-4 h-4 text-red-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-red-500">
            {crm.stages.find((s) => s.isLost)?.count ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">Perdidos</p>
        </Card>
      </div>

      {/* Pipeline stages */}
      <Card className="p-4 space-y-3">
        <p className="text-sm font-medium">Pipeline</p>
        {crm.stages.map((stage) => (
          <StageBar key={stage.id} stage={stage} total={total} />
        ))}
      </Card>

      {/* Recent leads */}
      {crm.recentLeads.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-medium mb-3">Leads recentes</p>
          <div className="space-y-2">
            {crm.recentLeads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.phone}</p>
                </div>
                <div className="text-right">
                  <Badge
                    variant="secondary"
                    className={
                      lead.stage.isWon
                        ? "text-green-600 bg-green-50"
                        : lead.stage.isLost
                        ? "text-red-500 bg-red-50"
                        : ""
                    }
                  >
                    {lead.stage.name}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(lead.createdAt), "dd/MM/yy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
