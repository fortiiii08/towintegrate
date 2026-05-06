import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Plus, Search, LayoutGrid, List,
  MoreHorizontal, CheckSquare, Trash2, Inbox,
  Building2, Users, ChevronDown, ChevronRight,
  Folder, List as ListIcon, Hash, Calendar,
  Circle, CheckCircle2, Settings, BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useWorkspaces, useSpaces, useLists, useTasks, useStatuses,
  useDeleteWorkspace, useDeleteSpace, useDeleteList, useInboxTasks, useCompleteTask,
  Space, TaskList as TaskListType, InboxTask,
} from "@/hooks/useTasks";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskGroupedList } from "@/components/tasks/TaskGroupedList";
import { ClientTasksView } from "@/components/tasks/ClientTasksView";
import { TasksDashboard } from "@/components/tasks/TasksDashboard";
import { CreateWorkspaceDialog } from "@/components/tasks/CreateWorkspaceDialog";
import { CreateSpaceDialog } from "@/components/tasks/CreateSpaceDialog";
import { CreateListDialog } from "@/components/tasks/CreateListDialog";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { NotificationBell } from "@/components/tasks/NotificationBell";
import { TaskDetailFromId } from "@/components/tasks/TaskDetailFromId";
import { WorkspaceMembersDialog } from "@/components/tasks/WorkspaceMembersDialog";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  format, isToday, isTomorrow, isPast,
  isThisWeek, differenceInDays, startOfMonth, isSameMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const OWNER_EMAIL = "gustavosaforti@gmail.com";

type ViewMode = "list" | "board" | "clients" | "dashboard";

