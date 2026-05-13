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

describe.skipIf(!integrationDbAvailable)('reports integration', () => {
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

  describe('POST /api/v1/reports', () => {
    it('lets a community member open a report on a listing', async () => {
      const seller = await createUser();
      const reporter = await createUser();
      const community = await createCommunity();
      await addMember(seller.id, community.id);
      await addMember(reporter.id, community.id);
      const listing = await createListing({
        sellerId: seller.id,
        communityId: community.id,
        status: 'active',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/reports',
        headers: { cookie: await accessCookieFor(app, reporter.id) },
        payload: {
          targetId: listing.id,
          targetType: 'listing',
          reason: 'Looks like a scam — duplicate stock photos.',
          severity: 'safety',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json<{
        data: {
          report: {
            id: string;
            status: string;
            reporterId: string;
            targetId: string;
          };
        };
      }>();
      expect(body.data.report.reporterId).toBe(reporter.id);
      expect(body.data.report.targetId).toBe(listing.id);
      expect(body.data.report.status).toBe('open');
    });

    it('blocks reports across community boundaries', async () => {
      const seller = await createUser();
      const outsider = await createUser();
      const sellerCommunity = await createCommunity({ name: 'Seller side' });
      const outsiderCommunity = await createCommunity({ name: 'Other side' });
      await addMember(seller.id, sellerCommunity.id);
      await addMember(outsider.id, outsiderCommunity.id);
      const listing = await createListing({
        sellerId: seller.id,
        communityId: sellerCommunity.id,
        status: 'active',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/reports',
        headers: { cookie: await accessCookieFor(app, outsider.id) },
        payload: {
          targetId: listing.id,
          targetType: 'listing',
          reason: 'Trying to report from the wrong community.',
          severity: 'quality',
        },
      });
      expect(res.statusCode).toBe(403);
      const total = await prisma.report.count();
      expect(total).toBe(0);
    });
  });

  describe('PATCH /api/v1/reports/:reportId', () => {
    it('lets a community admin walk a report from open → in_review → resolved', async () => {
      const seller = await createUser();
      const reporter = await createUser();
      const admin = await createUser({ displayName: 'Mod' });
      const community = await createCommunity();
      await addMember(seller.id, community.id);
      await addMember(reporter.id, community.id);
      await addMember(admin.id, community.id, 'admin');
      const listing = await createListing({
        sellerId: seller.id,
        communityId: community.id,
        status: 'active',
      });

      const created = await prisma.report.create({
        data: {
          reporterId: reporter.id,
          targetId: listing.id,
          targetType: 'listing',
          reason: 'Suspicious posting in the marketplace.',
          severity: 'safety',
          status: 'open',
        },
      });

      const adminCookie = await accessCookieFor(app, admin.id);

      const inReview = await app.inject({
        method: 'PATCH',
        url: `/api/v1/reports/${created.id}`,
        headers: { cookie: adminCookie },
        payload: { status: 'in_review' },
      });
      expect(inReview.statusCode).toBe(200);
      const inReviewBody = inReview.json<{
        data: {
          report: {
            status: string;
            moderatorId: string | null;
            resolvedAt: string | null;
          };
        };
      }>();
      expect(inReviewBody.data.report.status).toBe('in_review');
      expect(inReviewBody.data.report.moderatorId).toBe(admin.id);
      expect(inReviewBody.data.report.resolvedAt).toBeNull();

      const resolved = await app.inject({
        method: 'PATCH',
        url: `/api/v1/reports/${created.id}`,
        headers: { cookie: adminCookie },
        payload: { status: 'resolved' },
      });
      expect(resolved.statusCode).toBe(200);
      const resolvedBody = resolved.json<{
        data: {
          report: {
            status: string;
            resolvedAt: string | null;
          };
        };
      }>();
      expect(resolvedBody.data.report.status).toBe('resolved');
      expect(resolvedBody.data.report.resolvedAt).not.toBeNull();
    });

    it('rejects non-admin members with 403', async () => {
      const seller = await createUser();
      const reporter = await createUser();
      const community = await createCommunity();
      await addMember(seller.id, community.id);
      await addMember(reporter.id, community.id);
      const listing = await createListing({
        sellerId: seller.id,
        communityId: community.id,
        status: 'active',
      });
      const created = await prisma.report.create({
        data: {
          reporterId: reporter.id,
          targetId: listing.id,
          targetType: 'listing',
          reason: 'Just trying my luck without admin role.',
          severity: 'quality',
          status: 'open',
        },
      });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/reports/${created.id}`,
        headers: { cookie: await accessCookieFor(app, reporter.id) },
        payload: { status: 'resolved' },
      });
      expect(res.statusCode).toBe(403);

      const refreshed = await prisma.report.findUnique({
        where: { id: created.id },
      });
      expect(refreshed?.status).toBe('open');
    });

    it('blocks admins from acting on reports outside their community', async () => {
      const sellerA = await createUser();
      const reporterA = await createUser();
      const adminB = await createUser();
      const communityA = await createCommunity({ name: 'A' });
      const communityB = await createCommunity({ name: 'B' });
      await addMember(sellerA.id, communityA.id);
      await addMember(reporterA.id, communityA.id);
      await addMember(adminB.id, communityB.id, 'admin');
      const listingA = await createListing({
        sellerId: sellerA.id,
        communityId: communityA.id,
        status: 'active',
      });
      const reportA = await prisma.report.create({
        data: {
          reporterId: reporterA.id,
          targetId: listingA.id,
          targetType: 'listing',
          reason: 'Cross-community admin should not see this.',
          severity: 'safety',
          status: 'open',
        },
      });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/reports/${reportA.id}`,
        headers: { cookie: await accessCookieFor(app, adminB.id) },
        payload: { status: 'resolved' },
      });
      expect(res.statusCode).toBe(403);

      const refreshed = await prisma.report.findUnique({
        where: { id: reportA.id },
      });
      expect(refreshed?.status).toBe('open');
    });
  });

  describe('GET /api/v1/reports', () => {
    it('includes member-management context for report targets', async () => {
      const seller = await createUser({ displayName: 'Reported Seller' });
      const reporter = await createUser();
      const admin = await createUser({ displayName: 'Mod' });
      const community = await createCommunity();
      await addMember(seller.id, community.id);
      await addMember(reporter.id, community.id);
      await addMember(admin.id, community.id, 'admin');
      const listing = await createListing({
        sellerId: seller.id,
        communityId: community.id,
        status: 'active',
      });
      await prisma.report.create({
        data: {
          reporterId: reporter.id,
          targetId: listing.id,
          targetType: 'listing',
          reason: 'Seller should be reviewed by an admin.',
          severity: 'safety',
          status: 'open',
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/reports',
        headers: { cookie: await accessCookieFor(app, admin.id) },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{
        data: {
          reports: Array<{
            target: {
              memberManagement: {
                userId: string;
                communityId: string;
                displayName: string;
                role: string;
                status: string;
              } | null;
            } | null;
          }>;
        };
      }>();
      expect(body.data.reports[0]?.target?.memberManagement).toEqual(
        expect.objectContaining({
          userId: seller.id,
          communityId: community.id,
          displayName: 'Reported Seller',
          role: 'member',
          status: 'active',
        }),
      );
    });
  });

  describe('POST /api/v1/reports/:reportId/member-action', () => {
    it('deactivates a reported member and records moderation history', async () => {
      const seller = await createUser({ displayName: 'Reported Seller' });
      const reporter = await createUser();
      const admin = await createUser({ displayName: 'Mod' });
      const community = await createCommunity();
      await addMember(seller.id, community.id);
      await addMember(reporter.id, community.id);
      await addMember(admin.id, community.id, 'admin');
      const listing = await createListing({
        sellerId: seller.id,
        communityId: community.id,
        status: 'active',
      });
      const report = await prisma.report.create({
        data: {
          reporterId: reporter.id,
          targetId: listing.id,
          targetType: 'listing',
          reason: 'Seller should lose access pending review.',
          severity: 'safety',
          status: 'open',
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/reports/${report.id}/member-action`,
        headers: { cookie: await accessCookieFor(app, admin.id) },
        payload: {
          action: 'deactivate_member',
          note: 'Confirmed from report review.',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{
        data: {
          report: {
            moderationActions: Array<{
              actionType: string;
              moderatorId: string;
              targetUserId: string;
              previousStatus: string | null;
              nextStatus: string | null;
              nextAccessStatusReason: string | null;
              note: string | null;
            }>;
            target: {
              memberManagement: {
                status: string;
                accessStatusReason: string | null;
              } | null;
            } | null;
          };
        };
      }>();
      expect(body.data.report.target?.memberManagement).toEqual(
        expect.objectContaining({
          status: 'inactive',
          accessStatusReason: 'report_deactivated',
        }),
      );
      expect(body.data.report.moderationActions[0]).toEqual(
        expect.objectContaining({
          actionType: 'member_deactivated',
          moderatorId: admin.id,
          targetUserId: seller.id,
          previousStatus: 'active',
          nextStatus: 'inactive',
          nextAccessStatusReason: 'report_deactivated',
          note: 'Confirmed from report review.',
        }),
      );

      const membership = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId: seller.id,
            communityId: community.id,
          },
        },
      });
      expect(membership?.status).toBe('inactive');
      expect(membership?.accessStatusReason).toBe('report_deactivated');

      const audit = await prisma.moderationAction.findFirst({
        where: { reportId: report.id, targetUserId: seller.id },
      });
      expect(audit?.actionType).toBe('member_deactivated');
    });
  });

  describe('POST /api/v1/reports/:reportId/remove-listing', () => {
    it('lets an admin explicitly remove a reported listing and queue media cleanup', async () => {
      const originalCdnUrl = process.env.CLOUDFLARE_CDN_URL;
      process.env.CLOUDFLARE_CDN_URL = 'https://cdn.sellr.test';
      try {
        const seller = await createUser();
        const reporter = await createUser();
        const admin = await createUser({ displayName: 'Mod' });
        const community = await createCommunity();
        await addMember(seller.id, community.id);
        await addMember(reporter.id, community.id);
        await addMember(admin.id, community.id, 'admin');
        const photoUrl =
          'https://cdn.sellr.test/listing-images/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg';
        const listing = await createListing({
          sellerId: seller.id,
          communityId: community.id,
          status: 'active',
          photoUrls: [photoUrl],
        });
        const report = await prisma.report.create({
          data: {
            reporterId: reporter.id,
            targetId: listing.id,
            targetType: 'listing',
            reason: 'Counterfeit item photos should be removed.',
            severity: 'safety',
            status: 'in_review',
          },
        });

        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/reports/${report.id}/remove-listing`,
          headers: { cookie: await accessCookieFor(app, admin.id) },
        });

        expect(res.statusCode).toBe(200);
        const body = res.json<{
          data: {
            listingRemoved: boolean;
            report: { status: string; moderatorId: string | null };
          };
        }>();
        expect(body.data.listingRemoved).toBe(true);
        expect(body.data.report.status).toBe('resolved');
        expect(body.data.report.moderatorId).toBe(admin.id);

        const refreshedListing = await prisma.listing.findUnique({
          where: { id: listing.id },
        });
        expect(refreshedListing?.status).toBe('expired');
        expect(refreshedListing?.photoUrls).toEqual([]);

        const mediaAsset = await prisma.mediaAsset.findUnique({
          where: {
            storageKey:
              'listing-images/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg',
          },
        });
        expect(mediaAsset?.status).toBe('deletion_queued');
        expect(mediaAsset?.listingId).toBe(listing.id);
      } finally {
        if (originalCdnUrl == null) {
          Reflect.deleteProperty(process.env, 'CLOUDFLARE_CDN_URL');
        } else {
          process.env.CLOUDFLARE_CDN_URL = originalCdnUrl;
        }
      }
    });
  });
});
