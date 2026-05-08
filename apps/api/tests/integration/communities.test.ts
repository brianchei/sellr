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

describe.skipIf(!integrationDbAvailable)('communities integration', () => {
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

  describe('GET /api/v1/communities/admin', () => {
    it('requires an active community admin role', async () => {
      const user = await createUser();
      const community = await createCommunity();
      await addMember(user.id, community.id, 'member');

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/communities/admin',
        headers: { cookie: await accessCookieFor(app, user.id) },
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns communities, members, and invites for an admin', async () => {
      const admin = await createUser({ displayName: 'Admin User' });
      const member = await createUser({ displayName: 'Member User' });
      const community = await createCommunity({ name: 'Launch Community' });
      await addMember(admin.id, community.id, 'admin');
      await addMember(member.id, community.id, 'member');
      await prisma.inviteCode.create({
        data: {
          communityId: community.id,
          code: 'LAUNCH',
          maxUses: 25,
          createdBy: admin.id,
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/communities/admin',
        headers: { cookie: await accessCookieFor(app, admin.id) },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{
        data: {
          communities: Array<{
            id: string;
            members: Array<{ userId: string; role: string }>;
            inviteCodes: Array<{ code: string; maxUses: number | null }>;
          }>;
        };
      }>();
      expect(body.data.communities).toHaveLength(1);
      expect(body.data.communities[0].id).toBe(community.id);
      expect(body.data.communities[0].members).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ userId: admin.id, role: 'admin' }),
          expect.objectContaining({ userId: member.id, role: 'member' }),
        ]),
      );
      expect(body.data.communities[0].inviteCodes).toEqual([
        expect.objectContaining({ code: 'LAUNCH', maxUses: 25 }),
      ]);
    });
  });

  describe('POST /api/v1/communities/:communityId/invites', () => {
    it('creates an uppercase invite code for an admin community', async () => {
      const admin = await createUser();
      const community = await createCommunity();
      await addMember(admin.id, community.id, 'admin');

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/communities/${community.id}/invites`,
        headers: { cookie: await accessCookieFor(app, admin.id) },
        payload: {
          code: 'spring-2026',
          maxUses: 10,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json<{
        data: { inviteCode: { code: string; maxUses: number | null } };
      }>();
      expect(body.data.inviteCode).toEqual(
        expect.objectContaining({ code: 'SPRING-2026', maxUses: 10 }),
      );
    });
  });

  describe('PATCH /api/v1/communities/:communityId/members/:userId', () => {
    it('promotes, deactivates, and reactivates a member', async () => {
      const admin = await createUser();
      const member = await createUser();
      const community = await createCommunity();
      await addMember(admin.id, community.id, 'admin');
      await addMember(member.id, community.id, 'member');
      const headers = { cookie: await accessCookieFor(app, admin.id) };

      const promote = await app.inject({
        method: 'PATCH',
        url: `/api/v1/communities/${community.id}/members/${member.id}`,
        headers,
        payload: { role: 'admin' },
      });
      expect(promote.statusCode).toBe(200);

      const deactivate = await app.inject({
        method: 'PATCH',
        url: `/api/v1/communities/${community.id}/members/${member.id}`,
        headers,
        payload: { status: 'inactive' },
      });
      expect(deactivate.statusCode).toBe(200);
      expect(
        deactivate.json<{ data: { member: { status: string } } }>().data.member
          .status,
      ).toBe('inactive');

      const reactivate = await app.inject({
        method: 'PATCH',
        url: `/api/v1/communities/${community.id}/members/${member.id}`,
        headers,
        payload: { status: 'active' },
      });
      expect(reactivate.statusCode).toBe(200);
      expect(
        reactivate.json<{ data: { member: { status: string } } }>().data.member
          .status,
      ).toBe('active');
    });

    it('does not allow removing the last active admin', async () => {
      const admin = await createUser();
      const community = await createCommunity();
      await addMember(admin.id, community.id, 'admin');
      const headers = { cookie: await accessCookieFor(app, admin.id) };

      const demote = await app.inject({
        method: 'PATCH',
        url: `/api/v1/communities/${community.id}/members/${admin.id}`,
        headers,
        payload: { role: 'member' },
      });
      expect(demote.statusCode).toBe(400);

      const deactivate = await app.inject({
        method: 'PATCH',
        url: `/api/v1/communities/${community.id}/members/${admin.id}`,
        headers,
        payload: { status: 'inactive' },
      });
      expect(deactivate.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/communities/join', () => {
    it('does not let inactive members reactivate themselves with an invite code', async () => {
      const admin = await createUser();
      const member = await createUser();
      const community = await createCommunity();
      await addMember(admin.id, community.id, 'admin');
      await addMember(member.id, community.id, 'member');
      await prisma.communityMember.update({
        where: {
          userId_communityId: {
            userId: member.id,
            communityId: community.id,
          },
        },
        data: { status: 'inactive' },
      });
      await prisma.inviteCode.create({
        data: {
          communityId: community.id,
          code: 'REJOIN',
          createdBy: admin.id,
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/communities/join',
        headers: { cookie: await accessCookieFor(app, member.id) },
        payload: { inviteCode: 'REJOIN' },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json<{ error: string }>().error).toMatch(/inactive/i);
    });
  });
});
