import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { integrationDbAvailable } from './env';
import {
  accessCookieFor,
  addMember,
  buildTestApp,
  createCommunity,
  createListing,
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

  describe('GET /api/v1/communities/:communityId', () => {
    it('returns member-visible community details and stats', async () => {
      const member = await createUser();
      const seller = await createUser({ displayName: 'Seller User' });
      const community = await createCommunity({ name: 'Launch Community' });
      await addMember(member.id, community.id, 'member');
      await addMember(seller.id, community.id, 'member');
      await createListing({
        sellerId: seller.id,
        communityId: community.id,
        title: 'Desk lamp',
      });
      await createListing({
        sellerId: seller.id,
        communityId: community.id,
        title: 'Draft item',
        status: 'draft',
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/communities/${community.id}`,
        headers: { cookie: await accessCookieFor(app, member.id) },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{
        data: {
          community: { id: string; name: string };
          membership: { role: string; status: string };
          stats: {
            activeMemberCount: number;
            activeListingCount: number;
            activeSellerCount: number;
          };
        };
      }>();
      expect(body.data.community).toEqual(
        expect.objectContaining({
          id: community.id,
          name: 'Launch Community',
        }),
      );
      expect(body.data.membership).toEqual(
        expect.objectContaining({ role: 'member', status: 'active' }),
      );
      expect(body.data.stats).toEqual({
        activeMemberCount: 2,
        activeListingCount: 1,
        activeSellerCount: 1,
      });
    });

    it('rejects users outside the community', async () => {
      const user = await createUser();
      const community = await createCommunity();

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/communities/${community.id}`,
        headers: { cookie: await accessCookieFor(app, user.id) },
      });

      expect(res.statusCode).toBe(403);
    });
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
    it('lets a verified student email join a matching email-domain community', async () => {
      const user = await createUser({
        phoneE164: null,
        email: 'student@wisc.edu',
      });
      const community = await createCommunity({
        name: 'Badger Market',
        type: 'campus',
        accessMethod: 'email_domain',
        emailDomain: 'wisc.edu',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/communities/join',
        headers: { cookie: await accessCookieFor(app, user.id) },
        payload: { institutionalEmail: 'student@wisc.edu' },
      });

      expect(res.statusCode).toBe(200);
      expect(
        res.json<{ data: { communityId: string } }>().data.communityId,
      ).toBe(community.id);

      const membership = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId: user.id,
            communityId: community.id,
          },
        },
      });
      expect(membership?.status).toBe('active');
    });

    it('rejects email-domain join when the requested email is not verified on the user', async () => {
      const user = await createUser({
        phoneE164: null,
        email: 'student@wisc.edu',
      });
      await createCommunity({
        type: 'campus',
        accessMethod: 'email_domain',
        emailDomain: 'wisc.edu',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/communities/join',
        headers: { cookie: await accessCookieFor(app, user.id) },
        payload: { institutionalEmail: 'other@wisc.edu' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('rejects email-domain join for unverified email users', async () => {
      const user = await createUser({
        phoneE164: null,
        email: 'student@wisc.edu',
        emailVerified: false,
      });
      await createCommunity({
        type: 'campus',
        accessMethod: 'email_domain',
        emailDomain: 'wisc.edu',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/communities/join',
        headers: { cookie: await accessCookieFor(app, user.id) },
        payload: { institutionalEmail: 'student@wisc.edu' },
      });

      expect(res.statusCode).toBe(403);
    });

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