// ─── Group inbox tasks by assignment date period ──────────────────
function getPeriodLabel(date: Date, now: Date): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOf7DaysAgo = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  if (date >= startOfToday)       return "Hoje";
  if (date >= startOfYesterday)   return "Ontem";
  if (date >= startOf7DaysAgo)    return "Últimos 7 dias";
  if (date >= startOfThisMonth)   return "Este mês";
  if (date >= startOfLastMonth && date <= endOfLastMonth) {
    const name = format(date, "MMMM", { locale: ptBR });
    return name.charAt(0).toUpperCase() + name.slice(1); // "Março"
  }
  // Older: month name + year if different year
  const isCurrentYear = date.getFullYear() === now.getFullYear();
  const label = isCurrentYear
    ? format(date, "MMMM", { locale: ptBR })
    : format(date, "MMMM yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const PERIOD_ORDER = ["Hoje", "Ontem", "Últimos 7 dias", "Este mês"];

function groupInboxByPeriod(tasks: InboxTask[]): { label: string; tasks: InboxTask[] }[] {
  const now = new Date();
  const groups: Map<string, InboxTask[]> = new Map();

  for (const task of tasks) {
    const date = task.assigned_at ? new Date(task.assigned_at) : new Date(task.created_at);
    const label = getPeriodLabel(date, now);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(task);
  }

  const result: { label: string; tasks: InboxTask[] }[] = [];

  // Fixed order first
  for (const period of PERIOD_ORDER) {
    if (groups.has(period)) {
      result.push({ label: period, tasks: groups.get(period)! });
      groups.delete(period);
    }
  }

  // Remaining month labels in reverse chronological order
  for (const [label, items] of groups) {
    result.push({ label, tasks: items });
  }

  return result;
}

// ─── Sidebar space/list tree ─────────────────────────────────────
interface SpaceTreeProps {
  spaces: Space[];
  lists: TaskListType[];
  selectedSpaceId: string | null;
  selectedListId: string | null;
  onSelectSpace: (id: string) => void;
  onSelectList: (id: string) => void;
  onCreateList: () => void;
  onDeleteSpace: (id: string) => void;
  onDeleteList: (id: string, spaceId: string) => void;
}

function SpaceTree({ spaces, lists, selectedSpaceId, selectedListId, onSelectSpace, onSelectList, onCreateList, onDeleteSpace, onDeleteList }: SpaceTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleteSpaceId, setDeleteSpaceId] = useState<string | null>(null);
  const [deleteListId, setDeleteListId] = useState<{ id: string; spaceId: string } | null>(null);

  useEffect(() => {
    if (selectedSpaceId) setExpanded((p) => new Set([...p, selectedSpaceId]));
  }, [selectedSpaceId]);

  const toggle = (id: string) => setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-0.5">
      {spaces.map((space) => {
        const isOpen = expanded.has(space.id);
        const isActive = selectedSpaceId === space.id;
        const spaceLists = isActive ? lists : [];

        return (
          <div key={space.id}>
            <div className="flex items-center group/space">
              <button
                onClick={() => { toggle(space.id); onSelectSpace(space.id); }}
                className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] transition-colors min-w-0 text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              >
                <span className="text-gray-400 flex-shrink-0 w-3">
                  {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </span>
                <Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: space.color || "#407b75" }} />
                <span className="truncate font-medium">{space.name}</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="opacity-0 group-hover/space:opacity-100 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-all flex-shrink-0 mr-1">
                    <MoreHorizontal className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px]">
                  <DropdownMenuItem onClick={onCreateList} className="text-xs">
                    <Plus className="w-3 h-3 mr-2" /> Nova lista
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDeleteSpaceId(space.id)} className="text-red-500 focus:text-red-500 text-xs">
                    <Trash2 className="w-3 h-3 mr-2" /> Excluir espaço
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {isOpen && isActive && (
              <div className="ml-5 space-y-0.5 pb-1">
                {spaceLists.map((list) => {
                  const isListActive = selectedListId === list.id;
                  return (
                    <div key={list.id} className="flex items-center group/list">
                      <button
                        onClick={() => onSelectList(list.id)}
                        className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] transition-all min-w-0 ${
                          isListActive
                            ? "bg-[#407b75]/10 text-[#407b75] font-semibold"
                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isListActive ? "bg-[#407b75]" : "bg-gray-300"}`} />
                        <span className="truncate">{list.name}</span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="opacity-0 group-hover/list:opacity-100 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-all flex-shrink-0 mr-1">
                            <MoreHorizontal className="w-3 h-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[140px]">
                          <DropdownMenuItem onClick={() => setDeleteListId({ id: list.id, spaceId: list.space_id })} className="text-red-500 focus:text-red-500 text-xs">
                            <Trash2 className="w-3 h-3 mr-2" /> Excluir lista
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
                {spaceLists.length === 0 && <p className="text-[11px] text-gray-400 px-3 py-1">Sem listas</p>}
                <button onClick={onCreateList} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <Plus className="w-2.5 h-2.5" /> Nova lista
                </button>
              </div>
            )}
          </div>
        );
      })}

      {spaces.length === 0 && <p className="text-[11px] text-gray-400 px-2 py-1">Sem espaços</p>}

      <AlertDialog open={!!deleteSpaceId} onOpenChange={() => setDeleteSpaceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir espaço?</AlertDialogTitle><AlertDialogDescription>Todas as listas e tarefas serão excluídas.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { onDeleteSpace(deleteSpaceId!); setDeleteSpaceId(null); }} className="bg-red-600 hover:bg-red-700 text-white">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteListId} onOpenChange={() => setDeleteListId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir lista?</AlertDialogTitle><AlertDialogDescription>Todas as tarefas serão excluídas.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { onDeleteList(deleteListId!.id, deleteListId!.spaceId); setDeleteListId(null); }} className="bg-red-600 hover:bg-red-700 text-white">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Inbox view — grouped by assignment period ───────────────────
const PRIORITY_LABEL: Record<string, string> = { urgent: "Urgente", high: "Alta", normal: "Normal", low: "Baixa" };
const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  urgent: { bg: "bg-red-50", text: "text-red-500" },
  high:   { bg: "bg-orange-50", text: "text-orange-500" },
  normal: { bg: "bg-blue-50", text: "text-blue-500" },
  low:    { bg: "bg-gray-100", text: "text-gray-400" },
};

function InboxView({ tasks, onUpdate }: { tasks: InboxTask[]; onUpdate: () => void }) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const completeTask = useCompleteTask();

  const groups = groupInboxByPeriod(tasks);

  const handleComplete = async (e: React.MouseEvent, task: InboxTask) => {
    e.stopPropagation();
    if (task.status?.is_done || completingId === task.id) return;
    setCompletingId(task.id);
    try {
      await completeTask.mutateAsync(task.id);
      onUpdate();
    } catch {
      // silently fail - task detail still shows
    } finally {
      setCompletingId(null);
    }
  };

  const pending = tasks.filter((t) => !t.status?.is_done);
  const done = tasks.filter((t) => t.status?.is_done);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#407b75]/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-[#407b75]" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">Tudo em dia!</p>
          <p className="text-xs text-gray-400 mt-1">Nenhuma tarefa atribuída a você</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-2xl">
        {/* Summary bar */}
        <div className="flex items-center gap-4 mb-5">
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold text-gray-800">{pending.length}</span>
            <span className="text-sm text-gray-400">pendente{pending.length !== 1 ? "s" : ""}</span>
          </div>
          {done.length > 0 && (
            <>
              <div className="w-px h-4 bg-gray-200" />
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#407b75]" />
                <span className="text-sm text-gray-400">{done.length} concluída{done.length !== 1 ? "s" : ""}</span>
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              {/* Period label */}
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{group.label}</p>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Task rows */}
              <div className="space-y-1.5">
                {group.tasks.map((task) => {
                  const isDone = task.status?.is_done || false;
                  const isCompleting = completingId === task.id;
                  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && !isDone;
                  const pColors = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low;

                  return (
                    <div
                      key={task.id}
                      onClick={() => { setSelectedTaskId(task.id); setDetailOpen(true); }}
                      className={`group flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                        isDone
                          ? "bg-gray-50 border-gray-100 opacity-60"
                          : "bg-white border-gray-200 hover:border-[#407b75]/30 hover:shadow-sm hover:shadow-[#407b75]/5"
                      }`}
                    >
                      {/* Complete button */}
                      <button
                        type="button"
                        onClick={(e) => handleComplete(e, task)}
                        disabled={isDone || isCompleting}
                        title={isDone ? "Concluída" : "Marcar como concluída"}
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isDone
                            ? "bg-[#407b75] border-[#407b75]"
                            : isCompleting
                            ? "border-[#407b75] animate-pulse"
                            : "border-gray-300 hover:border-[#407b75] hover:bg-[#407b75]/5 group-hover:border-[#407b75]/50"
                        }`}
                        style={!isDone && !isCompleting ? { borderColor: task.status?.color || undefined } : {}}
                      >
                        {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        {isCompleting && <div className="w-2 h-2 rounded-full bg-[#407b75] animate-ping" />}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {task.cidade_client && (
                            <span className="text-[10px] text-[#407b75] font-semibold bg-[#407b75]/8 px-1.5 py-0.5 rounded">
                              {task.cidade_client.name}
                            </span>
                          )}
                          {task.reporter_name && (
                            <span className="text-[10px] text-gray-400 truncate">
                              {task.reporter_id === task.assignee_id ? "Você mesmo atribuiu" : `Atribuída por ${task.reporter_name}`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Priority badge */}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded hidden sm:inline-block ${pColors.bg} ${pColors.text}`}>
                          {PRIORITY_LABEL[task.priority] || task.priority}
                        </span>

                        {/* Due date */}
                        {task.due_date && (
                          <span className={`text-[11px] font-medium flex items-center gap-0.5 ${
                            isOverdue ? "text-red-500" : isToday(new Date(task.due_date)) ? "text-amber-500" : "text-gray-400"
                          }`}>
                            <Calendar className="w-3 h-3" />
                            {isToday(new Date(task.due_date)) ? "Hoje" : isTomorrow(new Date(task.due_date)) ? "Amanhã" : format(new Date(task.due_date), "dd MMM", { locale: ptBR })}
                          </span>
                        )}

                        {/* Status chip */}
                        {task.status && (
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white hidden md:inline-block"
                            style={{ backgroundColor: task.status.color || "#9ca3af" }}
                          >
                            {task.status.name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <TaskDetailFromId
        taskId={selectedTaskId}
        open={detailOpen}
        onOpenChange={(open) => { setDetailOpen(open); if (!open) setSelectedTaskId(null); }}
        onUpdate={onUpdate}
      />
    </>
  );
}

// ─── Main page ───────────────────────────────────────────────────
const Tarefas = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuthContext();
  const isOwner = profile?.email === OWNER_EMAIL;

  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [inboxView, setInboxView] = useState(false);
  const [inboxSeen, setInboxSeen] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");

  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [deleteWorkspaceDialog, setDeleteWorkspaceDialog] = useState<string | null>(null);
  const [membersWorkspaceId, setMembersWorkspaceId] = useState<string | null>(null);

  const deepTaskId = searchParams.get("taskId");
  const [deepTaskOpen, setDeepTaskOpen] = useState(!!deepTaskId);
  useEffect(() => { if (deepTaskId) setDeepTaskOpen(true); }, [deepTaskId]);

  const { data: workspaces, isLoading: loadingWorkspaces } = useWorkspaces();
  const { data: spaces = [] } = useSpaces(selectedWorkspace);
  const { data: lists = [] } = useLists(selectedSpace);
  const { data: tasks, refetch: refetchTasks } = useTasks(inboxView || viewMode === "clients" || viewMode === "dashboard" ? null : selectedList);
  const { data: statuses = [] } = useStatuses(inboxView || viewMode === "clients" || viewMode === "dashboard" ? null : selectedList);
  const { data: inboxTasks = [], refetch: refetchInbox } = useInboxTasks();

  const deleteWorkspace = useDeleteWorkspace();
  const deleteSpace = useDeleteSpace();
  const deleteList = useDeleteList();

  useEffect(() => { if (workspaces?.length && !selectedWorkspace) setSelectedWorkspace(workspaces[0].id); }, [workspaces, selectedWorkspace]);
  useEffect(() => { if (spaces.length && !selectedSpace) setSelectedSpace(spaces[0].id); }, [spaces, selectedSpace]);
  useEffect(() => { if (lists.length && !selectedList) setSelectedList(lists[0].id); }, [lists, selectedList]);

  const currentWorkspace = workspaces?.find((w) => w.id === selectedWorkspace);
  const currentSpace = spaces.find((s) => s.id === selectedSpace);
  const currentList = lists.find((l) => l.id === selectedList);

  const handleDeleteWorkspace = (id: string) => {
    deleteWorkspace.mutate(id, { onSuccess: () => { setDeleteWorkspaceDialog(null); setSelectedWorkspace(null); setSelectedSpace(null); setSelectedList(null); } });
  };
  const handleDeleteSpace = (id: string) => {
    if (!selectedWorkspace) return;
    deleteSpace.mutate({ spaceId: id, workspaceId: selectedWorkspace }, { onSuccess: () => { if (selectedSpace === id) { setSelectedSpace(null); setSelectedList(null); } } });
  };
  const handleDeleteList = (id: string, spaceId: string) => {
    deleteList.mutate({ listId: id, spaceId }, { onSuccess: () => { if (selectedList === id) setSelectedList(null); } });
  };

  const filteredTasks = (tasks || []).filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredInbox = inboxTasks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const inboxUnread = inboxTasks.filter((t) => !t.status?.is_done).length;
  const inboxBadge = Math.max(0, inboxUnread - inboxSeen);

  const crumbs = inboxView
    ? ["Caixa de Entrada"]
    : viewMode === "clients"
    ? [currentWorkspace?.name || "Workspace", "Por Cliente"]
    : viewMode === "dashboard"
    ? [currentWorkspace?.name || "Workspace", "Dashboard"]
    : [currentSpace?.name, currentList?.name].filter(Boolean) as string[];

  return (
    <div className="h-screen flex font-lufga overflow-hidden bg-[#f5f6fa]">

      {/* ══ Sidebar (LIGHT) ══ */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col overflow-hidden bg-white border-r border-gray-100 shadow-[1px_0_0_0_#f3f4f6]">

        {/* Back */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-gray-400 hover:text-[#407b75] text-[11px] mb-3 transition-colors group"
          >
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" /> Início
          </button>

          {/* Workspace selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all text-left group shadow-sm">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#407b75] shadow-sm">
                  <CheckSquare className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-gray-400 leading-none mb-0.5">Workspace</p>
                  <p className="text-[12px] font-bold text-gray-800 truncate leading-tight">
                    {currentWorkspace?.name || (loadingWorkspaces ? "..." : "Nenhum")}
                  </p>
                </div>
                <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={4} className="w-52 shadow-lg">
              {workspaces?.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => { setSelectedWorkspace(ws.id); setSelectedSpace(null); setSelectedList(null); setInboxView(false); if (viewMode === "clients") setViewMode("list"); }}
                  className={`text-xs ${selectedWorkspace === ws.id ? "text-[#407b75] font-semibold" : ""}`}
                >
                  <Hash className="w-3 h-3 mr-2 flex-shrink-0" />
                  <span className="truncate">{ws.name}</span>
                  {selectedWorkspace === ws.id && <CheckCircle2 className="w-3 h-3 ml-auto text-[#407b75]" />}
                </DropdownMenuItem>
              ))}
              {(workspaces?.length ?? 0) > 0 && <DropdownMenuSeparator />}
              {isOwner && (
                <>
                  {selectedWorkspace && <DropdownMenuItem onClick={() => setMembersWorkspaceId(selectedWorkspace)} className="text-xs"><Users className="w-3 h-3 mr-2" /> Gerenciar membros</DropdownMenuItem>}
                  {selectedWorkspace && <DropdownMenuItem onClick={() => setDeleteWorkspaceDialog(selectedWorkspace)} className="text-red-500 focus:text-red-500 text-xs"><Trash2 className="w-3 h-3 mr-2" /> Excluir workspace</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowCreateWorkspace(true)} className="text-[#407b75] font-medium text-xs"><Plus className="w-3 h-3 mr-2" /> Novo workspace</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Nav items */}
        <div className="px-3 py-1 space-y-0.5 flex-shrink-0">
          {/* Inbox */}
          <SidebarNavItem
            icon={<Inbox className="w-4 h-4" />}
            label="Caixa de Entrada"
            active={inboxView}
            badge={inboxBadge > 0 ? inboxBadge : undefined}
            onClick={() => { setInboxView(true); setInboxSeen(inboxUnread); if (viewMode === "clients") setViewMode("list"); }}
          />
          {selectedWorkspace && (
            <SidebarNavItem
              icon={<Building2 className="w-4 h-4" />}
              label="Por Cliente"
              active={viewMode === "clients" && !inboxView}
              onClick={() => { setViewMode("clients"); setInboxView(false); }}
            />
          )}
          {selectedWorkspace && isOwner && (
            <SidebarNavItem
              icon={<BarChart2 className="w-4 h-4" />}
              label="Dashboard"
              active={viewMode === "dashboard" && !inboxView}
              onClick={() => { setViewMode("dashboard"); setInboxView(false); }}
            />
          )}
        </div>

        {/* Divider */}
        <div className="mx-3 mt-2 mb-1 h-px bg-gray-100" />

        {/* Spaces + Lists */}
        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[9px] font-extrabold text-gray-300 uppercase tracking-[0.12em]">Espaços</span>
            {selectedWorkspace && (
              <button onClick={() => setShowCreateSpace(true)} className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>
          {selectedWorkspace ? (
            <SpaceTree
              spaces={spaces}
              lists={lists}
              selectedSpaceId={selectedSpace}
              selectedListId={inboxView || viewMode === "clients" ? null : selectedList}
              onSelectSpace={(id) => { setSelectedSpace(id); setSelectedList(null); setInboxView(false); if (viewMode === "clients") setViewMode("list"); }}
              onSelectList={(id) => { setSelectedList(id); setInboxView(false); if (viewMode === "clients") setViewMode("list"); }}
              onCreateList={() => setShowCreateList(true)}
              onDeleteSpace={handleDeleteSpace}
              onDeleteList={handleDeleteList}
            />
          ) : (
            <p className="text-[11px] text-gray-400 px-1">Selecione um workspace</p>
          )}
        </div>

        {/* Bottom: profile */}
        {profile && (
          <div className="px-3 pb-3 flex-shrink-0">
            <div className="h-px bg-gray-100 mb-2" />
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-[#407b75] text-white">
                {profile.name?.charAt(0).toUpperCase()}
              </div>
              <p className="text-[11px] font-medium text-gray-600 truncate flex-1">{profile.name}</p>
            </div>
          </div>
        )}
      </aside>

      {/* ══ Main area ══ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Toolbar */}
        <header className="h-[52px] flex items-center justify-between px-6 flex-shrink-0 bg-white border-b border-gray-100 shadow-[0_1px_0_0_#f3f4f6]">
          <div className="flex items-center gap-1 min-w-0">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-200 flex-shrink-0" />}
                <span className={`text-sm truncate ${i === crumbs.length - 1 ? "font-bold text-gray-800" : "text-gray-400 font-medium"}`}>{c}</span>
              </span>
            ))}
            {crumbs.length === 0 && <span className="text-sm text-gray-400">Selecione uma lista</span>}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 w-36 h-7 text-xs border-gray-200 bg-gray-50 focus:bg-white"
              />
            </div>

            {!inboxView && viewMode !== "clients" && selectedList && (
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow text-[#407b75]" : "text-gray-400 hover:text-gray-600"}`}>
                  <List className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setViewMode("board")} className={`p-1.5 rounded-md transition-all ${viewMode === "board" ? "bg-white shadow text-[#407b75]" : "text-gray-400 hover:text-gray-600"}`}>
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <NotificationBell />

            {!inboxView && viewMode !== "clients" && selectedList && (
              <Button onClick={() => setShowCreateTask(true)} size="sm" className="h-8 px-3.5 text-xs gap-1.5 bg-[#407b75] hover:bg-[#356862] text-white">
                <Plus className="w-3.5 h-3.5" /> Nova Tarefa
              </Button>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {inboxView ? (
            <InboxView tasks={filteredInbox} onUpdate={refetchInbox} />

          ) : viewMode === "dashboard" && isOwner ? (
            <TasksDashboard workspaceId={selectedWorkspace} onUpdate={() => { refetchTasks(); refetchInbox(); }} />

          ) : viewMode === "clients" ? (
            <ClientTasksView workspaceId={selectedWorkspace} searchQuery={searchQuery} onUpdate={() => { refetchTasks(); refetchInbox(); }} />

          ) : !selectedList ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-xs">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[#407b75]">
                  <CheckSquare className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-base font-bold text-gray-800 mb-1.5">
                  {!selectedWorkspace ? "Sem workspace" : spaces.length === 0 ? "Crie um espaço" : "Selecione uma lista"}
                </h2>
                <p className="text-sm text-gray-400 mb-5">
                  {!selectedWorkspace ? "Crie um workspace para começar" : spaces.length === 0 ? "Espaços organizam suas listas" : "Escolha uma lista no painel lateral"}
                </p>
                {!selectedWorkspace && isOwner && <Button onClick={() => setShowCreateWorkspace(true)} className="bg-[#407b75] hover:bg-[#356862] text-white"><Plus className="w-4 h-4 mr-2" /> Criar Workspace</Button>}
                {selectedWorkspace && spaces.length === 0 && <Button onClick={() => setShowCreateSpace(true)} className="bg-[#407b75] hover:bg-[#356862] text-white"><Plus className="w-4 h-4 mr-2" /> Criar Espaço</Button>}
              </div>
            </div>

          ) : viewMode === "board" ? (
            <TaskBoard tasks={filteredTasks} statuses={statuses} listId={selectedList!} onTaskUpdate={refetchTasks} searchQuery="" />

          ) : (
            <TaskGroupedList tasks={filteredTasks} statuses={statuses} listId={selectedList} onTaskUpdate={refetchTasks} />
          )}
        </div>
      </main>

      {/* Dialogs */}
      {isOwner && <CreateWorkspaceDialog open={showCreateWorkspace} onOpenChange={setShowCreateWorkspace} />}
      <CreateSpaceDialog open={showCreateSpace} onOpenChange={setShowCreateSpace} workspaceId={selectedWorkspace} />
      <CreateListDialog open={showCreateList} onOpenChange={setShowCreateList} spaceId={selectedSpace} />
      <CreateTaskDialog open={showCreateTask} onOpenChange={setShowCreateTask} listId={selectedList} statuses={statuses} onSuccess={refetchTasks} />
      <WorkspaceMembersDialog
        workspaceId={membersWorkspaceId}
        workspaceName={workspaces?.find((w) => w.id === membersWorkspaceId)?.name}
        open={!!membersWorkspaceId}
        onOpenChange={(open) => { if (!open) setMembersWorkspaceId(null); }}
      />
      <TaskDetailFromId
        taskId={deepTaskId}
        open={deepTaskOpen}
        onOpenChange={(open) => { if (!open) { setDeepTaskOpen(false); setSearchParams({}, { replace: true }); } }}
        onUpdate={() => { refetchTasks(); refetchInbox(); }}
      />
      <AlertDialog open={!!deleteWorkspaceDialog} onOpenChange={() => setDeleteWorkspaceDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir workspace?</AlertDialogTitle><AlertDialogDescription>Todos os espaços, listas e tarefas serão excluídos permanentemente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteWorkspaceDialog && handleDeleteWorkspace(deleteWorkspaceDialog)} className="bg-red-600 hover:bg-red-700 text-white">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Sidebar nav item ─────────────────────────
function SidebarNavItem({ icon, label, active, badge, onClick }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all relative ${
        active
          ? "bg-[#407b75]/10 text-[#407b75] shadow-[inset_2px_0_0_0_#407b75]"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      }`}
    >
      <span className={`flex-shrink-0 transition-transform ${active ? "scale-110" : ""}`}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center bg-[#407b75] text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

export default Tarefas;
