/*
  Warnings:

  - You are about to drop the column `location_geom` on the `listings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX IF EXISTS "listings_location_geom_idx";

-- AlterTable
ALTER TABLE "listings" DROP COLUMN IF EXISTS "location_geom";
