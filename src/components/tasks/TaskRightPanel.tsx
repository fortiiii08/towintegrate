import { useState, useEffect } from "react";
import {
  Calendar,
  User,
  Flag,
  MessageSquare,
  CheckSquare,
  Plus,
  Send,
  Building2,
  Lock,
  X,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Task,
  Status,
  useUpdateTask,
  useDeleteTask,
  useSubtasks,
  useCreateSubtask,
  useUpdateSubtask,
  useComments,
  useCreateComment,
  useEmployees,
} from "@/hooks/useTasks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { buildDisabledMatcher } from "@/lib/brazilianHolidays";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";

const OWNER_EMAIL = "gustavosaforti@gmail.com";
const disabledDays = buildDisabledMatcher();

const priorityOptions = [
  { value: "urgent", label: "Urgente", color: "bg-red-500",    text: "text-red-600" },
  { value: "high",   label: "Alta",    color: "bg-orange-400", text: "text-orange-600" },
  { value: "normal", label: "Normal",  color: "bg-blue-400",   text: "text-blue-600" },
  { value: "low",    label: "Baixa",   color: "bg-gray-400",   text: "text-gray-500" },
];

interface TaskRightPanelProps {
  task: Task | null;
  statuses: Status[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function TaskRightPanel({ task, statuses, open, onOpenChange, onUpdate }: TaskRightPanelProps) {
  const { isAdmin, profile } = useAuthContext();
  const isOwner = profile?.email === OWNER_EMAIL;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState<string | null>(null);
  const [priority, setPriority] = useState<string>("normal");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [assigneeName, setAssigneeName] = useState("");
  const [cidadeClientId, setCidadeClientId] = useState<string | null>(null);
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");

  const { data: cidadeClients = [] } = useQuery({
    queryKey: ["cidade-clients-simple"],
    queryFn: () => api.get<{ id: string; name: string }[]>("/cidade"),
  });

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: subtasks = [] } = useSubtasks(task?.id || null);
  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();
  const { data: comments = [] } = useComments(task?.id || null);
  const createComment = useCreateComment();
  const { data: employees = [] } = useEmployees();

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setStatusId(task.status_id);
      setPriority(task.priority);
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setAssigneeId(task.assignee_id);
      setAssigneeName(task.assignee_name || "");
      setCidadeClientId(task.cidade_client_id);
    }
  }, [task]);

  const handleSave = () => {
    if (!task) return;
    updateTask.mutate(
      {
        id: task.id, title, description: description || null,
        status_id: statusId, cidade_client_id: cidadeClientId,
        priority: priority as Task["priority"],
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        assignee_id: assigneeId, assignee_name: assigneeName || null,
      },
      { onSuccess: onUpdate }
    );
  };

  const handleStatusChange = (value: string) => {
    if (!task) return;
    const nextStatusId = value === "__none__" ? null : value;
    setStatusId(nextStatusId);
    updateTask.mutate({ id: task.id, status_id: nextStatusId }, { onSuccess: onUpdate });
  };

  const handlePriorityChange = (value: string) => {
    if (!task) return;
    setPriority(value);
    updateTask.mutate({ id: task.id, priority: value as Task["priority"] }, { onSuccess: onUpdate });
  };

  const handleDueDateChange = (date?: Date) => {
    if (!task) return;
    setDueDate(date);
    updateTask.mutate({ id: task.id, due_date: date ? format(date, "yyyy-MM-dd") : null }, { onSuccess: onUpdate });
  };

  const handleAssigneeChange = (userId: string) => {
    if (!task) return;
    if (userId === "__none__") {
      setAssigneeId(null); setAssigneeName("");
      updateTask.mutate({ id: task.id, assignee_id: null, assignee_name: null }, { onSuccess: onUpdate });
      return;
    }
    const employee = employees.find((e) => e.user_id === userId);
    setAssigneeId(userId);
    setAssigneeName(employee?.name || "");
    updateTask.mutate({ id: task.id, assignee_id: userId, assignee_name: employee?.name || null }, { onSuccess: onUpdate });
  };

  const handleClientChange = (value: string) => {
    const newId = value === "__none__" ? null : value;
    setCidadeClientId(newId);
    updateTask.mutate({ id: task!.id, cidade_client_id: newId }, { onSuccess: onUpdate });
  };

  const handleAddSubtask = () => {
    if (!task || !newSubtask.trim()) return;
    createSubtask.mutate({ title: newSubtask.trim(), task_id: task.id }, { onSuccess: () => setNewSubtask("") });
  };

  const handleToggleSubtask = (subtaskId: string, isDone: boolean) => {
    if (!task) return;
    updateSubtask.mutate({ id: subtaskId, taskId: task.id, is_done: !isDone });
  };

  const handleAddComment = () => {
    if (!task || !newComment.trim()) return;
    createComment.mutate({ body: newComment.trim(), task_id: task.id }, { onSuccess: () => setNewComment("") });
  };

  const handleDelete = () => {
    if (!task) return;
    deleteTask.mutate({ id: task.id, listId: task.list_id }, {
      onSuccess: () => { onOpenChange(false); onUpdate(); },
    });
  };

  if (!task) return null;

  const currentStatus = statuses.find((s) => s.id === statusId);
  const priorityOpt = priorityOptions.find((p) => p.value === priority) || priorityOptions[2];
  const subtasksDone = subtasks.filter((s) => s.is_done).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[520px] p-0 bg-white border-l border-gray-200 flex flex-col [&>button]:hidden"
      >
        <SheetTitle className="sr-only">Detalhes da tarefa</SheetTitle>
        <SheetDescription className="sr-only">Editar e visualizar detalhes da tarefa</SheetDescription>
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
          {/* Status badge */}
          {currentStatus ? (
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
              style={{ backgroundColor: `${currentStatus.color}18`, color: currentStatus.color, border: `1px solid ${currentStatus.color}35` }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: currentStatus.color }} />
              {currentStatus.name}
            </span>
          ) : (
            <span className="text-[11px] text-gray-400 px-2 py-1 rounded-full bg-gray-100">Sem status</span>
          )}

          <div className="flex items-center gap-1">
            {isOwner && (
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Excluir tarefa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-5">
            {/* Title */}
            <div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSave}
                className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 shadow-none bg-transparent text-gray-900 placeholder:text-gray-400"
                placeholder="Título da tarefa"
              />
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">

              {/* Status */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" /> Status
                </label>
                <Select value={statusId ?? "__none__"} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-8 text-xs border-gray-200">
                    <SelectValue placeholder="Sem status">
                      {currentStatus ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: currentStatus.color }} />
                          {currentStatus.name}
                        </div>
                      ) : "Sem status"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem status</SelectItem>
                    {statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Flag className="h-3 w-3" /> Prioridade
                </label>
                <Select value={priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="h-8 text-xs border-gray-200">
                    <SelectValue>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", priorityOpt.color)} />
                        {priorityOpt.label}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", opt.color)} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due date */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Prazo
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-xs font-normal h-8 border-gray-200", !dueDate && "text-gray-400")}
                    >
                      {dueDate ? format(dueDate, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dueDate}
                      onSelect={handleDueDateChange}
                      locale={ptBR}
                      initialFocus
                      disabled={disabledDays}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Assignee */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <User className="h-3 w-3" /> Responsável
                </label>
                {isOwner ? (
                  <Select value={assigneeId ?? "__none__"} onValueChange={handleAssigneeChange}>
                    <SelectTrigger className="h-8 text-xs border-gray-200">
                      <SelectValue placeholder="Sem responsável">
                        {assigneeName ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-4 w-4">
                              <AvatarFallback className="text-[9px] bg-[#407b75] text-white">{assigneeName.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            {assigneeName}
                          </div>
                        ) : "Sem responsável"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem responsável</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.user_id} value={emp.user_id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px] bg-[#407b75] text-white">{emp.name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            {emp.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 h-8 px-2.5 rounded-md border border-gray-200 bg-gray-50 text-xs">
                    {assigneeName ? (
                      <>
                        <div className="w-4 h-4 rounded-full bg-[#407b75]/15 flex items-center justify-center text-[9px] text-[#407b75] font-bold flex-shrink-0">
                          {assigneeName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-gray-700">{assigneeName}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-400">{profile?.name || "Não atribuído"}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Client */}
              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Cliente
                </label>
                <Select value={cidadeClientId ?? "__none__"} onValueChange={handleClientChange}>
                  <SelectTrigger className="h-8 text-xs border-gray-200">
                    <SelectValue placeholder="Sem cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem cliente</SelectItem>
                    {cidadeClients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Descrição</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSave}
                placeholder="Adicione uma descrição..."
                className="min-h-[80px] resize-none text-sm border-gray-200 focus:border-[#407b75] focus:ring-[#407b75]/20"
              />
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Subtasks */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" /> Subtarefas
                </label>
                {subtasks.length > 0 && (
                  <span className="text-[11px] text-gray-400">
                    {subtasksDone}/{subtasks.length} concluídas
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {subtasks.length > 0 && (
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#407b75] rounded-full transition-all"
                    style={{ width: `${(subtasksDone / subtasks.length) * 100}%` }}
                  />
                </div>
              )}

              <div className="space-y-0.5">
                {subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 group">
                    <Checkbox
                      checked={subtask.is_done}
                      onCheckedChange={() => handleToggleSubtask(subtask.id, subtask.is_done)}
                      className="border-gray-300 data-[state=checked]:bg-[#407b75] data-[state=checked]:border-[#407b75] flex-shrink-0"
                    />
                    <span className={`text-sm flex-1 ${subtask.is_done ? "line-through text-gray-400" : "text-gray-700"}`}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Adicionar subtarefa..."
                  className="text-sm h-8 border-gray-200"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSubtask(); } }}
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={handleAddSubtask}
                  disabled={!newSubtask.trim()}
                  className="h-8 w-8 bg-[#407b75] hover:bg-[#356862] text-white flex-shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Comments */}
            <div className="space-y-2.5 pb-4">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" /> Comentários
                {comments.length > 0 && <span className="text-gray-300 font-normal">({comments.length})</span>}
              </label>

              <div className="space-y-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded-full bg-[#407b75]/15 flex items-center justify-center text-[9px] text-[#407b75] font-bold flex-shrink-0">
                        {comment.user_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{comment.user_name}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">
                        {format(new Date(comment.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 pl-7">{comment.body}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Adicionar comentário..."
                  className="text-sm h-8 border-gray-200"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddComment(); } }}
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="h-8 w-8 bg-[#407b75] hover:bg-[#356862] text-white flex-shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
