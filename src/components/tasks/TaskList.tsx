import { useState } from "react";
import { MoreHorizontal, Calendar, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Task, Status, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { TaskRightPanel } from "./TaskRightPanel";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskListProps {
  tasks: Task[];
  statuses: Status[];
  onTaskUpdate: () => void;
  searchQuery: string;
}

const priorityColors: Record<string, { bg: string; text: string }> = {
  urgent: { bg: "bg-red-50",     text: "text-red-600" },
  high:   { bg: "bg-orange-50",  text: "text-orange-600" },
  normal: { bg: "bg-blue-50",    text: "text-blue-600" },
  low:    { bg: "bg-gray-100",   text: "text-gray-500" },
};

const priorityLabels: Record<string, string> = {
  urgent: "Urgente",
  high:   "Alta",
  normal: "Normal",
  low:    "Baixa",
};

export function TaskList({ tasks, statuses, onTaskUpdate, searchQuery }: TaskListProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const filtered = searchQuery
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tasks;

  const getStatus = (id: string | null) => statuses.find((s) => s.id === id);

  const handleToggleDone = (task: Task) => {
    const doneStatus = statuses.find((s) => s.is_done);
    const todoStatus = statuses.find((s) => !s.is_done);
    if (task.status_id === doneStatus?.id) {
      updateTask.mutate({ id: task.id, status_id: todoStatus?.id || null }, { onSuccess: onTaskUpdate });
    } else if (doneStatus) {
      updateTask.mutate({ id: task.id, status_id: doneStatus.id }, { onSuccess: onTaskUpdate });
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_130px_100px_140px_120px_40px] gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tarefa</span>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</span>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Prioridade</span>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Responsável</span>
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Prazo</span>
          <span />
        </div>

        {filtered.length === 0 ? (
          <div className="py-14 text-center text-gray-400 text-sm">
            Nenhuma tarefa encontrada
          </div>
        ) : (
          filtered.map((task) => {
            const status = getStatus(task.status_id);
            const isDone = status?.is_done || false;
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone;
            const pc = priorityColors[task.priority];

            return (
              <div
                key={task.id}
                className="grid grid-cols-[1fr_130px_100px_140px_120px_40px] gap-3 items-center px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50/80 transition-colors group"
                onClick={() => setSelectedTask(task)}
              >
                {/* Title */}
                <div className="flex items-center gap-3 min-w-0" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isDone}
                    onCheckedChange={() => handleToggleDone(task)}
                    className="border-gray-300 data-[state=checked]:bg-[#407b75] data-[state=checked]:border-[#407b75]"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
                      {task.title}
                    </p>
                    {task.cidade_client && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Building2 className="w-2.5 h-2.5 text-[#407b75]" />
                        <span className="text-[10px] text-[#407b75] font-medium truncate">{task.cidade_client.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div>
                  {status ? (
                    <span
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${status.color}18`, color: status.color, border: `1px solid ${status.color}35` }}
                    >
                      {status.name}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-sm">—</span>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${pc.bg} ${pc.text}`}>
                    {priorityLabels[task.priority]}
                  </span>
                </div>

                {/* Assignee */}
                <div>
                  {task.assignee_name ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-[#407b75]/15 flex items-center justify-center text-[10px] text-[#407b75] font-bold flex-shrink-0">
                        {task.assignee_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-600 truncate">{task.assignee_name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-300 text-sm">—</span>
                  )}
                </div>

                {/* Due date */}
                <div>
                  {task.due_date ? (
                    <div className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? "text-red-500" : "text-gray-500"}`}>
                      <Calendar className="h-3 w-3" />
                      {format(new Date(task.due_date), "dd MMM", { locale: ptBR })}
                    </div>
                  ) : (
                    <span className="text-gray-300 text-sm">—</span>
                  )}
                </div>

                {/* Actions */}
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedTask(task)}>
                        Editar
                      </DropdownMenuItem>
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
            );
          })
        )}
      </div>

      <TaskRightPanel
        task={selectedTask}
        statuses={statuses}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onUpdate={onTaskUpdate}
      />
    </>
  );
}
