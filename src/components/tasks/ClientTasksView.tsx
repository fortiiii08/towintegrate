import { useState } from "react";
import { ChevronDown, ChevronRight, Building2, CheckSquare, Calendar, User } from "lucide-react";
import { Task, Status, InboxTask, useWorkspaceTasks } from "@/hooks/useTasks";
import { TaskDetailFromId } from "./TaskDetailFromId";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  workspaceId: string | null;
  searchQuery: string;
  onUpdate?: () => void;
}

const priorityColors: Record<string, { bg: string; text: string }> = {
  urgent: { bg: "bg-red-50",    text: "text-red-600" },
  high:   { bg: "bg-orange-50", text: "text-orange-600" },
  normal: { bg: "bg-blue-50",   text: "text-blue-600" },
  low:    { bg: "bg-gray-100",  text: "text-gray-500" },
};

const priorityLabels: Record<string, string> = {
  urgent: "Urgente", high: "Alta", normal: "Normal", low: "Baixa",
};

interface ClientGroup {
  clientId: string | null;
  clientName: string;
  clientImage: string | null;
  tasks: InboxTask[];
}

export function ClientTasksView({ workspaceId, searchQuery, onUpdate }: Props) {
  const { data: allTasks = [], refetch } = useWorkspaceTasks(workspaceId);
  const [collapsed, setCollapsed] = useState<Set<string | null>>(new Set());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = searchQuery
    ? allTasks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allTasks;

  // Group by cidadeClient
  const groupMap = new Map<string | null, ClientGroup>();
  for (const task of filtered) {
    const key = task.cidade_client_id;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        clientId: key,
        clientName: task.cidade_client?.name || "Sem Cliente",
        clientImage: task.cidade_client?.imageUrl || null,
        tasks: [],
      });
    }
    groupMap.get(key)!.tasks.push(task);
  }

  // Sort: clients with tasks first (alphabetical), "Sem Cliente" at end
  const groups = Array.from(groupMap.values()).sort((a, b) => {
    if (!a.clientId && b.clientId) return 1;
    if (a.clientId && !b.clientId) return -1;
    return a.clientName.localeCompare(b.clientName);
  });

  const toggleCollapse = (key: string | null) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setDetailOpen(true);
  };

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Selecione um workspace para ver as tarefas por cliente
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
        <Building2 className="w-10 h-10 opacity-30" />
        <p className="text-sm">Nenhuma tarefa com cliente vinculado</p>
        <p className="text-xs text-gray-300">Vincule um cliente ao criar ou editar uma tarefa</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {groups.map((group) => {
          const key = group.clientId;
          const isCollapsed = collapsed.has(key);
          const done = group.tasks.filter((t) => t.status?.is_done).length;

          return (
            <div key={key ?? "__none__"} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Group header */}
              <button
                onClick={() => toggleCollapse(key)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}

                {key ? (
                  group.clientImage ? (
                    <img
                      src={group.clientImage}
                      alt={group.clientName}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#407b75] to-[#9b3515] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {group.clientName.charAt(0)}
                    </div>
                  )
                ) : (
                  <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}

                <span className="font-semibold text-gray-800 text-sm">{group.clientName}</span>
                <span className="text-xs text-gray-400 ml-1">
                  {group.tasks.length} tarefa{group.tasks.length !== 1 ? "s" : ""}
                </span>
                {done > 0 && (
                  <span className="text-xs text-[#407b75] flex items-center gap-0.5">
                    <CheckSquare className="w-3 h-3" /> {done} concluída{done !== 1 ? "s" : ""}
                  </span>
                )}
              </button>

              {/* Tasks */}
              {!isCollapsed && (
                <div>
                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_130px_100px_140px_120px] gap-3 px-4 py-2 border-b border-gray-100">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Tarefa</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Prioridade</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Responsável</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Prazo</span>
                  </div>

                  {group.tasks.map((task) => {
                    const status = task.status;
                    const isDone = status?.is_done || false;
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone;
                    const pc = priorityColors[task.priority];

                    return (
                      <div
                        key={task.id}
                        onClick={() => openTask(task.id)}
                        className="grid grid-cols-[1fr_130px_100px_140px_120px] gap-3 items-center px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50/80 transition-colors"
                      >
                        {/* Title */}
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-[11px] text-gray-400 truncate mt-0.5">{task.description}</p>
                          )}
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Task detail modal — fetches task + its statuses dynamically */}
      <TaskDetailFromId
        taskId={selectedTaskId}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedTaskId(null);
        }}
        onUpdate={() => { refetch(); onUpdate?.(); }}
      />
    </>
  );
}
