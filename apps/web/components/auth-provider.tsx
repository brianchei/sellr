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
  type ApiCommunitySummary,
} from '@sellr/api-client';

const SELECTED_COMMUNITY_STORAGE_KEY = 'sellr:selected-community-id';

type AuthContextValue = {
  hydrated: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  communityIds: string[] | null;
  communities: ApiCommunitySummary[] | null;
  primaryCommunityId: string | null;
  primaryCommunity: ApiCommunitySummary | null;
  /** After OTP verify: pass `userId` (web uses httpOnly cookies; no tokens in JS). */
  setSession: (userId: string) => void;
  setPrimaryCommunityId: (communityId: string) => void;
  refreshSession: (preferredCommunityId?: string) => Promise<{
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
  communities: ApiCommunitySummary[] | null;
  selectedCommunityId: string | null;
};

const initialAuthState: AuthState = {
  hydrated: false,
  hasToken: false,
  userId: null,
  communityIds: null,
  communities: null,
  selectedCommunityId: null,
};

function readStoredCommunityId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SELECTED_COMMUNITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredCommunityId(communityId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (communityId) {
      window.localStorage.setItem(SELECTED_COMMUNITY_STORAGE_KEY, communityId);
    } else {
      window.localStorage.removeItem(SELECTED_COMMUNITY_STORAGE_KEY);
    }
  } catch {
    /* Local storage can be unavailable in restrictive browser modes. */
  }
}

function chooseCommunityId(
  communityIds: string[],
  preferredCommunityId: string | null,
): string | null {
  if (communityIds.length === 0) return null;
  if (preferredCommunityId && communityIds.includes(preferredCommunityId)) {
    return preferredCommunityId;
  }
  return communityIds[0] ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialAuthState);

  const refreshSession = useCallback(async (preferredCommunityId?: string) => {
    try {
      const me = await fetchMe();
      const communities = me.communities ?? me.user.communities ?? [];
      const selectedCommunityId = chooseCommunityId(
        me.communityIds,
        preferredCommunityId ?? readStoredCommunityId(),
      );
      writeStoredCommunityId(selectedCommunityId);
      setState({
        hydrated: true,
        hasToken: true,
        userId: me.user.id,
        communityIds: me.communityIds,
        communities,
        selectedCommunityId,
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
        communities: [],
        selectedCommunityId: null,
      });
      writeStoredCommunityId(null);
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
      communities: null,
      selectedCommunityId: null,
    }));
  }, []);

  const setPrimaryCommunityId = useCallback((communityId: string) => {
    setState((prev) => {
      if (!prev.communityIds?.includes(communityId)) {
        return prev;
      }
      writeStoredCommunityId(communityId);
      return {
        ...prev,
        selectedCommunityId: communityId,
      };
    });
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
        communities: [],
        selectedCommunityId: null,
      }));
      writeStoredCommunityId(null);
    })();
  }, []);

  const primaryCommunity =
    state.communities?.find(
      (community) => community.id === state.selectedCommunityId,
    ) ??
    state.communities?.[0] ??
    null;
  const primaryCommunityId =
    primaryCommunity?.id ??
    state.selectedCommunityId ??
    state.communityIds?.[0] ??
    null;

  const value = useMemo(
    () =>
      ({
        hydrated: state.hydrated,
        isAuthenticated: state.hasToken,
        userId: state.userId,
        communityIds: state.communityIds,
        communities: state.communities,
        primaryCommunityId,
        primaryCommunity,
        setSession,
        setPrimaryCommunityId,
        refreshSession,
        logout,
      }) satisfies AuthContextValue,
    [
      state.hydrated,
      state.hasToken,
      state.userId,
      state.communityIds,
      state.communities,
      primaryCommunity,
      primaryCommunityId,
      setSession,
      setPrimaryCommunityId,
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
