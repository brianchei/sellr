"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchSyncWorker = searchSyncWorker;
const algolia_1 = require("../lib/algolia");
const prisma_1 = require("../lib/prisma");
let locationGeomColumnExists = null;
async function hasLocationGeomColumn() {
    if (locationGeomColumnExists !== null) {
        return locationGeomColumnExists;
    }
    const result = await prisma_1.prisma.$queryRaw `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'listings'
        AND column_name = 'location_geom'
    ) AS exists
  `;
    locationGeomColumnExists = Boolean(result.at(0)?.exists);
    return locationGeomColumnExists;
}
async function findListingGeoloc(listingId) {
    if (!(await hasLocationGeomColumn())) {
        return null;
    }
    const result = await prisma_1.prisma.$queryRaw `
    SELECT extensions.ST_Y(location_geom::extensions.geometry) AS lat,
           extensions.ST_X(location_geom::extensions.geometry) AS lng
    FROM listings
    WHERE id = ${listingId}::uuid
      AND location_geom IS NOT NULL
  `;
    return result.at(0) ?? null;
}
async function searchSyncWorker(job) {
    if (!algolia_1.algolia) {
        void job.log('Algolia not configured; skipping search sync');
        return;
    }
    const { listingId, action } = job.data;
    if (action === 'delete') {
        await algolia_1.algolia.deleteObject({
            indexName: algolia_1.LISTINGS_INDEX,
            objectID: listingId,
        });
        return;
    }
    const listing = await prisma_1.prisma.listing.findUnique({
        where: { id: listingId },
        include: {
            seller: {
                include: { reputation: true },
            },
        },
    });
    if (!listing || listing.status !== 'active') {
        return;
    }
    const photoUrls = listing.photoUrls;
    const geoloc = await findListingGeoloc(listingId);
    const rep = listing.seller.reputation;
    await algolia_1.algolia.saveObject({
        indexName: algolia_1.LISTINGS_INDEX,
        body: {
            objectID: listing.id,
            communityId: listing.communityId,
            sellerId: listing.sellerId,
            title: listing.title,
            description: listing.description,
            category: listing.category,
            subcategory: listing.subcategory,
            condition: listing.condition,
            price: Number(listing.price),
            negotiable: listing.negotiable,
            status: listing.status,
            locationNeighborhood: listing.locationNeighborhood,
            photoUrl: photoUrls[0] ?? null,
            sellerAvgRating: rep ? Number(rep.avgPunctuality) : null,
            sellerTransactionCount: rep?.transactionCount ?? 0,
            availabilityWindows: listing.availabilityWindows,
            createdAtTimestamp: Math.floor(listing.createdAt.getTime() / 1000),
            ...(geoloc ? { _geoloc: geoloc } : {}),
        },
    });
}
