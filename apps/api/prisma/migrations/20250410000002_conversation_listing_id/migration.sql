ALTER TABLE "conversations"
ADD COLUMN IF NOT EXISTS "listing_id" UUID;

ALTER TABLE "conversations"
ADD CONSTRAINT "conversations_listing_id_fkey"
FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "conversations_listing_id_idx" ON "conversations" ("listing_id");
