import { useState, useMemo } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  subMonths, format, isWithinInterval, isToday, isPast, isTomorrow,
  parseISO, differenceInCalendarDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar, CheckCircle2, ChevronDown, ChevronRight,
  AlertCircle, TrendingUp, Users, ArrowLeft, Clock,
  ChevronUp, Target,
} from "lucide-react";
import { useWorkspaceTasks, InboxTask } from "@/hooks/useTasks";
import { TaskDetailFromId } from "./TaskDetailFromId";

interface Props {
  workspaceId: string | null;
  onUpdate: () => void;
}

type PeriodPreset = "this_week" | "this_month" | "last_month" | "custom";

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  normal: "#3b82f6",
  low: "#9ca3af",
};
const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  normal: "Normal",
  low: "Baixa",
};

function getPresetRange(preset: PeriodPreset, customStart: string, customEnd: string) {
  const now = new Date();
  if (preset === "this_week") return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  if (preset === "this_month") return { start: startOfMonth(now), end: endOfMonth(now) };
  if (preset === "last_month") { const lm = subMonths(now, 1); return { start: startOfMonth(lm), end: endOfMonth(lm) }; }
  return {
    start: customStart ? new Date(customStart) : startOfMonth(now),
    end: customEnd ? new Date(customEnd) : endOfMonth(now),
  };
}

function taskDateKey(task: InboxTask): Date {
  return task.due_date ? parseISO(task.due_date) : parseISO(task.created_at);
}

function groupByDate(tasks: InboxTask[]) {
  const map = new Map<string, InboxTask[]>();
  for (const t of tasks) {
    const d = t.due_date ? format(parseISO(t.due_date), "yyyy-MM-dd") : "sem-data";
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(t);
  }
  return Array.from(map.entries()).sort(([a], [b]) => {
    if (a === "sem-data") return 1;
    if (b === "sem-data") return -1;
    return a.localeCompare(b);
  });
}

function dateLabel(dateKey: string): string {
  if (dateKey === "sem-data") return "Sem data definida";
  const d = parseISO(dateKey);
  if (isToday(d)) return "Hoje";
  if (isTomorrow(d)) return "Amanhã";
  const diff = differenceInCalendarDays(d, new Date());
  if (diff < 0) return format(d, "dd 'de' MMMM", { locale: ptBR });
  return format(d, "dd 'de' MMMM", { locale: ptBR });
}

function isOverdueKey(dateKey: string) {
  if (dateKey === "sem-data") return false;
  const d = parseISO(dateKey);
  return isPast(d) && !isToday(d);
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avt({ name, size = 36 }: { name: string; size?: number }) {
  const ini = name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="rounded-full bg-[#407b75] flex items-center justify-center font-bold text-white flex-shrink-0 shadow-sm"
    >
      {ini}
    </div>
  );
}

