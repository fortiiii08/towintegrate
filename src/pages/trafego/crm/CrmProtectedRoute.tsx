import { Navigate } from 'react-router-dom';
import { useCrmAuth } from '@/store/crmAuth';

export function CrmProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useCrmAuth();
  if (!token) return <Navigate to="/trafego" replace />;
  return <>{children}</>;
}
