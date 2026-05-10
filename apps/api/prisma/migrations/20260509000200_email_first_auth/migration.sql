-- AlterTable
ALTER TABLE "users" ADD COLUMN "email" VARCHAR(254);
ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP(3);
ALTER TABLE "users" ALTER COLUMN "phone_e164" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
