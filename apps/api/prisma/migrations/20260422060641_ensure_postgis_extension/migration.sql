/*
  Warnings:

  - You are about to drop the column `location_geom` on the `listings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "listings_location_geom_idx";

-- AlterTable
ALTER TABLE "listings" DROP COLUMN "location_geom";
