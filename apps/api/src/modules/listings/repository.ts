import { type Listing, Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';

export type ListingWithDistance = Listing & { distanceM?: number };

let locationGeomColumnExists: boolean | null = null;

export async function hasLocationGeomColumn(): Promise<boolean> {
  if (locationGeomColumnExists !== null) {
    return locationGeomColumnExists;
  }

  const result = await prisma.$queryRaw<{ exists: boolean }[]>`
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

function mapListingWithDistance(
  row: Record<string, unknown>,
): ListingWithDistance {
  return {
    id: row.id as string,
    communityId: row.community_id as string,
    sellerId: row.seller_id as string,
    title: row.title as string,
    description: row.description as string,
    category: row.category as string,
    subcategory: row.subcategory as string | null,
    condition: row.condition as Listing['condition'],
    conditionNote: row.condition_note as string | null,
    price: new Prisma.Decimal(row.price as string | number | Prisma.Decimal),
    negotiable: row.negotiable as boolean,
    status: row.status as Listing['status'],
    locationNeighborhood: row.location_neighborhood as string,
    locationRadiusM: row.location_radius_m as number,
    availabilityWindows:
      row.availability_windows as Listing['availabilityWindows'],
    photoUrls: row.photo_urls as Listing['photoUrls'],
    aiGenerated: row.ai_generated as boolean,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
    distanceM: Number(row.distance_m),
  };
}

export async function findListingsNearby(params: {
  communityId: string;
  lat: number;
  lng: number;
  radiusM: number;
}): Promise<ListingWithDistance[]> {
  if (!(await hasLocationGeomColumn())) {
    return prisma.listing.findMany({
      where: { communityId: params.communityId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT l.*,
           extensions.ST_Distance(
             l.location_geom::extensions.geography,
             extensions.ST_SetSRID(extensions.ST_MakePoint(${params.lng}, ${params.lat}), 4326)::extensions.geography
           ) AS distance_m
    FROM listings l
    WHERE l.community_id = ${params.communityId}::uuid
      AND l.status = 'active'
      AND l.location_geom IS NOT NULL
      AND extensions.ST_DWithin(
        l.location_geom::extensions.geography,
        extensions.ST_SetSRID(extensions.ST_MakePoint(${params.lng}, ${params.lat}), 4326)::extensions.geography,
        ${params.radiusM}
      )
    ORDER BY distance_m ASC
    LIMIT 50
  `;

  return rows.map((row) => {
    const copy = { ...row };
    delete copy.location_geom;
    return mapListingWithDistance(copy);
  });
}

export async function setListingLocationGeom(
  listingId: string,
  lat: number,
  lng: number,
): Promise<void> {
  if (!(await hasLocationGeomColumn())) {
    return;
  }

  await prisma.$executeRaw`
    UPDATE listings
    SET location_geom = extensions.ST_SetSRID(
      extensions.ST_MakePoint(${lng}, ${lat}),
      4326
    )
    WHERE id = ${listingId}::uuid
  `;
}
