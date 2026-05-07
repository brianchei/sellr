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
  validListingPayload,
} from './setup';

describe.skipIf(!integrationDbAvailable)('listings integration', () => {
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

  describe('POST /api/v1/listings', () => {
    it('creates a draft listing in the seller community', async () => {
      const seller = await createUser();
      const community = await createCommunity();
      await addMember(seller.id, community.id);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/listings',
        headers: { cookie: await accessCookieFor(app, seller.id) },
        payload: validListingPayload(community.id, {
          title: 'Vintage desk lamp',
        }),
      });

      expect(res.statusCode).toBe(201);
      const body = res.json<{
        data: {
          listing: {
            id: string;
            sellerId: string;
            communityId: string;
            status: string;
            title: string;
          };
        };
      }>();
      expect(body.data.listing.sellerId).toBe(seller.id);
      expect(body.data.listing.communityId).toBe(community.id);
      expect(body.data.listing.status).toBe('draft');
      expect(body.data.listing.title).toBe('Vintage desk lamp');

      const persisted = await prisma.listing.findUnique({
        where: { id: body.data.listing.id },
      });
      expect(persisted).not.toBeNull();
      expect(persisted?.status).toBe('draft');
    });

    it('rejects creation in a community the seller does not belong to', async () => {
      const seller = await createUser();
      const sellerCommunity = await createCommunity({ name: 'Seller side' });
      await addMember(seller.id, sellerCommunity.id);
      const otherCommunity = await createCommunity({ name: 'Other side' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/listings',
        headers: { cookie: await accessCookieFor(app, seller.id) },
        payload: validListingPayload(otherCommunity.id),
      });

      expect(res.statusCode).toBe(403);
      const count = await prisma.listing.count({
        where: { communityId: otherCommunity.id },
      });
      expect(count).toBe(0);
    });

    it('returns 401 without an access cookie', async () => {
      const community = await createCommunity();
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/listings',
        payload: validListingPayload(community.id),
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/listings (cross-community scope guard)', () => {
    it('only returns active listings from the requested community', async () => {
      const sellerA = await createUser();
      const sellerB = await createUser();
      const buyer = await createUser();

      const communityA = await createCommunity({ name: 'A' });
      const communityB = await createCommunity({ name: 'B' });
      await addMember(sellerA.id, communityA.id);
      await addMember(sellerB.id, communityB.id);
      // Buyer belongs to BOTH communities so they are allowed to query each.
      await addMember(buyer.id, communityA.id);
      await addMember(buyer.id, communityB.id);

      const listingA = await createListing({
        sellerId: sellerA.id,
        communityId: communityA.id,
        status: 'active',
        title: 'A active item',
      });
      await createListing({
        sellerId: sellerA.id,
        communityId: communityA.id,
        status: 'draft',
        title: 'A draft item',
      });
      const listingB = await createListing({
        sellerId: sellerB.id,
        communityId: communityB.id,
        status: 'active',
        title: 'B active item',
      });

      const cookie = await accessCookieFor(app, buyer.id);

      const resA = await app.inject({
        method: 'GET',
        url: `/api/v1/listings?communityId=${communityA.id}`,
        headers: { cookie },
      });
      expect(resA.statusCode).toBe(200);
      const bodyA = resA.json<{
        data: {
          listings: Array<{
            id: string;
            status: string;
            seller: {
              id: string;
              displayName: string;
              verifiedAt: string | null;
              memberSince: string | null;
              listingCount: number;
              communityMember: boolean;
            } | null;
          }>;
        };
      }>();
      expect(bodyA.data.listings.map((l) => l.id)).toEqual([listingA.id]);
      expect(bodyA.data.listings.every((l) => l.status === 'active')).toBe(
        true,
      );
      expect(bodyA.data.listings[0]).toMatchObject({
        seller: {
          id: sellerA.id,
          displayName: sellerA.displayName,
          communityMember: true,
          listingCount: 1,
        },
      });
      expect(bodyA.data.listings[0]?.seller?.verifiedAt).toBeTruthy();
      expect(bodyA.data.listings[0]?.seller?.memberSince).toBeTruthy();

      const resB = await app.inject({
        method: 'GET',
        url: `/api/v1/listings?communityId=${communityB.id}`,
        headers: { cookie },
      });
      expect(resB.statusCode).toBe(200);
      const bodyB = resB.json<{
        data: { listings: { id: string }[] };
      }>();
      expect(bodyB.data.listings.map((l) => l.id)).toEqual([listingB.id]);
    });

    it('rejects browse from a non-member with 403', async () => {
      const seller = await createUser();
      const outsider = await createUser();
      const community = await createCommunity();
      await addMember(seller.id, community.id);
      await createListing({
        sellerId: seller.id,
        communityId: community.id,
        status: 'active',
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/listings?communityId=${community.id}`,
        headers: { cookie: await accessCookieFor(app, outsider.id) },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/listings/:listingId', () => {
    it('hides drafts from non-sellers', async () => {
      const seller = await createUser();
      const buyer = await createUser();
      const community = await createCommunity();
      await addMember(seller.id, community.id);
      await addMember(buyer.id, community.id);

      const draft = await createListing({
        sellerId: seller.id,
        communityId: community.id,
        status: 'draft',
      });

      const buyerRes = await app.inject({
        method: 'GET',
        url: `/api/v1/listings/${draft.id}`,
        headers: { cookie: await accessCookieFor(app, buyer.id) },
      });
      expect(buyerRes.statusCode).toBe(404);

      const sellerRes = await app.inject({
        method: 'GET',
        url: `/api/v1/listings/${draft.id}`,
        headers: { cookie: await accessCookieFor(app, seller.id) },
      });
      expect(sellerRes.statusCode).toBe(200);
    });

    it('blocks cross-community detail reads with 403', async () => {
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
        method: 'GET',
        url: `/api/v1/listings/${listing.id}`,
        headers: { cookie: await accessCookieFor(app, outsider.id) },
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