// ── Thin progress bar ─────────────────────────────────────────────────────────
function Bar({ done, total, thin = false }: { done: number; total: number; thin?: boolean }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${thin ? "h-1" : "h-1.5"}`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#22c55e" : "#407b75" }}
      />
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ icon, value, label, color }: { icon: React.ReactNode; value: number | string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex-1 min-w-0">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-gray-800 leading-none">{value}</p>
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

// ── Period picker (shared) ────────────────────────────────────────────────────
function PeriodPicker({ preset, customStart, customEnd, periodLabel, onChange, onCustomStart, onCustomEnd }: {
  preset: PeriodPreset;
  customStart: string;
  customEnd: string;
  periodLabel: string;
  onChange: (p: PeriodPreset) => void;
  onCustomStart: (v: string) => void;
  onCustomEnd: (v: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
        {([
          ["this_week", "Esta semana"],
          ["this_month", "Este mês"],
          ["last_month", "Mês passado"],
          ["custom", "Personalizado"],
        ] as [PeriodPreset, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              preset === key ? "bg-white shadow text-[#407b75]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input type="date" value={customStart} onChange={(e) => onCustomStart(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-[#407b75] text-gray-700" />
          <span className="text-xs text-gray-400">até</span>
          <input type="date" value={customEnd} onChange={(e) => onCustomEnd(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-[#407b75] text-gray-700" />
        </div>
      )}
      <p className="text-xs text-gray-400 ml-auto capitalize font-medium">{periodLabel}</p>
    </div>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────
function TaskRow({ task, onClick }: { task: InboxTask; onClick: () => void }) {
  const isDone = task.status?.is_done || false;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left group"
    >
      {isDone
        ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
        : <div className="w-3.5 h-3.5 rounded-sm border-2 flex-shrink-0 group-hover:border-[#407b75] transition-colors"
            style={{ borderColor: task.status?.color || "#d1d5db" }} />
      }
      <span className={`text-xs flex-1 truncate ${isDone ? "line-through text-gray-400" : "text-gray-700"}`}>
        {task.title}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {task.cidade_client && (
          <span className="text-[9px] text-[#407b75] bg-[#407b75]/10 px-1.5 py-0.5 rounded-full truncate max-w-[72px]">
            {task.cidade_client.name}
          </span>
        )}
        <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
          style={{ color: PRIORITY_COLOR[task.priority], backgroundColor: `${PRIORITY_COLOR[task.priority]}15` }}>
          {PRIORITY_LABEL[task.priority]}
        </span>
      </div>
    </button>
  );
}

// ── Collab overview card (grid view) ─────────────────────────────────────────
function CollabCard({ name, tasks, onDrill, onOpenTask }: {
  name: string;
  tasks: InboxTask[];
  onDrill: () => void;
  onOpenTask: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const done = tasks.filter((t) => t.status?.is_done).length;
  const overdue = tasks.filter((t) => {
    if (!t.due_date || t.status?.is_done) return false;
    return isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date));
  }).length;
  const pct = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
  const byDate = groupByDate(tasks);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Clickable header → drill down */}
      <button
        onClick={onDrill}
        className="w-full px-4 pt-4 pb-3 border-b border-gray-100 text-left hover:bg-gray-50/60 transition-colors group"
      >
        <div className="flex items-center gap-3 mb-3">
          <Avt name={name} size={42} />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-800 text-sm truncate group-hover:text-[#407b75] transition-colors">{name}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {tasks.length} tarefa{tasks.length !== 1 ? "s" : ""} · {done} concluída{done !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-lg font-black text-[#407b75]">{pct}%</span>
            {overdue > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                <AlertCircle size={8} /> {overdue} atras.
              </span>
            )}
          </div>
        </div>
        <Bar done={done} total={tasks.length} />
        <p className="text-[10px] text-[#407b75] font-semibold mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Ver detalhes <ChevronRight size={10} />
        </p>
      </button>

      {/* Expandable mini task list */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 text-[11px] text-gray-400 hover:bg-gray-50 transition-colors"
      >
        <span>Tarefas por data</span>
        {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {expanded && (
        <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 border-t border-gray-50">
          {byDate.map(([dk, dTasks]) => {
            const overG = isOverdueKey(dk);
            return (
              <div key={dk}>
                <div className={`flex items-center gap-1.5 px-4 py-1.5 ${overG ? "bg-red-50" : "bg-gray-50"}`}>
                  <Calendar size={9} className={overG ? "text-red-400" : "text-gray-400"} />
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${overG ? "text-red-500" : "text-gray-500"}`}>
                    {dateLabel(dk)}{overG && " · Atrasado"}
                  </span>
                  <span className="ml-auto text-[9px] text-gray-400">{dTasks.filter(t => t.status?.is_done).length}/{dTasks.length}</span>
                </div>
                {dTasks.map((t) => <TaskRow key={t.id} task={t} onClick={() => onOpenTask(t.id)} />)}
              </div>
            );
          })}
          {tasks.length === 0 && <p className="text-xs text-gray-400 text-center py-5">Sem tarefas</p>}
        </div>
      )}
    </div>
  );
}

