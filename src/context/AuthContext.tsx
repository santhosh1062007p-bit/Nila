'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { useToast } from './ToastContext';
import { useRealtimeSubscription, useRealtimeBroadcast } from './RealtimeContext';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (phoneOrEmail: string, password?: string) => Promise<boolean>;
  register: (fullName: string, phone: string, email?: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUserState: (nextUser: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const broadcast = useRealtimeBroadcast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Listen for real-time auth changes from other tabs or server
  useRealtimeSubscription(['AUTH_SYNC', 'USER_PROFILE_UPDATED'], (event) => {
    if (event.type === 'AUTH_SYNC') {
      const payload = event.data as { action: string; user?: User | null };
      if (payload?.action === 'LOGIN' || payload?.action === 'REGISTER') {
        if (payload.user) {
          setUser(payload.user);
        } else {
          checkAuth();
        }
      } else if (payload?.action === 'LOGOUT') {
        setUser(null);
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (path.startsWith('/account') || path.startsWith('/admin')) {
            window.location.href = '/';
          }
        }
      } else if (payload?.action === 'PROFILE_UPDATED') {
        if (payload.user) {
          setUser(payload.user);
        } else {
          checkAuth();
        }
      }
    } else if (event.type === 'USER_PROFILE_UPDATED') {
      checkAuth();
    }
  });

  const login = async (phoneOrEmail: string, password = ''): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: phoneOrEmail, password }),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        broadcast('AUTH_SYNC', { action: 'LOGIN', user: data.user });
        showToast(`Welcome back, ${data.user.full_name}!`, 'success');
        return true;
      } else {
        showToast(data.message || 'Invalid login credentials', 'error');
        return false;
      }
    } catch {
      showToast('Login request failed. Please check network connection.', 'error');
      return false;
    }
  };

  const register = async (
    fullName: string,
    phone: string,
    email?: string,
    password = ''
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, phone, email, password }),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        broadcast('AUTH_SYNC', { action: 'REGISTER', user: data.user });
        showToast(`Account created successfully! Welcome to Nila's Treat.`, 'success');
        return true;
      } else {
        showToast(data.message || 'Registration failed', 'error');
        return false;
      }
    } catch {
      showToast('Registration failed. Please try again.', 'error');
      return false;
    }
  };

  const updateUserState = (nextUser: User | null) => {
    setUser(nextUser);
    broadcast('AUTH_SYNC', { action: 'PROFILE_UPDATED', user: nextUser });
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
    } catch {
      // ignore network glitches during logout
    }
    if (typeof document !== 'undefined') {
      document.cookie = 'nilas_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0;';
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0;';
    }
    setUser(null);
    broadcast('AUTH_SYNC', { action: 'LOGOUT' });
    window.location.href = '/';
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isLoading,
        login,
        register,
        logout,
        checkAuth,
        updateUserState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
