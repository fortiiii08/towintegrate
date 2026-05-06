import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useCrmAuth } from '@/store/crmAuth';
import {
  LayoutDashboard, Kanban, Users, MessageSquare, BarChart2,
  LogOut, ArrowLeft,
} from 'lucide-react';

const navItems = [
  { to: '/trafego/crm/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/trafego/crm/kanban', icon: Kanban, label: 'Funil Kanban' },
  { to: '/trafego/crm/leads', icon: Users, label: 'Leads' },
  { to: '/trafego/crm/scripts', icon: MessageSquare, label: 'Scripts' },
  { to: '/trafego/crm/reports', icon: BarChart2, label: 'Relatórios' },
];

export default function CrmLayout() {
  const { user, crmLogout } = useCrmAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    crmLogout();
    navigate('/trafego');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="w-64 flex flex-col shrink-0" style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d1f38 100%)' }}>
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
          <button
            onClick={() => navigate('/trafego')}
            className="text-white/50 hover:text-white transition-colors"
            title="Voltar à lista de clientes"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.tenant?.name || 'CRM'}</p>
            <p className="text-white/40 text-[10px]">Gestão de Leads</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`
              }
              style={({ isActive }) =>
                isActive ? { background: 'linear-gradient(90deg, #0d9488, #ea580c)' } : {}
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg, #0d9488, #ea580c)' }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair do CRM
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
