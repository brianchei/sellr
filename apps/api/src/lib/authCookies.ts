import type { FastifyReply } from 'fastify';

export const SELLR_ACCESS_COOKIE = 'sellr_access';
export const SELLR_REFRESH_COOKIE = 'sellr_refresh';

const WEB_CLIENT = 'web';

export function isWebClient(headers: {
  [key: string]: string | string[] | undefined;
}): boolean {
  const v = headers['x-sellr-client'] ?? headers['X-Sellr-Client'];
  return typeof v === 'string' && v.toLowerCase() === WEB_CLIENT;
}

function accessMaxAgeSec(): number {
  return Number.parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? '900', 10);
}

function refreshMaxAgeSec(): number {
  return Number.parseInt(process.env.JWT_REFRESH_TOKEN_TTL ?? '2592000', 10);
}

export function setAuthCookies(
  reply: FastifyReply,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const secure = process.env.NODE_ENV === 'production';
  reply.setCookie(SELLR_ACCESS_COOKIE, tokens.accessToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: accessMaxAgeSec(),
  });
  reply.setCookie(SELLR_REFRESH_COOKIE, tokens.refreshToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: refreshMaxAgeSec(),
  });
}

export function clearAuthCookies(reply: FastifyReply): void {
  const secure = process.env.NODE_ENV === 'production';
  const common = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
  };
  reply.clearCookie(SELLR_ACCESS_COOKIE, { ...common, maxAge: 0 });
  reply.clearCookie(SELLR_REFRESH_COOKIE, { ...common, maxAge: 0 });
}
