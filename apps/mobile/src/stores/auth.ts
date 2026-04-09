import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { setAccessToken } from '@sellr/api-client';

const ACCESS_TOKEN_KEY = 'sellr_access_token';
const REFRESH_TOKEN_KEY = 'sellr_refresh_token';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  accessToken: string | null;
  setTokens: (access: string, refresh: string, userId: string) => Promise<void>;
  clearTokens: () => Promise<void>;
  rehydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userId: null,
  accessToken: null,

  setTokens: async (access, refresh, userId) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
    setAccessToken(access);
    set({ isAuthenticated: true, accessToken: access, userId });
  },

  clearTokens: async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    setAccessToken(null);
    set({ isAuthenticated: false, accessToken: null, userId: null });
  },

  rehydrate: async () => {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (token) {
      setAccessToken(token);
      set({ isAuthenticated: true, accessToken: token, userId: null });
    }
  },
}));
