ALTER TYPE "EngineerDocumentType" ADD VALUE IF NOT EXISTS 'CHECKLIST_TAHAPAN';

ALTER TABLE "eprom_checklist_konstruksi"
ADD COLUMN IF NOT EXISTS "original_file_name" TEXT;
