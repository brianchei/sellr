import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { integrationDbAvailable } from './env';
import {
  accessCookieFor,
  addMember,
  buildTestApp,
  createCommunity,
  createUser,
  prisma,
  truncateAll,
} from './setup';

describe.skipIf(!integrationDbAvailable)('auth integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  describe('POST /api/v1/auth/otp/verify', () => {
    it('issues web cookies and creates a user on first verify', async () => {
      const phoneE164 = '+15555550101';
      const before = await prisma.user.findUnique({ where: { phoneE164 } });
      expect(before).toBeNull();

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        headers: { 'x-sellr-client': 'web' },
        payload: { phoneE164, code: '000000' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: { userId: string } }>();
      expect(body.data.userId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );

      const setCookie = res.headers['set-cookie'];
      const cookies = Array.isArray(setCookie)
        ? setCookie
        : typeof setCookie === 'string'
          ? [setCookie]
          : [];
      expect(cookies.some((c) => c.startsWith('sellr_access='))).toBe(true);
      expect(cookies.some((c) => c.startsWith('sellr_refresh='))).toBe(true);

      const after = await prisma.user.findUnique({ where: { phoneE164 } });
      expect(after).not.toBeNull();
      expect(after?.verifiedAt).toBeInstanceOf(Date);
    });

    it('returns access + refresh tokens in the body for non-web clients', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        payload: { phoneE164: '+15555550102', code: '000000' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{
        data: {
          userId: string;
          accessToken: string;
          refreshToken: string;
        };
      }>();
      expect(body.data.accessToken.length).toBeGreaterThan(20);
      expect(body.data.refreshToken.length).toBeGreaterThan(20);
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('rejects an invalid OTP without creating a user', async () => {
      const phoneE164 = '+15555550103';
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        payload: { phoneE164, code: '111111' },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json<{ error: string }>();
      expect(body.error).toMatch(/invalid|expired/i);

      const user = await prisma.user.findUnique({ where: { phoneE164 } });
      expect(user).toBeNull();
    });

    it('rejects malformed phone numbers via Zod validation', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        payload: { phoneE164: 'not-a-phone', code: '000000' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 without an access cookie or bearer token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });
      expect(res.statusCode).toBe(401);
    });

    it('returns the authed user profile and their community ids', async () => {
      const user = await createUser({ displayName: 'Alex' });
      const community = await createCommunity({ name: 'Westside' });
      await addMember(user.id, community.id, 'member');

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: await accessCookieFor(app, user.id) },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{
        data: {
          user: {
            id: string;
            displayName: string;
            communityMember: boolean;
          };
          communityIds: string[];
        };
      }>();
      expect(body.data.user.id).toBe(user.id);
      expect(body.data.user.displayName).toBe('Alex');
      expect(body.data.user.communityMember).toBe(true);
      expect(body.data.communityIds).toContain(community.id);
    });
  });

  describe('GET /api/v1/auth/realtime-token', () => {
    it('returns 401 without an access cookie', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/realtime-token',
      });
      expect(res.statusCode).toBe(401);
    });

    it('issues a short-lived JWT for an authed user', async () => {
      const user = await createUser();
      const community = await createCommunity();
      await addMember(user.id, community.id);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/realtime-token',
        headers: { cookie: await accessCookieFor(app, user.id) },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{
        data: { token: string; expiresIn: number };
      }>();
      expect(body.data.token.length).toBeGreaterThan(20);
      expect(body.data.expiresIn).toBeGreaterThan(0);

      const decoded = app.jwt.verify<{
        sub: string;
        communityIds: string[];
      }>(body.data.token);
      expect(decoded.sub).toBe(user.id);
      expect(decoded.communityIds).toContain(community.id);
    });
  });
});
