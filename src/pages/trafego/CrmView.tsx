import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrmAuth } from '@/store/crmAuth';
import { ArrowLeft, Loader2 } from 'lucide-react';

const CRM_URL = import.meta.env.VITE_CRM_URL || 'http://localhost:5173';

export default function CrmView() {
  const { user, token, crmLogout } = useCrmAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  const handleBack = () => {
    crmLogout();
    navigate('/trafego');
  };

  if (!token) {
    navigate('/trafego');
    return null;
  }

  const iframeSrc = `${CRM_URL}?crm_token=${encodeURIComponent(token)}&crm_user=${encodeURIComponent(JSON.stringify(user))}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Barra superior */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <span className="text-sm font-medium text-gray-700">{user?.tenant?.name}</span>
        {!ready && (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-2" />
        )}
      </div>

      {/* key={token} força remount completo do iframe a cada cliente */}
      <iframe
        key={token}
        src={iframeSrc}
        onLoad={() => setReady(true)}
        className="flex-1 w-full border-0"
        allow="clipboard-write"
        title="CRM Leads"
      />
    </div>
  );
}
