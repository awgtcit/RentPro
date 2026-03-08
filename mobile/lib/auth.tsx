import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getItem, setItem, deleteItem } from './storage';
import api from './api';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getItem('access_token');
      if (token) {
        const res = await api.get('/auth/me');
        setUser(res.data);
      }
    } catch {
      await deleteItem('access_token');
      await deleteItem('refresh_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    await setItem('access_token', res.data.access_token);
    await setItem('refresh_token', res.data.refresh_token);
    setUser(res.data.user);
  };

  const logout = async () => {
    await deleteItem('access_token');
    await deleteItem('refresh_token');
    setUser(null);
  };

  const isAdmin = user?.roles?.includes('Admin') ?? false;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
