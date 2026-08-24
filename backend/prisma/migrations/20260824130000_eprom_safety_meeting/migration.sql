CREATE TYPE "EpromSafetyMeetingType" AS ENUM (
  'P5M',
  'SAFETY_TALK',
  'FATIGUE_TEST'
);

CREATE TABLE "eprom_safety_meeting_files" (
  "id" SERIAL NOT NULL,
  "project_id" INTEGER NOT NULL,
  "tipe" "EpromSafetyMeetingType" NOT NULL,
  "file_url" TEXT NOT NULL,
  "original_file_name" TEXT NOT NULL,
  "uploaded_by" INTEGER NOT NULL,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eprom_safety_meeting_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "eprom_safety_meeting_files_project_id_tipe_uploaded_at_idx"
  ON "eprom_safety_meeting_files"("project_id", "tipe", "uploaded_at");
CREATE INDEX "eprom_safety_meeting_files_uploaded_by_idx"
  ON "eprom_safety_meeting_files"("uploaded_by");

ALTER TABLE "eprom_safety_meeting_files"
  ADD CONSTRAINT "eprom_safety_meeting_files_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "eprom_safety_meeting_files"
  ADD CONSTRAINT "eprom_safety_meeting_files_uploaded_by_fkey"
  FOREIGN KEY ("uploaded_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
