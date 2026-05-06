import { useState, useEffect, useRef } from "react";
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
  Paperclip,
  Upload,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Task,
  Status,
  useUpdateTask,
  useSubtasks,
  useCreateSubtask,
  useUpdateSubtask,
  useDeleteSubtask,
  useComments,
  useCreateComment,
  useEmployees,
} from "@/hooks/useTasks";
import { getAuthToken } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { buildDisabledMatcher } from "@/lib/brazilianHolidays";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";

const disabledDays = buildDisabledMatcher();

interface TaskDetailDialogProps {
  task: Task | null;
  statuses: Status[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const priorityOptions = [
  { value: "urgent", label: "Urgente", color: "bg-red-500" },
  { value: "high",   label: "Alta",    color: "bg-orange-400" },
  { value: "normal", label: "Normal",  color: "bg-blue-400" },
  { value: "low",    label: "Baixa",   color: "bg-gray-400" },
];

export function TaskDetailDialog({
  task,
  statuses,
  open,
  onOpenChange,
  onUpdate,
}: TaskDetailDialogProps) {
  const { isAdmin, profile } = useAuthContext();

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
  const { data: subtasks = [] } = useSubtasks(task?.id || null);
  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();
  const { data: comments = [] } = useComments(task?.id || null);
  const createComment = useCreateComment();
  const { data: employees = [] } = useEmployees();

  // Task files
  const queryClient = useQueryClient();
  const taskFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingTaskFile, setUploadingTaskFile] = useState(false);

  const { data: taskFiles = [] } = useQuery({
    queryKey: ["task-files", task?.id],
    queryFn: () => task ? api.get<{ id: string; original_name: string; url: string; mime_type: string }[]>(`/inside/task-files/${task.id}`) : Promise.resolve([]),
    enabled: !!task?.id && open,
  });

  const deleteTaskFileMutation = useMutation({
    mutationFn: (fileId: string) => api.delete(`/inside/task-files/file/${fileId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["task-files", task?.id] }),
  });

  const handleTaskFileUpload = async (file: File) => {
    if (!task) return;
    setUploadingTaskFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = getAuthToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/inside/task-files/${task.id}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload falhou");
      queryClient.invalidateQueries({ queryKey: ["task-files", task.id] });
    } catch {
      // silent
    } finally {
      setUploadingTaskFile(false);
    }
  };

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
    } else {
      setTitle(""); setDescription(""); setStatusId(null); setPriority("normal");
      setDueDate(undefined); setAssigneeId(null); setAssigneeName("");
      setCidadeClientId(null); setNewSubtask(""); setNewComment("");
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

  if (!task) return null;

  const currentStatus = statuses.find((s) => s.id === statusId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b border-gray-200">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 shadow-none bg-transparent text-gray-900 placeholder:text-gray-400"
            placeholder="Título da tarefa"
          />
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="p-6 pt-4 space-y-5">
            {/* Meta fields */}
            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5" /> Status
                </label>
                <Select value={statusId ?? "__none__"} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecionar status">
                      {currentStatus ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentStatus.color }} />
                          {currentStatus.name}
                        </div>
                      ) : "Sem status"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem status</SelectItem>
                    {statuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                          {status.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5" /> Prioridade
                </label>
                <Select value={priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2.5 h-2.5 rounded-full", option.color)} />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Prazo
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal h-9", !dueDate && "text-muted-foreground")}
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
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Responsável
                </label>
                {isAdmin ? (
                  <Select value={assigneeId ?? "__none__"} onValueChange={handleAssigneeChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Sem responsável">
                        {assigneeName ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px] bg-[#407b75] text-white">{assigneeName.charAt(0).toUpperCase()}</AvatarFallback>
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
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-gray-200 bg-gray-50">
                    {assigneeName ? (
                      <>
                        <div className="w-5 h-5 rounded-full bg-[#407b75]/15 flex items-center justify-center text-[10px] text-[#407b75] font-bold">
                          {assigneeName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700">{assigneeName}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-400">{profile?.name || "Não atribuído"}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Cliente Cidade */}
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Cliente (Cidade)
                </label>
                <Select value={cidadeClientId ?? "__none__"} onValueChange={handleClientChange}>
                  <SelectTrigger className="h-9">
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

            <Separator />

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Descrição</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSave}
                placeholder="Adicione uma descrição..."
                className="min-h-[80px] resize-none"
              />
            </div>

            <Separator />

            {/* Subtasks */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 uppercase tracking-wider">
                <CheckSquare className="h-3.5 w-3.5" />
                Subtarefas
                {subtasks.length > 0 && (
                  <span className="text-gray-400 font-normal">
                    ({subtasks.filter((s) => s.is_done).length}/{subtasks.length})
                  </span>
                )}
              </label>
              <div className="space-y-1">
                {subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 group">
                    <Checkbox
                      checked={subtask.is_done}
                      onCheckedChange={() => handleToggleSubtask(subtask.id, subtask.is_done)}
                      className="border-gray-300 data-[state=checked]:bg-[#407b75] data-[state=checked]:border-[#407b75]"
                    />
                    <span className={`text-sm flex-1 ${subtask.is_done ? "line-through text-gray-400" : "text-gray-700"}`}>
                      {subtask.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => task && deleteSubtask.mutate({ id: subtask.id, taskId: task.id })}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                      title="Excluir subtarefa"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Adicionar subtarefa..."
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSubtask(); } }}
                />
                <Button type="button" size="icon" onClick={handleAddSubtask} disabled={!newSubtask.trim()} className="bg-[#407b75] hover:bg-[#356862] text-white">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Task Files */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 uppercase tracking-wider">
                  <Paperclip className="h-3.5 w-3.5" />
                  Anexos
                  {taskFiles.length > 0 && <span className="text-gray-400 font-normal">({taskFiles.length})</span>}
                </label>
                <button
                  type="button"
                  onClick={() => taskFileInputRef.current?.click()}
                  disabled={uploadingTaskFile}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                >
                  <Upload className="h-3 w-3" />
                  {uploadingTaskFile ? "Enviando..." : "Anexar"}
                </button>
                <input
                  ref={taskFileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleTaskFileUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>
              {taskFiles.length > 0 && (
                <div className="space-y-1.5">
                  {taskFiles.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 group">
                      <Paperclip className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#407b75] hover:text-[#356862] truncate flex-1 transition-colors flex items-center gap-1"
                      >
                        {f.original_name}
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                      </a>
                      <button
                        type="button"
                        onClick={() => deleteTaskFileMutation.mutate(f.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Comments */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 uppercase tracking-wider">
                <MessageSquare className="h-3.5 w-3.5" />
                Comentários
                {comments.length > 0 && <span className="text-gray-400 font-normal">({comments.length})</span>}
              </label>
              <div className="space-y-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">{comment.user_name}</span>
                      <span className="text-[11px] text-gray-400">
                        {format(new Date(comment.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{comment.body}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Adicionar comentário..."
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddComment(); } }}
                />
                <Button type="button" size="icon" onClick={handleAddComment} disabled={!newComment.trim()} className="bg-[#407b75] hover:bg-[#356862] text-white">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
