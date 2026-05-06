import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const LendasProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "#0a0603" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#C9A84C" }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/lendas/login" replace />;

  return <>{children}</>;
};
