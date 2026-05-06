import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import crmApi from '@/lib/crmApi';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft, MessageCircle, Phone, Mail, Building2, Clock,
  CheckSquare, FileText, ChevronRight, User, Tag, Send,
  Plus, AlertTriangle, Trash2,
} from 'lucide-react';

const EVENT_ICONS: Record<string, any> = {
  CREATED: { icon: Plus, color: 'text-indigo-500 bg-indigo-50' },
  STAGE_CHANGED: { icon: ChevronRight, color: 'text-blue-500 bg-blue-50' },
  WHATSAPP_SENT: { icon: MessageCircle, color: 'text-green-500 bg-green-50' },
  NOTE_ADDED: { icon: FileText, color: 'text-gray-500 bg-gray-50' },
  TASK_CREATED: { icon: CheckSquare, color: 'text-purple-500 bg-purple-50' },
  TASK_COMPLETED: { icon: CheckSquare, color: 'text-green-500 bg-green-50' },
  SLA_WARNING: { icon: AlertTriangle, color: 'text-yellow-500 bg-yellow-50' },
  SLA_OVERDUE: { icon: AlertTriangle, color: 'text-red-500 bg-red-50' },
  ASSIGNED: { icon: User, color: 'text-blue-500 bg-blue-50' },
  SCRIPT_USED: { icon: FileText, color: 'text-indigo-500 bg-indigo-50' },
};

