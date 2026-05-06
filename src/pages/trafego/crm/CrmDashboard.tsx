import { useQuery } from '@tanstack/react-query';
import crmApi from '@/lib/crmApi';
import { Users, UserCheck, UserX, Clock, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function SlaBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-24">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(value * 10, 100)}%` }} />
      </div>
      <span className="text-sm font-medium w-6 text-right">{value}</span>
    </div>
  );
}

export default function CrmDashboard() {
  const { data: dash } = useQuery({
    queryKey: ['crm-dashboard'],
    queryFn: () => crmApi.get('/reports/dashboard').then(r => r.data),
  });
  const { data: byDay = [] } = useQuery({
    queryKey: ['crm-leads-by-day'],
    queryFn: () => crmApi.get('/reports/leads-by-day?days=14').then(r => r.data),
  });
  const { data: agents = [] } = useQuery({
    queryKey: ['crm-agents-report'],
    queryFn: () => crmApi.get('/reports/agents').then(r => r.data),
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do desempenho comercial</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total de Leads" value={dash?.totalLeads} icon={Users} color="bg-indigo-500" sub={`+${dash?.leadsToday || 0} hoje`} />
        <StatCard label="Clientes Fechados" value={dash?.clientesFechados} icon={UserCheck} color="bg-green-500" sub={`${dash?.taxaFechamento}% conversão`} />
        <StatCard label="Leads Perdidos" value={dash?.leadsPeridos} icon={UserX} color="bg-red-500" />
        <StatCard label="Tempo Médio Contato" value={dash?.avgFirstContactMinutes != null ? `${dash.avgFirstContactMinutes}min` : '—'} icon={Clock} color="bg-blue-500" sub="primeiro contato" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Leads por Dia (14 dias)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => [v, 'Leads']} labelFormatter={l => `Data: ${l}`} />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-gray-900">Status SLA</h3>
          </div>
          <div className="space-y-3">
            <SlaBar label="OK" value={dash?.sla?.ok || 0} color="bg-green-500" />
            <SlaBar label="Atenção (5min)" value={dash?.sla?.warning || 0} color="bg-yellow-500" />
            <SlaBar label="Crítico (10min)" value={dash?.sla?.critical || 0} color="bg-orange-500" />
            <SlaBar label="Vencido (30min+)" value={dash?.sla?.overdue || 0} color="bg-red-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Performance da Equipe</h3>
        {agents.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhum dado disponível</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">Atendente</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Leads</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Qualificados</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Fechados</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Conversão</th>
                  <th className="text-center py-2 text-gray-500 font-medium">SLA OK</th>
                  <th className="text-center py-2 text-gray-500 font-medium">SLA Vencido</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a: any) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 font-medium">{a.name}</td>
                    <td className="py-3 text-center">{a.totalLeads}</td>
                    <td className="py-3 text-center">{a.qualified}</td>
                    <td className="py-3 text-center text-green-600 font-medium">{a.closed}</td>
                    <td className="py-3 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700">{a.conversionRate}%</span>
                    </td>
                    <td className="py-3 text-center text-green-600">{a.slaOk}</td>
                    <td className="py-3 text-center text-red-600">{a.slaOverdue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
