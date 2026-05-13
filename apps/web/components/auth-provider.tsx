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
  communityIds: string[] | null;
  primaryCommunityId: string | null;
  /** After OTP verify: pass `userId` (web uses httpOnly cookies; no tokens in JS). */
  setSession: (userId: string) => void;
  refreshSession: () => Promise<{
    userId: string;
    communityIds: string[];
  } | null>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthState = {
  hydrated: boolean;
  hasToken: boolean;
  userId: string | null;
  communityIds: string[] | null;
};

const initialAuthState: AuthState = {
  hydrated: false,
  hasToken: false,
  userId: null,
  communityIds: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialAuthState);

  const refreshSession = useCallback(async () => {
    try {
      const me = await fetchMe();
      setState({
        hydrated: true,
        hasToken: true,
        userId: me.user.id,
        communityIds: me.communityIds,
      });
      setAccessToken(null);
      return {
        userId: me.user.id,
        communityIds: me.communityIds,
      };
    } catch {
      setState({
        hydrated: true,
        hasToken: false,
        userId: null,
        communityIds: [],
      });
      setAccessToken(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // Cookie-backed auth needs one client-side hydration check on app load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshSession();
  }, [refreshSession]);

  const setSession = useCallback((userId: string) => {
    setState((prev) => ({
      ...prev,
      hydrated: true,
      hasToken: true,
      userId,
      communityIds: null,
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
        communityIds: [],
      }));
    })();
  }, []);

  const value = useMemo(
    () =>
      ({
        hydrated: state.hydrated,
        isAuthenticated: state.hasToken,
        userId: state.userId,
        communityIds: state.communityIds,
        primaryCommunityId: state.communityIds?.[0] ?? null,
        setSession,
        refreshSession,
        logout,
      }) satisfies AuthContextValue,
    [
      state.hydrated,
      state.hasToken,
      state.userId,
      state.communityIds,
      setSession,
      refreshSession,
      logout,
    ],
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
