-- Phase 3 community presentation config and moderation audit trail.

ALTER TABLE "communities"
ADD COLUMN "presentation" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "community_members"
ADD COLUMN "access_status_reason" VARCHAR(40),
ADD COLUMN "access_status_note" VARCHAR(300),
ADD COLUMN "access_suspended_until" TIMESTAMP(3);

CREATE TYPE "ModerationActionType" AS ENUM (
  'admin_demoted',
  'member_deactivated',
  'member_suspended',
  'member_reactivated',
  'admin_promoted'
);

CREATE TABLE "moderation_actions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "report_id" UUID,
  "community_id" UUID NOT NULL,
  "target_user_id" UUID NOT NULL,
  "moderator_id" UUID NOT NULL,
  "action_type" "ModerationActionType" NOT NULL,
  "previous_role" VARCHAR(20),
  "next_role" VARCHAR(20),
  "previous_status" VARCHAR(20),
  "next_status" VARCHAR(20),
  "previous_access_status_reason" VARCHAR(40),
  "next_access_status_reason" VARCHAR(40),
  "note" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "moderation_actions_report_id_idx" ON "moderation_actions"("report_id");
CREATE INDEX "moderation_actions_community_id_created_at_idx" ON "moderation_actions"("community_id", "created_at");
CREATE INDEX "moderation_actions_target_user_id_created_at_idx" ON "moderation_actions"("target_user_id", "created_at");
CREATE INDEX "moderation_actions_moderator_id_created_at_idx" ON "moderation_actions"("moderator_id", "created_at");

ALTER TABLE "moderation_actions"
ADD CONSTRAINT "moderation_actions_report_id_fkey"
FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "moderation_actions"
ADD CONSTRAINT "moderation_actions_community_id_fkey"
FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "moderation_actions"
ADD CONSTRAINT "moderation_actions_target_user_id_fkey"
FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "moderation_actions"
ADD CONSTRAINT "moderation_actions_moderator_id_fkey"
FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
