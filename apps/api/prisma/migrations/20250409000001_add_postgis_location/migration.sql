CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS postgis;

DO $$
DECLARE
  postgis_schema text;
BEGIN
  SELECT n.nspname
  INTO postgis_schema
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE t.typname = 'geometry'
  LIMIT 1;

  IF postgis_schema IS NULL THEN
    RAISE EXCEPTION 'PostGIS geometry type is not available';
  END IF;

  EXECUTE format(
    'ALTER TABLE listings ADD COLUMN IF NOT EXISTS location_geom %I.geometry(Point, 4326)',
    postgis_schema
  );
END $$;

CREATE INDEX IF NOT EXISTS listings_location_geom_idx
ON listings USING GIST (location_geom);

CREATE INDEX IF NOT EXISTS listings_community_status_geom_idx
ON listings (community_id, status)
WHERE status = 'active';