// ── Collab drill-down view ────────────────────────────────────────────────────
function CollabDetailView({ name, tasks, onBack, onOpenTask }: {
  name: string;
  tasks: InboxTask[];
  onBack: () => void;
  onOpenTask: (id: string) => void;
}) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set(["all"]));

  const done = tasks.filter((t) => t.status?.is_done).length;
  const overdue = tasks.filter((t) => {
    if (!t.due_date || t.status?.is_done) return false;
    return isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date));
  }).length;
  const pct = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
  const pending = tasks.length - done;

  const byDate = groupByDate(tasks);

  const toggleDate = (dk: string) => {
    setExpandedDates((prev) => {
      const n = new Set(prev);
      n.has(dk) ? n.delete(dk) : n.add(dk);
      return n;
    });
  };

  // Init all dates expanded
  useMemo(() => {
    setExpandedDates(new Set(byDate.map(([dk]) => dk)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length]);

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-gray-400 hover:text-[#407b75] text-xs font-medium transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Todos os colaboradores
        </button>
      </div>

      {/* Collab hero card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
        <div className="flex items-center gap-4 mb-5">
          <Avt name={name} size={52} />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-gray-800">{name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{tasks.length} tarefa{tasks.length !== 1 ? "s" : ""} no período selecionado</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-[#407b75]">{pct}%</p>
            <p className="text-[10px] text-gray-400">taxa de conclusão</p>
          </div>
        </div>
        <Bar done={done} total={tasks.length} />
      </div>

      {/* Stats row */}
      <div className="flex gap-3 flex-wrap">
        <StatPill icon={<Target size={16} className="text-[#407b75]" />} value={tasks.length} label="Total" color="bg-[#407b75]/10" />
        <StatPill icon={<CheckCircle2 size={16} className="text-green-500" />} value={done} label="Concluídas" color="bg-green-50" />
        <StatPill icon={<Clock size={16} className="text-amber-500" />} value={pending} label="Pendentes" color="bg-amber-50" />
        <StatPill icon={<AlertCircle size={16} className="text-red-500" />} value={overdue} label="Atrasadas" color="bg-red-50" />
      </div>

      {/* Date timeline */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Linha do tempo por data</h3>

        {byDate.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-14 gap-3">
            <TrendingUp className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-400">Sem tarefas no período</p>
          </div>
        )}

        {byDate.map(([dk, dTasks]) => {
          const overG = isOverdueKey(dk);
          const dDone = dTasks.filter((t) => t.status?.is_done).length;
          const dPct = dTasks.length === 0 ? 0 : Math.round((dDone / dTasks.length) * 100);
          const isOpen = expandedDates.has(dk);
          const dOverdue = dTasks.filter((t) => {
            if (!t.due_date || t.status?.is_done) return false;
            return isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date));
          }).length;

          return (
            <div
              key={dk}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                overG ? "border-red-100" : "border-gray-100"
              }`}
            >
              {/* Date section header */}
              <button
                onClick={() => toggleDate(dk)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                  overG ? "hover:bg-red-50/50" : "hover:bg-gray-50"
                }`}
              >
                {/* Date badge */}
                <div className={`flex-shrink-0 flex flex-col items-center justify-center w-11 h-11 rounded-xl text-center ${
                  overG ? "bg-red-50" : isToday(dk !== "sem-data" ? parseISO(dk) : new Date()) ? "bg-[#407b75]/10" : "bg-gray-50"
                }`}>
                  {dk === "sem-data" ? (
                    <Calendar size={18} className="text-gray-400" />
                  ) : (
                    <>
                      <span className={`text-[10px] font-bold uppercase ${overG ? "text-red-400" : "text-gray-400"}`}>
                        {format(parseISO(dk), "MMM", { locale: ptBR })}
                      </span>
                      <span className={`text-base font-black leading-none ${overG ? "text-red-500" : "text-gray-800"}`}>
                        {format(parseISO(dk), "dd")}
                      </span>
                    </>
                  )}
                </div>

                {/* Label + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-sm font-bold truncate ${overG ? "text-red-600" : "text-gray-800"}`}>
                      {dateLabel(dk)}
                    </span>
                    {overG && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        <AlertCircle size={8} /> Atrasado
                      </span>
                    )}
                    {dOverdue > 0 && !overG && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        <AlertCircle size={8} /> {dOverdue} atras.
                      </span>
                    )}
                  </div>
                  <Bar done={dDone} total={dTasks.length} thin />
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className={`text-sm font-black ${dPct === 100 ? "text-green-500" : overG ? "text-red-500" : "text-[#407b75]"}`}>{dPct}%</p>
                    <p className="text-[9px] text-gray-400">{dDone}/{dTasks.length}</p>
                  </div>
                  {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </div>
              </button>

              {/* Task list */}
              {isOpen && (
                <div className="border-t border-gray-50 divide-y divide-gray-50">
                  {dTasks.map((t) => <TaskRow key={t.id} task={t} onClick={() => onOpenTask(t.id)} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export function TasksDashboard({ workspaceId, onUpdate }: Props) {
  const [preset, setPreset] = useState<PeriodPreset>("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [drillAssignee, setDrillAssignee] = useState<{ name: string; tasks: InboxTask[] } | null>(null);

  const { data: allTasks = [], isLoading } = useWorkspaceTasks(workspaceId);

  const { start, end } = getPresetRange(preset, customStart, customEnd);

  const periodTasks = useMemo(() => {
    return allTasks.filter((t) => isWithinInterval(taskDateKey(t), { start, end }));
  }, [allTasks, start, end]);

  const byAssignee = useMemo(() => {
    const map = new Map<string, { id: string; name: string; tasks: InboxTask[] }>();
    for (const t of periodTasks) {
      if (!t.assignee_id || !t.assignee_name) continue;
      if (!map.has(t.assignee_id)) map.set(t.assignee_id, { id: t.assignee_id, name: t.assignee_name, tasks: [] });
      map.get(t.assignee_id)!.tasks.push(t);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [periodTasks]);

  // Sync drill tasks when period changes
  const drillTasks = useMemo(() => {
    if (!drillAssignee) return [];
    const found = byAssignee.find((a) => a.name === drillAssignee.name);
    return found?.tasks ?? [];
  }, [drillAssignee, byAssignee]);

  const totalTasks = periodTasks.length;
  const doneTasks = periodTasks.filter((t) => t.status?.is_done).length;
  const overdueTasks = periodTasks.filter((t) => {
    if (!t.due_date || t.status?.is_done) return false;
    return isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date));
  }).length;

  const periodLabel = preset === "this_week" ? "Esta semana"
    : preset === "this_month" ? format(new Date(), "MMMM yyyy", { locale: ptBR })
    : preset === "last_month" ? format(subMonths(new Date(), 1), "MMMM yyyy", { locale: ptBR })
    : `${format(start, "dd/MM")} – ${format(end, "dd/MM/yyyy")}`;

  const openTask = (id: string) => { setSelectedTaskId(id); setDetailOpen(true); };

  return (
    <div className="space-y-6">

      {/* Period picker — always visible */}
      <PeriodPicker
        preset={preset} customStart={customStart} customEnd={customEnd} periodLabel={periodLabel}
        onChange={(p) => { setPreset(p); setDrillAssignee(null); }}
        onCustomStart={setCustomStart} onCustomEnd={setCustomEnd}
      />

      {drillAssignee ? (
        /* ── DRILL-DOWN VIEW ─────────────────────────────────────────── */
        <CollabDetailView
          name={drillAssignee.name}
          tasks={drillTasks}
          onBack={() => setDrillAssignee(null)}
          onOpenTask={openTask}
        />
      ) : (
        /* ── OVERVIEW ────────────────────────────────────────────────── */
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total de tarefas", value: totalTasks, icon: <Target size={18} className="text-[#407b75]" />, color: "bg-[#407b75]/10" },
              { label: "Concluídas", value: doneTasks, icon: <CheckCircle2 size={18} className="text-green-500" />, color: "bg-green-50" },
              { label: "Atrasadas", value: overdueTasks, icon: <AlertCircle size={18} className="text-red-500" />, color: "bg-red-50" },
              { label: "Colaboradores", value: byAssignee.length, icon: <Users size={18} className="text-blue-500" />, color: "bg-blue-50" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color}`}>{stat.icon}</div>
                <div>
                  <p className="text-xl font-black text-gray-800">{stat.value}</p>
                  <p className="text-[11px] text-gray-400">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Collaborator cards */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#407b75] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : byAssignee.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-600">Nenhuma tarefa atribuída no período</p>
              <p className="text-xs text-gray-400">Tente alterar o período ou verifique se há tarefas com responsável</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-gray-400 px-0.5">
                Clique em um colaborador para ver a análise detalhada por data
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {byAssignee.map(({ name, tasks }) => (
                  <CollabCard
                    key={name}
                    name={name}
                    tasks={tasks}
                    onDrill={() => setDrillAssignee({ name, tasks })}
                    onOpenTask={openTask}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <TaskDetailFromId
        taskId={selectedTaskId}
        open={detailOpen}
        onOpenChange={(open) => { setDetailOpen(open); if (!open) setSelectedTaskId(null); }}
        onUpdate={onUpdate}
      />
    </div>
  );
}
