import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Building2, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Status, useCreateTask, useEmployees } from "@/hooks/useTasks";
import { buildDisabledMatcher } from "@/lib/brazilianHolidays";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string | null;
  statuses: Status[];
  onSuccess: () => void;
}

const priorityOptions = [
  { value: "urgent", label: "Urgente", color: "bg-red-500" },
  { value: "high",   label: "Alta",    color: "bg-orange-400" },
  { value: "normal", label: "Normal",  color: "bg-blue-400" },
  { value: "low",    label: "Baixa",   color: "bg-gray-400" },
];

const disabledDays = buildDisabledMatcher();

export function CreateTaskDialog({ open, onOpenChange, listId, statuses, onSuccess }: CreateTaskDialogProps) {
  const { isAdmin, user, profile } = useAuthContext();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState<string>("");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneeName, setAssigneeName] = useState("");
  const [cidadeClientId, setCidadeClientId] = useState<string>("");

  const createTask = useCreateTask();
  const { data: employees = [] } = useEmployees();
  const { data: cidadeClients = [] } = useQuery({
    queryKey: ["cidade-clients-simple"],
    queryFn: () => api.get<{ id: string; name: string }[]>("/cidade"),
  });

  // For non-admin users, always self-assign
  useEffect(() => {
    if (!isAdmin && user && profile) {
      setAssigneeId(user.id);
      setAssigneeName(profile.name);
    }
  }, [isAdmin, user, profile]);

  const reset = () => {
    setTitle(""); setDescription(""); setStatusId(""); setPriority("normal");
    setDueDate(undefined); setCidadeClientId("");
    if (!isAdmin && user && profile) {
      setAssigneeId(user.id);
      setAssigneeName(profile.name);
    } else {
      setAssigneeId(""); setAssigneeName("");
    }
  };

  const handleAssigneeChange = (userId: string) => {
    const employee = employees.find((e) => e.user_id === userId);
    setAssigneeId(userId);
    setAssigneeName(employee?.name || "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !listId) return;

    createTask.mutate(
      {
        title,
        list_id: listId,
        status_id: statusId || undefined,
        cidade_client_id: cidadeClientId || null,
        description: description || undefined,
        priority: priority as "urgent" | "high" | "normal" | "low",
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
        assignee_id: assigneeId || undefined,
        assignee_name: assigneeName || undefined,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
          onSuccess();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O que precisa ser feito?"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600">Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione mais detalhes..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600">Status</Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600">Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${o.color}`} />
                        {o.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due date */}
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600">Prazo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    locale={ptBR}
                    initialFocus
                    disabled={disabledDays}
                    className="pointer-events-auto [&_.rdp-day_button:disabled]:opacity-20 [&_.rdp-day_button:disabled]:cursor-not-allowed"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-600">Responsável</Label>
              {isAdmin ? (
                <Select value={assigneeId} onValueChange={handleAssigneeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.user_id} value={emp.user_id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px] bg-[#407b75] text-white">
                              {emp.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {emp.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-gray-200 bg-gray-50">
                  <div className="w-5 h-5 rounded-full bg-[#407b75]/15 flex items-center justify-center">
                    <User className="w-3 h-3 text-[#407b75]" />
                  </div>
                  <span className="text-sm text-gray-700">{profile?.name || "Você"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cliente Cidade */}
          <div className="space-y-1.5">
            <Label className="text-sm text-gray-600 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Cliente (Cidade)
            </Label>
            <Select value={cidadeClientId} onValueChange={setCidadeClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Vincular a um cliente..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground">Sem cliente</span>
                </SelectItem>
                {cidadeClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || createTask.isPending} className="bg-[#407b75] hover:bg-[#356862] text-white">
              {createTask.isPending ? "Criando..." : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
