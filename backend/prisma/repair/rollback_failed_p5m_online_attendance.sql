-- Pemulihan khusus migrasi P5M online 20261104150000 yang gagal sebelum fitur aktif.
DROP TABLE IF EXISTS "p5m_attendances" CASCADE;

ALTER TABLE "p5m_meetings"
  DROP COLUMN IF EXISTS "status",
  DROP COLUMN IF EXISTS "opened_at",
  DROP COLUMN IF EXISTS "closed_at";

DROP TYPE IF EXISTS "P5mHealth";
DROP TYPE IF EXISTS "P5mSleep24";
DROP TYPE IF EXISTS "P5mStatus";
