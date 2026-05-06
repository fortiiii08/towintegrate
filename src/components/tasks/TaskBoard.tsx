import { useState } from "react";
import { MoreHorizontal, Building2, Calendar, GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Task, Status, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { TaskDetailDialog } from "./TaskDetailDialog";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskBoardProps {
  tasks: Task[];
  statuses: Status[];
  listId: string;
  onTaskUpdate: () => void;
  searchQuery: string;
}

const PRIORITY_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  urgent: { color: "#ef4444", label: "Urgente", bg: "#fef2f2" },
  high:   { color: "#f97316", label: "Alta",    bg: "#fff7ed" },
  normal: { color: "#3b82f6", label: "Normal",  bg: "#eff6ff" },
  low:    { color: "#9ca3af", label: "Baixa",   bg: "#f9fafb" },
};

function formatDueDate(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Hoje";
  if (isTomorrow(d)) return "Amanhã";
  return format(d, "dd MMM", { locale: ptBR });
}

export function TaskBoard({ tasks, statuses, listId, onTaskUpdate, searchQuery }: TaskBoardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const filtered = searchQuery
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tasks;

  const byStatus = (statusId: string) => filtered.filter((t) => t.status_id === statusId);
  const noStatus = () => filtered.filter((t) => !t.status_id);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(statusId);
  };
  const handleDrop = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status_id !== statusId) {
      updateTask.mutate({ id: draggedTask.id, status_id: statusId }, { onSuccess: onTaskUpdate });
    }
    setDraggedTask(null);
    setDragOverStatus(null);
  };
  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverStatus(null);
  };

  const allColumns: Array<{ id: string; name: string; color: string; tasks: Task[] }> = [
    ...(noStatus().length > 0
      ? [{ id: "__none__", name: "Sem Status", color: "#94a3b8", tasks: noStatus() }]
      : []),
    ...statuses.map((s) => ({ id: s.id, name: s.name, color: s.color, tasks: byStatus(s.id) })),
  ];

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4 h-full items-start">
        {allColumns.map((col) => (
          <Column
            key={col.id}
            statusId={col.id}
            title={col.name}
            color={col.color}
            tasks={col.tasks}
            isDragOver={dragOverStatus === col.id}
            draggedTaskId={draggedTask?.id ?? null}
            onDragStart={handleDragStart}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={(e) => handleDrop(e, col.id)}
            onDragEnd={handleDragEnd}
            onClick={setSelectedTask}
            onDelete={(t) => deleteTask.mutate({ id: t.id, listId }, { onSuccess: onTaskUpdate })}
          />
        ))}

        {allColumns.length === 0 && (
          <div className="flex-1 flex items-center justify-center h-64 text-sm text-gray-400">
            Nenhum status criado ainda
          </div>
        )}
      </div>

      <TaskDetailDialog
        task={selectedTask}
        statuses={statuses}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onUpdate={onTaskUpdate}
      />
    </>
  );
}

// ── Column ─────────────────────────────────────────────────────────────────

interface ColumnProps {
  statusId: string;
  title: string;
  color: string;
  tasks: Task[];
  isDragOver: boolean;
  draggedTaskId: string | null;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function Column({
  title, color, tasks, isDragOver, draggedTaskId,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
  onClick, onDelete,
}: ColumnProps) {
  return (
    <div className="flex-shrink-0 w-[268px] flex flex-col max-h-full">
      {/* Column header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-t-xl mb-0"
        style={{ backgroundColor: `${color}14`, borderTop: `3px solid ${color}` }}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="font-semibold text-gray-700 text-[13px] flex-1 truncate">{title}</span>
        <span
          className="text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: `${color}25`, color }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        className={`flex-1 space-y-2 min-h-[120px] rounded-b-xl p-2 transition-all duration-150 overflow-y-auto ${
          isDragOver
            ? "bg-[#407b75]/10 ring-2 ring-inset ring-[#407b75]/30"
            : "bg-gray-100/70"
        }`}
        style={{ maxHeight: "calc(100vh - 220px)" }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isDragging={draggedTaskId === task.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={() => onClick(task)}
            onDelete={() => onDelete(task)}
          />
        ))}

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 gap-1.5 select-none">
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
              <Plus className="w-3 h-3 text-gray-300" />
            </div>
            <p className="text-[11px] text-gray-300 font-medium">Arraste aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── TaskCard ───────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onDelete: () => void;
}

function TaskCard({ task, isDragging, onDragStart, onDragEnd, onClick, onDelete }: TaskCardProps) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
  const pConfig = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.low;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-100 shadow-sm cursor-pointer
        transition-all duration-150 group select-none
        hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5
        ${isDragging ? "opacity-40 scale-95 rotate-1 shadow-lg" : ""}
      `}
    >
      {/* Priority accent bar */}
      <div
        className="h-[3px] rounded-t-xl"
        style={{ backgroundColor: pConfig.color }}
      />

      <div className="p-3">
        {/* Top row: drag handle + title + menu */}
        <div className="flex items-start gap-1.5">
          <GripVertical className="w-3.5 h-3.5 text-gray-200 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
          <p className="flex-1 font-semibold text-gray-800 text-[13px] leading-snug line-clamp-2 min-w-0">
            {task.title}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 hover:bg-gray-100 -mr-0.5 -mt-0.5 rounded"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
                Abrir
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-red-500 focus:text-red-500"
              >
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-[11px] text-gray-400 mt-1.5 line-clamp-1 leading-relaxed pl-5">
            {task.description}
          </p>
        )}

        {/* Client pill */}
        {task.cidade_client && (
          <div className="flex items-center gap-1.5 mt-2 pl-5">
            <div className="flex items-center gap-1 bg-[#407b75]/8 border border-[#407b75]/15 rounded-md px-2 py-1 min-w-0 max-w-full">
              <Building2 className="w-3 h-3 text-[#407b75] flex-shrink-0" />
              <span
                className="text-[11px] text-[#407b75] font-semibold truncate"
                title={task.cidade_client.name}
              >
                {task.cidade_client.name}
              </span>
            </div>
          </div>
        )}

        {/* Footer: priority · date · assignee */}
        <div className="flex items-center gap-1.5 mt-2.5 pl-5">
          {/* Priority badge */}
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ backgroundColor: pConfig.bg, color: pConfig.color }}
          >
            {pConfig.label}
          </span>

          {/* Due date */}
          {task.due_date && (
            <span
              className={`flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
                isOverdue
                  ? "bg-red-50 text-red-500"
                  : isToday(new Date(task.due_date))
                  ? "bg-amber-50 text-amber-600"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <Calendar className="w-2.5 h-2.5" />
              {formatDueDate(task.due_date)}
            </span>
          )}

          {/* Assignee avatar — pushed to end */}
          {task.assignee_name && (
            <div className="ml-auto flex items-center gap-1 flex-shrink-0">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: "#407b75" }}
                title={task.assignee_name}
              >
                {task.assignee_name.charAt(0).toUpperCase()}
              </div>
              <span className="text-[10px] text-gray-400 max-w-[64px] truncate">
                {task.assignee_name.split(" ")[0]}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
