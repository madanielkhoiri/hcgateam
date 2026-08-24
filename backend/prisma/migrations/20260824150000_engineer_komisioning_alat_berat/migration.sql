ALTER TYPE "EngineerDocumentType"
  ADD VALUE IF NOT EXISTS 'KOMISIONING_ALAT_BERAT';

CREATE TABLE "eprom_komisioning_alat_berat" (
  "id" SERIAL NOT NULL,
  "project_id" INTEGER NOT NULL,
  "file_url" TEXT,
  "original_file_name" TEXT,
  "status" "StatusApprovalEprom" NOT NULL DEFAULT 'PENDING',
  "komentar" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "eprom_komisioning_alat_berat_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "eprom_komisioning_alat_berat_project_id_status_idx"
  ON "eprom_komisioning_alat_berat"("project_id", "status");

ALTER TABLE "eprom_komisioning_alat_berat"
  ADD CONSTRAINT "eprom_komisioning_alat_berat_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
