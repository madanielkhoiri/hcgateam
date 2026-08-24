-- Ganti kolom tunggal "tanggal_kontrak" menjadi periode "tanggal_mulai" & "tanggal_selesai".
-- Data lama dipakai sebagai nilai awal untuk kedua kolom baru (dapat diedit ulang oleh Owner).
-- AlterTable
ALTER TABLE "eprom_kontrak" ADD COLUMN "tanggal_mulai" DATE;
ALTER TABLE "eprom_kontrak" ADD COLUMN "tanggal_selesai" DATE;

UPDATE "eprom_kontrak" SET "tanggal_mulai" = "tanggal_kontrak", "tanggal_selesai" = "tanggal_kontrak";

ALTER TABLE "eprom_kontrak" ALTER COLUMN "tanggal_mulai" SET NOT NULL;
ALTER TABLE "eprom_kontrak" ALTER COLUMN "tanggal_selesai" SET NOT NULL;

ALTER TABLE "eprom_kontrak" DROP COLUMN "tanggal_kontrak";
