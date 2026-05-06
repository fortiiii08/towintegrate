import { createContext, useContext, ReactNode } from 'react';
import { useAuth, AuthUser, AuthProfile } from '@/hooks/useAuth';

interface AuthContextType {
  user: AuthUser | null;
  session: { token: string } | null;
  profile: AuthProfile | null;
  userRole: 'client' | 'employee' | null;
  isAdmin: boolean;
  isSecondOwner: boolean;
  linkedClientId: string | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: 'client' | 'employee') => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; user?: AuthUser; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: { name?: string; avatarUrl?: string }) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
