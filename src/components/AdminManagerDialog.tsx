import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldOff, Loader2, Crown, Trash2, Star, StarOff, LayoutGrid, UserPlus } from "lucide-react";
import { useAdmins, usePromoteAdmin, useRevokeAdmin } from "@/hooks/useAdmins";
import { usePromoteSuperAdmin, useRevokeSuperAdmin, useDeleteUser } from "@/hooks/useCardPermissions";
import { useAuthContext } from "@/contexts/AuthContext";
import { UserCardConfigDialog } from "@/components/UserCardConfigDialog";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OWNER_EMAIL = "gustavosaforti@gmail.com";

export function AdminManagerDialog({ open, onOpenChange }: Props) {
  const { data: users, isLoading } = useAdmins();
  const { user: me, isSecondOwner: iAmSecondOwner } = useAuthContext();
  const isOwner = me?.email === OWNER_EMAIL;

  const promote = usePromoteAdmin();
  const revoke = useRevokeAdmin();
  const promoteSuperAdmin = usePromoteSuperAdmin();
  const revokeSuperAdmin = useRevokeSuperAdmin();
  const deleteUser = useDeleteUser();

  const [cardConfigUser, setCardConfigUser] = useState<{ id: string; name: string; isAdmin: boolean; roles: string[] } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [provisioning, setProvisioning] = useState(false);

  const handlePromote = async (id: string, name: string) => {
    try { await promote.mutateAsync(id); toast.success(`${name} agora é admin`); }
    catch { toast.error("Erro ao promover admin"); }
  };

  const handleRevoke = async (id: string, name: string) => {
    try { await revoke.mutateAsync(id); toast.success(`Admin removido de ${name}`); }
    catch { toast.error("Erro ao remover admin"); }
  };

  const handlePromoteSuperAdmin = async (id: string, name: string) => {
    try { await promoteSuperAdmin.mutateAsync(id); toast.success(`${name} agora é Super Admin`); }
    catch { toast.error("Erro ao promover Super Admin"); }
  };

  const handleRevokeSuperAdmin = async (id: string, name: string) => {
    try { await revokeSuperAdmin.mutateAsync(id); toast.success(`Super Admin removido de ${name}`); }
    catch { toast.error("Erro ao revogar Super Admin"); }
  };

  const handleProvisionClients = async () => {
    setProvisioning(true);
    try {
      const result = await api.post<{ results: { name: string; email: string; status: string }[] }>(
        "/cidade/provision-client-users", {}
      );
      const created = result.results.filter(r => r.status === "criado").length;
      const updated = result.results.filter(r => r.status.includes("link")).length;
      toast.success(`${created} conta(s) criada(s), ${updated} link(s) atualizado(s)`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao provisionar clientes");
    } finally {
      setProvisioning(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.name} foi removido do sistema`);
      setDeleteTarget(null);
    } catch { toast.error("Erro ao remover usuário"); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Gerenciar Usuários
            </DialogTitle>
            <DialogDescription>
              Gerencie permissões, visibilidade de cards e acesso dos membros.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {users?.map((user) => {
                  const isThisOwner = user.email === OWNER_EMAIL;
                  const isMe = user.email === me?.email;

                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30"
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {isThisOwner
                          ? <Crown className="w-4 h-4 text-amber-500" />
                          : user.isSecondOwner
                          ? <Star className="w-4 h-4 text-purple-400" />
                          : <span className="text-sm font-semibold text-primary">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.name} {isMe && <span className="text-xs text-muted-foreground">(você)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                        {isThisOwner ? (
                          <Badge className="bg-amber-500 text-white text-xs">Owner</Badge>
                        ) : user.isSecondOwner ? (
                          <Badge className="bg-purple-500 text-white text-xs">Super Admin</Badge>
                        ) : user.isAdmin ? (
                          <Badge className="bg-primary text-white text-xs">Admin</Badge>
                        ) : null}

                        {/* Card config button (owner + super_admin, not for owner target) */}
                        {!isThisOwner && (isOwner || iAmSecondOwner) && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="Configurar cards visíveis"
                            onClick={() => setCardConfigUser({ id: user.id, name: user.name, isAdmin: user.isAdmin || user.isSecondOwner, roles: user.roles })}
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* Super Admin toggle (owner only, not for themselves) */}
                        {isOwner && !isThisOwner && !isMe && (
                          user.isSecondOwner ? (
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-purple-400 hover:text-purple-600 hover:bg-purple-50"
                              title="Revogar Super Admin"
                              disabled={revokeSuperAdmin.isPending}
                              onClick={() => handleRevokeSuperAdmin(user.id, user.name)}
                            >
                              <StarOff className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-purple-500 hover:bg-purple-50"
                              title="Promover a Super Admin"
                              disabled={promoteSuperAdmin.isPending}
                              onClick={() => handlePromoteSuperAdmin(user.id, user.name)}
                            >
                              <Star className="w-3.5 h-3.5" />
                            </Button>
                          )
                        )}

                        {/* Admin toggle (owner + super_admin, not for owner/super_admin targets) */}
                        {!isThisOwner && !user.isSecondOwner && (isOwner || iAmSecondOwner) && (
                          user.isAdmin ? (
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                              title="Remover admin"
                              disabled={revoke.isPending}
                              onClick={() => handleRevoke(user.id, user.name)}
                            >
                              <ShieldOff className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              title="Promover a admin"
                              disabled={promote.isPending}
                              onClick={() => handlePromote(user.id, user.name)}
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </Button>
                          )
                        )}

                        {/* Delete (owner only, not themselves) */}
                        {isOwner && !isThisOwner && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            title="Remover usuário do sistema"
                            onClick={() => setDeleteTarget({ id: user.id, name: user.name })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-amber-500" /> Owner</span>
              <span className="flex items-center gap-1"><Star className="w-3 h-3 text-purple-400" /> Super Admin</span>
              <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-primary" /> Admin</span>
              <span className="flex items-center gap-1"><LayoutGrid className="w-3 h-3" /> Cards visíveis</span>
            </div>

            {/* Provision client users (owner + super_admin only) */}
            {(isOwner || iAmSecondOwner) && (
              <div className="mt-3 pt-3 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2 text-xs"
                  onClick={handleProvisionClients}
                  disabled={provisioning}
                >
                  {provisioning
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <UserPlus className="w-3.5 h-3.5" />}
                  Criar logins dos clientes (CRM)
                </Button>
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  Cria contas de acesso para clientes com credenciais no CRM
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Card config dialog */}
      {cardConfigUser && (
        <UserCardConfigDialog
          open={!!cardConfigUser}
          onOpenChange={(o) => { if (!o) setCardConfigUser(null); }}
          userId={cardConfigUser.id}
          userName={cardConfigUser.name}
          userIsAdmin={cardConfigUser.isAdmin}
          userRoles={cardConfigUser.roles}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteTarget?.name}</strong> do sistema? Esta ação não pode ser desfeita e todos os dados do usuário serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDelete}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
