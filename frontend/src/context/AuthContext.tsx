import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types/index.js';
import { authApi } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  demoLogin: (email?: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('reachinbox_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      if (!localStorage.getItem('reachinbox_token')) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const data = await authApi.getMe();
      setUser(data.user);
    } catch (err) {
      console.warn('Failed to load current user session:', err);
      setUser(null);
      localStorage.removeItem('reachinbox_token');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check if token in URL query (after OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const queryToken = urlParams.get('token');
    if (queryToken) {
      localStorage.setItem('reachinbox_token', queryToken);
      setToken(queryToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    fetchCurrentUser();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const url = await authApi.getGoogleAuthUrl();
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Google OAuth is not configured yet with valid Client ID & Secret in backend/.env. You can use the Email & Password login below to access everything immediately!';
      alert(msg);
    }
  };

  const demoLogin = async (email?: string, name?: string) => {
    setIsLoading(true);
    try {
      const data = await authApi.demoLogin(email, name);
      localStorage.setItem('reachinbox_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('reachinbox_token');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        loginWithGoogle,
        demoLogin,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
