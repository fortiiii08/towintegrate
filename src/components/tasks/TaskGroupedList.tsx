import { useState } from "react";
import {
  ChevronDown, ChevronRight, Plus, Calendar,
  Building2, MoreHorizontal, Circle, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Task, Status, useUpdateTask, useDeleteTask, useCreateTask } from "@/hooks/useTasks";
import { TaskRightPanel } from "./TaskRightPanel";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskGroupedListProps {
  tasks: Task[];
  statuses: Status[];
  listId: string | null;
  onTaskUpdate: () => void;
}

const priorityDot: Record<string, string> = {
  urgent: "#ef4444",
  high:   "#f97316",
  normal: "#3b82f6",
  low:    "#d1d5db",
};

function DueDateBadge({ date, isDone }: { date: string; isDone: boolean }) {
  const d = new Date(date);
  const overdue = isPast(d) && !isToday(d) && !isDone;
  const today = isToday(d);
  const tomorrow = isTomorrow(d);
  const label = today ? "Hoje" : tomorrow ? "Amanhã" : format(d, "dd MMM", { locale: ptBR });
  return (
    <span className={`flex items-center gap-1 text-[10px] font-medium whitespace-nowrap ${overdue ? "text-red-500" : today ? "text-amber-600" : "text-gray-400"}`}>
      <Calendar className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

export function TaskGroupedList({ tasks, statuses, listId, onTaskUpdate }: TaskGroupedListProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();

  const toggleGroup = (key: string) => {
    setCollapsed((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  const openTask = (task: Task) => { setSelectedTask(task); setPanelOpen(true); };

  const handleToggleDone = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const doneStatus = statuses.find((s) => s.is_done);
    const todoStatus = statuses.find((s) => !s.is_done);
    const isDone = statuses.find((s) => s.id === task.status_id)?.is_done;
    updateTask.mutate(
      { id: task.id, status_id: isDone ? (todoStatus?.id || null) : (doneStatus?.id || null) },
      { onSuccess: onTaskUpdate }
    );
  };

  const handleAddTask = (statusId: string | null) => {
    if (!listId || !newTaskTitle.trim()) return;
    createTask.mutate(
      { title: newTaskTitle.trim(), list_id: listId, status_id: statusId || undefined, priority: "normal" },
      { onSuccess: () => { setNewTaskTitle(""); setAddingTo(null); onTaskUpdate(); } }
    );
  };

  // Build groups
  const statusGroups = statuses.map((s) => ({
    key: s.id,
    status: s,
    tasks: tasks.filter((t) => t.status_id === s.id),
  }));
  const noStatusTasks = tasks.filter((t) => !t.status_id || !statuses.find((s) => s.id === t.status_id));
  if (noStatusTasks.length > 0) {
    statusGroups.unshift({
      key: "__none__",
      status: { id: "__none__", list_id: "", name: "Sem status", color: "#9ca3af", order_index: -1, is_done: false, created_at: "" },
      tasks: noStatusTasks,
    });
  }

  if (tasks.length === 0 && !listId) return null;

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-[#407b75]/40" />
        </div>
        <p className="text-sm font-medium text-gray-500">Nenhuma tarefa nesta lista</p>
        <p className="text-xs text-gray-400">Clique em "Nova Tarefa" para começar</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {statusGroups.map((group) => {
          const isCollapsed = collapsed.has(group.key);
          const doneCount = group.tasks.filter((t) => statuses.find((s) => s.id === t.status_id)?.is_done).length;
          const total = group.tasks.length;

          if (total === 0 && group.key !== "__none__") return null;

          return (
            <div key={group.key} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100/80">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors"
              >
                <span className="text-gray-400 flex-shrink-0">
                  {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>

                {/* Status color dot + name */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.status.color }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: group.status.color }}>
                    {group.status.name}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 flex-shrink-0">
                    {total}
                  </span>
                </div>

                {/* Progress */}
                {doneCount > 0 && total > 0 && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(doneCount / total) * 100}%`, backgroundColor: group.status.color, opacity: 0.6 }} />
                    </div>
                    <span className="text-[10px] text-gray-400">{doneCount}/{total}</span>
                  </div>
                )}
              </button>

              {/* Tasks */}
              {!isCollapsed && (
                <div>
                  {group.tasks.map((task, i) => {
                    const isDone = statuses.find((s) => s.id === task.status_id)?.is_done || false;
                    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && !isDone;

                    return (
                      <div
                        key={task.id}
                        onClick={() => openTask(task)}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all group ${
                          i < group.tasks.length - 1 ? "border-b border-gray-50" : ""
                        } hover:bg-[#407b75]/[0.03]`}
                      >
                        {/* Checkbox area */}
                        <div
                          className="flex-shrink-0 w-5 h-5 flex items-center justify-center"
                          onClick={(e) => handleToggleDone(e, task)}
                        >
                          {isDone
                            ? <CheckCircle2 className="w-4 h-4 text-[#407b75]" />
                            : <Circle className="w-4 h-4 text-gray-300 group-hover:text-[#407b75]/40 transition-colors" />
                          }
                        </div>

                        {/* Title + client */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-medium truncate ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
                            {task.title}
                          </p>
                          {task.cidade_client && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Building2 className="w-2.5 h-2.5 text-[#407b75]/60 flex-shrink-0" />
                              <span className="text-[10px] text-[#407b75]/70 font-medium truncate">{task.cidade_client.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Meta — right side */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Assignee */}
                          {task.assignee_name && (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: "rgba(64,123,117,0.12)", color: "#407b75" }} title={task.assignee_name}>
                              {task.assignee_name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          {/* Due date */}
                          {task.due_date && <DueDateBadge date={task.due_date} isDone={isDone} />}

                          {/* Priority dot */}
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0 opacity-70"
                            style={{ backgroundColor: priorityDot[task.priority] || "#d1d5db" }}
                          />

                          {/* Actions menu */}
                          <div onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded-md hover:bg-gray-100 transition-colors">
                                  <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-sm">
                                <DropdownMenuItem onClick={() => openTask(task)}>Abrir</DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => deleteTask.mutate({ id: task.id, listId: task.list_id }, { onSuccess: onTaskUpdate })}
                                  className="text-red-500 focus:text-red-500"
                                >
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add task row */}
                  {listId && (
                    <div className="px-4 py-2">
                      {addingTo === group.key ? (
                        <div className="flex items-center gap-2">
                          <Circle className="w-4 h-4 text-gray-200 flex-shrink-0" />
                          <Input
                            autoFocus
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Nome da tarefa..."
                            className="flex-1 h-7 text-sm border-gray-200 focus-visible:ring-[#407b75]/30"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddTask(group.key === "__none__" ? null : group.key);
                              if (e.key === "Escape") { setAddingTo(null); setNewTaskTitle(""); }
                            }}
                            onBlur={() => { if (!newTaskTitle.trim()) setAddingTo(null); }}
                          />
                          <Button size="sm" onClick={() => handleAddTask(group.key === "__none__" ? null : group.key)} disabled={!newTaskTitle.trim()} className="h-7 px-3 text-xs bg-[#407b75] hover:bg-[#356862] text-white">
                            Salvar
                          </Button>
                          <button onClick={() => { setAddingTo(null); setNewTaskTitle(""); }} className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingTo(group.key)}
                          className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-[#407b75] transition-colors py-0.5 group/add"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar tarefa</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <TaskRightPanel
        task={selectedTask}
        statuses={statuses}
        open={panelOpen}
        onOpenChange={(open) => { setPanelOpen(open); if (!open) setSelectedTask(null); }}
        onUpdate={onTaskUpdate}
      />
    </>
  );
}
