CREATE TABLE "conversation_participant_states" (
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_participant_states_pkey" PRIMARY KEY ("conversation_id", "user_id")
);

CREATE INDEX "conversation_participant_states_user_id_archived_at_idx"
    ON "conversation_participant_states"("user_id", "archived_at");

ALTER TABLE "conversation_participant_states"
    ADD CONSTRAINT "conversation_participant_states_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversation_participant_states"
    ADD CONSTRAINT "conversation_participant_states_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
