import { create } from 'zustand';

interface CrmUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  tenant: { id: string; name: string; slug: string };
}

interface CrmAuthStore {
  user: CrmUser | null;
  token: string | null;
  setCrmAuth: (user: CrmUser, token: string) => void;
  crmLogout: () => void;
}

export const useCrmAuth = create<CrmAuthStore>((set) => ({
  user: (() => {
    try { return JSON.parse(localStorage.getItem('crm_user') || 'null'); } catch { return null; }
  })(),
  token: localStorage.getItem('crm_token'),
  setCrmAuth: (user, token) => {
    localStorage.setItem('crm_user', JSON.stringify(user));
    localStorage.setItem('crm_token', token);
    set({ user, token });
  },
  crmLogout: () => {
    localStorage.removeItem('crm_user');
    localStorage.removeItem('crm_token');
    set({ user: null, token: null });
  },
}));
