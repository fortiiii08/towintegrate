import { useNavigate } from 'react-router-dom';
import { LogOut, GraduationCap, Users } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { setAuthToken } from '@/lib/api';
import lendasLogo from '@/assets/lendas-logo.png';
import lendasBg from '@/assets/lendas-bg.png';

const GOLD = '#C9A84C';
const GOLD_LIGHT = '#e8c86a';
const GOLD_DARK = '#8b6914';

const OWNER_EMAIL = 'gustavosaforti@gmail.com';

const LendasHome = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuthContext();
  const isOwner = user?.email === OWNER_EMAIL;
  const firstName = profile?.name?.split(' ')[0] || 'Membro';

  const handleLogout = () => {
    setAuthToken(null);
    navigate('/lendas/login');
  };

  const modules = [
    { id: 'escola', title: 'Escola de Vendas', description: 'Carregando...', icon: GraduationCap, path: null },
    { id: 'comunidade', title: 'A Comunidade', description: 'Carregando...', icon: Users, path: null },
  ];

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden font-lufga">

      {/* BG */}
      <div className="absolute inset-0 z-0"
        style={{ backgroundImage: `url(${lendasBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="absolute inset-0 z-0"
        style={{ background: 'linear-gradient(160deg, rgba(0,0,0,0.88) 0%, rgba(10,6,2,0.80) 50%, rgba(0,0,0,0.92) 100%)' }} />

      {/* Header */}
      <header className="relative z-10 px-8 py-6 flex items-center justify-between border-b"
        style={{ borderColor: `${GOLD}18` }}>
        <img src={lendasLogo} alt="Lendas Milionárias"
          className="h-10 object-contain"
          style={{ filter: `drop-shadow(0 0 10px ${GOLD}55)` }} />

        <div className="flex items-center gap-5">
          <span className="text-sm" style={{ color: `${GOLD}88` }}>
            Bem vindo, <span className="font-semibold" style={{ color: GOLD }}>{firstName}</span>
          </span>

          {isOwner && (
            <button
              className="flex items-center gap-1.5 text-xs tracking-wider border rounded-lg px-3 py-1.5 transition-all"
              style={{ color: `${GOLD}99`, borderColor: `${GOLD}33` }}
              onMouseEnter={e => { e.currentTarget.style.color = GOLD; e.currentTarget.style.borderColor = `${GOLD}66`; }}
              onMouseLeave={e => { e.currentTarget.style.color = `${GOLD}99`; e.currentTarget.style.borderColor = `${GOLD}33`; }}>
              Gerenciar Admins
            </button>
          )}

          <button onClick={handleLogout}
            className="transition-colors p-2 rounded-lg"
            style={{ color: `${GOLD}55` }}
            onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
            onMouseLeave={e => (e.currentTarget.style.color = `${GOLD}55`)}>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Title */}
      <div className="relative z-10 text-center py-12">
        <p className="text-xs tracking-[0.4em] uppercase mb-3" style={{ color: `${GOLD}55` }}>Plataforma</p>
        <h1 className="text-5xl md:text-7xl font-bold tracking-[0.25em] uppercase"
          style={{
            background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 45%, ${GOLD_DARK} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: 'none',
            filter: `drop-shadow(0 0 30px ${GOLD}40)`,
          }}>
          LENDAS
        </h1>
        <div className="w-24 h-px mx-auto mt-4"
          style={{ background: `linear-gradient(90deg, transparent, ${GOLD}55, transparent)` }} />
      </div>

      {/* Modules */}
      <main className="relative z-10 flex-1 container max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {modules.map((mod) => (
            <div key={mod.id}
              className="group rounded-2xl p-10 flex flex-col items-center text-center transition-all duration-300 cursor-pointer"
              style={{
                background: 'rgba(10,6,2,0.75)',
                border: `1px solid ${GOLD}22`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.4)`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.border = `1px solid ${GOLD}55`;
                e.currentTarget.style.boxShadow = `0 0 30px ${GOLD}18, 0 12px 40px rgba(0,0,0,0.5)`;
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.border = `1px solid ${GOLD}22`;
                e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4)`;
                e.currentTarget.style.transform = 'none';
              }}>
              <div className="w-20 h-20 rounded-full mb-6 flex items-center justify-center transition-all duration-300"
                style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}35` }}>
                <mod.icon className="w-9 h-9" style={{ color: GOLD }} />
              </div>
              <p className="font-semibold text-xl tracking-wider mb-2" style={{ color: GOLD }}>
                {mod.title}
              </p>
              <p className="text-xs tracking-widest uppercase" style={{ color: `${GOLD}44` }}>
                {mod.description}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-6">
        <p className="text-xs tracking-widest" style={{ color: `${GOLD}30` }}>
          © 2025 Lendas Milionárias
        </p>
      </footer>
    </div>
  );
};

export default LendasHome;
