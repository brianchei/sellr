CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

ALTER TABLE listings
ADD COLUMN IF NOT EXISTS location_geom extensions.geometry(Point, 4326);

CREATE INDEX IF NOT EXISTS listings_location_geom_idx
ON listings USING GIST (location_geom);

CREATE INDEX IF NOT EXISTS listings_community_status_geom_idx
ON listings (community_id, status)
WHERE status = 'active';
