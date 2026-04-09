'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { setAccessToken } from '@sellr/api-client';
import {
  clearStoredTokens,
  getStoredTokens,
  persistTokens,
} from '@/lib/auth-storage';

type AuthContextValue = {
  hydrated: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  setSession: (access: string, refresh: string, userId: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthState = {
  hydrated: boolean;
  hasToken: boolean;
  userId: string | null;
};

const initialAuthState: AuthState = {
  hydrated: false,
  hasToken: false,
  userId: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialAuthState);

  useEffect(() => {
    const t = getStoredTokens();
    if (t) {
      setAccessToken(t.access);
    }
    // Client-only: read persisted session after mount (localStorage is unavailable on the server).
    /* eslint-disable react-hooks/set-state-in-effect -- intentional one-shot hydration */
    setState({
      hydrated: true,
      hasToken: Boolean(t),
      userId: t?.userId ? t.userId : null,
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const setSession = useCallback(
    (access: string, refresh: string, uid: string) => {
      persistTokens(access, refresh, uid);
      setState((prev) => ({
        ...prev,
        hasToken: true,
        userId: uid,
      }));
    },
    [],
  );

  const logout = useCallback(() => {
    clearStoredTokens();
    setState((prev) => ({
      ...prev,
      hasToken: false,
      userId: null,
    }));
  }, []);

  const value = useMemo(
    () =>
      ({
        hydrated: state.hydrated,
        isAuthenticated: state.hasToken,
        userId: state.userId,
        setSession,
        logout,
      }) satisfies AuthContextValue,
    [state.hydrated, state.hasToken, state.userId, setSession, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