function ScriptModal({ lead, onClose }: { lead: any; onClose: () => void }) {
  const [selected, setSelected] = useState<any>(null);
  const [preview, setPreview] = useState('');

  const { data: scripts = [] } = useQuery({
    queryKey: ['crm-scripts'],
    queryFn: () => crmApi.get('/scripts').then(r => r.data),
  });

  const selectScript = (s: any) => {
    setSelected(s);
    setPreview(s.content.replace(/\{\{nome\}\}/g, lead.name));
  };

  const copy = () => {
    navigator.clipboard.writeText(preview);
    crmApi.post(`/scripts/${selected.id}/use`);
    crmApi.post(`/leads/${lead.id}/whatsapp`);
    onClose();
  };

  const categories: Record<string, string> = {
    FIRST_CONTACT: 'Primeiro Contato', QUALIFICATION: 'Qualificação', FOLLOW_UP: 'Follow-up',
    SCHEDULING: 'Agendamento', REACTIVATION: 'Reativação', PROPOSAL: 'Proposta', CLOSING: 'Fechamento',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold">Scripts de Atendimento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 border-r border-gray-100 overflow-y-auto p-3 space-y-1">
            {scripts.map((s: any) => (
              <button
                key={s.id}
                onClick={() => selectScript(s)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${selected?.id === s.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <p className="font-medium leading-tight">{s.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{categories[s.category]}</p>
              </button>
            ))}
          </div>
          <div className="flex-1 p-5 flex flex-col">
            {selected ? (
              <>
                <p className="text-sm font-medium text-gray-700 mb-2">Preview para {lead.name}:</p>
                <textarea
                  value={preview}
                  onChange={e => setPreview(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 resize-none font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-indigo-300"
                  rows={12}
                />
                <button onClick={copy} className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: 'linear-gradient(90deg, #0d9488, #ea580c)' }}>
                  <Send className="w-4 h-4" />
                  Copiar e Registrar Contato
                </button>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Selecione um script ao lado</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-400 flex items-center gap-1"><Icon className="w-3 h-3" />{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}

export default function CrmLeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [showScript, setShowScript] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [showTask, setShowTask] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ['crm-lead', id],
    queryFn: () => crmApi.get(`/leads/${id}`).then(r => r.data),
  });

  const { data: pipelines = [] } = useQuery({
    queryKey: ['crm-pipelines'],
    queryFn: () => crmApi.get('/pipelines').then(r => r.data),
  });

  const noteMutation = useMutation({
    mutationFn: () => crmApi.post(`/leads/${id}/notes`, { note }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['crm-lead', id] }); setNote(''); },
  });

  const stageMutation = useMutation({
    mutationFn: (stageId: string) => crmApi.patch(`/leads/${id}/stage`, { stageId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-lead', id] }),
  });

  const taskMutation = useMutation({
    mutationFn: () => crmApi.post('/tasks', { leadId: id, title: taskTitle }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['crm-lead', id] }); setTaskTitle(''); setShowTask(false); },
  });

  const whatsappMutation = useMutation({
    mutationFn: () => crmApi.post(`/leads/${id}/whatsapp`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-lead', id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => crmApi.delete(`/leads/${id}`),
    onSuccess: () => navigate('/trafego/crm/leads'),
  });

  const handleDelete = () => {
    if (confirm(`Remover o lead "${lead?.name}"?`)) deleteMutation.mutate();
  };

  if (isLoading) return <div className="p-6 text-gray-500">Carregando...</div>;
  if (!lead) return <div className="p-6 text-gray-500">Lead não encontrado</div>;

  const phone = lead.phone?.replace(/\D/g, '');
  const waLink = `https://wa.me/55${phone}?text=${encodeURIComponent(`Olá ${lead.name}, tudo bem?`)}`;
  const allStages = pipelines.find((p: any) => p.id === lead.pipelineId)?.stages || [];
  const slaColors: Record<string, string> = {
    OK: 'bg-green-100 text-green-700',
    WARNING: 'bg-yellow-100 text-yellow-700',
    CRITICAL: 'bg-orange-100 text-orange-700',
    OVERDUE: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 -ml-1 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${slaColors[lead.slaStatus]}`}>{lead.slaStatus}</span>
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lead.stage?.color }} />
                    {lead.stage?.name}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { setShowScript(true); window.open(waLink, '_blank'); whatsappMutation.mutate(); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
                <button onClick={() => setShowScript(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                  <FileText className="w-4 h-4" />
                  Scripts
                </button>
                <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                  <Trash2 className="w-4 h-4" />
                  Remover
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Mover Etapa</h3>
            <div className="flex flex-wrap gap-2">
              {allStages.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => stageMutation.mutate(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    lead.stageId === s.id ? 'border-transparent text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                  }`}
                  style={lead.stageId === s.id ? { backgroundColor: s.color } : {}}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-3">
              {(lead.events || []).map((ev: any) => {
                const cfg = EVENT_ICONS[ev.type] || EVENT_ICONS.NOTE_ADDED;
                const Icon = cfg.icon;
                return (
                  <div key={ev.id} className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm text-gray-800">{ev.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ev.user?.name && <span>{ev.user.name} · </span>}
                        {formatDistanceToNow(new Date(ev.createdAt), { locale: ptBR, addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Adicionar observação..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 resize-none text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                rows={3}
              />
              <button
                onClick={() => noteMutation.mutate()}
                disabled={!note.trim()}
                className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors"
                style={{ background: 'linear-gradient(90deg, #0d9488, #ea580c)' }}
              >
                <Send className="w-4 h-4" />
                Adicionar Nota
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Tarefas</h3>
              <button onClick={() => setShowTask(!showTask)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                <Plus className="w-3 h-3" />
                Nova Tarefa
              </button>
            </div>
            {showTask && (
              <div className="flex gap-2 mb-4">
                <input
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="Título da tarefa..."
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button onClick={() => taskMutation.mutate()} disabled={!taskTitle} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ background: 'linear-gradient(90deg, #0d9488, #ea580c)' }}>Criar</button>
              </div>
            )}
            <div className="space-y-2">
              {(lead.tasks || []).map((task: any) => (
                <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg border ${task.status === 'COMPLETED' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'}`}>
                  <CheckSquare className={`w-4 h-4 ${task.status === 'COMPLETED' ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className={`flex-1 text-sm ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</span>
                  <span className="text-xs text-gray-400">{task.priority}</span>
                </div>
              ))}
              {(lead.tasks || []).length === 0 && <p className="text-sm text-gray-400">Nenhuma tarefa</p>}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Informações</h3>
            <InfoItem icon={Phone} label="Telefone" value={lead.phone} />
            <InfoItem icon={Mail} label="E-mail" value={lead.email} />
            <InfoItem icon={Building2} label="Banco" value={lead.bankWorked} />
            <InfoItem icon={Clock} label="Desligamento" value={lead.timeSinceDismissal} />
            <InfoItem icon={Tag} label="Origem" value={lead.source} />
            <InfoItem icon={Tag} label="Campanha" value={lead.campaign?.name} />
            <InfoItem icon={Tag} label="Anúncio" value={lead.adName} />
            <InfoItem icon={User} label="Responsável" value={lead.assignedTo?.name} />
            <div>
              <p className="text-xs text-gray-400">Data de entrada</p>
              <p className="text-sm text-gray-800">{format(new Date(lead.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Ações Rápidas</h3>
            <div className="space-y-2">
              <a href={waLink} target="_blank" rel="noreferrer" onClick={() => whatsappMutation.mutate()}
                className="flex items-center gap-3 p-3 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Abrir WhatsApp</span>
              </a>
              <button onClick={() => setShowScript(true)} className="flex w-full items-center gap-3 p-3 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Ver Scripts</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showScript && <ScriptModal lead={lead} onClose={() => setShowScript(false)} />}
    </div>
  );
}
