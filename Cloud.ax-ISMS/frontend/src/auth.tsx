// Authentication context. Loads the current user from the API and exposes helpers
// for role checks, sign in and sign out.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';

export interface User {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
}

interface MeResponse {
  user: User | null;
  oidcConfigured: boolean;
  devLoginAllowed: boolean;
}

interface AuthState extends MeResponse {
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  oidcConfigured: false,
  devLoginAllowed: false,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MeResponse>({ user: null, oidcConfigured: false, devLoginAllowed: false });
  const [loading, setLoading] = useState(true);

  async function refresh(): Promise<void> {
    try {
      const me = await api<MeResponse>('/auth/me');
      setState(me);
    } finally {
      setLoading(false);
    }
  }

  async function logout(): Promise<void> {
    await api('/auth/logout', { method: 'POST' });
    await refresh();
  }

  useEffect(() => {
    void refresh();
  }, []);

  return <AuthContext.Provider value={{ ...state, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthState => useContext(AuthContext);

export function hasRole(user: User | null, ...roles: string[]): boolean {
  if (!user) return false;
  if (user.roles.includes('Administrator')) return true;
  return roles.some((r) => user.roles.includes(r));
}
