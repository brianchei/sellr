import { setAccessToken } from '@sellr/api-client';

const ACCESS = 'sellr_access_token';
const REFRESH = 'sellr_refresh_token';
const USER_ID = 'sellr_user_id';

export function getStoredTokens(): {
  access: string;
  refresh: string;
  userId: string;
} | null {
  if (typeof window === 'undefined') return null;
  const access = localStorage.getItem(ACCESS);
  if (!access) return null;
  return {
    access,
    refresh: localStorage.getItem(REFRESH) ?? '',
    userId: localStorage.getItem(USER_ID) ?? '',
  };
}

export function persistTokens(
  access: string,
  refresh: string,
  userId: string,
): void {
  localStorage.setItem(ACCESS, access);
  localStorage.setItem(REFRESH, refresh);
  localStorage.setItem(USER_ID, userId);
  setAccessToken(access);
}

export function clearStoredTokens(): void {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(USER_ID);
  setAccessToken(null);
}
