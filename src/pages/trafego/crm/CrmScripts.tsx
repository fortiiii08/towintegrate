import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import crmApi from '@/lib/crmApi';
import { Search, Copy, Check } from 'lucide-react';

const CATEGORIES: Record<string, string> = {
  FIRST_CONTACT: 'Primeiro Contato',
  QUALIFICATION: 'Qualificação',
  FOLLOW_UP: 'Follow-up',
  SCHEDULING: 'Agendamento',
  REACTIVATION: 'Reativação',
  PROPOSAL: 'Proposta',
  CLOSING: 'Fechamento',
};

export default function CrmScripts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const { data: scripts = [], isLoading } = useQuery({
    queryKey: ['crm-scripts', category],
    queryFn: () => {
      const params = category ? `?category=${category}` : '';
      return crmApi.get(`/scripts${params}`).then(r => r.data);
    },
  });

  const useMutation_ = useMutation({
    mutationFn: (id: string) => crmApi.post(`/scripts/${id}/use`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-scripts'] }),
  });

  const handleCopy = (script: any) => {
    navigator.clipboard.writeText(script.content);
    useMutation_.mutate(script.id);
    setCopied(script.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const filtered = scripts.filter((s: any) =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scripts</h1>
        <p className="text-sm text-gray-500 mt-1">Biblioteca de scripts de atendimento</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar scripts..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 pl-9 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">Todas categorias</option>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((script: any) => (
            <div key={script.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{script.title}</p>
                  <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700">
                    {CATEGORIES[script.category] || script.category}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(script)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    copied === script.id ? 'bg-green-50 text-green-700' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {copied === script.id ? <><Check className="w-3 h-3" />Copiado</> : <><Copy className="w-3 h-3" />Copiar</>}
                </button>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-4">{script.content}</p>
              <p className="text-xs text-gray-400">{script.usageCount} uso{script.usageCount !== 1 ? 's' : ''}</p>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-gray-400 text-sm col-span-2">Nenhum script encontrado</p>}
        </div>
      )}
    </div>
  );
}
