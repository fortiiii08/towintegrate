import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import crmApi from '@/lib/crmApi';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import type { CollisionDetection } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Clock, CheckSquare, User, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function getSlaColor(status: string) {
  if (status === 'WARNING') return 'border-l-yellow-400';
  if (status === 'CRITICAL') return 'border-l-orange-500';
  if (status === 'OVERDUE') return 'border-l-red-500';
  return 'border-l-transparent';
}

function LeadCard({ lead, onClick }: { lead: any; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`relative rounded-lg border border-gray-200 border-l-4 ${getSlaColor(lead.slaStatus)} p-3 bg-white cursor-pointer hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 leading-tight">{lead.name}</p>
        {lead.slaStatus !== 'OK' && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
            lead.slaStatus === 'OVERDUE' ? 'bg-red-100 text-red-700' :
            lead.slaStatus === 'CRITICAL' ? 'bg-orange-100 text-orange-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {lead.slaStatus === 'OVERDUE' ? 'VENCIDO' : lead.slaStatus === 'CRITICAL' ? 'CRÍTICO' : 'ATENÇÃO'}
          </span>
        )}
      </div>
      {lead.bankWorked && <p className="text-xs text-gray-500 mt-1">{lead.bankWorked}</p>}
      <div className="flex items-center gap-3 mt-2.5">
        {lead.assignedTo && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <User className="w-3 h-3" />
            {lead.assignedTo.name.split(' ')[0]}
          </span>
        )}
        {lead._count?.tasks > 0 && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <CheckSquare className="w-3 h-3" />
            {lead._count.tasks}
          </span>
        )}
        <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(lead.createdAt), { locale: ptBR, addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

function KanbanColumn({ stage, leads, onLeadClick }: { stage: any; leads: any[]; onLeadClick: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className="w-72 shrink-0 flex flex-col">
      <div className="flex items-center gap-2 px-1 mb-3">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
        <h3 className="text-sm font-semibold text-gray-700">{stage.name}</h3>
        <span className="ml-auto text-xs bg-gray-200 text-gray-600 font-medium px-2 py-0.5 rounded-full">
          {leads.length}
        </span>
      </div>
      <SortableContext items={leads.map(l => l.id)}>
        <div
          ref={setNodeRef}
          className={`flex-1 overflow-y-auto space-y-2 pr-1 min-h-[100px] rounded-lg transition-colors ${
            isOver ? 'bg-indigo-50 ring-2 ring-indigo-300 ring-inset' : ''
          }`}
        >
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead.id)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function kanbanCollision(stageIds: string[]): CollisionDetection {
  return (args) => {
    const columnHits = pointerWithin({ ...args, droppableContainers: args.droppableContainers.filter(c => stageIds.includes(String(c.id))) });
    if (columnHits.length > 0) return columnHits;
    return rectIntersection(args);
  };
}

export default function CrmKanban() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeLead, setActiveLead] = useState<any>(null);

  const { data: pipelines = [] } = useQuery({
    queryKey: ['crm-pipelines'],
    queryFn: () => crmApi.get('/pipelines').then(r => r.data),
  });

  const [selectedPipeline, setSelectedPipeline] = useState<string>('');

  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipeline) {
      setSelectedPipeline(pipelines[0].id);
    }
  }, [pipelines]);

  const { data: kanban, isLoading } = useQuery({
    queryKey: ['crm-kanban', selectedPipeline],
    queryFn: () => crmApi.get(`/leads/kanban/${selectedPipeline}`).then(r => r.data),
    enabled: !!selectedPipeline,
    refetchInterval: 30000,
  });

  const moveMutation = useMutation({
    mutationFn: ({ leadId, stageId }: any) => crmApi.patch(`/leads/${leadId}/stage`, { stageId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-kanban'] }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (e: DragStartEvent) => {
    const lead = kanban?.stages?.flatMap((s: any) => s.leads).find((l: any) => l.id === e.active.id);
    setActiveLead(lead);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const stages = kanban?.stages || [];
    let targetStage = stages.find((s: any) => s.id === over.id);
    if (!targetStage) {
      for (const stage of stages) {
        if (stage.leads.some((l: any) => l.id === over.id)) {
          targetStage = stage;
          break;
        }
      }
    }
    if (targetStage) moveMutation.mutate({ leadId: active.id, stageId: targetStage.id });
  };

  if (isLoading) return <div className="p-6 text-gray-500">Carregando funil...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Funil Kanban</h1>
          <p className="text-sm text-gray-500">Arraste os cards entre as colunas</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <select
            value={selectedPipeline}
            onChange={e => setSelectedPipeline(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 w-52"
          >
            {pipelines.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => navigate('/trafego/crm/leads')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'linear-gradient(90deg, #0d9488, #ea580c)' }}
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={kanbanCollision(kanban?.stages?.map((s: any) => s.id) ?? [])}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {kanban?.stages?.map((stage: any) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                leads={stage.leads || []}
                onLeadClick={(id) => navigate(`/trafego/crm/leads/${id}`)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeLead && (
              <div className="bg-white rounded-lg border-2 border-indigo-400 p-3 shadow-xl w-72 opacity-90">
                <p className="text-sm font-semibold">{activeLead.name}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
