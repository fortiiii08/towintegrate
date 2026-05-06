import { useState } from "react";
import { Search, UserPlus, X, Crown, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useWorkspaceMembers,
  useAddWorkspaceMember,
  useRemoveWorkspaceMember,
  useEmployees,
} from "@/hooks/useTasks";
import { useAuthContext } from "@/contexts/AuthContext";

interface Props {
  workspaceId: string | null;
  workspaceName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Dono",
  admin: "Admin",
  member: "Membro",
  guest: "Convidado",
};

export function WorkspaceMembersDialog({ workspaceId, workspaceName, open, onOpenChange }: Props) {
  const { profile } = useAuthContext();
  const [search, setSearch] = useState("");

  const { data: members = [] } = useWorkspaceMembers(open ? workspaceId : null);
  const { data: employees = [] } = useEmployees();
  const addMember = useAddWorkspaceMember();
  const removeMember = useRemoveWorkspaceMember();

  const memberUserIds = new Set(members.map((m) => m.userId));

  // Employees not yet in workspace, filtered by search
  const eligible = employees.filter(
    (e) =>
      !memberUserIds.has(e.user_id) &&
      (search === "" ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = (userId: string) => {
    if (!workspaceId) return;
    addMember.mutate({ workspaceId, userId });
  };

  const handleRemove = (userId: string) => {
    if (!workspaceId) return;
    removeMember.mutate({ workspaceId, userId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#18182a] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-base">
            Membros do Workspace
            {workspaceName && (
              <span className="text-white/40 font-normal ml-2 text-sm">— {workspaceName}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current members */}
          <div>
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-2">
              Membros Atuais ({members.length})
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#407b75]/20 flex items-center justify-center text-[11px] font-bold text-[#5bbfb5] flex-shrink-0">
                      {m.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{m.userName}</p>
                      <p className="text-[10px] text-white/40 truncate">{m.userEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-white/40 flex items-center gap-1">
                      {m.role === "owner" ? (
                        <><Crown className="w-3 h-3 text-yellow-400" /> {ROLE_LABELS[m.role]}</>
                      ) : (
                        <><User className="w-3 h-3" /> {ROLE_LABELS[m.role] ?? m.role}</>
                      )}
                    </span>
                    {m.role !== "owner" && m.userId !== profile?.id && (
                      <button
                        onClick={() => handleRemove(m.userId)}
                        className="text-white/20 hover:text-red-400 transition-colors"
                        title="Remover membro"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-white/20 text-sm px-3 py-2">Nenhum membro</p>
              )}
            </div>
          </div>

          {/* Add members */}
          <div>
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-2">
              Adicionar Pessoa
            </p>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-8"
              />
            </div>

            <div className="space-y-1 max-h-44 overflow-y-auto">
              {eligible.length === 0 ? (
                <p className="text-white/20 text-sm px-3 py-2">
                  {search ? "Nenhum resultado" : "Todos os funcionários já são membros"}
                </p>
              ) : (
                eligible.map((emp) => (
                  <div
                    key={emp.user_id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold text-white/60 flex-shrink-0">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{emp.name}</p>
                        <p className="text-[10px] text-white/40 truncate">{emp.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAdd(emp.user_id)}
                      disabled={addMember.isPending}
                      className="h-7 px-2 text-[#5bbfb5] hover:text-[#407b75] hover:bg-[#407b75]/10 gap-1 text-xs flex-shrink-0"
                    >
                      <UserPlus className="w-3 h-3" />
                      Adicionar
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
