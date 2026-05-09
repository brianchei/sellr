CREATE TABLE "media_assets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_id" UUID,
  "listing_id" UUID,
  "url" VARCHAR(2048) NOT NULL,
  "storage_key" VARCHAR(512) NOT NULL,
  "storage_provider" VARCHAR(20) NOT NULL DEFAULT 'r2',
  "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
  "expires_at" TIMESTAMP(3),
  "attached_at" TIMESTAMP(3),
  "deleted_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "media_assets_url_key" ON "media_assets"("url");
CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "media_assets"("storage_key");
CREATE INDEX "media_assets_owner_id_idx" ON "media_assets"("owner_id");
CREATE INDEX "media_assets_listing_id_idx" ON "media_assets"("listing_id");
CREATE INDEX "media_assets_status_expires_at_idx" ON "media_assets"("status", "expires_at");

ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_listing_id_fkey"
  FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
