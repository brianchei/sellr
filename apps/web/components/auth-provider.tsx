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
import {
  fetchMe,
  logout as logoutApi,
  setAccessToken,
} from '@sellr/api-client';

type AuthContextValue = {
  hydrated: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  /** After OTP verify: pass `userId` (web uses httpOnly cookies; no tokens in JS). */
  setSession: (userId: string) => void;
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
    void (async () => {
      try {
        const me = await fetchMe();
        setState({
          hydrated: true,
          hasToken: true,
          userId: me.user.id,
        });
        setAccessToken(null);
      } catch {
        setState({
          hydrated: true,
          hasToken: false,
          userId: null,
        });
        setAccessToken(null);
      }
    })();
  }, []);

  const setSession = useCallback((userId: string) => {
    setState((prev) => ({
      ...prev,
      hasToken: true,
      userId,
    }));
  }, []);

  const logout = useCallback(() => {
    void (async () => {
      try {
        await logoutApi();
      } catch {
        /* still clear local UI */
      }
      setAccessToken(null);
      setState((prev) => ({
        ...prev,
        hasToken: false,
        userId: null,
      }));
    })();
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
