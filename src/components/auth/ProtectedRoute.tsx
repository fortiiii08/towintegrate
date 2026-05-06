import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('client' | 'employee')[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/portal" replace />;
  }

  // If specific roles are required, check if user has one of them
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    // Redirect to home if user doesn't have permission
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
