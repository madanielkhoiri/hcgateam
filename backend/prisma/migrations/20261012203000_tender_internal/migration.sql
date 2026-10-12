CREATE TYPE "JenisTender" AS ENUM ('VENDOR', 'INTERNAL');

ALTER TABLE "eprom_tender_process"
ADD COLUMN "jenis_tender" "JenisTender" NOT NULL DEFAULT 'VENDOR',
ADD COLUMN "internal_aktif" BOOLEAN NOT NULL DEFAULT true;
