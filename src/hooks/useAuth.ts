import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { api, setAuthToken, getAuthToken } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    isAdmin?: boolean;
    isSecondOwner?: boolean;
    profile: { id: string; userId: string; name: string; email: string; avatarUrl?: string | null; createdAt: string; updatedAt: string } | null;
    roles: string[];
    linkedClientId?: string | null;
  };
}

interface RegisterResponse {
  token: string;
  user: {
    id: string;
    email: string;
    isAdmin?: boolean;
    isSecondOwner?: boolean;
    profile: { id: string; userId: string; name: string; email: string; avatarUrl?: string | null; createdAt: string; updatedAt: string } | null;
    roles: string[];
    linkedClientId?: string | null;
  };
}

interface MeResponse {
  id: string;
  email: string;
  isAdmin?: boolean;
  isSecondOwner?: boolean;
  profile: { id: string; userId: string; name: string; email: string; avatarUrl?: string | null; createdAt: string; updatedAt: string } | null;
  roles: string[];
  linkedClientId?: string | null;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<{ token: string } | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [userRole, setUserRole] = useState<'client' | 'employee' | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSecondOwner, setIsSecondOwner] = useState(false);
  const [linkedClientId, setLinkedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mapProfile = (p: MeResponse['profile']): AuthProfile | null => {
    if (!p) return null;
    return {
      id: p.id,
      user_id: p.userId,
      name: p.name,
      email: p.email,
      avatar_url: p.avatarUrl || null,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    };
  };

  const fetchCurrentUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.get<MeResponse>('/auth/me');
      setUser({ id: data.id, email: data.email });
      setSession({ token });
      setProfile(mapProfile(data.profile));
      setUserRole((data.roles.find((r: string) => r === 'client' || r === 'employee') as 'client' | 'employee') || null);
      setIsAdmin(data.isAdmin || false);
      setIsSecondOwner(data.isSecondOwner || false);
      setLinkedClientId(data.linkedClientId ?? null);
    } catch {
      // Token expired or invalid
      setAuthToken(null);
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(null);
      setIsAdmin(false);
      setIsSecondOwner(false);
      setLinkedClientId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: 'client' | 'employee'
  ) => {
    try {
      const data = await api.post<RegisterResponse>('/auth/register', {
        email,
        password,
        name,
        role,
      });

      setAuthToken(data.token);
      setUser({ id: data.user.id, email: data.user.email });
      setSession({ token: data.token });
      setProfile(mapProfile(data.user.profile));
      setUserRole((data.user.roles[0] as 'client' | 'employee') || null);
      setIsAdmin(data.user.isAdmin || false);
      setIsSecondOwner(data.user.isSecondOwner || false);
      setLinkedClientId((data.user as any).linkedClientId ?? null);

      toast({
        title: 'Conta criada com sucesso!',
        description: 'Bem-vindo ao Town.',
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Erro ao criar conta',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const data = await api.post<LoginResponse>('/auth/login', {
        email,
        password,
      });

      setAuthToken(data.token);
      setUser({ id: data.user.id, email: data.user.email });
      setSession({ token: data.token });
      setProfile(mapProfile(data.user.profile));
      setUserRole((data.user.roles[0] as 'client' | 'employee') || null);
      setIsAdmin(data.user.isAdmin || false);
      setIsSecondOwner(data.user.isSecondOwner || false);
      setLinkedClientId((data.user as any).linkedClientId ?? null);
      queryClient.clear();

      toast({ title: 'Login realizado com sucesso!' });

      return { success: true, user: { id: data.user.id, email: data.user.email } };
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer login',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    setAuthToken(null);
    setUser(null);
    setSession(null);
    setProfile(null);
    setUserRole(null);
    setIsAdmin(false);
    setIsSecondOwner(false);
    setLinkedClientId(null);
    queryClient.clear();
    navigate('/auth/login');
    toast({ title: 'Logout realizado com sucesso!' });
  };

  const resetPassword = async (email: string) => {
    try {
      await api.post('/auth/forgot-password', { email });
      toast({
        title: 'Email enviado!',
        description: 'Verifique sua caixa de entrada para redefinir sua senha.',
      });
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar email',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      await api.put('/auth/update-password', { password: newPassword });
      toast({ title: 'Senha atualizada com sucesso!' });
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar senha',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const updateProfile = async (data: { name?: string; avatarUrl?: string }) => {
    try {
      const updated = await api.put<any>('/users/profile', data);
      setProfile((prev) => prev ? {
        ...prev,
        name: updated.name ?? prev.name,
        avatar_url: updated.avatarUrl ?? prev.avatar_url,
      } : prev);
      toast({ title: 'Perfil atualizado!' });
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  return {
    user,
    session,
    profile,
    userRole,
    isAdmin,
    isSecondOwner,
    linkedClientId,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
  };
};
