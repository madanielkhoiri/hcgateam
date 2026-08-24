-- AlterTable: tambah nama_pekerjaan, planned_persen, actual_persen ke Progress Mingguan.
-- Data lama (upload tanpa persen) di-backfill nilai default sebelum dikunci NOT NULL.
ALTER TABLE "eprom_progress_mingguan" ADD COLUMN "nama_pekerjaan" TEXT;
ALTER TABLE "eprom_progress_mingguan" ADD COLUMN "planned_persen" DECIMAL(5,2);
ALTER TABLE "eprom_progress_mingguan" ADD COLUMN "actual_persen" DECIMAL(5,2);

UPDATE "eprom_progress_mingguan"
SET "nama_pekerjaan" = 'Umum', "planned_persen" = 0, "actual_persen" = 0
WHERE "nama_pekerjaan" IS NULL;

ALTER TABLE "eprom_progress_mingguan" ALTER COLUMN "nama_pekerjaan" SET NOT NULL;
ALTER TABLE "eprom_progress_mingguan" ALTER COLUMN "planned_persen" SET NOT NULL;
ALTER TABLE "eprom_progress_mingguan" ALTER COLUMN "actual_persen" SET NOT NULL;
