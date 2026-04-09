import type { Listing } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export type ListingWithDistance = Listing & { distance_m: number };

/**
 * Nearby active listings using PostGIS (`location_geom`).
 * Raw rows use DB column names at runtime; cast to `Listing` for app use after mapping if needed.
 */
export async function findListingsNearby(params: {
  communityId: string;
  lat: number;
  lng: number;
  radiusM: number;
}): Promise<ListingWithDistance[]> {
  const rows = await prisma.$queryRaw<ListingWithDistance[]>`
    SELECT l.*,
           ST_Distance(
             l.location_geom::geography,
             ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography
           ) AS distance_m
    FROM listings l
    WHERE l.community_id = ${params.communityId}::uuid
      AND l.status = 'active'
      AND l.location_geom IS NOT NULL
      AND ST_DWithin(
        l.location_geom::geography,
        ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography,
        ${params.radiusM}
      )
    ORDER BY distance_m ASC
    LIMIT 50
  `;
  return rows;
}
