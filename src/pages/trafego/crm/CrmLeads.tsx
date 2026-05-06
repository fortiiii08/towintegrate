import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import crmApi from '@/lib/crmApi';
import { Search, Plus, MessageCircle, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SLA_CONFIG = {
  OK: { label: 'OK', className: 'bg-green-100 text-green-700' },
  WARNING: { label: 'Atenção', className: 'bg-yellow-100 text-yellow-700' },
  CRITICAL: { label: 'Crítico', className: 'bg-orange-100 text-orange-700' },
  OVERDUE: { label: 'Vencido', className: 'bg-red-100 text-red-700' },
};

function NewLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', bankWorked: '', timeSinceDismissal: '', adName: '', formName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await crmApi.post('/leads', { ...form, source: 'manual' });
      if (data.existing) setError('Lead com este telefone já existe no sistema.');
      else { onCreated(); onClose(); }
    } catch { setError('Erro ao criar lead'); } finally { setLoading(false); }
  };

  const field = (key: string, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={(form as any)[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-lg p-6">
        <h2 className="text-lg font-bold mb-5">Novo Lead</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">{field('name', 'Nome completo *', 'text', 'João Silva')}</div>
            {field('phone', 'Telefone *', 'tel', '(11) 9 9999-9999')}
            {field('email', 'E-mail', 'email', 'joao@email.com')}
            {field('bankWorked', 'Banco onde trabalhou', 'text', 'Banco do Brasil')}
            {field('timeSinceDismissal', 'Tempo desde desligamento', 'text', 'Ex: 8 meses')}
            {field('adName', 'Nome do anúncio', 'text')}
            {field('formName', 'Formulário', 'text')}
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!form.name || !form.phone || loading}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: 'linear-gradient(90deg, #0d9488, #ea580c)' }}
            >
              {loading ? 'Salvando...' : 'Criar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CrmLeads() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [slaFilter, setSlaFilter] = useState('');
  const [showNew, setShowNew] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['crm-leads', search, slaFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (slaFilter) params.set('slaStatus', slaFilter);
      return crmApi.get(`/leads?${params}`).then(r => r.data);
    },
  });

  const whatsappMutation = useMutation({
    mutationFn: (id: string) => crmApi.post(`/leads/${id}/whatsapp`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-leads'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.delete(`/leads/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-leads'] }),
  });

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Remover o lead "${name}"? Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate(id);
    }
  };

  const openWhatsapp = (e: React.MouseEvent, lead: any) => {
    e.stopPropagation();
    const phone = lead.phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá ${lead.name}, tudo bem? Sou do escritório e gostaria de conversar sobre os seus direitos.`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
    whatsappMutation.mutate(lead.id);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">{leads.length} lead{leads.length !== 1 ? 's' : ''} encontrado{leads.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'linear-gradient(90deg, #0d9488, #ea580c)' }}
        >
          <Plus className="w-4 h-4" />
          Novo Lead
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou telefone..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 pl-9 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <select
          value={slaFilter}
          onChange={e => setSlaFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 w-44"
        >
          <option value="">Todos os SLA</option>
          <option value="WARNING">Atenção</option>
          <option value="CRITICAL">Crítico</option>
          <option value="OVERDUE">Vencido</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Lead</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Contato</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Banco</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Etapa</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">SLA</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Entrada</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum lead encontrado</td></tr>
            ) : leads.map((lead: any) => {
              const sla = SLA_CONFIG[lead.slaStatus as keyof typeof SLA_CONFIG] || SLA_CONFIG.OK;
              return (
                <tr key={lead.id} onClick={() => navigate(`/trafego/crm/leads/${lead.id}`)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{lead.name}</p>
                    {lead.assignedTo && <p className="text-xs text-gray-400">{lead.assignedTo.name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{lead.phone}</p>
                    {lead.email && <p className="text-xs text-gray-400">{lead.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{lead.bankWorked || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lead.stage?.color || '#999' }} />
                      <span className="text-gray-700">{lead.stage?.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sla.className}`}>{sla.label}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {formatDistanceToNow(new Date(lead.createdAt), { locale: ptBR, addSuffix: true })}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={e => openWhatsapp(e, lead)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Abrir WhatsApp">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button onClick={e => handleDelete(e, lead.id, lead.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remover lead">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NewLeadModal
          onClose={() => setShowNew(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['crm-leads'] })}
        />
      )}
    </div>
  );
}
