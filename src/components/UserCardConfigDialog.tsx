import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, LayoutGrid } from "lucide-react";
import { useUserBlockedCards, useSetUserBlockedCards } from "@/hooks/useCardPermissions";
import { toast } from "sonner";

export const ALL_CARDS = [
  { id: "trafego",    label: "Tráfego",    description: "Dashboard de leads e métricas",  adminOnly: false, roles: ["employee", "client"] },
  { id: "cidade",     label: "Cidade",      description: "Dashboard de clientes",           adminOnly: false, roles: ["employee", "client"] },
  { id: "tarefas",    label: "Tarefas",     description: "Gestão de projetos e equipe",     adminOnly: false, roles: ["employee"] },
  { id: "financeiro", label: "Financeiro",  description: "MRR, contratos e faturamento",   adminOnly: true,  roles: ["employee"] },
  { id: "gravacoes",  label: "Agenda",      description: "Agenda e postagens",              adminOnly: false, roles: ["client", "employee"] },
  { id: "inbox",      label: "Mensagens",   description: "Chat interno da equipe",          adminOnly: false, roles: ["client", "employee"] },
];

const defaultVisible = (): Record<string, boolean> =>
  Object.fromEntries(ALL_CARDS.map(c => [c.id, true]));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userIsAdmin: boolean;
  userRoles?: string[];
}

export function UserCardConfigDialog({ open, onOpenChange, userId, userName, userIsAdmin, userRoles = [] }: Props) {
  const { data, isLoading } = useUserBlockedCards(userId);
  const save = useSetUserBlockedCards();

  // Initialize all as visible — overridden once fetch resolves
  const [visible, setVisible] = useState<Record<string, boolean>>(defaultVisible);

  useEffect(() => {
    if (!data) return;
    const blocked = new Set(data.blockedCards);
    setVisible(Object.fromEntries(ALL_CARDS.map(c => [c.id, !blocked.has(c.id)])));
  }, [data]);

  // Reset to defaults when dialog closes
  useEffect(() => {
    if (!open) setVisible(defaultVisible);
  }, [open]);

  // Determine the effective role for filtering (client, employee, etc.)
  const isClient = userRoles.includes("client") && !userRoles.includes("employee");

  // Cards available for this user: hide adminOnly for non-admins + hide role-inaccessible cards
  const availableCards = ALL_CARDS.filter(c => {
    if (c.adminOnly && !userIsAdmin) return false;
    // Only show cards the user's role can actually access
    const effectiveRole = isClient ? "client" : "employee";
    if (!c.roles.includes(effectiveRole)) return false;
    return true;
  });

  const toggle = (cardId: string) => {
    setVisible(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const handleSave = async () => {
    // Financeiro is always blocked for non-admins regardless of toggle state
    const blockedCards = ALL_CARDS.filter(c => {
      if (c.adminOnly && !userIsAdmin) return true; // always block admin-only for non-admins
      return visible[c.id] === false;
    }).map(c => c.id);

    try {
      await save.mutateAsync({ userId, blockedCards });
      toast.success(`Permissões de ${userName} atualizadas`);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar permissões");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            Cards visíveis — {userName}
          </DialogTitle>
          <DialogDescription>
            Marque quais seções este usuário pode ver no menu principal.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {availableCards.map(card => (
                <div key={card.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <Checkbox
                    id={`card-${card.id}`}
                    checked={visible[card.id] !== false}
                    onCheckedChange={() => toggle(card.id)}
                    className="mt-0.5"
                  />
                  <Label htmlFor={`card-${card.id}`} className="cursor-pointer flex-1">
                    <p className="text-sm font-medium text-foreground">{card.label}</p>
                    <p className="text-xs text-muted-foreground">{card.description}</p>
                  </Label>
                </div>
              ))}

              {isClient ? (
                <p className="text-xs text-muted-foreground px-1">
                  * Clientes têm acesso padrão a Tráfego, Agenda e Mensagens.
                </p>
              ) : !userIsAdmin ? (
                <p className="text-xs text-muted-foreground px-1">
                  * Financeiro requer role de Admin — não disponível para este usuário.
                </p>
              ) : null}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={save.isPending || isLoading}>
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
