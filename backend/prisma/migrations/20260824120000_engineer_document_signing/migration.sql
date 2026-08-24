-- Additive migration: audit approval dan file signed Engineer.
CREATE TYPE "EngineerDocumentType" AS ENUM (
  'SHOP_DRAWING',
  'MATERIAL_APPROVAL',
  'METODE_PEKERJAAN',
  'SERTIFIKASI_PEKERJAAN',
  'DAFTAR_PERALATAN'
);

ALTER TABLE "eprom_shop_drawings" ADD COLUMN "original_file_name" TEXT;
ALTER TABLE "eprom_material_approvals" ADD COLUMN "original_file_name" TEXT;
ALTER TABLE "eprom_metode_pekerjaan" ADD COLUMN "original_file_name" TEXT;
ALTER TABLE "eprom_sertifikasi_pekerjaan" ADD COLUMN "original_file_name" TEXT;
ALTER TABLE "eprom_peralatan_list" ADD COLUMN "original_file_name" TEXT;

CREATE TABLE "eprom_engineer_document_approvals" (
  "id" SERIAL NOT NULL,
  "document_id" INTEGER NOT NULL,
  "document_type" "EngineerDocumentType" NOT NULL,
  "project_id" INTEGER NOT NULL,
  "approved_by" INTEGER NOT NULL,
  "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "signature_file" TEXT NOT NULL,
  "signature_page" INTEGER NOT NULL,
  "signature_x_ratio" DOUBLE PRECISION NOT NULL,
  "signature_y_ratio" DOUBLE PRECISION NOT NULL,
  "signature_width_ratio" DOUBLE PRECISION NOT NULL,
  "signature_height_ratio" DOUBLE PRECISION NOT NULL,
  "original_file_path" TEXT NOT NULL,
  "source_file_path" TEXT NOT NULL,
  "signed_file_path" TEXT NOT NULL,
  CONSTRAINT "eprom_engineer_document_approvals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "eprom_engineer_document_approvals_document_type_document_id_approved_at_idx"
  ON "eprom_engineer_document_approvals"("document_type", "document_id", "approved_at");
CREATE INDEX "eprom_engineer_document_approvals_project_id_idx"
  ON "eprom_engineer_document_approvals"("project_id");
CREATE INDEX "eprom_engineer_document_approvals_approved_by_idx"
  ON "eprom_engineer_document_approvals"("approved_by");

ALTER TABLE "eprom_engineer_document_approvals"
  ADD CONSTRAINT "eprom_engineer_document_approvals_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eprom_engineer_document_approvals"
  ADD CONSTRAINT "eprom_engineer_document_approvals_approved_by_fkey"
  FOREIGN KEY ("approved_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
