ALTER TABLE "eprom_tender_process" ADD COLUMN "evaluasi_config" JSONB;
ALTER TABLE "eprom_evaluasi_vendor" ADD COLUMN "evaluasi_data" JSONB;
ALTER TABLE "eprom_evaluasi_vendor" ADD COLUMN "dokumen_admin_files" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "eprom_evaluasi_vendor" ADD COLUMN "dokumen_hse_files" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
