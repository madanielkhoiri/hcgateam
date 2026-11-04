-- Repair a production database where the original P5M migration was marked
-- as applied although its attendance table was not created.
DO $$ BEGIN
  CREATE TYPE "P5mStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "P5mSleep24" AS ENUM ('LESS_THAN_4', 'BETWEEN_4_6', 'MORE_THAN_6');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "P5mHealth" AS ENUM ('HEALTHY', 'SICK');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "p5m_meetings"
  ADD COLUMN IF NOT EXISTS "status" "P5mStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "opened_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "p5m_attendances" (
  "id" SERIAL NOT NULL,
  "meeting_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "name_snapshot" TEXT NOT NULL,
  "nrp_snapshot" TEXT NOT NULL,
  "job_title_snapshot" TEXT NOT NULL,
  "department_snapshot" TEXT NOT NULL DEFAULT 'HCGA',
  "sleep_72" BOOLEAN NOT NULL,
  "sleep_48" BOOLEAN NOT NULL,
  "sleep_24" "P5mSleep24" NOT NULL,
  "nutrition_enough" BOOLEAN NOT NULL,
  "no_alcohol_medicine" BOOLEAN NOT NULL,
  "no_excess_activity" BOOLEAN NOT NULL,
  "no_excess_stress" BOOLEAN NOT NULL,
  "no_serious_illness" BOOLEAN NOT NULL,
  "no_family_problem" BOOLEAN NOT NULL,
  "understands_work" BOOLEAN NOT NULL,
  "health" "P5mHealth" NOT NULL,
  "allowed_to_work" BOOLEAN,
  "review_note" TEXT,
  "reviewed_by_id" INTEGER,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "p5m_attendances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "p5m_attendances_meeting_id_user_id_key"
  ON "p5m_attendances"("meeting_id", "user_id");
CREATE INDEX IF NOT EXISTS "p5m_attendances_meeting_id_submitted_at_idx"
  ON "p5m_attendances"("meeting_id", "submitted_at");
CREATE INDEX IF NOT EXISTS "p5m_attendances_user_id_idx"
  ON "p5m_attendances"("user_id");

DO $$ BEGIN
  ALTER TABLE "p5m_attendances"
    ADD CONSTRAINT "p5m_attendances_meeting_id_fkey"
    FOREIGN KEY ("meeting_id") REFERENCES "p5m_meetings"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "p5m_attendances"
    ADD CONSTRAINT "p5m_attendances_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "p5m_attendances"
    ADD CONSTRAINT "p5m_attendances_reviewed_by_id_fkey"
    FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
