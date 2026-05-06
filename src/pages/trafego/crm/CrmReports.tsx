import { useQuery } from '@tanstack/react-query';
import crmApi from '@/lib/crmApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CrmReports() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['crm-campaigns-report'],
    queryFn: () => crmApi.get('/reports/campaigns').then(r => r.data),
  });
  const { data: agents = [] } = useQuery({
    queryKey: ['crm-agents-report'],
    queryFn: () => crmApi.get('/reports/agents').then(r => r.data),
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-sm text-gray-500 mt-1">Análise de campanhas e performance</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Leads por Campanha</h3>
        {campaigns.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhuma campanha registrada</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={campaigns}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="leadsCount" fill="#6366f1" radius={[4, 4, 0, 0]} name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        )}
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
